/**
 * @fileoverview 数据聚合 API 路由
 * @description 提供手动触发数据聚合的 HTTP 接口
 * @module services/analytics/aggregation.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { createAggregationService } from './aggregation.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

export function createAggregationRouter() {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * POST /api/analytics/aggregate
   * 手动触发每日数据聚合
   */
  router.post('/aggregate', async (c) => {
    try {
      const body = await c.req.json<{ date?: string }>();
      const aggregationService = createAggregationService(c.env);

      const result = await aggregationService.aggregateDailyData(body?.date);

      if (result.success) {
        return c.json(success({
          message: result.message,
          recordsProcessed: result.recordsProcessed,
        }));
      } else {
        return c.json(error(
          result.message,
          'AGGREGATION_ERROR',
          { errors: result.errors }
        ), HTTP_STATUS.INTERNAL_ERROR);
      }
    } catch (err) {
      console.error('[Aggregation API] Error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Aggregation failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/analytics/aggregate/historical
   * 手动触发历史数据聚合
   */
  router.post('/aggregate/historical', async (c) => {
    try {
      const body = await c.req.json<{ startDate: string; endDate: string }>();

      if (!body.startDate || !body.endDate) {
        return c.json(
          error('startDate and endDate are required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const aggregationService = createAggregationService(c.env);
      const result = await aggregationService.aggregateHistoricalData(
        body.startDate,
        body.endDate
      );

      if (result.success) {
        return c.json(success({
          message: result.message,
          recordsProcessed: result.recordsProcessed,
          dateRange: { start: body.startDate, end: body.endDate },
        }));
      } else {
        return c.json(error(
          result.message,
          'AGGREGATION_ERROR',
          { errors: result.errors }
        ), HTTP_STATUS.INTERNAL_ERROR);
      }
    } catch (err) {
      console.error('[Aggregation API] Historical aggregation error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Historical aggregation failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/status
   * 获取聚合状态（预留接口）
   */
  router.get('/status', async (c) => {
    return c.json(success({
      status: 'active',
      message: 'Analytics aggregation service is running',
      timestamp: new Date().toISOString(),
    }));
  });

  return router;
}
