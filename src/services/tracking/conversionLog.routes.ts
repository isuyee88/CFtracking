/**
 * @fileoverview Conversion Log API 路由
 * @description 处理转化日志相关的 HTTP 请求，包括列表查询、详情获取和统计
 * @module services/tracking/conversionLog.routes
 * 
 * 输入: HTTP 请求（查询参数、路径参数）
 * 输出: HTTP 响应（JSON 数据）
 * 逻辑交互: 
 *   - 调用 ConversionRepository 查询转化数据
 *   - 支持分页、筛选等功能
 * 前后端交互: 
 *   - GET /api/conversions - 返回转化日志列表
 *   - GET /api/conversions/:id - 返回单条转化详情
 *   - GET /api/conversions/stats - 返回转化统计数据
 */

import { Hono } from 'hono';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { getD1Connection } from '@/handlers/d1';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createConversionLogRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/conversions
   * 获取转化日志列表（支持分页、筛选）
   */
  router.get('/', async (c) => {
    try {
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);

      const page = parseInt(c.req.query('page') || '1');
      const pageSize = Math.min(parseInt(c.req.query('pageSize') || '20'), 100);

      const params = {
        page,
        pageSize,
        campaignId: c.req.query('campaignId') || undefined,
        offerId: c.req.query('offerId') || undefined,
        startDate: c.req.query('startDate') || undefined,
        endDate: c.req.query('endDate') || undefined,
        status: c.req.query('status') || undefined,
        country: c.req.query('country') || undefined,
        device: c.req.query('device') || undefined,
        search: c.req.query('search') || undefined,
      };

      const result = await conversionRepo.findConversions(params);

      return c.json(success(result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      }));
    } catch (err) {
      console.error('[ConversionLog] Failed to fetch conversions:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch conversions',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/conversions/stats
   * 获取转化统计概览
   */
  router.get('/stats', async (c) => {
    try {
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);

      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const campaignId = c.req.query('campaignId') || undefined;

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const stats = await conversionRepo.getConversionStats(startDate, endDate, campaignId);

      return c.json(success(stats));
    } catch (err) {
      console.error('[ConversionLog] Failed to fetch stats:', err);
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
   * GET /api/conversions/:id
   * 获取单条转化详情
   */
  router.get('/:id', async (c) => {
    try {
      const conversionId = c.req.param('id');
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);

      const conversion = await conversionRepo.findByConversionId(conversionId);

      if (!conversion) {
        return c.json(
          error('Conversion not found', ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }

      return c.json(success(conversion));
    } catch (err) {
      console.error('[ConversionLog] Failed to fetch conversion:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch conversion',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/conversions/click/:clickId
   * 根据 clickId 获取转化记录
   */
  router.get('/click/:clickId', async (c) => {
    try {
      const clickId = c.req.param('clickId');
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);

      const conversions = await conversionRepo.findByClickId(clickId);

      return c.json(success(conversions));
    } catch (err) {
      console.error('[ConversionLog] Failed to fetch conversions by click:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to fetch conversions',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * PUT /api/conversions/:id/status
   * 更新转化状态
   */
  router.put('/:id/status', async (c) => {
    try {
      const conversionId = c.req.param('id');
      const body = await c.req.json();
      const { status } = body;

      if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
        return c.json(
          error('Invalid status. Must be approved, pending, or rejected', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);

      const success_update = await conversionRepo.updateStatus(conversionId, status);

      if (!success_update) {
        return c.json(
          error('Conversion not found or update failed', ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }

      return c.json(success({ updated: true, conversionId, status }));
    } catch (err) {
      console.error('[ConversionLog] Failed to update status:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to update status',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
