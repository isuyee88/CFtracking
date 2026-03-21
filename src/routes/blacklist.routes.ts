/**
 * @fileoverview Blacklist API Routes
 * @description 黑名单相关的 API 路由
 * @module routes/blacklist.routes
 */

import { Hono } from 'hono';
import { BlacklistService } from '@/services/blacklist/blacklist.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createBlacklistRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => new BlacklistService(env);

  // 获取黑名单列表
  router.get('/', async (c) => {
    const env = c.env;
    const query = c.req.query();

    try {
      const entries = await service(env).query({
        trafficSourceId: query.trafficSourceId,
        type: query.type as any,
        status: query.status as any,
        synced: query.synced === 'true' ? true : query.synced === 'false' ? false : undefined,
        campaignId: query.campaignId,
      });

      return c.json(success(entries));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建单个黑名单条目
  router.post('/', async (c) => {
    const env = c.env;
    const body = await c.req.json();

    try {
      const entry = await service(env).create(body);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to create blacklist entry', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取单个黑名单条目
  router.get('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).getById(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch blacklist entry', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.NOT_FOUND
      );
    }
  });

  // 更新黑名单条目
  router.put('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    const body = await c.req.json();

    try {
      const entry = await service(env).update(id, body);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update blacklist entry', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 批量添加黑名单
  router.post('/batch', async (c) => {
    const env = c.env;
    const body = await c.req.json();

    try {
      const entries = await service(env).batchAdd(body);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add to blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 从报告候选项目批量添加黑名单
  router.post('/batch-from-candidates', async (c) => {
    const env = c.env;
    const { trafficSourceId, candidates, reason } = await c.req.json();

    try {
      const entries = await service(env).batchAddFromCandidates(trafficSourceId, candidates, reason);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add candidates to blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取黑名单候选项目
  router.get('/candidates', async (c) => {
    const env = c.env;
    const query = c.req.query();

    try {
      const candidates = await service(env).getBlacklistCandidates(query.trafficSourceId || '', {
        minSpend: query.minSpend ? parseFloat(query.minSpend) : undefined,
        maxRoi: query.maxRoi ? parseFloat(query.maxRoi) : undefined,
        minClicks: query.minClicks ? parseInt(query.minClicks) : undefined,
      });

      return c.json(success(candidates));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch candidates', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 同步黑名单到流量平台
  router.post('/sync/:trafficSourceId', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('trafficSourceId');

    try {
      const result = await service(env).syncToPlatform(trafficSourceId);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to sync blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取黑名单统计
  router.get('/stats/:trafficSourceId', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('trafficSourceId');

    try {
      const stats = await service(env).getStats(trafficSourceId);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch stats', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 从黑名单中移除
  router.delete('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).remove(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to remove from blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}
