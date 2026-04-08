/**
 * @fileoverview Landing Page 预加载服务
 * @description 处理 Landing Page 预加载内容的获取、缓存和管理
 * @module services/landingPage/lp.preload.service
 * 
 * 数据流:
 * 1. 从远程 URL 获取 Landing Page 内容
 * 2. 缓存到 D1 数据库 (lpPreloadCache 表)
 * 3. 支持缓存过期和自动刷新
 * 4. 记录缓存命中/未命中统计
 * 
 * @input LandingPage ID 或 URL
 * @output PreloadContentResult
 * @logic 
 * - 检查缓存是否存在且未过期
 * - 如果缓存有效，直接返回
 * - 如果缓存无效，从远程获取并缓存
 * @frontend 无
 * @backend LP Preload Routes, Flow Engine
 */

import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  LPPreloadCache,
  LPPreloadStats,
  PreloadContentResult,
  PreloadConfig,
  FetchStatus,
} from '@/types/landingPage';
import { DEFAULT_PRELOAD_CONFIG } from '@/types/landingPage';

export class LPPreloadService {
  private db: D1Database;
  private config: PreloadConfig;

  constructor(env: Env, config?: Partial<PreloadConfig>) {
    this.db = getD1Connection(env);
    this.config = { ...DEFAULT_PRELOAD_CONFIG, ...config };
  }

  /**
   * 获取预加载内容
   * 优先从缓存获取，缓存不存在或过期则从远程获取
   */
  async getPreloadContent(landingPageId: string, url: string): Promise<PreloadContentResult> {
    const startTime = Date.now();

    // 检查缓存
    const cached = await this.getCache(landingPageId);
    if (cached && this.isCacheValid(cached)) {
      // 更新统计
      await this.updateStats(landingPageId, true, Date.now() - startTime);
      return {
        success: true,
        content: cached.content,
        contentType: cached.contentType,
        contentSize: cached.contentSize,
        cached: true,
        fetchTime: Date.now() - startTime,
      };
    }

    // 缓存不存在或已过期，从远程获取
    const fetchResult = await this.fetchContent(url);
    if (!fetchResult.success) {
      await this.updateStats(landingPageId, false, Date.now() - startTime);
      return fetchResult;
    }

    // 保存到缓存
    await this.saveCache(landingPageId, fetchResult);

    // 更新统计
    await this.updateStats(landingPageId, false, Date.now() - startTime);

    return {
      ...fetchResult,
      cached: false,
      fetchTime: Date.now() - startTime,
    };
  }

  /**
   * 强制刷新缓存
   */
  async refreshCache(landingPageId: string, url: string): Promise<PreloadContentResult> {
    const startTime = Date.now();

    const fetchResult = await this.fetchContent(url);
    if (!fetchResult.success) {
      return fetchResult;
    }

    await this.saveCache(landingPageId, fetchResult);

    return {
      ...fetchResult,
      cached: false,
      fetchTime: Date.now() - startTime,
    };
  }

  /**
   * 清除缓存
   */
  async clearCache(landingPageId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM lpPreloadCache WHERE landingPageId = ?')
      .bind(landingPageId)
      .run();
  }

  /**
   * 获取缓存状态
   */
  async getCacheStatus(landingPageId: string): Promise<{
    cached: boolean;
    fetchStatus: FetchStatus | null;
    contentSize: number;
    lastFetchedAt: string | null;
    expiresAt: string | null;
  }> {
    const cache = await this.getCache(landingPageId);

    if (!cache) {
      return {
        cached: false,
        fetchStatus: null,
        contentSize: 0,
        lastFetchedAt: null,
        expiresAt: null,
      };
    }

    return {
      cached: this.isCacheValid(cache),
      fetchStatus: cache.fetchStatus,
      contentSize: cache.contentSize,
      lastFetchedAt: cache.lastFetchedAt,
      expiresAt: cache.expiresAt,
    };
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(landingPageId: string): Promise<LPPreloadStats | null> {
    const result = await this.db
      .prepare('SELECT * FROM lpPreloadStats WHERE landingPageId = ?')
      .bind(landingPageId)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      landingPageId: result.landingPageId as string,
      cacheHits: (result.cacheHits as number) || 0,
      cacheMisses: (result.cacheMisses as number) || 0,
      totalRequests: (result.totalRequests as number) || 0,
      avgResponseTime: (result.avgResponseTime as number) || 0,
      lastResetAt: result.lastResetAt as string | null,
      createdAt: result.createdAt as string,
      updatedAt: result.updatedAt as string,
    };
  }

