/**
 * @fileoverview ETag缓存管理器
 * @description 实现基于ETag和版本号的智能缓存策略,支持分层缓存(静态30天/历史24小时/实时5分钟)
 * @module services/cache/etag-cache-manager
 * 
 * 输入: 数据 + 缓存配置
 * 输出: ETag响应 + 304 Not Modified
 * 逻辑交互: 协调浏览器缓存、边缘缓存、Workers内存缓存
 * 前后端交互: 通过HTTP头(ETag, If-None-Match, Cache-Control)与浏览器交互
 */

import type { Env } from '@/config/env';
import { UnifiedCacheManager, CacheKeyBuilder } from './unified-cache-manager';

/**
 * 缓存类型枚举
 */
export enum CacheType {
  STATIC = 'static',       // 静态资源: 30天
  HISTORICAL = 'historical', // 历史数据: 24小时
  RECENT = 'recent',       // 近期数据: 6小时
  REALTIME = 'realtime',   // 实时数据: 5分钟
}

/**
 * 缓存配置映射
 */
export const CACHE_CONFIGS = {
  [CacheType.STATIC]: {
    maxAge: 2592000,      // 30天
    swr: 2592000,         // 30天SWR
    immutable: true,      // 永不变化
    description: '静态资源(JS/CSS/图片)',
  },
  [CacheType.HISTORICAL]: {
    maxAge: 86400,        // 24小时
    swr: 172800,          // 2天SWR
    immutable: false,
    description: '历史数据(昨天及之前,不再变化)',
  },
  [CacheType.RECENT]: {
    maxAge: 21600,        // 6小时
    swr: 43200,           // 12小时SWR
    immutable: false,
    description: '近期数据(过去7天/30天,基本稳定)',
  },
  [CacheType.REALTIME]: {
    maxAge: 300,          // 5分钟
    swr: 600,             // 10分钟SWR
    immutable: false,
    description: '实时数据(今天,频繁变化)',
  },
};

/**
 * ETag生成器
 */
export class ETagGenerator {
  /**
   * 生成ETag
   * 格式: W/"{version}-{hash}"
   * 排除timestamp字段以确保ETag稳定
   */
  static generate(data: any, version?: string): string {
    const hash = this.hashData(this.excludeTimestamp(data));
    const ver = version || Date.now().toString();
    return `W/"${ver}-${hash}"`;
  }
  
  /**
   * 排除时间戳字段
   */
  private static excludeTimestamp(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const { timestamp, ...rest } = data;
    return rest;
  }
  
  /**
   * 数据哈希
   */
  private static hashData(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 验证ETag
   */
  static matches(requestETag: string | null, currentETag: string): boolean {
    if (!requestETag) return false;
    
    // 处理W/前缀
    const normalizedRequest = requestETag.replace(/^W\//, '');
    const normalizedCurrent = currentETag.replace(/^W\//, '');
    
    return normalizedRequest === normalizedCurrent;
  }
}

/**
 * ETag缓存管理器
 */
export class ETagCacheManager {
  private cacheManager: UnifiedCacheManager;
  
  constructor(private env: Env) {
    this.cacheManager = new UnifiedCacheManager(env);
  }
  
  /**
   * 处理请求,返回ETag响应
   */
  async fetch<T>(
    request: Request,
    fetcher: () => Promise<T>,
    options: {
      cacheType: CacheType;
      cacheKey?: string;
      version?: string;
    }
  ): Promise<Response> {
    const { cacheType, cacheKey, version } = options;
    const config = CACHE_CONFIGS[cacheType];
    
    // 获取或生成缓存键
    const key = cacheKey || this.buildCacheKey(request);
    
    // 检查客户端ETag
    const clientETag = request.headers.get('If-None-Match');
    
    // 尝试从缓存获取数据（包含ETag）
    const cachedResult = await this.cacheManager.fetch(
      request,
      fetcher,
      {
        strategy: 'cache-first',
        cacheKey: key,
        edgeTTL: config.maxAge,
        workersTTL: Math.floor(config.maxAge / 2),
      }
    );
    
    // 生成或使用已有的ETag
    const currentETag = cachedResult.etag || ETagGenerator.generate(cachedResult.data, version);
    
    // 如果客户端ETag匹配，返回304
    if (clientETag && ETagGenerator.matches(clientETag, currentETag)) {
      return new Response(null, {
        status: 304,
        headers: this.buildCacheHeaders(config, currentETag),
      });
    }
    
    // 缓存已变化或首次请求，返回新数据
    return Response.json(cachedResult.data, {
      headers: this.buildCacheHeaders(config, currentETag),
    });
  }
  
  /**
   * 构建缓存响应头
   */
  private buildCacheHeaders(config: typeof CACHE_CONFIGS[CacheType], etag: string): Headers {
    const headers = new Headers();
    
    // Cache-Control
    const directives = [
      'public',
      `max-age=${config.maxAge}`,
      `stale-while-revalidate=${config.swr}`,
    ];
    
    if (config.immutable) {
      directives.push('immutable');
    }
    
    headers.set('Cache-Control', directives.join(', '));
    
    // ETag
    headers.set('ETag', etag);
    
    // 其他缓存相关头
    headers.set('Vary', 'Accept-Encoding');
    
    return headers;
  }
  
  /**
   * 构建缓存键
   */
  private buildCacheKey(request: Request): string {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  }
  
  /**
   * 根据数据特征自动判断缓存类型
   */
  static inferCacheType(pathname: string, dateRange?: string): CacheType {
    // 静态资源
    if (/\.(js|css|png|jpg|svg|ico|woff2|ttf)$/i.test(pathname)) {
      return CacheType.STATIC;
    }
    
    // Dashboard数据
    if (pathname.includes('/dashboard') || pathname.includes('/analytics')) {
      if (dateRange === 'today') {
        return CacheType.REALTIME;
      }
      if (dateRange === 'last7days' || dateRange === 'last30days') {
        return CacheType.RECENT;
      }
      // 历史数据(昨天及之前)
      return CacheType.HISTORICAL;
    }
    
    // 统计数据
    if (pathname.includes('/stats')) {
      if (dateRange === 'today') {
        return CacheType.REALTIME;
      }
      return CacheType.RECENT;
    }
    
    // 实体列表/详情
    if (pathname.match(/\/(campaigns|offers|flows|landings)/)) {
      return CacheType.RECENT;
    }
    
    // 默认近期数据
    return CacheType.RECENT;
  }
}

/**
 * 创建ETag缓存中间件
 */
export function createETagCacheMiddleware(env: Env) {
  const manager = new ETagCacheManager(env);
  
  return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 仅处理GET请求
    if (request.method !== 'GET') {
      return next();
    }
    
    // 排除特定路径
    const excludePaths = ['/api/auth', '/api/webhook', '/api/cache'];
    if (excludePaths.some(path => pathname.startsWith(path))) {
      return next();
    }
    
    // 推断缓存类型
    const dateRange = url.searchParams.get('range') || undefined;
    const cacheType = ETagCacheManager.inferCacheType(pathname, dateRange);
    
    // 使用ETag缓存管理器
    return manager.fetch(
      request,
      async () => {
        const response = await next();
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return await response.json();
      },
      { cacheType }
    );
  };
}
