/**
 * @fileoverview Flow API 路由
 * @description 处理 Flow 相关的 HTTP 请求，包括规则管理
 * @module services/flow/flow.routes
 * @input HTTP Request
 * @output JSON Response
 * @logic 路由处理 -> Service -> Response
 * @frontend API 调用
 * @backend FlowService
 */

import { Hono } from 'hono';
import { FlowService } from './flow.service';
import { FlowValidator } from './flow.validator';
import { success, error } from '@/utils/response';
import { validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { getAvailableOperators, getAvailableTargets } from '@/utils/flow.filters';

export function createFlowRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/campaign/:campaignId', async (c) => {
    const campaignId = c.req.param('campaignId');
    const service = new FlowService(c.env);
    const flows = await service.getByCampaignId(campaignId);
    return c.json(success(flows));
  });

  router.get('/campaign/:campaignId/active', async (c) => {
    const campaignId = c.req.param('campaignId');
    const service = new FlowService(c.env);
    const flows = await service.getActiveByCampaignId(campaignId);
    return c.json(success(flows));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);

    try {
      const flow = await service.getById(id);
      return c.json(success(flow));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.get('/:id/landing-pages', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);
    const lps = await service.getLandingPages(id);
    return c.json(success(lps));
  });

  router.get('/:id/offers', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);
    const offers = await service.getOffers(id);
    return c.json(success(offers));
  });

  router.post('/', async (c) => {
    const body = await c.req.json();

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const campaignValidation = validateRequired(body.campaignId, 'campaignId');
    if (!campaignValidation.valid) {
      return c.json(error(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);

    try {
      const flow = await service.create(body);
      return c.json(success(flow), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new FlowService(c.env);

    try {
      const flow = await service.update(id, body);
      return c.json(success(flow));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);

    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/:id/landing-pages', async (c) => {
    const flowId = c.req.param('id');
    const body = await c.req.json();

    const lpValidation = validateRequired(body.landingPageId, 'landingPageId');
    if (!lpValidation.valid) {
      return c.json(error(lpValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);

    try {
      const result = await service.addLandingPage(flowId, body.landingPageId, body.weight);
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/:id/offers', async (c) => {
    const flowId = c.req.param('id');
    const body = await c.req.json();

    const offerValidation = validateRequired(body.offerId, 'offerId');
    if (!offerValidation.valid) {
      return c.json(error(offerValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);

    try {
      const result = await service.addOffer(flowId, body.offerId, body.weight);
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.delete('/:id/landing-pages/:landingPageId', async (c) => {
    const flowId = c.req.param('id');
    const landingPageId = c.req.param('landingPageId');
    const service = new FlowService(c.env);

    await service.removeLandingPage(flowId, landingPageId);
    return c.json(success({ removed: true }));
  });

  router.delete('/:id/offers/:offerId', async (c) => {
    const flowId = c.req.param('id');
    const offerId = c.req.param('offerId');
    const service = new FlowService(c.env);

    await service.removeOffer(flowId, offerId);
    return c.json(success({ removed: true }));
  });

  // ==================== Flow Schema & Rules ====================

  /**
   * 获取 Flow 完整 Schema
   */
  router.get('/:id/schema', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);

    const schema = await service.getFlowSchema(id);
    if (!schema) {
      return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(schema));
  });

  /**
   * 验证 Flow Schema
   */
  router.post('/validate-schema', async (c) => {
    const body = await c.req.json();
    const service = new FlowService(c.env);

    const result = service.validateSchema(body);
    return c.json(success(result));
  });

  /**
   * 测试 Flow 验证
   */
  router.post('/:id/test', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new FlowService(c.env);

    try {
      // 从请求构建上下文
      const context = FlowValidator.buildContext(c.req.raw, body.visitData || {});
      const result = await service.executeValidation(id, context);
      return c.json(success(result));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 获取 Flow 的所有规则
   */
  router.get('/:id/rules', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);

    const rules = await service.getFlowRules(id);
    return c.json(success(rules));
  });

  /**
   * 获取单个规则详情
   */
  router.get('/rules/:ruleId', async (c) => {
    const ruleId = c.req.param('ruleId');
    const service = new FlowService(c.env);

    const rule = await service.getRuleById(ruleId);
    if (!rule) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(rule));
  });

  /**
   * 创建 Flow 规则
   */
  router.post('/:id/rules', async (c) => {
    const flowId = c.req.param('id');
    const body = await c.req.json();

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const conditionValidation = validateRequired(body.condition, 'condition');
    if (!conditionValidation.valid) {
      return c.json(error(conditionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const actionValidation = validateRequired(body.action, 'action');
    if (!actionValidation.valid) {
      return c.json(error(actionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);

    try {
      const rule = await service.createRule({
        ...body,
        flowId,
      });
      return c.json(success(rule), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.startsWith('Invalid rule')) {
        return c.json(error(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  /**
   * 更新 Flow 规则
   */
  router.put('/rules/:ruleId', async (c) => {
    const ruleId = c.req.param('ruleId');
    const body = await c.req.json();
    const service = new FlowService(c.env);

    try {
      const rule = await service.updateRule(ruleId, body);
      return c.json(success(rule));
    } catch (err) {
      if (err instanceof Error && err.message === 'Rule not found') {
        return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 删除 Flow 规则
   */
  router.delete('/rules/:ruleId', async (c) => {
    const ruleId = c.req.param('ruleId');
    const service = new FlowService(c.env);

    try {
      await service.deleteRule(ruleId);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Rule not found') {
        return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 获取可用的过滤器操作符
   */
  router.get('/filters/operators', async (c) => {
    const operators = getAvailableOperators();
    return c.json(success(operators));
  });

  /**
   * 获取可用的过滤器目标
   */
  router.get('/filters/targets', async (c) => {
    const targets = getAvailableTargets();
    return c.json(success(targets));
  });

  return router;
}
