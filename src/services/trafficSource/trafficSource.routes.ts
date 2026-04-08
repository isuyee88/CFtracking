/**
 * @fileoverview Traffic Source API 路由
 * @description 处理 Traffic Source 相关的 HTTP 请求
 * @module services/trafficSource/trafficSource.routes
 */

import { Hono } from 'hono';
import { TrafficSourceService } from './trafficSource.service';
import { testApiConnection } from '@/services/platform/api-tester';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createTrafficSourceRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      withStats: c.req.query('withStats') === 'true',
      startDate: c.req.query('startDate') || undefined,
      endDate: c.req.query('endDate') || undefined,
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new TrafficSourceService(c.env);
    
    // Use getListWithStats if withStats=true
    const result = query.withStats 
      ? await service.getListWithStats(page, pageSize, query.startDate, query.endDate)
      : await service.getList(page, pageSize);

    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total,
    }));
  });

  router.get('/active', async (c) => {
    const service = new TrafficSourceService(c.env);
    const sources = await service.getActive();
    return c.json(success(sources));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const withStats = c.req.query('withStats') === 'true';
    const startDate = c.req.query('startDate') || undefined;
    const endDate = c.req.query('endDate') || undefined;
    const service = new TrafficSourceService(c.env);

    try {
      // Use getDetail if withStats=true
      const ts = withStats 
        ? await service.getDetail(id, startDate, endDate)
        : await service.getById(id);
      return c.json(success(ts));
    } catch (err) {
      if (err instanceof Error && err.message === 'Traffic Source not found') {
        return c.json(error('Traffic Source not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/', async (c) => {
    const body = await c.req.json();

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new TrafficSourceService(c.env);

    try {
      const ts = await service.create(body);
      return c.json(success(ts), HTTP_STATUS.CREATED);
    } catch (err) {
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new TrafficSourceService(c.env);

    try {
      const ts = await service.update(id, body);
      return c.json(success(ts));
    } catch (err) {
      if (err instanceof Error && err.message === 'Traffic Source not found') {
        return c.json(error('Traffic Source not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new TrafficSourceService(c.env);

    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Traffic Source not found') {
        return c.json(error('Traffic Source not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // Test API connection
  router.post('/test-connection', async (c) => {
    const body = await c.req.json();

    // Validate required fields
    if (!body.apiBaseUrl) {
      return c.json(error('API Base URL is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!body.apiKey) {
      return c.json(error('API Key is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const result = await testApiConnection({
        baseUrl: body.apiBaseUrl,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        platformType: body.platformType,
      });

      if (result.success) {
        return c.json(success(result));
      } else {
        return c.json(error(result.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    } catch (err) {
      return c.json(
        error('Failed to test connection: ' + (err instanceof Error ? err.message : 'Unknown error')),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
