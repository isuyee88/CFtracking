/**
 * @fileoverview 数据获取客户端
 * @description 提供支持数据验证和增量更新的 API 客户端
 * @module services/data-client
 *
 * 功能:
 *   - 支持数据验证（时间戳、版本号、哈希值）
 *   - 支持增量更新
 *   - 支持批量请求
 *   - 自动缓存管理
 *
 * 输入: API 请求参数
 * 输出: 数据响应
 */

import type { DataMetadata } from '@/context/DataCacheContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface CacheEntry {
  data: any;
  metadata: DataMetadata;
}

class DataClient {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * 获取缓存元数据
   */
  private getCacheMetadata(key: string): DataMetadata | null {
    const entry = this.cache.get(key);
    return entry?.metadata || null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any, metadata: DataMetadata): void {
    this.cache.set(key, { data, metadata });
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string, maxAge?: number): boolean {
    const metadata = this.getCacheMetadata(key);
    if (!metadata) return false;

    const age = Date.now() - metadata.timestamp;
    const ttl = maxAge || metadata.ttl;
    return age < ttl;
  }

  /**
   * 通用数据获取方法
   */
  async fetchData<T>(
    endpoint: string,
    options?: {
      cacheKey?: string;
      ttl?: number;
      forceRefresh?: boolean;
    }
  ): Promise<{ data: T; metadata: DataMetadata; fromCache: boolean }> {
    const cacheKey = options?.cacheKey || endpoint;
    const ttl = options?.ttl || 5 * 60 * 1000; // 默认5分钟

    // 检查缓存有效性
    if (!options?.forceRefresh && this.isCacheValid(cacheKey, ttl)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`[DataClient] Using cached data for ${cacheKey}`);
      return {
        data: cached.data,
        metadata: cached.metadata,
        fromCache: true,
      };
    }

    // 检查是否有正在进行的请求（避免重复请求）
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`[DataClient] Waiting for pending request: ${cacheKey}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 添加验证标识（用于增量更新）
    const cachedMetadata = this.getCacheMetadata(cacheKey);
    if (cachedMetadata && !options?.forceRefresh) {
      headers['If-Modified-Since'] = cachedMetadata.timestamp.toString();
      headers['If-None-Match'] = cachedMetadata.hash;
      headers['X-Data-Version'] = cachedMetadata.version;
    }

    // 发起请求
    const requestPromise = this.executeRequest<T>(endpoint, headers, cacheKey, ttl);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * 执行 HTTP 请求
   */
  private async executeRequest<T>(
    endpoint: string,
    headers: Record<string, string>,
    cacheKey: string,
    ttl: number
  ): Promise<{ data: T; metadata: DataMetadata; fromCache: boolean }> {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`[DataClient] Fetching ${url}`);

    const response = await fetch(url, { headers });

    // 从响应头提取元数据
    const metadata: DataMetadata = {
      timestamp: parseInt(response.headers.get('Last-Modified') || Date.now().toString(), 10),
      version: response.headers.get('X-Data-Version') || '1.0.0',
      hash: response.headers.get('ETag') || '',
      source: 'API',
      ttl,
      lastAccessed: Date.now(),
    };

    // 处理 304 Not Modified
    if (response.status === 304) {
      console.log(`[DataClient] Data not modified, using cache for ${cacheKey}`);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          metadata,
          fromCache: true,
        };
      }
    }

    // 处理其他响应
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const data = result.data || result;

    // 更新缓存
    this.setCache(cacheKey, data, metadata);

    return {
      data,
      metadata,
      fromCache: false,
    };
  }

  /**
   * 批量获取数据
   */
  async fetchBatch<T extends Record<string, any>>(
    types: string[],
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<{ data: T; metadata: Record<string, DataMetadata> }> {
    const url = `${API_BASE_URL}/api/data/batch`;

    console.log(`[DataClient] Batch fetching: ${types.join(', ')}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ types }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const data = result.data || {};
    const metadata = result.metadata || {};

    // 更新缓存
    for (const type of types) {
      if (data[type] && metadata[type]) {
        this.setCache(type, data[type], {
          ...metadata[type],
          source: 'API',
          lastAccessed: Date.now(),
        });
      }
    }

    return { data, metadata };
  }

  /**
   * 获取 Dashboard 数据
   */
  async getDashboard(timeRange?: string, options?: { ttl?: number; forceRefresh?: boolean }) {
    const endpoint = `/api/data/dashboard${timeRange ? `?timeRange=${timeRange}` : ''}`;
    return this.fetchData(endpoint, {
      cacheKey: 'dashboard',
      ttl: options?.ttl || 60 * 1000, // 1分钟
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 获取 Campaigns 数据
   */
  async getCampaigns(options?: { ttl?: number; forceRefresh?: boolean }) {
    return this.fetchData('/api/data/campaigns', {
      cacheKey: 'campaigns',
      ttl: options?.ttl || 5 * 60 * 1000,
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 获取 Landings 数据
   */
  async getLandings(options?: { ttl?: number; forceRefresh?: boolean }) {
    return this.fetchData('/api/data/landings', {
      cacheKey: 'landings',
      ttl: options?.ttl || 5 * 60 * 1000,
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 获取 Offers 数据
   */
  async getOffers(options?: { ttl?: number; forceRefresh?: boolean }) {
    return this.fetchData('/api/data/offers', {
      cacheKey: 'offers',
      ttl: options?.ttl || 5 * 60 * 1000,
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 获取 Clicks 数据（支持分页）
   */
  async getClicks(page: number = 1, pageSize: number = 20, options?: { ttl?: number; forceRefresh?: boolean }) {
    const endpoint = `/api/data/clicks?page=${page}&pageSize=${pageSize}`;
    return this.fetchData(endpoint, {
      cacheKey: `clicks-${page}-${pageSize}`,
      ttl: options?.ttl || 30 * 1000, // 30秒
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 获取 Conversions 数据（支持分页）
   */
  async getConversions(page: number = 1, pageSize: number = 20, options?: { ttl?: number; forceRefresh?: boolean }) {
    const endpoint = `/api/data/conversions?page=${page}&pageSize=${pageSize}`;
    return this.fetchData(endpoint, {
      cacheKey: `conversions-${page}-${pageSize}`,
      ttl: options?.ttl || 30 * 1000, // 30秒
      forceRefresh: options?.forceRefresh,
    });
  }

  /**
   * 清除缓存
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): Record<string, { valid: boolean; age: number; ttl: number }> {
    const status: Record<string, { valid: boolean; age: number; ttl: number }> = {};
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      const age = now - entry.metadata.timestamp;
      status[key] = {
        valid: age < entry.metadata.ttl,
        age,
        ttl: entry.metadata.ttl,
      };
    }

    return status;
  }
}

export const dataClient = new DataClient();

export default dataClient;
