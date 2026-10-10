/**
 * @fileoverview Domain 校验 API 路由
 * @description 处理 Domain 校验相关的 HTTP 请求
 * @module services/domain/domain.validation.routes
 * 
 * @input HTTP Request
 * @output JSON Response
 * @logic 路由处理 -> DomainValidationService -> Response
 * @frontend API 调用
 * @backend DomainValidationService
 */

import { Hono } from 'hono';
import { DomainValidationService } from './domain.validation.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createDomainValidationRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * 验证单个域名
   */
  router.post('/:id/validate', async (c) => {
    const id = c.req.param('id');
    const service = new DomainValidationService(c.env);

    try {
      const result = await service.validateDomain(id);
      return c.json(success(result));
    } catch (err) {
      if (err instanceof Error && err.message === 'Domain not found') {
        return c.json(error('Domain not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * 批量验证域名
   */
  router.post('/batch-validate', async (c) => {
    const body = await c.req.json();

    if (!body.domainIds || !Array.isArray(body.domainIds) || body.domainIds.length === 0) {
      return c.json(error('domainIds is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new DomainValidationService(c.env);
    const results = await service.validateDomains(body.domainIds);

    const summary = {
      total: body.domainIds.length,
      valid: results.filter(r => r.zoneStatus === 'valid' && r.sslStatus === 'valid').length,
      invalid: results.filter(r => r.zoneStatus === 'invalid' || r.sslStatus === 'invalid').length,
      error: results.filter(r => r.zoneStatus === 'error').length,
    };

    return c.json(success({ summary, results }));
  });

  /**
   * 获取需要校验的域名列表
   */
  router.get('/pending', async (c) => {
    const service = new DomainValidationService(c.env);
    const domains = await service.getDomainsNeedingValidation();
    return c.json(success(domains));
  });

  /**
   * 获取校验历史
   */
  router.get('/:id/history', async (c) => {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '10');
    const service = new DomainValidationService(c.env);

    const history = await service.getValidationHistory(id, limit);
    return c.json(success(history));
  });

  /**
   * 获取最新校验结果
   */
  router.get('/:id/status', async (c) => {
    const id = c.req.param('id');
    const service = new DomainValidationService(c.env);

    const result = await service.getLatestValidation(id);
    if (!result) {
      return c.json(error('Domain not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(result));
  });

  /**
   * 清除校验缓存
   */
  router.delete('/:id/cache', async (c) => {
    const id = c.req.param('id');
    const service = new DomainValidationService(c.env);

    await service.clearValidationCache(id);
    return c.json(success({ cleared: true }));
  });

  return router;
}
