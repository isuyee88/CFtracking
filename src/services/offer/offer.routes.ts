/**
 * @fileoverview Offer API 路由
 * @description 处理 Offer 相关的 HTTP 请求
 * @module services/offer/offer.routes
 */

import { Hono } from 'hono';
import { OfferService } from './offer.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired, isValidUrl, validateNumberRange } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { ETagCacheManager, CacheType } from '@/services/cache/etag-cache-manager';
import { CacheUpdateService } from '@/services/cache/cache-update-service';
import { ConfigSnapshotPublisher } from '@/services/cache/config-snapshot.service';

export function createOfferRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      withStats: c.req.query('withStats') === 'true',
      status: c.req.query('status') || undefined,
      search: c.req.query('search') || undefined,
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const cacheManager = new ETagCacheManager(c.env);
    return cacheManager.fetch(
      c.req.raw,
      async () => {
        const service = new OfferService(c.env);
        const filters = { status: query.status, search: query.search };
        const result = query.withStats
          ? await service.getListWithStats(page, pageSize, filters)
          : await service.getList(page, pageSize, filters);
        return success(result.list, { page, pageSize, total: result.total });
      },
      {
        cacheType: CacheType.RECENT,
        cacheKey: `offers:list:${page}:${pageSize}:${query.withStats ? 'stats' : 'plain'}:${query.status || 'all'}:${query.search || ''}`,
      }
    );
  });

  router.get('/active', async (c) => {
    const service = new OfferService(c.env);
    const offers = await service.getActive();
    return c.json(success(offers));
  });

  router.get('/by-external-id/:externalId', async (c) => {
    const service = new OfferService(c.env);
    const offer = await service.getByExternalId(c.req.param('externalId'));
    return offer ? c.json(success(offer)) : c.json(error('Offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const withStats = c.req.query('withStats') === 'true';
    const service = new OfferService(c.env);

    try {
      // Use getDetail if withStats=true
      const offer = withStats 
        ? await service.getDetail(id)
        : await service.getById(id);
      return c.json(success(offer));
    } catch (err) {
      if (err instanceof Error && err.message === 'Offer not found') {
        return c.json(error('Offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
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

    if (body.payout !== undefined) {
      const payoutValidation = validateNumberRange(body.payout, 0, 1000000, 'payout');
      if (!payoutValidation.valid) {
        return c.json(error(payoutValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    }

    const service = new OfferService(c.env);

    try {
      const offer = await service.create(body);
      // Awaited: the click fast path must not keep the pre-create snapshot.
      await new CacheUpdateService(c.env).onDataChanged('offer', offer.id, 'create');
      return c.json(success(offer), HTTP_STATUS.CREATED);
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
    const service = new OfferService(c.env);

    if (body.url && !isValidUrl(body.url)) {
      return c.json(error('Invalid URL format', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (body.payout !== undefined) {
      const payoutValidation = validateNumberRange(body.payout, 0, 1000000, 'payout');
      if (!payoutValidation.valid) {
        return c.json(error(payoutValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    }

    try {
      const offer = await service.update(id, body);
      // URL/status changes must republish every alias routing through it.
      await new CacheUpdateService(c.env).onDataChanged('offer', offer.id, 'update');
      return c.json(success(offer));
    } catch (err) {
      if (err instanceof Error && err.message === 'Offer not found') {
        return c.json(error('Offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new OfferService(c.env);

    try {
      // Capture affected aliases first: deleting the offer may remove the
      // joining rows that a post-delete lookup would need.
      const affectedAliases = await new ConfigSnapshotPublisher(c.env).aliasesForOffer(id);
      await service.delete(id);
      await new CacheUpdateService(c.env).onDataChanged('offer', id, 'delete', undefined, { affectedAliases });
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Offer not found') {
        return c.json(error('Offer not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
