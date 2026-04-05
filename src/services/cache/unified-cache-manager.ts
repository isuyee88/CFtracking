/**
 * @fileoverview 统一缓存管理服务 (优化版 - 无KV)
 * @description 实现双层缓存架构(边缘缓存 + Workers缓存),移除KV避免免费版写入限制
 * @module services/cache/unified-cache-manager
 * 
 * 输入: Request对象 + 数据获取函数
 * 输出: Response对象(优先从缓存读取)
 * 逻辑交互: 协调边缘缓存、Workers内存缓存
 * 前后端交互: 通过中间件集成到所有API路由
 */

import type { Env } from '@/config/env';

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',           // 优先缓存,适用于静态数据
  NETWORK_FIRST = 'network-first',       // 优先网络,适用于实时数据
  STALE_WHILE_REVALIDATE = 'swr',        // 过期重验证,平衡性能与新鲜度
  CACHE_ONLY = 'cache-only',             // 仅缓存,适用于离线场景
}

/**
 * 缓存层级枚举
 */
export enum CacheLayer {
  EDGE = 'edge',       // 边缘缓存(Cloudflare Cache API)
  WORKERS = 'workers', // Workers内存缓存
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  strategy: CacheStrategy;
  edgeTTL?: number;      // 边缘缓存TTL(秒)
  workersTTL?: number;   // Workers内存缓存TTL(秒)
  cacheKey?: string;     // 自定义缓存键
  forceRefresh?: boolean; // 强制刷新缓存
  vary?: string[];       // 缓存变体(如语言、设备类型)
  etag?: string;         // ETag值
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  layer: CacheLayer;
}

/**
 * 缓存键构建器
 */
export class CacheKeyBuilder {
  private static readonly PREFIX = 'cftrack';
  private static readonly VERSION = 'v1';
  
  /**
   * 构建Dashboard缓存键
   */
  static dashboard(range: string): string {
    return `${this.PREFIX}:${this.VERSION}:dashboard:${range}`;
  }
  
  /**
   * 构建实体列表缓存键
   */
  static entityList(entity: string, page: number = 1, filters?: Record<string, any>): string {
    const filterHash = filters ? this.hashObject(filters) : 'all';
    return `${this.PREFIX}:${this.VERSION}:${entity}:list:page${page}:${filterHash}`;
  }
  
  /**
   * 构建实体详情缓存键
   */
  static entityDetail(entity: string, id: string): string {
    return `${this.PREFIX}:${this.VERSION}:${entity}:detail:${id}`;
  }
  
  /**
   * 构建统计缓存键
   */
  static stats(type: string, range: string): string {
    return `${this.PREFIX}:${this.VERSION}:stats:${type}:${range}`;
  }
  
  /**
   * 构建自定义缓存键
   */
  static custom(parts: string[]): string {
    return `${this.PREFIX}:${this.VERSION}:${parts.join(':')}`;
  }
  
  /**
   * 对象哈希
   */
  private static hashObject(obj: Record<string, any>): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Workers内存缓存
 */
class WorkersMemoryCache {
  private cache = new Map<string, MemoryCacheEntry>();
  private readonly maxSize = 100;
  
  get<T>(key: string): { data: T; etag?: string } | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    entry.lastAccessed = Date.now();
    return { data: entry.data as T, etag: entry.etag };
  }
  
  set<T>(key: string, data: T, ttl: number, etag?: string): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000,
      lastAccessed: Date.now(),
      etag,
    });
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest);
    }
  }
  
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

interface MemoryCacheEntry {
  data: any;
  expires: number;
  lastAccessed: number;
  etag?: string;  // ETag与缓存数据一起存储
}

/**
 * 统一缓存管理器 (优化版 - 无KV)
 */
export class UnifiedCacheManager {
  private edgeCache: Cache;
  private memoryCache: WorkersMemoryCache;
  private stats = {
    edgeHits: 0,
    edgeMisses: 0,
    workersHits: 0,
    workersMisses: 0,
  };
  
