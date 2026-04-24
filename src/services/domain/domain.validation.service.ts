/**
 * @fileoverview Domain 校验服务
 * @description 处理 Domain 的实时校验功能
 * @module services/domain/domain.validation.service
 * 
 * 数据流:
 * 1. 从 Cloudflare API 获取 Zone、SSL、DNS 状态
 * 2. 缓存校验结果到 D1 数据库
 * 3. 支持批量校验和定时校验
 * 
 * @input Domain ID 或 hostname
 * @output ValidationResult
 * @logic 
 * - 调用 Cloudflare API 获取 Zone 信息
 * - 检查 SSL 证书状态
 * - 验证 DNS 配置
 * - 记录校验历史
 * @frontend 无
 * @backend Domain Validation Routes, Cron Tasks
 */

import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  ValidationResult,
  ValidationStatus,
  CloudflareZoneInfo,
  DomainValidationHistory,
} from '@/types/domain';
import { DEFAULT_VALIDATION_CONFIG } from '@/types/domain';

export class DomainValidationService {
  private db: D1Database;
  private env: Env;
  private config: typeof DEFAULT_VALIDATION_CONFIG;

  constructor(env: Env, config?: Partial<typeof DEFAULT_VALIDATION_CONFIG>) {
    this.db = getD1Connection(env);
    this.env = env;
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * 验证单个域名
   */
  async validateDomain(domainId: string): Promise<ValidationResult> {
    const domain = await this.getDomain(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    const errors: string[] = [];
    let zoneStatus: ValidationStatus = 'unknown';
    let sslStatus: ValidationStatus = 'unknown';
    let dnsStatus: ValidationStatus = 'unknown';
    let zoneId: string | null = null;

    try {
      // 获取 Zone 信息
      const zoneInfo = await this.fetchZoneInfo(domain.hostname);
      if (zoneInfo) {
        zoneStatus = zoneInfo.status === 'active' ? 'valid' : 'invalid';
        sslStatus = zoneInfo.sslStatus === 'active' ? 'valid' : 'pending';
        zoneId = zoneInfo.id;

        // 检查 DNS 配置
        dnsStatus = await this.checkDNS(domain.hostname, zoneInfo.nameServers);
      } else {
        zoneStatus = 'invalid';
        sslStatus = 'unknown';
        dnsStatus = 'unknown';
        errors.push('Zone not found in Cloudflare');
      }
    } catch (error) {
      zoneStatus = 'error';
      sslStatus = 'error';
      dnsStatus = 'error';
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    const now = new Date().toISOString();
    const result: ValidationResult = {
      domainId,
      hostname: domain.hostname,
      zoneStatus,
      sslStatus,
      dnsStatus,
      zoneId,
      errors,
      validatedAt: now,
    };

    // 保存校验结果
    await this.saveValidationResult(result);

    // 记录校验历史
    await this.recordValidationHistory(result);

    return result;
  }

  /**
   * 批量验证域名
   */
  async validateDomains(domainIds: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const domainId of domainIds) {
      try {
        const result = await this.validateDomain(domainId);
        results.push(result);
      } catch (error) {
        results.push({
          domainId,
          hostname: '',
          zoneStatus: 'error',
          sslStatus: 'error',
          dnsStatus: 'error',
          zoneId: null,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          validatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * 获取需要校验的域名列表
   */
  async getDomainsNeedingValidation(): Promise<Array<{ id: string; hostname: string }>> {
    const now = new Date();
    const threshold = new Date(now.getTime() - (this.config.cacheTTL || 3600) * 1000);

    const result = await this.db
      .prepare(`
        SELECT id, hostname FROM domains 
        WHERE validationEnabled = 1 
          AND (lastValidatedAt IS NULL OR lastValidatedAt < ?)
        ORDER BY lastValidatedAt ASC
      `)
      .bind(threshold.toISOString())
      .all();

    return (result.results as unknown as Array<{ id: string; hostname: string }>) || [];
  }

  /**
   * 获取校验历史
   */
  async getValidationHistory(
    domainId: string,
    limit = 10
  ): Promise<DomainValidationHistory[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM domainValidationHistory 
        WHERE domainId = ? 
        ORDER BY validatedAt DESC 
        LIMIT ?
      `)
      .bind(domainId, limit)
      .all();

    return (result.results as unknown as DomainValidationHistory[]) || [];
  }

  /**
   * 获取最新校验结果
   */
  async getLatestValidation(domainId: string): Promise<ValidationResult | null> {
    const domain = await this.getDomain(domainId);
    if (!domain) return null;

    return {
      domainId,
      hostname: domain.hostname,
      zoneStatus: domain.zoneStatus || 'unknown',
      sslStatus: domain.sslValidationStatus || 'unknown',
      dnsStatus: domain.dnsStatus || 'unknown',
      zoneId: domain.zoneId,
      errors: [],
      validatedAt: domain.lastValidatedAt || new Date().toISOString(),
    };
  }

  /**
   * 清除校验缓存
   */
  async clearValidationCache(domainId: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE domains 
        SET zoneStatus = 'unknown', 
            sslStatus = 'unknown', 
            dnsStatus = 'unknown', 
            lastValidatedAt = NULL
        WHERE id = ?
      `)
      .bind(domainId)
      .run();
  }

  /**
   * 获取所有域名的校验状态摘要
   */
  async getValidationSummary(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    pending: number;
    unknown: number;
    error: number;
  }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN zoneStatus = 'valid' AND sslStatus = 'valid' THEN 1 ELSE 0 END) as valid,
          SUM(CASE WHEN zoneStatus = 'invalid' OR sslStatus = 'invalid' THEN 1 ELSE 0 END) as invalid,
          SUM(CASE WHEN zoneStatus = 'pending' OR sslStatus = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN zoneStatus = 'unknown' OR sslStatus = 'unknown' THEN 1 ELSE 0 END) as unknown,
          SUM(CASE WHEN zoneStatus = 'error' OR sslStatus = 'error' THEN 1 ELSE 0 END) as error
        FROM domains
        WHERE validationEnabled = 1
      `)
      .first();

    return {
      total: (result?.total as number) || 0,
      valid: (result?.valid as number) || 0,
      invalid: (result?.invalid as number) || 0,
      pending: (result?.pending as number) || 0,
      unknown: (result?.unknown as number) || 0,
      error: (result?.error as number) || 0,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 获取域名信息
   */
  private async getDomain(domainId: string): Promise<{
    id: string;
    hostname: string;
    zoneStatus: ValidationStatus;
    sslValidationStatus: ValidationStatus;
    dnsStatus: ValidationStatus;
    zoneId: string | null;
    lastValidatedAt: string | null;
  } | null> {
    const result = await this.db
      .prepare(`
        SELECT id, hostname, zoneStatus, sslStatus, dnsStatus, zoneId, lastValidatedAt
        FROM domains 
        WHERE id = ?
      `)
      .bind(domainId)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      hostname: result.hostname as string,
      zoneStatus: (result.zoneStatus as ValidationStatus) || 'unknown',
      sslValidationStatus: (result.sslStatus as ValidationStatus) || 'unknown',
      dnsStatus: (result.dnsStatus as ValidationStatus) || 'unknown',
      zoneId: result.zoneId as string | null,
      lastValidatedAt: result.lastValidatedAt as string | null,
    };
  }

  /**
   * 从 Cloudflare API 获取 Zone 信息
   */
  private async fetchZoneInfo(hostname: string): Promise<CloudflareZoneInfo | null> {
    const apiToken = this.env.CF_API_TOKEN;
    if (!apiToken) {
      throw new Error('Cloudflare API token not configured');
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${hostname}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as { result: Array<{
        id: string;
        name: string;
        status: string;
        name_servers: string[];
        ssl: { status: string };
        dnssec: string;
      }> };

      if (!data.result || data.result.length === 0) {
        return null;
      }

      const zone = data.result[0];
      if (!zone) {
        return null;
      }

      return {
        id: zone.id,
        name: zone.name,
        status: zone.status,
        nameServers: zone.name_servers || [],
        sslStatus: zone.ssl?.status || 'unknown',
        dnsSecStatus: zone.dnssec || 'disabled',
      };
    } catch (error) {
      console.error('[DomainValidationService] Failed to fetch zone info:', error);
      throw error;
    }
  }

  /**
   * 检查 DNS 配置
   */
  private async checkDNS(hostname: string, nameServers: string[]): Promise<ValidationStatus> {
    if (!nameServers || nameServers.length === 0) {
      return 'unknown';
    }

    try {
      // 简单检查：尝试解析域名
      const response = await fetch(`https://${hostname}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok ? 'valid' : 'invalid';
    } catch {
      return 'invalid';
    }
  }

  /**
   * 保存校验结果
   */
  private async saveValidationResult(result: ValidationResult): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE domains 
        SET zoneStatus = ?, 
            sslStatus = ?, 
            dnsStatus = ?, 
            zoneId = ?, 
            lastValidatedAt = ?,
            updatedAt = ?
        WHERE id = ?
      `)
      .bind(
        result.zoneStatus,
        result.sslStatus,
        result.dnsStatus,
        result.zoneId,
        result.validatedAt,
        now,
        result.domainId
      )
      .run();
  }

  /**
   * 记录校验历史
   */
  private async recordValidationHistory(result: ValidationResult): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO domainValidationHistory (
          id, domainId, zoneStatus, sslStatus, dnsStatus, zoneId, errors, validatedAt, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        result.domainId,
        result.zoneStatus,
        result.sslStatus,
        result.dnsStatus,
        result.zoneId,
        result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        result.validatedAt,
        now
      )
      .run();
  }
}

/**
 * 创建 DomainValidationService 实例
 */
export function createDomainValidationService(
  env: Env,
  config?: Partial<typeof DEFAULT_VALIDATION_CONFIG>
): DomainValidationService {
  return new DomainValidationService(env, config);
}
