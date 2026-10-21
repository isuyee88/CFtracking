/**
 * @fileoverview Landing Page API 路由
 * @description 处理 Landing Page 相关的 HTTP 请求
 * @module services/landingPage/lp.routes
 */

import { Hono } from 'hono';
import { LandingPageService } from './lp.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired, isValidUrl } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { ETagCacheManager, CacheType } from '@/services/cache/etag-cache-manager';
import { CacheUpdateService } from '@/services/cache/cache-update-service';
import { ConfigSnapshotPublisher } from '@/services/cache/config-snapshot.service';

export function createLandingPageRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      withStats: c.req.query('withStats') === 'true',
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const cacheManager = new ETagCacheManager(c.env);
    return cacheManager.fetch(
      c.req.raw,
      async () => {
        const service = new LandingPageService(c.env);
        const result = query.withStats
          ? await service.getListWithStats(page, pageSize)
          : await service.getList(page, pageSize);
        return success(result.list, { page, pageSize, total: result.total });
      },
      { cacheType: CacheType.RECENT, cacheKey: `landings:list:${page}:${pageSize}:${query.withStats ? 'stats' : 'plain'}` }
    );
  });

  router.get('/active', async (c) => {
    const service = new LandingPageService(c.env);
    const lps = await service.getActive();
    return c.json(success(lps));
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const withStats = c.req.query('withStats') === 'true';
    const service = new LandingPageService(c.env);

    try {
      // Use getDetail if withStats=true
      const lp = withStats 
        ? await service.getDetail(id)
        : await service.getById(id);
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
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

    const urlValidation = validateRequired(body.url, 'url');
    if (!urlValidation.valid) {
      return c.json(error(urlValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidUrl(body.url)) {
      return c.json(error('Invalid URL format', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LandingPageService(c.env);

    try {
      const lp = await service.create(body);
      await new CacheUpdateService(c.env).onDataChanged('landing', lp.id, 'create');
      return c.json(success(lp), HTTP_STATUS.CREATED);
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
    const service = new LandingPageService(c.env);

    if (body.url && !isValidUrl(body.url)) {
      return c.json(error('Invalid URL format', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const lp = await service.update(id, body);
      await new CacheUpdateService(c.env).onDataChanged('landing', lp.id, 'update');
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new LandingPageService(c.env);

    try {
      // flowLandingPages cascades on delete; capture affected aliases first.
      const affectedAliases = await new ConfigSnapshotPublisher(c.env).aliasesForLandingPage(id);
      await service.delete(id);
      await new CacheUpdateService(c.env).onDataChanged('landing', id, 'delete', undefined, { affectedAliases });
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
