/**
 * @fileoverview 缓存中间件
 * @description 为所有API路由添加缓存支持,实现客户端请求100%读取缓存
 * @module middleware/cache-middleware
 * 
 * 输入: Request对象
 * 输出: Response对象(优先从缓存读取)
 * 逻辑交互: 集成UnifiedCacheManager
 * 前后端交互: 作为中间件包装所有API处理器
 */

import type { Context, Next } from 'hono';
import type { Env } from '@/config/env';
import { UnifiedCacheManager, CacheStrategy, CacheConfig } from '@/services/cache/unified-cache-manager';

/**
 * 缓存中间件配置
 */
export interface CacheMiddlewareConfig {
  enabled: boolean;
  defaultStrategy: CacheStrategy;
  defaultEdgeTTL: number;
  defaultWorkersTTL: number;
  excludePaths: string[];
  forceRefreshHeader?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: CacheMiddlewareConfig = {
  enabled: true,
  defaultStrategy: CacheStrategy.CACHE_FIRST,
  defaultEdgeTTL: 300,      // 5分钟
  defaultWorkersTTL: 60,    // 1分钟
  excludePaths: [
    '/api/auth',
    '/api/webhook',
    '/api/cache-update',
  ],
};

/**
 * 创建缓存中间件
 */
export function createCacheMiddleware(config: Partial<CacheMiddlewareConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // 检查是否启用缓存
    if (!finalConfig.enabled) {
      return next();
    }
    
    const request = c.req.raw;
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 检查是否在排除路径中
    if (finalConfig.excludePaths.some(path => pathname.startsWith(path))) {
      return next();
    }
    
    // 仅缓存GET请求
    if (request.method !== 'GET') {
      return next();
    }
    
    // 检查强制刷新标志
    const forceRefresh = request.headers.get(finalConfig.forceRefreshHeader || 'X-Force-Refresh') === 'true';
    
    // 获取缓存配置
    const cacheConfig = getCacheConfig(pathname, finalConfig, forceRefresh);
    
    // 创建缓存管理器
    const cacheManager = new UnifiedCacheManager(c.env);
    
    try {
      // 使用缓存管理器获取数据
      const result = await cacheManager.fetch(
        request,
        async () => {
          // 执行实际的请求处理
          await next();
          const response = c.res;
          
          // 检查响应状态
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          
          return await response.json();
        },
        cacheConfig
      );
      
      // 返回缓存的数据
      return c.json(result.data);
      
    } catch (error) {
      console.error('[CacheMiddleware] Error:', error);
      
      // 缓存失败时降级到直接处理
      return next();
    }
  };
}

/**
 * 根据路径获取缓存配置
 */
function getCacheConfig(
  pathname: string,
  defaultConfig: CacheMiddlewareConfig,
  forceRefresh: boolean
): CacheConfig {
  // Dashboard数据: 短TTL,实时性要求高
  if (pathname.includes('/dashboard') || pathname.includes('/analytics')) {
    return {
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      edgeTTL: 60,      // 1分钟
      workersTTL: 30,   // 30秒
      forceRefresh,
    };
  }
  
  // 实体列表: 中等TTL
  if (pathname.match(/\/(campaigns|offers|flows|landings)$/)) {
    return {
      strategy: CacheStrategy.CACHE_FIRST,
      edgeTTL: 600,     // 10分钟
      workersTTL: 120,  // 2分钟
      forceRefresh,
    };
  }
  
  // 实体详情: 长TTL
  if (pathname.match(/\/(campaigns|offers|flows|landings)\/[\w-]+$/)) {
    return {
      strategy: CacheStrategy.CACHE_FIRST,
      edgeTTL: 1800,    // 30分钟
      workersTTL: 300,  // 5分钟
      forceRefresh,
    };
  }
  
  // 统计数据: 短TTL
  if (pathname.includes('/stats')) {
    return {
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      edgeTTL: 300,     // 5分钟
      workersTTL: 60,   // 1分钟
      forceRefresh,
    };
  }
  
  // 默认配置
  return {
    strategy: defaultConfig.defaultStrategy,
    edgeTTL: defaultConfig.defaultEdgeTTL,
    workersTTL: defaultConfig.defaultWorkersTTL,
    forceRefresh,
  };
}

/**
 * 缓存统计中间件
 */
export function createCacheStatsMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next();
    
    // 添加缓存统计头
    const cacheManager = new UnifiedCacheManager(c.env);
    const stats = cacheManager.getStats();
    
    c.res.headers.set('X-Cache-Hit-Rate', stats.overall.hitRate.toFixed(2));
    c.res.headers.set('X-Cache-Edge-Hits', stats.edge.hits.toString());
    c.res.headers.set('X-Cache-Workers-Hits', stats.workers.hits.toString());
  };
}

/**
 * 缓存预热中间件
 */
export function createCacheWarmupMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const request = c.req.raw;
    const url = new URL(request.url);
    
    // 检查是否是预热请求
    if (url.searchParams.get('warmup') === 'true') {
      console.log('[CacheWarmup] Warmup request detected');
    }
    
    await next();
  };
}
