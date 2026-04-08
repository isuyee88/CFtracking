/**
 * @fileoverview Traffic Source 参数映射 API 路由
 * @description 提供参数映射相关的 HTTP 接口
 * @module services/trafficSource/paramMapping.routes
 */

import { Hono } from 'hono';
import { createParamMappingService } from './paramMapping.service';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export function registerParamMappingRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => createParamMappingService(env);

  // 获取模板列表
  router.get('/templates', async (c) => {
    const env = c.env;
    try {
      const templates = await service(env).getTemplates();
      return c.json(success(templates));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get templates', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取模板详情
  router.get('/templates/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const template = await service(env).getTemplateById(id);
      if (!template) {
        return c.json(error('Template not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      return c.json(success(template));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get template', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建自定义模板
  router.post('/templates', async (c) => {
    const env = c.env;
    try {
      const data = await c.req.json();
      const template = await service(env).createTemplate(data);
      return c.json(success(template), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to create template', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 应用模板到流量源
  router.post('/traffic-sources/:id/apply-template', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('id');
    try {
      const { templateId } = await c.req.json();
      await service(env).applyTemplateToTrafficSource(trafficSourceId, templateId);
      return c.json(success({ applied: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to apply template', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 验证参数
  router.post('/validate', async (c) => {
    const env = c.env;
    try {
      const { params, mapping } = await c.req.json();
      const result = service(env).validateParameters(params, mapping);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to validate', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 生成跟踪 URL
  router.post('/generate-url', async (c) => {
    const env = c.env;
    try {
      const { campaignId, trafficSourceId, mapping, customParams } = await c.req.json();
      const url = service(env).generateTrackingUrl(campaignId, trafficSourceId, mapping, customParams);
      return c.json(success({ url }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate URL', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 更新参数映射
  router.put('/traffic-sources/:id/mapping', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('id');
    try {
      const { mapping } = await c.req.json();
      await service(env).updateParameterMapping(trafficSourceId, mapping);
      return c.json(success({ updated: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update mapping', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}

export default registerParamMappingRoutes();