  constructor(_env: Env) {
    this.edgeCache = caches.default;
    this.memoryCache = new WorkersMemoryCache();
  }
  
  /**
   * 主缓存获取方法
   * 返回数据对象，包含data和etag
   */
  async fetch<T>(
    request: Request,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<{ data: T; etag?: string }> {
    const {
      strategy = CacheStrategy.CACHE_FIRST,
      edgeTTL = 300,
      workersTTL = 60,
      cacheKey,
      forceRefresh = false,
      etag: providedEtag,
    } = config;
    
    const key = cacheKey || this.buildCacheKey(request);
    
    // 强制刷新时跳过缓存
    if (forceRefresh) {
      return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
    }
    
    // 根据策略执行缓存逻辑
    switch (strategy) {
      case CacheStrategy.CACHE_FIRST:
        return this.cacheFirst(key, fetcher, edgeTTL, workersTTL, providedEtag);
      
      case CacheStrategy.NETWORK_FIRST:
        return this.networkFirst(key, fetcher, edgeTTL, workersTTL, providedEtag);
      
      case CacheStrategy.STALE_WHILE_REVALIDATE:
        return this.staleWhileRevalidate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      
      case CacheStrategy.CACHE_ONLY:
        return this.cacheOnly(key);
      
      default:
        const data = await fetcher();
        return { data, etag: providedEtag };
    }
  }
  
  /**
   * Cache-First策略
   */
  private async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    providedEtag?: string
  ): Promise<{ data: T; etag?: string }> {
    // 1. 尝试Workers内存缓存
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult !== null) {
      this.stats.workersHits++;
      return { data: memoryResult.data, etag: memoryResult.etag };
    }
    this.stats.workersMisses++;
    
