/**
 * @fileoverview Landing Page 预加载 API 路由
 * @description 处理 Landing Page 预加载相关的 HTTP 请求
 * @module services/landingPage/lp.preload.routes
 * 
 * @input HTTP Request
 * @output JSON Response
 * @logic 路由处理 -> LPPreloadService -> Response
 * @frontend API 调用
 * @backend LPPreloadService
 */

import { Hono } from 'hono';
import { LPPreloadService } from './lp.preload.service';
import { LandingPageService } from './lp.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createLPPreloadRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * 获取 Landing Page 预加载内容
   */
  router.get('/:id/content', async (c) => {
    const id = c.req.param('id');
    const lpService = new LandingPageService(c.env);
    const preloadService = new LPPreloadService(c.env);

    try {
      const lp = await lpService.getById(id);
      const result = await preloadService.getPreloadContent(id, lp.url);

      if (!result.success) {
        return c.json(error(result.error || 'Failed to fetch content', ERROR_CODES.EXTERNAL_API), HTTP_STATUS.INTERNAL_ERROR);
      }

      return c.json(success({
        content: result.content,
        contentType: result.contentType,
        contentSize: result.contentSize,
        cached: result.cached,
        fetchTime: result.fetchTime,
      }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 强制刷新预加载缓存
   */
  router.post('/:id/refresh', async (c) => {
    const id = c.req.param('id');
    const lpService = new LandingPageService(c.env);
    const preloadService = new LPPreloadService(c.env);

    try {
      const lp = await lpService.getById(id);
      const result = await preloadService.refreshCache(id, lp.url);

      if (!result.success) {
        return c.json(error(result.error || 'Failed to refresh cache', ERROR_CODES.EXTERNAL_API), HTTP_STATUS.INTERNAL_ERROR);
      }

      return c.json(success({
        content: result.content,
        contentType: result.contentType,
        contentSize: result.contentSize,
        fetchTime: result.fetchTime,
      }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 清除预加载缓存
   */
  router.delete('/:id/cache', async (c) => {
    const id = c.req.param('id');
    const preloadService = new LPPreloadService(c.env);

    await preloadService.clearCache(id);
    return c.json(success({ cleared: true }));
  });

  /**
   * 获取缓存状态
   */
  router.get('/:id/status', async (c) => {
    const id = c.req.param('id');
    const preloadService = new LPPreloadService(c.env);

    const status = await preloadService.getCacheStatus(id);
    return c.json(success(status));
  });

  /**
   * 获取缓存统计
   */
  router.get('/:id/stats', async (c) => {
    const id = c.req.param('id');
    const preloadService = new LPPreloadService(c.env);

    const stats = await preloadService.getCacheStats(id);
    if (!stats) {
      return c.json(success({
        cacheHits: 0,
        cacheMisses: 0,
        totalRequests: 0,
        avgResponseTime: 0,
      }));
    }

    return c.json(success(stats));
  });

  /**
   * 重置统计
   */
  router.post('/:id/reset-stats', async (c) => {
    const id = c.req.param('id');
    const preloadService = new LPPreloadService(c.env);

    await preloadService.resetStats(id);
    return c.json(success({ reset: true }));
  });

  /**
   * 批量预加载
   */
  router.post('/batch', async (c) => {
    const body = await c.req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json(error('items is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const preloadService = new LPPreloadService(c.env);
    const results = await preloadService.batchPreload(body.items);

    const summary = {
      total: body.items.length,
      success: 0,
      failed: 0,
      cached: 0,
    };

    results.forEach((result) => {
      if (result.success) {
        summary.success++;
        if (result.cached) summary.cached++;
      } else {
        summary.failed++;
      }
    });

    return c.json(success({
      summary,
      results: Object.fromEntries(results),
    }));
  });

  /**
   * 清理过期缓存
   */
  router.post('/cleanup', async (c) => {
    const preloadService = new LPPreloadService(c.env);
    const deleted = await preloadService.cleanupExpiredCache();
    return c.json(success({ deleted }));
  });

  return router;
}
