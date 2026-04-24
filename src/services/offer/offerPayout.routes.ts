/**
 * @fileoverview Offer Payout API 路由
 * @description 提供 Offer 支付相关的 HTTP 接口
 * @module services/offer/offerPayout.routes
 */

import { Hono } from 'hono';
import { createOfferPayoutService } from './offerPayout.service';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export function registerOfferPayoutRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => createOfferPayoutService(env);

  // 计算支付预览
  router.post('/offers/:id/payout-preview', async (c) => {
    const env = c.env;
    try {
      const { basePayout, rules, context } = await c.req.json();
      const result = service(env).calculatePayout(basePayout, rules, context);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to calculate payout', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 检查转化上限
  router.get('/offers/:id/cap-check', async (c) => {
    const env = c.env;
    const offerId = c.req.param('id');
    const dailyCap = parseInt(c.req.query('dailyCap') || '0');
    const totalCap = parseInt(c.req.query('totalCap') || '0');

    try {
      const result = await service(env).checkConversionCap(offerId, dailyCap, totalCap);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to check cap', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取转化统计
  router.get('/offers/:id/conversion-stats', async (c) => {
    const env = c.env;
    const offerId = c.req.param('id');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    try {
      const stats = await service(env).getConversionStats(offerId, startDate, endDate);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get stats', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 更新支付规则
  router.put('/offers/:id/payout-rules', async (c) => {
    const env = c.env;
    const offerId = c.req.param('id');
    try {
      const { rules } = await c.req.json();
      await service(env).updatePayoutRules(offerId, rules);
      return c.json(success({ updated: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update rules', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 更新转化上限
  router.put('/offers/:id/conversion-cap', async (c) => {
    const env = c.env;
    const offerId = c.req.param('id');
    try {
      const { dailyCap, totalCap } = await c.req.json();
      await service(env).updateConversionCap(offerId, dailyCap, totalCap);
      return c.json(success({ updated: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update cap', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}

export default registerOfferPayoutRoutes();
