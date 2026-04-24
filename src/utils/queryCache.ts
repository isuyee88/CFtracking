/**
 * @fileoverview 查询结果缓存工具
 * @description 为D1查询提供内存级缓存，减少重复数据库查询
 * @module utils/queryCache
 *
 * 输入: 缓存键、查询函数、TTL配置
 * 输出: 缓存命中返回缓存数据，未命中执行查询并缓存结果
 * 逻辑交互: 被Repository层调用，缓存查询结果
 * 前后端交互: 无直接交互，通过API响应间接影响性能
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
}

interface QueryCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
}

export class QueryCache {
  private static instance: QueryCache;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  private constructor(maxSize = 200, defaultTTL = 60) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const ttl = ttlSeconds ?? this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  getStats(): QueryCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total === 0 ? 0 : (this.stats.hits / total) * 100,
      size: this.cache.size,
      evictions: this.stats.evictions,
    };
  }

  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const score = entry.hitCount / Math.max(1, (Date.now() - entry.createdAt) / 1000);
      if (score < lowestHits || (score === lowestHits && entry.createdAt < oldestTime)) {
        lowestHits = score;
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

export function buildQueryCacheKey(table: string, params: object): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  const parts = entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return `query:${table}:${parts.join('&')}`;
}
