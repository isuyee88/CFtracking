/**
 * @fileoverview Click Log API 路由
 * @description 处理点击日志相关的 HTTP 请求，使用 DO 和 D1 数据源
 * @module services/tracking/clickLog.routes
 * 
 * 数据源策略:
 * - 实时数据: 从 TrackingStatsDO 查询
 * - 历史数据: 从 D1 数据库查询
 * 
 * 输入: HTTP 请求（查询参数、路径参数）
 * 输出: HTTP 响应（JSON 数据）
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
   * 
   * 数据源选择:
   * - 所有数据: D1 数据库
   * - startDate < 3个月前: D1 数据库
   */
  router.get('/', async (c) => {
    try {
      const page = parseInt(c.req.query('page') || '1');
      const pageSize = Math.min(parseInt(c.req.query('pageSize') || '20'), 100);
      const startDate = c.req.query('startDate') || new Date().toISOString().split('T')[0];
      const endDate = c.req.query('endDate') || new Date().toISOString().split('T')[0];

      const params = {
        page,
        pageSize,
        campaignId: c.req.query('campaignId') || undefined,
        startDate,
        endDate,
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

      // Use D1 database for all queries
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);
      const result = await clickRepo.findClicks(params);

      return c.json(success(result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        // total 为 null（请求页码越界）时不再派生页数，避免 NaN。
        totalPages: result.total === null ? null : Math.ceil(result.total / result.pageSize),
        hasMore: result.hasMore,
        totalCapped: result.totalCapped,
        totalIsApproximate: result.totalIsApproximate,
        pageOutOfRange: result.pageOutOfRange,
        dataSource: 'd1_database',
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
   *
   * 时间窗由 stats-query 归一化：缺失/非法回退最近 7 天（rangeDefaulted=true），
   * 超过 90 天截断（rangeCapped=true）；聚合最多读 STATS_ROW_LIMIT 行。
   * 可选 `topN`（1..50）请求 byCountry/byDevice 分组，分组 SQL 自带 LIMIT。
   */
  router.get('/stats', async (c) => {
    try {
      const startDate = c.req.query('startDate') || undefined;
      const endDate = c.req.query('endDate') || undefined;
      const campaignId = c.req.query('campaignId') || undefined;
      const topN = c.req.query('topN') || undefined;

      // Use D1 database for all queries
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);
      const stats = await clickRepo.getClickStats(startDate, endDate, campaignId, { topN });

      return c.json(success({
        ...stats,
        dataSource: 'd1_database',
      }));
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
