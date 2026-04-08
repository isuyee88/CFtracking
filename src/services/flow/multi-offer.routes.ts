/**
 * @fileoverview Multi-offer API 路由
 * @description 处理 Multi-offer 相关的 HTTP 请求
 * @module services/flow/multi-offer.routes
 * @input HTTP Request
 * @output JSON Response
 * @logic 路由处理 -> MultiOfferService -> Response
 * @frontend API 调用
 * @backend MultiOfferService
 */

import { Hono } from 'hono';
import { MultiOfferService } from './multi-offer.service';
import { success, error } from '@/utils/response';
import { validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { AllocationStrategy } from '@/types/multi-offer';

export function createMultiOfferRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * 获取 Flow 的所有 Multi-offers
   */
  router.get('/flow/:flowId', async (c) => {
    const flowId = c.req.param('flowId');
    const service = new MultiOfferService(c.env);
    const offers = await service.getFlowOffers(flowId);
    return c.json(success(offers));
  });

  /**
   * 获取单个 Multi-offer 详情
   */
  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new MultiOfferService(c.env);

    try {
      const offer = await service.getById(id);
      return c.json(success(offer));
    } catch (err) {
      if (err instanceof Error && err.message === 'Multi-offer not found') {
        return c.json(error('Multi-offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 添加 Offer 到 Flow（增强版）
   */
  router.post('/', async (c) => {
    const body = await c.req.json();

    const flowValidation = validateRequired(body.flowId, 'flowId');
    if (!flowValidation.valid) {
      return c.json(error(flowValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const offerValidation = validateRequired(body.offerId, 'offerId');
    if (!offerValidation.valid) {
      return c.json(error(offerValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    // 验证 allocationStrategy
    const validStrategies: AllocationStrategy[] = ['weight', 'random', 'priority', 'round-robin'];
    if (body.allocationStrategy && !validStrategies.includes(body.allocationStrategy)) {
      return c.json(error('Invalid allocationStrategy', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new MultiOfferService(c.env);

    try {
      const result = await service.addOffer(body);
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message === 'Offer not found') {
        return c.json(error('Offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message === 'Offer already exists in this flow') {
        return c.json(error('Offer already exists in this flow', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  /**
   * 更新 Multi-offer
   */
  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    // 验证 allocationStrategy
    const validStrategies: AllocationStrategy[] = ['weight', 'random', 'priority', 'round-robin'];
    if (body.allocationStrategy && !validStrategies.includes(body.allocationStrategy)) {
      return c.json(error('Invalid allocationStrategy', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new MultiOfferService(c.env);

    try {
      const result = await service.update(id, body);
      return c.json(success(result));
    } catch (err) {
      if (err instanceof Error && err.message === 'Multi-offer not found') {
        return c.json(error('Multi-offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 批量更新 Multi-offers
   */
  router.put('/batch', async (c) => {
    const body = await c.req.json();

    const flowValidation = validateRequired(body.flowId, 'flowId');
    if (!flowValidation.valid) {
      return c.json(error(flowValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!body.offers || !Array.isArray(body.offers) || body.offers.length === 0) {
      return c.json(error('offers is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new MultiOfferService(c.env);

    try {
      const results = await service.batchUpdate(body);
      return c.json(success(results));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 删除 Multi-offer
   */
  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new MultiOfferService(c.env);

    try {
      await service.remove(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Multi-offer not found') {
        return c.json(error('Multi-offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 从 Flow 移除 Offer
   */
  router.delete('/flow/:flowId/offer/:offerId', async (c) => {
    const flowId = c.req.param('flowId');
    const offerId = c.req.param('offerId');
    const service = new MultiOfferService(c.env);

    await service.removeFromFlow(flowId, offerId);
    return c.json(success({ removed: true }));
  });

  /**
   * 获取 Multi-offer 统计数据
   */
  router.get('/:id/stats', async (c) => {
    const id = c.req.param('id');
    const service = new MultiOfferService(c.env);

    try {
      const stats = await service.getStats(id);
      return c.json(success(stats));
    } catch (err) {
      if (err instanceof Error && err.message === 'Multi-offer not found') {
        return c.json(error('Multi-offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 获取 Flow 下所有 Multi-offer 统计
   */
  router.get('/flow/:flowId/stats', async (c) => {
    const flowId = c.req.param('flowId');
    const service = new MultiOfferService(c.env);
    const stats = await service.getFlowStats(flowId);
    return c.json(success(stats));
  });

  /**
   * 重置统计数据
   */
  router.post('/:id/reset-stats', async (c) => {
    const id = c.req.param('id');
    const service = new MultiOfferService(c.env);

    try {
      await service.resetStats(id);
      return c.json(success({ reset: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Multi-offer not found') {
        return c.json(error('Multi-offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 批量设置启用状态
   */
  router.post('/batch/enable', async (c) => {
    const body = await c.req.json();

    const flowValidation = validateRequired(body.flowId, 'flowId');
    if (!flowValidation.valid) {
      return c.json(error(flowValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!body.offerIds || !Array.isArray(body.offerIds) || body.offerIds.length === 0) {
      return c.json(error('offerIds is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new MultiOfferService(c.env);
    const count = await service.batchSetEnabled(body.flowId, body.offerIds, body.enabled !== false);
    return c.json(success({ updated: count }));
  });

  /**
   * 获取 Multi-offer 配置摘要
   */
  router.get('/flow/:flowId/summary', async (c) => {
    const flowId = c.req.param('flowId');
    const service = new MultiOfferService(c.env);

    try {
      const summary = await service.getConfigSummary(flowId);
      return c.json(success(summary));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 获取达到转化限制的 Offers
   */
  router.get('/flow/:flowId/at-limit', async (c) => {
    const flowId = c.req.param('flowId');
    const service = new MultiOfferService(c.env);
    const offers = await service.getOffersAtConversionLimit(flowId);
    return c.json(success(offers));
  });

  return router;
}
