/**
 * @fileoverview Flow Rule API 路由
 * @description 提供 Flow 规则相关的 HTTP 接口
 * @module services/flow/flowRule.routes
 */

import { Hono } from 'hono';
import { createFlowRuleEngine } from './flowRule.engine';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export function registerFlowRuleRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const engine = (env: Env) => createFlowRuleEngine(env);

  // 获取 Flow 的所有规则
  router.get('/flows/:flowId/rules', async (c) => {
    const env = c.env;
    const flowId = c.req.param('flowId');
    try {
      const rules = await engine(env).getFlowRules(flowId);
      return c.json(success(rules));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get rules', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取单个规则
  router.get('/rules/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const rule = await engine(env).getRuleById(id);
      if (!rule) {
        return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      return c.json(success(rule));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建规则
  router.post('/flows/:flowId/rules', async (c) => {
    const env = c.env;
    const flowId = c.req.param('flowId');
    try {
      const data = await c.req.json();
      const rule = await engine(env).createRule(flowId, data);
      return c.json(success(rule), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to create rule', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 更新规则
  router.put('/rules/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const data = await c.req.json();
      const rule = await engine(env).updateRule(id, data);
      return c.json(success(rule));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update rule', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 删除规则
  router.delete('/rules/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      await engine(env).deleteRule(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete rule', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 测试规则
  router.post('/rules/:id/test', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const testData = await c.req.json();
      const result = await engine(env).testRule(id, testData);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to test rule', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 匹配 Flow
  router.post('/flows/:flowId/match', async (c) => {
    const env = c.env;
    const flowId = c.req.param('flowId');
    try {
      const context = await c.req.json();
      const result = await engine(env).matchFlow(flowId, context);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to match flow', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}

export default registerFlowRuleRoutes();
