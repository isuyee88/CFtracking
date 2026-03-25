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
import { getTrackingStatsStub } from '@/handlers/do';
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
   * - startDate >= 3个月前: Analytics Engine
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

      if (startDate && isWithinThreeMonths(startDate)) {
        const analyticsQuery = createAnalyticsQueryService(c.env);
        const aeResult = await analyticsQuery.getRecentClicks({
          limit: pageSize,
          campaignId: params.campaignId,
          country: params.country,
          device: params.device,
        });

        const formattedList = aeResult.list.map((item) => ({
          clickId: item.clickId,
          campaignId: item.campaignId,
          flowId: item.flowId,
          landingPageId: item.landingPageId,
          offerId: item.offerId,
          timestamp: item.timestamp,
          ip: item.ip,
          userAgent: '',
          referer: item.referer,
          country: item.country,
          city: item.city,
          device: item.device,
          browser: item.browser,
          os: item.os,
          isp: '',
          connectionType: null,
          visitorId: item.visitorId,
          subId1: item.subId1,
          subId2: item.subId2,
          subId3: item.subId3,
          cost: item.cost,
        }));

        return c.json(success(formattedList, {
          page,
          pageSize,
          total: aeResult.total,
          totalPages: Math.ceil(aeResult.total / pageSize),
          dataSource: 'analytics_engine',
        }));
      } else {
        const db = getD1Connection(c.env);
        const clickRepo = new ClickRepository(db);
        const result = await clickRepo.findClicks(params);

        return c.json(success(result.list, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
          dataSource: 'd1_database',
        }));
      }
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
   * 数据源选择:
   * - startDate >= 3个月前: Analytics Engine
   * - startDate < 3个月前: D1 数据库
   */
  router.get('/stats', async (c) => {
    try {
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const campaignId = c.req.query('campaignId') || undefined;

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      if (isWithinThreeMonths(startDate)) {
        const analyticsQuery = createAnalyticsQueryService(c.env);
        const aeResult = await analyticsQuery.getRecentClicks({
          limit: 1000,
          campaignId,
        });

        const uniqueVisitors = new Set(aeResult.list.map(c => c.visitorId)).size;
        const countries = new Set(aeResult.list.map(c => c.country)).size;
        const devices = new Set(aeResult.list.map(c => c.device)).size;

        return c.json(success({
          totalClicks: aeResult.total,
          uniqueClicks: uniqueVisitors,
          countries,
          deviceTypes: devices,
          dataSource: 'analytics_engine',
        }));
      } else {
        const db = getD1Connection(c.env);
        const clickRepo = new ClickRepository(db);
        const stats = await clickRepo.getClickStats(startDate, endDate, campaignId);

        return c.json(success({
          ...stats,
          dataSource: 'd1_database',
        }));
      }
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
