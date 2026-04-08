/**
 * @fileoverview 统一缓存管理器
 * @description 双层缓存架构（Workers Memory + Edge Cache），支持LFUDA淘汰算法和Cache-Tag
 * @module services/cache/unified-cache-manager
 *
 * 输入: Request对象、数据获取函数、缓存配置
 * 输出: 缓存数据或原始数据，附带缓存元信息
 * 逻辑交互:
 *   - WorkersMemoryCache: Worker进程内内存缓存（LFUDA算法）
 *   - Edge Cache: Cloudflare边缘CDN缓存
 *   - Cache-Tag: 支持按标签批量失效
 * 前后端交互: 通过HTTP响应头暴露缓存状态
 */

import type { Env } from '@/config/env';

export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  STALE_WHILE_REVALIDATE = 'swr',
  CACHE_ONLY = 'cache-only',
}

export enum CacheLayer {
  EDGE = 'edge',
  WORKERS = 'workers',
}

export interface CacheConfig {
  strategy: CacheStrategy;
  edgeTTL?: number;
  workersTTL?: number;
  cacheKey?: string;
  forceRefresh?: boolean;
  vary?: string[];
  etag?: string;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  layer: CacheLayer;
}

export type CacheFetchSource = 'workers-memory' | 'edge' | 'origin';

export interface CacheFetchMeta {
  source: CacheFetchSource;
  key: string;
  strategy: CacheStrategy;
  edgeTTL: number;
  workersTTL: number;
  lookupMs: number;
  originMs: number;
  writeMs: number;
  totalMs: number;
}

export class CacheKeyBuilder {
  private static readonly PREFIX = 'cftrack';
  private static readonly VERSION = 'v3';

  static dashboard(range: string, campaignId = 'all'): string {
    return `${this.PREFIX}:${this.VERSION}:dashboard:${range}:${campaignId}`;
  }

  static recentClicks(range: string, limit = 10, campaignId = 'all'): string {
    return `${this.PREFIX}:${this.VERSION}:recent-clicks:${range}:limit-${limit}:${campaignId}`;
  }

  static entityStats(entityType: string, range: string, campaignId = 'all'): string {
    return `${this.PREFIX}:${this.VERSION}:entity-stats:${entityType}:${range}:${campaignId}`;
  }

  static pageBundle(page: string, layer: string, scope: Record<string, unknown>): string {
    const scopeHash = this.hashObject(scope);
    return `${this.PREFIX}:${this.VERSION}:page:${page}:${layer}:${scopeHash}`;
  }

  static entityList(entity: string, page = 1, filters?: Record<string, unknown>): string {
    const filterHash = filters ? this.hashObject(filters) : 'all';
    return `${this.PREFIX}:${this.VERSION}:${entity}:list:page${page}:${filterHash}`;
  }

  static entityDetail(entity: string, id: string): string {
    return `${this.PREFIX}:${this.VERSION}:${entity}:detail:${id}`;
  }

  static stats(type: string, range: string): string {
    return `${this.PREFIX}:${this.VERSION}:stats:${type}:${range}`;
  }

  static custom(parts: string[]): string {
    return `${this.PREFIX}:${this.VERSION}:${parts.join(':')}`;
  }

  private static hashObject(obj: Record<string, unknown>): string {
    const serialized = JSON.stringify(obj);
    let hash = 0;

    for (let index = 0; index < serialized.length; index++) {
      hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
  }
}

interface MemoryCacheEntry {
  data: unknown;
  etag?: string;
  expires: number;
  createdAt: number;
  lastAccessed: number;
  frequency: number;
  tags: Set<string>;
}

class WorkersMemoryCache {
  private readonly cache = new Map<string, MemoryCacheEntry>();
  private readonly maxSize: number;
  private dynamicAge = 0;

  constructor(config: {
    maxSize?: number;
  } = {}) {
    this.maxSize = config.maxSize ?? 512;
  }

  get<T>(key: string): { data: T; etag?: string; tags?: Set<string> } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.frequency++;
    return { data: entry.data as T, etag: entry.etag, tags: entry.tags };
  }

