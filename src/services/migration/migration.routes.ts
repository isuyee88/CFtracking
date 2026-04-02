/**
 * @fileoverview 数据迁移路由
 * @description 提供数据迁移相关的 API 端点
 * @module services/migration/migration.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';

import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

export function createMigrationRouter() {
  const router = new Hono<{ Bindings: Env }>();



  /**
   * 获取迁移状态
   * @route GET /api/migration/status
   */
  router.get('/status', async (c) => {
    try {
      return c.json(
        success({
          status: 'ready',
          lastMigration: null,
          nextMigration: null,
        }),
        HTTP_STATUS.OK
      );
    } catch (err) {
      console.error('[Migration] Status error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get status'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
