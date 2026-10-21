/**
 * @fileoverview Campaign API 路由
 * @description 处理 Campaign 相关的 HTTP 请求
 * @module services/campaign/campaign.routes
 */

import { Hono } from 'hono';
import { CampaignService } from './campaign.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired, validateStringLength } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { ETagCacheManager, CacheType } from '@/services/cache/etag-cache-manager';
import { CacheUpdateService } from '@/services/cache/cache-update-service';

export function createCampaignRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      status: c.req.query('status') as 'active' | 'paused' | 'deleted' | undefined,
      search: c.req.query('search'),
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const cacheManager = new ETagCacheManager(c.env);
    return cacheManager.fetch(
      c.req.raw,
      async () => {
        const service = new CampaignService(c.env);
        const result = await service.getList({ ...query, page, pageSize });
        return success(result.list, { page, pageSize, total: result.total });
      },
      {
        cacheType: CacheType.RECENT,
        cacheKey: `campaigns:list:${page}:${pageSize}:${query.status || 'all'}:${query.search || ''}`,
      }
    );
  });

  router.get('/active', async (c) => {
    const service = new CampaignService(c.env);
    const campaigns = await service.getActive();
    return c.json(success(campaigns));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new CampaignService(c.env);

    try {
      const campaign = await service.getById(id);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
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

    const aliasValidation = validateStringLength(body.alias, 2, 50, 'alias');
    if (!aliasValidation.valid) {
      return c.json(error(aliasValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const domainValidation = validateRequired(body.domain, 'domain');
    if (!domainValidation.valid) {
      return c.json(error(domainValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new CampaignService(c.env);

    try {
      const campaign = await service.create(body);
      await new CacheUpdateService(c.env).onDataChanged('campaign', campaign.id, 'create');
      return c.json(success(campaign), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new CampaignService(c.env);

    try {
      // An alias rename leaves the old key orphaned; capture it before update.
      const previous = body.alias !== undefined ? await service.getById(id) : null;
      const campaign = await service.update(id, body);
      await new CacheUpdateService(c.env).onDataChanged('campaign', campaign.id, 'update', undefined, {
        previousAlias: previous?.alias,
      });
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new CampaignService(c.env);

    try {
      const existing = await service.getById(id);
      await service.delete(id);
      await new CacheUpdateService(c.env).onDataChanged('campaign', id, 'delete', undefined, {
        previousAlias: existing.alias,
      });
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/:id/pause', async (c) => {
    const id = c.req.param('id');
    const service = new CampaignService(c.env);

    try {
      const campaign = await service.pause(id);
      // Publishing now deletes the alias key, so a paused campaign stops
      // redirecting through the compatibility fast path.
      await new CacheUpdateService(c.env).onDataChanged('campaign', campaign.id, 'update');
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/:id/activate', async (c) => {
    const id = c.req.param('id');
    const service = new CampaignService(c.env);

    try {
      const campaign = await service.activate(id);
      await new CacheUpdateService(c.env).onDataChanged('campaign', campaign.id, 'update');
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // 重新生成 API Token
  router.post('/:id/regenerate-token', async (c) => {
    const id = c.req.param('id');
    const service = new CampaignService(c.env);

    try {
      const apiToken = await service.regenerateApiToken(id);
      return c.json(success({ apiToken }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // 按 API Token 查询
  router.get('/by-token/:token', async (c) => {
    const token = c.req.param('token');
    const service = new CampaignService(c.env);

    try {
      const campaign = await service.getByApiToken(token);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // 获取 Campaign 统计数据
  router.get('/:id/stats', async (c) => {
    const id = c.req.param('id');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const service = new CampaignService(c.env);

    try {
      const stats = await service.getStats(id, startDate || undefined, endDate || undefined);
      return c.json(success(stats));
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