  set<T>(
    key: string,
    data: T,
    ttlSeconds: number,
    etag?: string,
    tags: string[] = [],
  ): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLFUDA();
    }

    const existing = this.cache.get(key);
    const frequency = existing ? existing.frequency + 1 : 1;

    this.cache.set(key, {
      data,
      etag,
      expires: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      frequency,
      tags: new Set(tags),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.dynamicAge = 0;
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.has(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateByTags(tags: string[]): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.has(tag))) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  getKeysByTag(tag: string): string[] {
    const keys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.has(tag)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private evictLFUDA(): void {
    let evictKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const age = (Date.now() - entry.createdAt) / 1000;
      const score = (entry.frequency + this.dynamicAge) / Math.max(1, age);

      if (score < lowestScore) {
        lowestScore = score;
        evictKey = key;
      }
    }

    if (evictKey) {
      const evicted = this.cache.get(evictKey);
      if (evicted) {
        this.dynamicAge = evicted.frequency;
      }
      this.cache.delete(evictKey);
    }
  }
}

const sharedMemoryCache = new WorkersMemoryCache({
  maxSize: 512,
});
const sharedEdgeKeys = new Map<string, Set<string>>();
const sharedStats = {
  edgeHits: 0,
  edgeMisses: 0,
  workersHits: 0,
  workersMisses: 0,
};

export class UnifiedCacheManager {
  private readonly edgeCache: Cache;
  private readonly memoryCache: WorkersMemoryCache;

  constructor(_env: Env) {
    this.edgeCache = caches.default;
    this.memoryCache = sharedMemoryCache;
  }

  async fetch<T>(
    request: Request,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {},
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    const {
      strategy = CacheStrategy.CACHE_FIRST,
      edgeTTL = 300,
      workersTTL = 60,
      cacheKey,
      forceRefresh = false,
      etag: providedEtag,
      tags = [],
    } = config;

    const key = cacheKey || this.buildCacheKey(request);

    if (forceRefresh) {
      return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, strategy, 0, providedEtag, tags);
    }

