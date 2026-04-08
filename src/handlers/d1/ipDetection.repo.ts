/**
 * @fileoverview IP检测数据仓库
 * @description 处理IP检测结果缓存、服务商配置的数据库操作
 * @module handlers/d1/ipDetection.repo
 */

import type { D1Database } from './index';
import type {
  IPDetectionCache,
  IPDetectionStats,
  IPDetectionProvider,
  IPDetectionProviderCreateInput,
  IPDetectionProviderRepository,
  IPDetectionRepository,
} from '@/types/ipDetection';
import { nanoid } from 'nanoid';

export class IPDetectionRepo implements IPDetectionRepository {
  constructor(private db: D1Database) {}

  async findByIP(ip: string): Promise<IPDetectionCache | null> {
    const now = new Date().toISOString();
    return await this.db
      .prepare('SELECT * FROM ipDetectionCache WHERE ip = ? AND expiresAt > ?')
      .bind(ip, now)
      .first<IPDetectionCache>();
  }

  async upsert(result: Omit<IPDetectionCache, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO ipDetectionCache (
          id, ip, isProxy, isVpn, isTor, isDatacenter, riskScore, provider,
          isp, country, city, asn, details, expiresAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ip) DO UPDATE SET
          isProxy = excluded.isProxy,
          isVpn = excluded.isVpn,
          isTor = excluded.isTor,
          isDatacenter = excluded.isDatacenter,
          riskScore = excluded.riskScore,
          provider = excluded.provider,
          isp = excluded.isp,
          country = excluded.country,
          city = excluded.city,
          asn = excluded.asn,
          details = excluded.details,
          expiresAt = excluded.expiresAt,
          updatedAt = excluded.updatedAt
      `)
      .bind(
        id,
        result.ip,
        result.isProxy ? 1 : 0,
        result.isVpn ? 1 : 0,
        result.isTor ? 1 : 0,
        result.isDatacenter ? 1 : 0,
        result.riskScore,
        result.provider,
        result.isp || null,
        result.country || null,
        result.city || null,
        result.asn || null,
        result.details || null,
        result.expiresAt,
        now,
        now
      )
      .run();
  }

  async deleteByIP(ip: string): Promise<void> {
    await this.db.prepare('DELETE FROM ipDetectionCache WHERE ip = ?').bind(ip).run();
  }

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare('DELETE FROM ipDetectionCache WHERE expiresAt <= ?')
      .bind(now)
      .run();
    return result.meta.changes || 0;
  }

  async getStats(): Promise<IPDetectionStats> {
    const statsResult = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as totalChecks,
          SUM(isProxy) as proxyDetected,
          SUM(isVpn) as vpnDetected,
          SUM(isTor) as torDetected,
          SUM(isDatacenter) as datacenterDetected
        FROM ipDetectionCache
      `)
      .first<{
        totalChecks: number;
        proxyDetected: number;
        vpnDetected: number;
        torDetected: number;
        datacenterDetected: number;
      }>();

    const topProviders = await this.db
      .prepare(`
        SELECT provider, COUNT(*) as count
        FROM ipDetectionCache
        GROUP BY provider
        ORDER BY count DESC
        LIMIT 10
      `)
      .all<{ provider: string; count: number }>();

    const topCountries = await this.db
      .prepare(`
        SELECT country, COUNT(*) as count
        FROM ipDetectionCache
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `)
      .all<{ country: string; count: number }>();

    return {
      totalChecks: statsResult?.totalChecks || 0,
      cacheHits: 0,
      cacheMisses: 0,
      proxyDetected: statsResult?.proxyDetected || 0,
      vpnDetected: statsResult?.vpnDetected || 0,
      torDetected: statsResult?.torDetected || 0,
      datacenterDetected: statsResult?.datacenterDetected || 0,
      topProviders: (topProviders.results || []).map((r) => ({
        provider: r.provider,
        count: r.count,
      })),
      topCountries: (topCountries.results || []).map((r) => ({
        country: r.country,
        count: r.count,
      })),
    };
  }
}

export class IPDetectionProviderRepo implements IPDetectionProviderRepository {
  constructor(private db: D1Database) {}

  async findByName(name: string): Promise<IPDetectionProvider | null> {
    return await this.db
      .prepare('SELECT * FROM ipDetectionProviders WHERE name = ?')
      .bind(name)
      .first<IPDetectionProvider>();
  }

  async findById(id: string): Promise<IPDetectionProvider | null> {
    return await this.db
      .prepare('SELECT * FROM ipDetectionProviders WHERE id = ?')
      .bind(id)
      .first<IPDetectionProvider>();
  }

  async listEnabled(): Promise<IPDetectionProvider[]> {
    const results = await this.db
      .prepare('SELECT * FROM ipDetectionProviders WHERE enabled = 1 ORDER BY priority ASC')
      .all<IPDetectionProvider>();
    return results.results || [];
  }

  async listAll(): Promise<IPDetectionProvider[]> {
    const results = await this.db
      .prepare('SELECT * FROM ipDetectionProviders ORDER BY priority ASC')
      .all<IPDetectionProvider>();
    return results.results || [];
  }

  async create(input: IPDetectionProviderCreateInput): Promise<IPDetectionProvider> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO ipDetectionProviders (
          id, name, displayName, apiKey, apiEndpoint, enabled, priority, dailyLimit, config, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        input.name,
        input.displayName || null,
        input.apiKey || null,
        input.apiEndpoint,
        input.enabled !== false ? 1 : 0,
        input.priority || 1,
        input.dailyLimit || 1000,
        input.config ? JSON.stringify(input.config) : null,
        now,
        now
      )
      .run();

    return (await this.findById(id))!;
  }

  async update(
    id: string,
    input: Partial<IPDetectionProviderCreateInput>
  ): Promise<IPDetectionProvider> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.displayName !== undefined) {
      updates.push('displayName = ?');
      values.push(input.displayName);
    }
    if (input.apiKey !== undefined) {
      updates.push('apiKey = ?');
      values.push(input.apiKey);
    }
    if (input.apiEndpoint !== undefined) {
      updates.push('apiEndpoint = ?');
      values.push(input.apiEndpoint);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }
    if (input.dailyLimit !== undefined) {
      updates.push('dailyLimit = ?');
      values.push(input.dailyLimit);
    }
    if (input.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(input.config));
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db
        .prepare(`UPDATE ipDetectionProviders SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM ipDetectionProviders WHERE id = ?').bind(id).run();
  }

  async incrementUsage(id: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.db
      .prepare(`
        UPDATE ipDetectionProviders 
        SET dailyUsed = dailyUsed + 1,
            lastResetDate = CASE WHEN lastResetDate IS NULL OR lastResetDate < ? THEN ? ELSE lastResetDate END,
            dailyUsed = CASE WHEN lastResetDate IS NULL OR lastResetDate < ? THEN 1 ELSE dailyUsed END,
            updatedAt = ?
        WHERE id = ?
      `)
      .bind(today, today, today, new Date().toISOString(), id)
      .run();
  }

  async resetDailyUsage(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.db
      .prepare(`
        UPDATE ipDetectionProviders 
        SET dailyUsed = 0, lastResetDate = ?, updatedAt = ?
        WHERE lastResetDate IS NULL OR lastResetDate < ?
      `)
      .bind(today, new Date().toISOString(), today)
      .run();
  }
}

export function createIPDetectionRepo(db: D1Database): IPDetectionRepo {
  return new IPDetectionRepo(db);
}

export function createIPDetectionProviderRepo(db: D1Database): IPDetectionProviderRepo {
  return new IPDetectionProviderRepo(db);
}
