/**
 * @fileoverview Click Log API 路由
 * @description 处理点击日志相关的 HTTP 请求，包括列表查询、详情获取和实时 SSE 流
 * @module services/tracking/clickLog.routes
 * 
 * 输入: HTTP 请求（查询参数、路径参数）
 * 输出: HTTP 响应（JSON 数据或 SSE 流）
 * 逻辑交互: 
 *   - 调用 ClickRepository 查询点击数据
 *   - 支持分页、筛选、排序等功能
 * 前后端交互: 
 *   - GET /api/clicks - 返回点击日志列表
 *   - GET /api/clicks/:id - 返回单条点击详情
 *   - GET /api/clicks/stream - SSE 实时点击流
 */

import { Hono } from 'hono';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { getD1Connection } from '@/handlers/d1';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createClickLogRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/clicks
   * 获取点击日志列表（支持分页、筛选）
   */
  router.get('/', async (c) => {
    try {
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);

      const page = parseInt(c.req.query('page') || '1');
      const pageSize = Math.min(parseInt(c.req.query('pageSize') || '20'), 100);

      const params = {
        page,
        pageSize,
        campaignId: c.req.query('campaignId') || undefined,
        startDate: c.req.query('startDate') || undefined,
        endDate: c.req.query('endDate') || undefined,
        country: c.req.query('country') || undefined,
        device: c.req.query('device') || undefined,
        browser: c.req.query('browser') || undefined,
        os: c.req.query('os') || undefined,
        ip: c.req.query('ip') || undefined,
        visitorId: c.req.query('visitorId') || undefined,
        offerId: c.req.query('offerId') || undefined,
        flowId: c.req.query('flowId') || undefined,
        isUnique: c.req.query('isUnique') ? c.req.query('isUnique') === 'true' : undefined,
        search: c.req.query('search') || undefined,
      };

      const result = await clickRepo.findClicks(params);

      return c.json(success(result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      }));
    } catch (err) {
      console.error('[ClickLog] Failed to fetch clicks:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch clicks',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/clicks/stats
   * 获取点击统计概览
   */
  router.get('/stats', async (c) => {
    try {
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);

      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const campaignId = c.req.query('campaignId') || undefined;

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const stats = await clickRepo.getClickStats(startDate, endDate, campaignId);

      return c.json(success(stats));
    } catch (err) {
      console.error('[ClickLog] Failed to fetch stats:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch stats',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/clicks/:id
   * 获取单条点击详情
   */
  router.get('/:id', async (c) => {
    try {
      const clickId = c.req.param('id');
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);

      const click = await clickRepo.findByClickId(clickId);

      if (!click) {
        return c.json(
          error('Click not found', ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }

      return c.json(success(click));
    } catch (err) {
      console.error('[ClickLog] Failed to fetch click:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch click',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/clicks/visitor/:visitorId
   * 获取指定访客的所有点击记录
   */
  router.get('/visitor/:visitorId', async (c) => {
    try {
      const visitorId = c.req.param('visitorId');
      const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
      
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);

      const clicks = await clickRepo.findByVisitorId(visitorId, limit);

      return c.json(success(clicks));
    } catch (err) {
      console.error('[ClickLog] Failed to fetch visitor clicks:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch visitor clicks',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