    switch (strategy) {
      case CacheStrategy.CACHE_FIRST:
        return this.cacheFirst(key, fetcher, edgeTTL, workersTTL, strategy, providedEtag, tags);
      case CacheStrategy.NETWORK_FIRST:
        return this.networkFirst(key, fetcher, edgeTTL, workersTTL, strategy, providedEtag, tags);
      case CacheStrategy.STALE_WHILE_REVALIDATE:
        return this.staleWhileRevalidate(key, fetcher, edgeTTL, workersTTL, strategy, providedEtag, tags);
      case CacheStrategy.CACHE_ONLY:
        return this.cacheOnly(key, edgeTTL, workersTTL, strategy);
      default:
        return {
          data: await fetcher(),
          etag: providedEtag,
          meta: this.createMeta('origin', key, strategy, edgeTTL, workersTTL, {}),
        };
    }
  }

  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    sharedEdgeKeys.delete(key);

    try {
      await this.edgeCache.delete(this.createEdgeRequest(key));
    } catch (error) {
      console.error('[CacheManager] Edge cache delete failed:', error);
    }
  }

  async invalidateBatch(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }

  async invalidateByTag(tag: string): Promise<number> {
    const memoryCount = this.memoryCache.invalidateByTag(tag);

    const edgeKeysToDelete: string[] = [];
    for (const [key, tags] of sharedEdgeKeys.entries()) {
      if (tags.has(tag)) {
        edgeKeysToDelete.push(key);
      }
    }

    await Promise.all(
      edgeKeysToDelete.map(async (key) => {
        try {
          await this.edgeCache.delete(this.createEdgeRequest(key));
          sharedEdgeKeys.delete(key);
        } catch (error) {
          console.error('[CacheManager] Edge cache tag invalidation failed:', error);
        }
      }),
    );

    return memoryCount + edgeKeysToDelete.length;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let total = 0;
    for (const tag of tags) {
      total += await this.invalidateByTag(tag);
    }
    return total;
  }

  async clearAll(): Promise<void> {
    this.memoryCache.clear();

    const keys = Array.from(sharedEdgeKeys.keys());
    sharedEdgeKeys.clear();

    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.edgeCache.delete(this.createEdgeRequest(key));
        } catch (error) {
          console.error('[CacheManager] Edge cache clear failed:', error);
        }
      }),
    );
  }

  async get<T>(
    key: string,
    config: {
      edgeTTL?: number;
      workersTTL?: number;
    } = {},
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    return this.fetch<T>(new Request(this.createEdgeRequest(key)), async () => {
      throw new Error('Cache miss with get() helper');
    }, {
      strategy: CacheStrategy.CACHE_ONLY,
      cacheKey: key,
      edgeTTL: config.edgeTTL ?? 300,
      workersTTL: config.workersTTL ?? 60,
    });
  }

  async write<T>(
    key: string,
    data: T,
    config: {
      edgeTTL: number;
      workersTTL: number;
      etag?: string;
      tags?: string[];
    },
  ): Promise<void> {
    await this.cacheToAllLayers(key, data, config.edgeTTL, config.workersTTL, config.etag, config.tags ?? []);
  }

  getStats(): { edge: CacheStats; workers: CacheStats; overall: CacheStats } {
    const edgeTotal = sharedStats.edgeHits + sharedStats.edgeMisses;
    const workersTotal = sharedStats.workersHits + sharedStats.workersMisses;
    const overallHits = sharedStats.edgeHits + sharedStats.workersHits;
    const overallMisses = sharedStats.edgeMisses + sharedStats.workersMisses;

    return {
      edge: {
        hits: sharedStats.edgeHits,
        misses: sharedStats.edgeMisses,
        hitRate: edgeTotal === 0 ? 0 : (sharedStats.edgeHits / edgeTotal) * 100,
        layer: CacheLayer.EDGE,
      },
      workers: {
        hits: sharedStats.workersHits,
        misses: sharedStats.workersMisses,
        hitRate: workersTotal === 0 ? 0 : (sharedStats.workersHits / workersTotal) * 100,
        layer: CacheLayer.WORKERS,
      },
      overall: {
        hits: overallHits,
        misses: overallMisses,
        hitRate: overallHits + overallMisses === 0 ? 0 : (overallHits / (overallHits + overallMisses)) * 100,
        layer: CacheLayer.EDGE,
      },
    };
  }

  private async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    strategy: CacheStrategy,
    providedEtag?: string,
    tags: string[] = [],
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    const lookupStartedAt = this.now();
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult) {
      sharedStats.workersHits++;
      return {
        data: memoryResult.data,
        etag: memoryResult.etag,
        meta: this.createMeta('workers-memory', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }
    sharedStats.workersMisses++;

    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult) {
      sharedStats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag, tags);
      return {
        ...edgeResult,
        meta: this.createMeta('edge', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }
    sharedStats.edgeMisses++;

    return this.fetchAndCache(
      key,
      fetcher,
      edgeTTL,
      workersTTL,
      strategy,
      this.elapsedSince(lookupStartedAt),
      providedEtag,
      tags,
    );
  }

  private async networkFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    strategy: CacheStrategy,
    providedEtag?: string,
    tags: string[] = [],
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    try {
      return await this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, strategy, 0, providedEtag, tags);
    } catch (error) {
      console.warn('[CacheManager] Network-first fallback triggered:', error);

      const memoryResult = this.memoryCache.get<T>(key);
      if (memoryResult) {
        return {
          data: memoryResult.data,
          etag: memoryResult.etag,
          meta: this.createMeta('workers-memory', key, strategy, edgeTTL, workersTTL, {}),
        };
      }

      const edgeResult = await this.getFromEdgeCache<T>(key);
      if (edgeResult) {
        return {
          ...edgeResult,
          meta: this.createMeta('edge', key, strategy, edgeTTL, workersTTL, {}),
        };
      }

      throw error;
    }
  }

  private async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    strategy: CacheStrategy,
    providedEtag?: string,
    tags: string[] = [],
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    const lookupStartedAt = this.now();
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult) {
      sharedStats.workersHits++;
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag, tags);
      return {
        data: memoryResult.data,
        etag: memoryResult.etag,
        meta: this.createMeta('workers-memory', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }
    sharedStats.workersMisses++;

    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult) {
      sharedStats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag, tags);
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag, tags);
      return {
        ...edgeResult,
        meta: this.createMeta('edge', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }
    sharedStats.edgeMisses++;

    return this.fetchAndCache(
      key,
      fetcher,
      edgeTTL,
      workersTTL,
      strategy,
      this.elapsedSince(lookupStartedAt),
      providedEtag,
      tags,
    );
  }

  private async cacheOnly<T>(
    key: string,
    edgeTTL: number,
    workersTTL: number,
    strategy: CacheStrategy,
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    const lookupStartedAt = this.now();
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult) {
      return {
        data: memoryResult.data,
        etag: memoryResult.etag,
        meta: this.createMeta('workers-memory', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }

    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult) {
      return {
        ...edgeResult,
        meta: this.createMeta('edge', key, strategy, edgeTTL, workersTTL, {
          lookupMs: this.elapsedSince(lookupStartedAt),
          totalMs: this.elapsedSince(lookupStartedAt),
        }),
      };
    }

    throw new Error('Cache miss with CACHE_ONLY strategy');
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    strategy: CacheStrategy,
    lookupMs: number,
    providedEtag?: string,
    tags: string[] = [],
  ): Promise<{ data: T; etag?: string; meta: CacheFetchMeta }> {
    const originStartedAt = this.now();
    const data = await fetcher();
    const originMs = this.elapsedSince(originStartedAt);
    const resolvedEtag = providedEtag || this.generateEtag(data);
    const writeStartedAt = this.now();
    await this.cacheToAllLayers(key, data, edgeTTL, workersTTL, resolvedEtag, tags);
    const writeMs = this.elapsedSince(writeStartedAt);
    return {
      data,
      etag: resolvedEtag,
      meta: this.createMeta('origin', key, strategy, edgeTTL, workersTTL, {
        lookupMs,
        originMs,
        writeMs,
        totalMs: Number((lookupMs + originMs + writeMs).toFixed(1)),
      }),
    };
  }

  private async cacheToAllLayers<T>(
    key: string,
    data: T,
    edgeTTL: number,
    workersTTL: number,
    etag?: string,
    tags: string[] = [],
  ): Promise<void> {
    this.memoryCache.set(key, data, workersTTL, etag, tags);
    await this.setToEdgeCache(key, data, edgeTTL, etag, tags);
  }

  private backgroundUpdate<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    etag?: string,
    tags: string[] = [],
  ): void {
    fetcher()
      .then((data) => this.cacheToAllLayers(key, data, edgeTTL, workersTTL, etag || this.generateEtag(data), tags))
      .catch((error) => console.error('[CacheManager] Background update failed:', error));
  }

  private async getFromEdgeCache<T>(key: string): Promise<{ data: T; etag?: string } | null> {
    try {
      const response = await this.edgeCache.match(this.createEdgeRequest(key));
      if (!response) {
        return null;
      }

      return {
        data: (await response.json()) as T,
        etag: response.headers.get('ETag') || undefined,
      };
    } catch (error) {
      console.error('[CacheManager] Edge cache get failed:', error);
      return null;
    }
  }

  private async setToEdgeCache<T>(
    key: string,
    data: T,
    ttl: number,
    etag?: string,
    tags: string[] = [],
  ): Promise<void> {
    try {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttl}`,
        'X-Cache-Key': key,
      });

      if (etag) {
        headers.set('ETag', etag);
      }

      if (tags.length > 0) {
        headers.set('Cache-Tag', tags.join(','));
      }

      await this.edgeCache.put(
        this.createEdgeRequest(key),
        new Response(JSON.stringify(data), { headers }),
      );

      sharedEdgeKeys.set(key, new Set(tags));
    } catch (error) {
      console.error('[CacheManager] Edge cache set failed:', error);
    }
  }

  private buildCacheKey(request: Request): string {
    const url = new URL(request.url);
    const params = Array.from(url.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    });

    const queryString = new URLSearchParams(params).toString();
    return queryString ? `${url.pathname}?${queryString}` : url.pathname;
  }

  private createEdgeRequest(key: string): Request {
    return new Request(`https://cache.local/__cftrack/${encodeURIComponent(key)}`);
  }

  private generateEtag(data: unknown): string {
    const serialized = JSON.stringify(data);
    let hash = 0;

    for (let index = 0; index < serialized.length; index++) {
      hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
    }

    return `W/"cache-${Math.abs(hash).toString(36)}"`;
  }

  private createMeta(
    source: CacheFetchSource,
    key: string,
    strategy: CacheStrategy,
    edgeTTL: number,
    workersTTL: number,
    values: Partial<Omit<CacheFetchMeta, 'source' | 'key' | 'strategy' | 'edgeTTL' | 'workersTTL'>>,
  ): CacheFetchMeta {
    return {
      source,
      key,
      strategy,
      edgeTTL,
      workersTTL,
      lookupMs: values.lookupMs ?? 0,
      originMs: values.originMs ?? 0,
      writeMs: values.writeMs ?? 0,
      totalMs: values.totalMs ?? 0,
    };
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private elapsedSince(startedAt: number): number {
    return Number(Math.max(0, this.now() - startedAt).toFixed(1));
  }
}
