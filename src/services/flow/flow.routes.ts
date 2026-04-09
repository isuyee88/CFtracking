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
import { FlowLogService } from './flow.log.service';
import { FlowValidator } from './flow.validator';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { FlowStatus } from '@/types/flow';
import { getAvailableOperators, getAvailableTargets } from '@/utils/flow.filters';

export function createFlowRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      campaignId: c.req.query('campaignId') || undefined,
      status: c.req.query('status') || undefined,
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new FlowService(c.env);
    const result = await service.getList({
      page,
      pageSize,
      campaignId: query.campaignId,
      status: query.status,
    });

    return c.json(
      success(result.list, {
        page,
        pageSize,
        total: result.total,
      })
    );
  });

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

  // ==================== Flow Statistics ====================

  /**
   * 获取 Flow 统计数据
   */
  router.get('/:id/stats', async (c) => {
    const id = c.req.param('id');
    const service = new FlowService(c.env);
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const query: { startDate?: string; endDate?: string } = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    try {
      const stats = await service.getFlowStats(id, Object.keys(query).length > 0 ? query : undefined);
      return c.json(success(stats));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 获取 Campaign 下所有 Flow 的统计数据
   */
  router.get('/campaign/:campaignId/stats', async (c) => {
    const campaignId = c.req.param('campaignId');
    const service = new FlowService(c.env);
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const query: { startDate?: string; endDate?: string } = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    const stats = await service.getCampaignFlowStats(campaignId, Object.keys(query).length > 0 ? query : undefined);
    return c.json(success(stats));
  });

  // ==================== Flow Traffic Logs ====================

  /**
   * 获取 Flow 执行日志
   */
  router.get('/:id/logs', async (c) => {
    const flowId = c.req.param('id');
    const logService = new FlowLogService(c.env);
    
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const result = await logService.query({
      flowId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return c.json(success(result));
  });

  /**
   * 获取 Campaign 的流量日志
   */
  router.get('/campaign/:campaignId/logs', async (c) => {
    const campaignId = c.req.param('campaignId');
    const logService = new FlowLogService(c.env);
    
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const result = await logService.query({
      campaignId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return c.json(success(result));
  });

  /**
   * 获取单个日志详情
   */
  router.get('/logs/:logId', async (c) => {
    const logId = c.req.param('logId');
    const logService = new FlowLogService(c.env);

    const log = await logService.getById(logId);
    if (!log) {
      return c.json(error('Log not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(log));
  });

  /**
   * 清除 Flow 的所有日志
   */
  router.delete('/:id/logs', async (c) => {
    const flowId = c.req.param('id');
    const logService = new FlowLogService(c.env);

    const deleted = await logService.clearFlowLogs(flowId);
    return c.json(success({ deleted }));
  });

  // ==================== Batch Operations ====================

  /**
   * 批量更新 Flow 状态或权重
   */
  router.post('/batch', async (c) => {
    const body = await c.req.json();
    const { flowIds, action, value } = body;

    if (!flowIds || !Array.isArray(flowIds) || flowIds.length === 0) {
      return c.json(error('flowIds is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);
    const results: { flowId: string; success: boolean; error?: string }[] = [];

    for (const flowId of flowIds) {
      try {
        if (action === 'updateStatus') {
          await service.update(flowId, { status: value as FlowStatus });
        } else if (action === 'updateWeight') {
          await service.update(flowId, { weight: value as number });
        } else if (action === 'delete') {
          await service.delete(flowId);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }
        results.push({ flowId, success: true });
      } catch (err) {
        results.push({ flowId, success: false, error: (err as Error).message });
      }
    }

    return c.json(success({ results }));
  });

  /**
   * 均衡 Flow 权重
   */
  router.post('/equalize', async (c) => {
    const body = await c.req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return c.json(error('campaignId is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new FlowService(c.env);
    const flows = await service.getByCampaignId(campaignId);
    const activeFlows = flows.filter(f => f.status === 'active' && f.type !== 'default');

    if (activeFlows.length === 0) {
      return c.json(success({ message: 'No active flows to equalize' }));
    }

    const equalWeight = Math.floor(100 / activeFlows.length);
    const remainder = 100 % activeFlows.length;

    const results: { flowId: string; newWeight: number }[] = [];
    
    for (let i = 0; i < activeFlows.length; i++) {
      const flow = activeFlows[i]!;
      const newWeight = equalWeight + (i < remainder ? 1 : 0);
      await service.update(flow.id, { weight: newWeight });
      results.push({ flowId: flow.id, newWeight });
    }

    return c.json(success({ results }));
  });

  /**
   * 克隆 Flow
   */
  router.post('/:id/clone', async (c) => {
    const flowId = c.req.param('id');
    const service = new FlowService(c.env);

    try {
      const clonedFlow = await service.clone(flowId);
      return c.json(success(clonedFlow));
    } catch (err) {
      if (err instanceof Error && err.message === 'Flow not found') {
        return c.json(error('Flow not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
