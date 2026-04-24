/**
 * @fileoverview Whitelist API routes
 * @module routes/whitelist.routes
 */

import { Hono } from 'hono';
import { WhitelistService } from '@/services/whitelist/whitelist.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { getSafeErrorMessage } from '@/utils/validation';

export function createWhitelistRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => new WhitelistService(env);

  router.get('/', async (c) => {
    const env = c.env;
    const query = c.req.query();

    try {
      const entries = await service(env).query({
        trafficSourceId: query.trafficSourceId,
        type: query.type as never,
        status: query.status as never,
        synced: query.synced === 'true' ? true : query.synced === 'false' ? false : undefined,
        campaignId: query.campaignId,
      });
      return c.json(success(entries));
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/', async (c) => {
    const env = c.env;
    const body = await c.req.json();

    try {
      const entry = await service(env).create(body);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.get('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).getById(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.NOT_FOUND);
    }
  });

  router.put('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    const body = await c.req.json();

    try {
      const entry = await service(env).update(id, body);
      return c.json(success(entry));
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.post('/batch', async (c) => {
    const env = c.env;
    const body = await c.req.json();

    try {
      const entries = await service(env).batchAdd(body);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.post('/batch-from-candidates', async (c) => {
    const env = c.env;
    const { trafficSourceId, candidates, reason } = await c.req.json();

    try {
      const entries = await service(env).batchAddFromCandidates(trafficSourceId, candidates, reason);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.get('/candidates', async (c) => {
    const env = c.env;
    const query = c.req.query();

    try {
      const candidates = await service(env).getWhitelistCandidates(query.trafficSourceId || '', {
        minSpend: query.minSpend ? parseFloat(query.minSpend) : undefined,
        minRoi: query.minRoi ? parseFloat(query.minRoi) : undefined,
        minClicks: query.minClicks ? parseInt(query.minClicks) : undefined,
      });
      return c.json(success(candidates));
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/sync/:trafficSourceId', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('trafficSourceId');

    try {
      const result = await service(env).syncToPlatform(trafficSourceId);
      return c.json(success(result));
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.get('/stats/:trafficSourceId', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('trafficSourceId');

    try {
      const stats = await service(env).getStats(trafficSourceId);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.delete('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).remove(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(error(getSafeErrorMessage(err), ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.BAD_REQUEST);
    }
  });

  return router;
}
