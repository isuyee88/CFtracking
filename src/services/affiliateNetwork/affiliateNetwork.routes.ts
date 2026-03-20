/**
 * @fileoverview Affiliate Network API 路由
 * @description 处理 Affiliate Network 相关的 HTTP 请求
 * @module services/affiliateNetwork/affiliateNetwork.routes
 */

import { Hono } from 'hono';
import { AffiliateNetworkService } from './affiliateNetwork.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createAffiliateNetworkRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      withStats: c.req.query('withStats') === 'true',
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new AffiliateNetworkService(c.env);
    
    // Use getListWithStats if withStats=true
    const result = query.withStats 
      ? await service.getListWithStats(page, pageSize)
      : await service.getList(page, pageSize);

    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total,
    }));
  });

  router.get('/active', async (c) => {
    const service = new AffiliateNetworkService(c.env);
    const networks = await service.getActive();
    return c.json(success(networks));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const withStats = c.req.query('withStats') === 'true';
    const service = new AffiliateNetworkService(c.env);

    try {
      // Use getDetail if withStats=true
      const network = withStats 
        ? await service.getDetail(id)
        : await service.getById(id);
      return c.json(success(network));
    } catch (err) {
      if (err instanceof Error && err.message === 'Affiliate Network not found') {
        return c.json(error('Affiliate Network not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
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

    const service = new AffiliateNetworkService(c.env);

    try {
      const network = await service.create(body);
      return c.json(success(network), HTTP_STATUS.CREATED);
    } catch (err) {
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new AffiliateNetworkService(c.env);

    try {
      const network = await service.update(id, body);
      return c.json(success(network));
    } catch (err) {
      if (err instanceof Error && err.message === 'Affiliate Network not found') {
        return c.json(error('Affiliate Network not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new AffiliateNetworkService(c.env);

    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Affiliate Network not found') {
        return c.json(error('Affiliate Network not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