  /**
   * 重置统计
   */
  async resetStats(landingPageId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE lpPreloadStats 
        SET cacheHits = 0, cacheMisses = 0, totalRequests = 0, avgResponseTime = 0, lastResetAt = ?, updatedAt = ?
        WHERE landingPageId = ?
      `)
      .bind(now, now, landingPageId)
      .run();
  }

  /**
   * 批量预加载
   */
  async batchPreload(items: Array<{ id: string; url: string }>): Promise<Map<string, PreloadContentResult>> {
    const results = new Map<string, PreloadContentResult>();

    // 并发控制
    const chunks = this.chunkArray(items, this.config.maxConcurrent);
    for (const chunk of chunks) {
      const promises = chunk.map(async (item) => {
        const result = await this.getPreloadContent(item.id, item.url);
        results.set(item.id, result);
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare('DELETE FROM lpPreloadCache WHERE expiresAt < ?')
      .bind(now)
      .run();
    return result.meta.changes || 0;
  }

  // ==================== 私有方法 ====================

  /**
   * 从远程获取内容
   */
  private async fetchContent(url: string): Promise<PreloadContentResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          cached: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      const content = await response.text();
      const contentSize = new Blob([content]).size;

      // 检查内容大小
      if (contentSize > this.config.maxContentSize) {
        return {
          success: false,
          cached: false,
          error: `Content size ${contentSize} exceeds limit ${this.config.maxContentSize}`,
        };
      }

      return {
        success: true,
        content,
        contentType,
        contentSize,
        cached: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        cached: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取缓存
   */
  private async getCache(landingPageId: string): Promise<LPPreloadCache | null> {
    const result = await this.db
      .prepare('SELECT * FROM lpPreloadCache WHERE landingPageId = ?')
      .bind(landingPageId)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      landingPageId: result.landingPageId as string,
      content: result.content as string,
      contentType: result.contentType as string,
      contentSize: (result.contentSize as number) || 0,
      fetchStatus: result.fetchStatus as FetchStatus,
      lastFetchedAt: result.lastFetchedAt as string | null,
      expiresAt: result.expiresAt as string | null,
      createdAt: result.createdAt as string,
      updatedAt: result.updatedAt as string,
    };
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cache: LPPreloadCache): boolean {
    if (cache.fetchStatus !== 'success') return false;
    if (!cache.expiresAt) return false;

    const expiresAt = new Date(cache.expiresAt).getTime();
    return expiresAt > Date.now();
  }

  /**
   * 保存缓存
   */
  private async saveCache(landingPageId: string, result: PreloadContentResult): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.defaultTTL * 1000);
    const id = crypto.randomUUID();

    const existing = await this.db
      .prepare('SELECT id FROM lpPreloadCache WHERE landingPageId = ?')
      .bind(landingPageId)
      .first();

    if (existing) {
      await this.db
        .prepare(`
          UPDATE lpPreloadCache 
          SET content = ?, contentType = ?, contentSize = ?, fetchStatus = ?, 
              lastFetchedAt = ?, expiresAt = ?, updatedAt = ?
          WHERE landingPageId = ?
        `)
        .bind(
          result.content,
          result.contentType,
          result.contentSize,
          result.success ? 'success' : 'failed',
          now.toISOString(),
          expiresAt.toISOString(),
          now.toISOString(),
          landingPageId
        )
        .run();
    } else {
      await this.db
        .prepare(`
          INSERT INTO lpPreloadCache (
            id, landingPageId, content, contentType, contentSize, fetchStatus,
            lastFetchedAt, expiresAt, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          landingPageId,
          result.content,
          result.contentType,
          result.contentSize,
          result.success ? 'success' : 'failed',
          now.toISOString(),
          expiresAt.toISOString(),
          now.toISOString(),
          now.toISOString()
        )
        .run();
    }
  }

  /**
   * 更新统计
   */
  private async updateStats(landingPageId: string, isHit: boolean, responseTime: number): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db
      .prepare('SELECT * FROM lpPreloadStats WHERE landingPageId = ?')
      .bind(landingPageId)
      .first();

    if (existing) {
      const totalRequests = (existing.totalRequests as number) + 1;
      const cacheHits = (existing.cacheHits as number) + (isHit ? 1 : 0);
      const cacheMisses = (existing.cacheMisses as number) + (isHit ? 0 : 1);
      const avgResponseTime = Math.round(
        ((existing.avgResponseTime as number) * (existing.totalRequests as number) + responseTime) / totalRequests
      );

      await this.db
        .prepare(`
          UPDATE lpPreloadStats 
          SET cacheHits = ?, cacheMisses = ?, totalRequests = ?, avgResponseTime = ?, updatedAt = ?
          WHERE landingPageId = ?
        `)
        .bind(cacheHits, cacheMisses, totalRequests, avgResponseTime, now, landingPageId)
        .run();
    } else {
      const id = crypto.randomUUID();
      await this.db
        .prepare(`
          INSERT INTO lpPreloadStats (
            id, landingPageId, cacheHits, cacheMisses, totalRequests, avgResponseTime, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          landingPageId,
          isHit ? 1 : 0,
          isHit ? 0 : 1,
          1,
          responseTime,
          now,
          now
        )
        .run();
    }
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * 创建 LPPreloadService 实例
 */
export function createLPPreloadService(env: Env, config?: Partial<PreloadConfig>): LPPreloadService {
  return new LPPreloadService(env, config);
}
