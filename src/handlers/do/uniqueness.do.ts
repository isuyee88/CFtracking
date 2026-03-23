/**
 * @fileoverview Durable Objects - Uniqueness 去重
 * @description 管理访问者唯一性检查和计数器
 * @module handlers/do/uniqueness.do
 *
 * 数据存储架构:
 *   - DO: 唯一性检查和计数器，用于解决KV免费版写入限制
 *   - AE: 主存储，免费3个月，用于时序数据
 *   - D1: 归档存储，永久，用于Dashboard
 *
 * 数据流:
 *   点击请求 → DO(唯一性检查) → AE(主存储) → 每天汇总 → D1(归档)
 *
 * 输入: 去重请求（campaignId, visitorId, method等）
 * 输出: 去重结果（isUnique, clickId等）
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 通过 DO RPC 调用
 */

import type { Env } from '@/config/env';

/**
 * 去重方法
 */
export type UniquenessMethod =
  | 'ip'
  | 'ip_ua'
  | 'cookie'
  | 'fingerprint'
  | 'parameter'
  | 'none';

/**
 * Uniqueness 记录
 */
export interface UniquenessRecord {
  visitorId: string;
  clickId: string;
  firstSeenAt: string;
  campaignId: string;
  method: UniquenessMethod;
}

/**
 * 去重检查请求
 */
export interface UniquenessCheckRequest {
  campaignId: string;
  method: UniquenessMethod;
  uniquenessParameter?: string;
  ttl: number;
  ip: string;
  userAgent: string;
  visitorId: string;
  urlParams?: Record<string, string>;
  fingerprint?: string;
}

/**
 * 去重检查结果
 */
export interface UniquenessCheckResult {
  isUnique: boolean;
  method: UniquenessMethod;
  firstSeenAt: string | null;
  existingClickId: string | null;
  visitorId: string;
  shouldSetCookie: boolean;
}

/**
 * Uniqueness Durable Object
 * 用于高吞吐量的唯一性检查
 */
export class UniquenessDurableObject {
  private storage: DurableObjectStorage;
  private records: Map<string, UniquenessRecord> = new Map();

  constructor(state: DurableObjectState, _env: Env) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'POST' && path === '/check') {
      return this.check(request);
    }

    if (method === 'GET' && path.startsWith('/stats/')) {
      const key = path.replace('/stats/', '');
      return this.getStats(key);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * 执行去重检查
   */
  private async check(request: Request): Promise<Response> {
    const req = await request.json() as UniquenessCheckRequest;

    if (req.method === 'none') {
      return this.jsonResponse({
        isUnique: true,
        method: 'none',
        firstSeenAt: null,
        existingClickId: null,
        visitorId: req.visitorId,
        shouldSetCookie: false,
      });
    }

    const key = this.generateKey(req);
    const clickId = this.generateClickId();

    const existing = await this.storage.get<UniquenessRecord>(key);

    if (existing) {
      const result: UniquenessCheckResult = {
        isUnique: false,
        method: req.method,
        firstSeenAt: existing.firstSeenAt,
        existingClickId: existing.clickId,
        visitorId: req.visitorId,
        shouldSetCookie: false,
      };

      return this.jsonResponse(result);
    }

    const record: UniquenessRecord = {
      visitorId: req.visitorId,
      clickId,
      firstSeenAt: new Date().toISOString(),
      campaignId: req.campaignId,
      method: req.method,
    };

    this.records.set(key, record);

    const ttlSeconds = req.ttl || 86400;
    await this.storage.put(key, record, { expirationTtl: ttlSeconds } as any);

    const result: UniquenessCheckResult = {
      isUnique: true,
      method: req.method,
      firstSeenAt: null,
      existingClickId: null,
      visitorId: req.visitorId,
      shouldSetCookie: req.method === 'cookie',
    };

    return this.jsonResponse(result);
  }

  /**
   * 获取统计信息
   */
  private async getStats(key: string): Promise<Response> {
    const record = await this.storage.get<UniquenessRecord>(key);

    if (!record) {
      return this.jsonResponse({ exists: false });
    }

    return this.jsonResponse({
      exists: true,
      record,
    });
  }

  /**
   * 生成去重键
   */
  private generateKey(request: UniquenessCheckRequest): string {
    const prefix = `uniqueness:${request.campaignId}:`;

    switch (request.method) {
      case 'ip':
        return `${prefix}ip:${this.hashString(request.ip)}`;

      case 'ip_ua':
        return `${prefix}ipua:${this.hashString(`${request.ip}:${request.userAgent}`)}`;

      case 'cookie':
        return `${prefix}cookie:${request.visitorId}`;

      case 'fingerprint':
        const fp = request.fingerprint || this.hashString(`${request.ip}:${request.userAgent}`);
        return `${prefix}fp:${fp}`;

      case 'parameter':
        if (!request.uniquenessParameter || !request.urlParams) {
          return `${prefix}ip:${this.hashString(request.ip)}`;
        }
        const paramValue = request.urlParams[request.uniquenessParameter];
        if (!paramValue) {
          return `${prefix}ip:${this.hashString(request.ip)}`;
        }
        return `${prefix}param:${request.uniquenessParameter}:${paramValue}`;

      default:
        throw new Error(`Unknown uniqueness method: ${request.method}`);
    }
  }

  /**
   * 简单哈希算法
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成点击ID
   */
  private generateClickId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }

  private jsonResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Uniqueness DO 服务类
 * 用于从外部调用 DO
 */
export class UniquenessDOService {
  constructor(private env: Env) {}

  /**
   * 执行去重检查
   */
  async check(request: UniquenessCheckRequest): Promise<UniquenessCheckResult> {
    const id = this.env.UNIQUE_DO.idFromName(`campaign-${request.campaignId}`);
    const stub = this.env.UNIQUE_DO.get(id);

    const response = await stub.fetch('http://localhost/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Uniqueness check failed: ${response.status}`);
    }

    return response.json() as Promise<UniquenessCheckResult>;
  }
}
