/**
 * @fileoverview 规则 API 路由
 * @description 处理规则相关的 HTTP 请求
 * @module services/rule/rule.routes
 */

import { Hono } from 'hono';
import { RuleRepository } from '@/handlers/d1/rule.repo';
import { RuleEngine } from './engine';
import { success, error } from '@/utils/response';
import { validateRequired, validatePagination } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { CreateRuleDTO, UpdateRuleDTO } from '@/types/rule';

export function createRuleRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      type: c.req.query('type'),
      status: c.req.query('status'),
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const repo = new RuleRepository(c.env.DB);
    const result = await repo.findList({ page, pageSize, type: query.type, status: query.status });

    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total,
    }));
  });

  router.get('/enabled', async (c) => {
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findEnabled();
    return c.json(success(rules));
  });

  router.get('/type/:type', async (c) => {
    const type = c.req.param('type');
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findByType(type);
    return c.json(success(rules));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.findById(id);

    if (!rule) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(rule));
  });

  router.get('/:id/history', async (c) => {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    const repo = new RuleRepository(c.env.DB);
    const history = await repo.getExecutionHistory(id, limit);
    return c.json(success(history));
  });

  router.post('/', async (c) => {
    const body = await c.req.json() as CreateRuleDTO;

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const typeValidation = validateRequired(body.type, 'type');
    if (!typeValidation.valid) {
      return c.json(error(typeValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!body.conditions || body.conditions.length === 0) {
      return c.json(error('At least one condition is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!body.actions || body.actions.length === 0) {
      return c.json(error('At least one action is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.create(body);
    return c.json(success(rule), HTTP_STATUS.CREATED);
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as UpdateRuleDTO;
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, body);
    return c.json(success(rule));
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    await repo.update(id, { status: 'deleted' });
    return c.json(success({ deleted: true }));
  });

  router.post('/:id/enable', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, { enabled: true });
    return c.json(success(rule));
  });

  router.post('/:id/disable', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, { enabled: false });
    return c.json(success(rule));
  });

  router.post('/:id/evaluate', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);
    const engine = new RuleEngine(c.env);

    const rule = await repo.findById(id);
    if (!rule) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const triggered = await engine.evaluateRule(rule);
    return c.json(success({ triggered }));
  });

  router.post('/evaluate-all', async (c) => {
    const engine = new RuleEngine(c.env);
    await engine.evaluateAllRules();
    return c.json(success({ message: 'All rules evaluated' }));
  });

  return router;
}
