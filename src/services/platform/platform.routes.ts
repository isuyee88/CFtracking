/**
 * @fileoverview 平台管理 API 路由
 * @description 处理平台管理相关的 HTTP 请求
 * @module services/platform/platform.routes
 */

import { Hono } from 'hono';
import { PlatformManager } from './manager';
import { triggerRuleEvaluation, triggerTaskProcessing } from './cron.worker';
import { success, error } from '@/utils/response';
import { validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

export function createPlatformRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const manager = PlatformManager.createDefault();

  router.get('/', async (c) => {
    const platforms = manager.getAvailablePlatforms();
    return c.json(success(platforms));
  });

  router.get('/configured', async (c) => {
    const platforms = manager.getConfiguredPlatforms();
    return c.json(success(platforms));
  });

  router.get('/:platformId', async (c) => {
    const platformId = c.req.param('platformId');
    const platforms = manager.getAvailablePlatforms();
    const platform = platforms.find((p) => p.id === platformId);

    if (!platform) {
      return c.json(error('Platform not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(platform));
  });

  router.post('/:platformId/configure', async (c) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json();

    try {
      await manager.initializePlatform(platformId, body);
      return c.json(success({ configured: true }));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        return c.json(error('Platform not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('Invalid configuration')) {
        return c.json(error(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  router.post('/:platformId/test', async (c) => {
    const platformId = c.req.param('platformId');
    const result = await manager.testPlatformConnection(platformId);

    return c.json(success({
      platformId,
      connected: result,
    }));
  });

  router.post('/:platformId/execute', async (c) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json();

    const actionValidation = validateRequired(body.action, 'action');
    if (!actionValidation.valid) {
      return c.json(error(actionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const result = await manager.executeAction(platformId, body.action, body.parameters || {});

    if (!result.success) {
      return c.json(error(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }

    return c.json(success(result));
  });

  // 手动触发规则评估（用于测试）
  router.post('/cron/evaluate-rules', async (c) => {
    const env = c.env;
    const result = await triggerRuleEvaluation(env);

    if (!result.success) {
      return c.json(error(result.message, ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.INTERNAL_ERROR);
    }

    return c.json(success(result));
  });

  // 手动触发任务处理（用于测试）
  router.post('/cron/process-tasks', async (c) => {
    const env = c.env;
    const body = await c.req.json().catch(() => ({}));
    const limit = body.limit || 10;

    const result = await triggerTaskProcessing(env, limit);

    if (!result.success) {
      return c.json(error(result.message, ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.INTERNAL_ERROR);
    }

    return c.json(success(result));
  });

  // 直接执行 Zone 排除（用于测试）
  router.post('/:platformId/exclude-zone', async (c) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json();

    if (!body.campaignId || !body.zoneId) {
      return c.json(
        error('Missing required parameters: campaignId and zoneId', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await manager.executeAction(platformId, 'exclude_zone', {
      campaignId: body.campaignId,
      zoneId: body.zoneId,
    });

    if (!result.success) {
      return c.json(error(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }

    return c.json(success(result));
  });

  // 直接执行 Zone 恢复（用于测试）
  router.post('/:platformId/include-zone', async (c) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json();

    if (!body.campaignId || !body.zoneId) {
      return c.json(
        error('Missing required parameters: campaignId and zoneId', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await manager.executeAction(platformId, 'include_zone', {
      campaignId: body.campaignId,
      zoneId: body.zoneId,
    });

    if (!result.success) {
      return c.json(error(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }

    return c.json(success(result));
  });

  return router;
}