    // 2. 尝试边缘缓存
    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult !== null) {
      this.stats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag);
      return { data: edgeResult.data, etag: edgeResult.etag };
    }
    this.stats.edgeMisses++;
    
    // 3. 回源获取并缓存
    return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
  }
  
  /**
   * Network-First策略
   */
  private async networkFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    providedEtag?: string
  ): Promise<{ data: T; etag?: string }> {
    try {
      const data = await fetcher();
      await this.cacheToAllLayers(key, data, edgeTTL, workersTTL, providedEtag);
      return { data, etag: providedEtag };
    } catch (error) {
      console.warn('[CacheManager] Network failed, fallback to cache:', error);
      
      // 降级到缓存
      const memoryResult = this.memoryCache.get<T>(key);
      if (memoryResult !== null) return { data: memoryResult.data, etag: memoryResult.etag };
      
      const edgeResult = await this.getFromEdgeCache<T>(key);
      if (edgeResult !== null) return { data: edgeResult.data, etag: edgeResult.etag };
      
      throw error;
    }
  }
  
  /**
   * Stale-While-Revalidate策略
   */
  private async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    providedEtag?: string
  ): Promise<{ data: T; etag?: string }> {
    // 尝试从缓存获取
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult !== null) {
      this.stats.workersHits++;
      // 后台更新(不阻塞响应)
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      return { data: memoryResult.data, etag: memoryResult.etag };
    }
    
    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult !== null) {
      this.stats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag);
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      return { data: edgeResult.data, etag: edgeResult.etag };
    }
    
    // 缓存未命中,直接获取
    return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
  }
  
  /**
   * Cache-Only策略
   */
  private async cacheOnly<T>(key: string): Promise<{ data: T; etag?: string }> {
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult !== null) return { data: memoryResult.data, etag: memoryResult.etag };
    
    const edgeResult = await this.getFromEdgeCache<T>(key);
    if (edgeResult !== null) return { data: edgeResult.data, etag: edgeResult.etag };
    
    throw new Error('Cache miss with CACHE_ONLY strategy');
  }
  
  /**
   * 获取数据并缓存到所有层
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    providedEtag?: string
  ): Promise<{ data: T; etag?: string }> {
    const data = await fetcher();
    await this.cacheToAllLayers(key, data, edgeTTL, workersTTL, providedEtag);
    return { data, etag: providedEtag };
  }
  
  /**
   * 缓存到所有层
   */
  private async cacheToAllLayers<T>(
    key: string,
    data: T,
    edgeTTL: number,
    workersTTL: number,
    etag?: string
  ): Promise<void> {
    // Workers内存缓存
    this.memoryCache.set(key, data, workersTTL, etag);
    
    // 边缘缓存
    await this.setToEdgeCache(key, data, edgeTTL, etag);
  }
  
  /**
   * 后台更新
   */
  private backgroundUpdate<T>(
    key: string,
    fetcher: () => Promise<T>,
    edgeTTL: number,
    workersTTL: number,
    etag?: string
  ): void {
    // 使用Promise但不等待,实现后台更新
    fetcher()
      .then(data => this.cacheToAllLayers(key, data, edgeTTL, workersTTL, etag))
      .catch(error => console.error('[CacheManager] Background update failed:', error));
  }
  
  /**
   * 从边缘缓存获取
   */
  private async getFromEdgeCache<T>(key: string): Promise<{ data: T; etag?: string } | null> {
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      const response = await this.edgeCache.match(request);
      
      if (!response) return null;
      
      const etag = response.headers.get('X-Cached-ETag') || undefined;
      const data = await response.json() as T;
      return { data, etag };
    } catch (error) {
      console.error('[CacheManager] Edge cache get failed:', error);
      return null;
    }
  }
  
  /**
   * 设置到边缘缓存
   */
  private async setToEdgeCache<T>(key: string, data: T, ttl: number, etag?: string): Promise<void> {
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
        'CF-Cache-Status': 'HIT',
      };
      if (etag) {
        headers['X-Cached-ETag'] = etag;
      }
      const response = new Response(JSON.stringify(data), { headers });
      
      await this.edgeCache.put(request, response);
    } catch (error) {
      console.error('[CacheManager] Edge cache set failed:', error);
    }
  }
  
  /**
   * 构建缓存键
   */
  private buildCacheKey(request: Request): string {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  }
  
  /**
   * 失效缓存
   */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      await this.edgeCache.delete(request);
    } catch (error) {
      console.error('[CacheManager] Edge cache delete failed:', error);
    }
  }
  
  /**
   * 批量失效缓存
   */
  async invalidateBatch(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.invalidate(key)));
  }
  
  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      await this.edgeCache.delete(new Request('https://cache.example.com/*'), { ignoreMethod: true });
    } catch (error) {
      console.error('[CacheManager] Edge cache clear failed:', error);
    }
  }
  
  /**
   * 获取缓存统计
   */
  getStats(): {
    edge: CacheStats;
    workers: CacheStats;
    overall: CacheStats;
  } {
    const edgeTotal = this.stats.edgeHits + this.stats.edgeMisses;
    const workersTotal = this.stats.workersHits + this.stats.workersMisses;
    const overallHits = this.stats.edgeHits + this.stats.workersHits;
    const overallMisses = this.stats.edgeMisses + this.stats.workersMisses;
    
    return {
      edge: {
        hits: this.stats.edgeHits,
        misses: this.stats.edgeMisses,
        hitRate: edgeTotal > 0 ? (this.stats.edgeHits / edgeTotal) * 100 : 0,
        layer: CacheLayer.EDGE,
      },
      workers: {
        hits: this.stats.workersHits,
        misses: this.stats.workersMisses,
        hitRate: workersTotal > 0 ? (this.stats.workersHits / workersTotal) * 100 : 0,
        layer: CacheLayer.WORKERS,
      },
      overall: {
        hits: overallHits,
        misses: overallMisses,
        hitRate: (overallHits + overallMisses) > 0 ? (overallHits / (overallHits + overallMisses)) * 100 : 0,
        layer: CacheLayer.EDGE,
      },
    };
  }
}
