/**
 * @fileoverview 缓存中间件
 * @description 为所有API路由添加缓存支持，集成Cache-Tag批量失效和统一缓存配置
 * @module middleware/cache-middleware
 *
 * 输入: Request对象
 * 输出: Response对象(优先从缓存读取，附带Cache-Tag响应头)
 * 逻辑交互: 集成UnifiedCacheManager + cache-config统一配置
 * 前后端交互: 作为中间件包装所有API处理器，通过HTTP响应头暴露缓存状态
 */

import type { Context, Next } from 'hono';
import type { Env } from '@/config/env';
import { UnifiedCacheManager, CacheStrategy, CacheConfig } from '@/services/cache/unified-cache-manager';
import { getCacheTagForPath, getCacheTTLForPath } from '@/config/cache-config';

export interface CacheMiddlewareConfig {
  enabled: boolean;
  defaultStrategy: CacheStrategy;
  defaultEdgeTTL: number;
  defaultWorkersTTL: number;
  excludePaths: string[];
  forceRefreshHeader?: string;
}

const DEFAULT_CONFIG: CacheMiddlewareConfig = {
  enabled: true,
  defaultStrategy: CacheStrategy.CACHE_FIRST,
  defaultEdgeTTL: 300,
  defaultWorkersTTL: 60,
  excludePaths: [
    '/api/auth',
    '/api/webhook',
    '/api/cache-update',
  ],
};

export function createCacheMiddleware(config: Partial<CacheMiddlewareConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (!finalConfig.enabled) {
      return next();
    }

    const request = c.req.raw;
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (finalConfig.excludePaths.some(path => pathname.startsWith(path))) {
      return next();
    }

    if (request.method !== 'GET') {
      return next();
    }

    const forceRefresh = request.headers.get(finalConfig.forceRefreshHeader || 'X-Force-Refresh') === 'true';
    const cacheConfig = getCacheConfig(pathname, finalConfig, forceRefresh);
    const cacheManager = new UnifiedCacheManager(c.env);

    try {
      const result = await cacheManager.fetch(
        request,
        async () => {
          await next();
          const response = c.res;

          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          return await response.json();
        },
        cacheConfig,
      );

      const response = c.json(result.data);

      if (result.meta) {
        response.headers.set('X-Cache-Source', result.meta.source);
        response.headers.set('X-Cache-TTL', result.meta.edgeTTL.toString());
      }

      return response;
    } catch (error) {
      console.error('[CacheMiddleware] Error:', error);
      return next();
    }
  };
}

function getCacheConfig(
  pathname: string,
  defaultConfig: CacheMiddlewareConfig,
  forceRefresh: boolean,
): CacheConfig {
  const tag = getCacheTagForPath(pathname);
  const ttlConfig = getCacheTTLForPath(pathname);

  if (pathname.includes('/dashboard') || pathname.includes('/analytics')) {
    return {
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      edgeTTL: ttlConfig.edge,
      workersTTL: ttlConfig.workers,
      forceRefresh,
      tags: tag ? [tag] : [],
    };
  }

  if (pathname.match(/\/(campaigns|offers|flows|landings)$/)) {
    return {
      strategy: CacheStrategy.CACHE_FIRST,
      edgeTTL: ttlConfig.edge,
      workersTTL: ttlConfig.workers,
      forceRefresh,
      tags: tag ? [tag] : [],
    };
  }

  if (pathname.match(/\/(campaigns|offers|flows|landings)\/[\w-]+$/)) {
    return {
      strategy: CacheStrategy.CACHE_FIRST,
      edgeTTL: ttlConfig.edge,
      workersTTL: ttlConfig.workers,
      forceRefresh,
      tags: tag ? [tag] : [],
    };
  }

  if (pathname.includes('/stats') || pathname.includes('/reports')) {
    return {
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      edgeTTL: ttlConfig.edge,
      workersTTL: ttlConfig.workers,
      forceRefresh,
      tags: tag ? [tag] : [],
    };
  }

  if (pathname.includes('/clicks') || pathname.includes('/conversions')) {
    return {
      strategy: CacheStrategy.CACHE_FIRST,
      edgeTTL: ttlConfig.edge,
      workersTTL: ttlConfig.workers,
      forceRefresh,
      tags: tag ? [tag] : [],
    };
  }

  return {
    strategy: defaultConfig.defaultStrategy,
    edgeTTL: defaultConfig.defaultEdgeTTL,
    workersTTL: defaultConfig.defaultWorkersTTL,
    forceRefresh,
    tags: tag ? [tag] : [],
  };
}

export function createCacheStatsMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next();

    const cacheManager = new UnifiedCacheManager(c.env);
    const stats = cacheManager.getStats();

    c.res.headers.set('X-Cache-Hit-Rate', stats.overall.hitRate.toFixed(2));
    c.res.headers.set('X-Cache-Edge-Hits', stats.edge.hits.toString());
    c.res.headers.set('X-Cache-Workers-Hits', stats.workers.hits.toString());
  };
}

export function createCacheWarmupMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const request = c.req.raw;
    const url = new URL(request.url);

    if (url.searchParams.get('warmup') === 'true') {
      console.log('[CacheWarmup] Warmup request detected');
    }

    await next();
  };
}

export function createCacheTagInvalidationHandler() {
  return async (c: Context<{ Bindings: Env }>) => {
    const body = await c.req.json<{ tags?: string[] }>().catch(() => ({ tags: [] }));
    const { tags = [] } = body;

    if (tags.length === 0) {
      return c.json({ success: false, error: 'No tags provided' }, 400);
    }

    const cacheManager = new UnifiedCacheManager(c.env);
    const invalidatedCount = await cacheManager.invalidateByTags(tags);

    return c.json({
      success: true,
      invalidatedCount,
      tags,
    });
  };
}
