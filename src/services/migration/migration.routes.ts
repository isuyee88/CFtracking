/**
 * @fileoverview 数据迁移路由
 * @description 提供数据迁移相关的 API 端点
 * @module services/migration/migration.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { createAETODOMigrationService } from './ae-to-do.migration';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

export function createMigrationRouter() {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * 执行 AE 到 DO 的数据迁移
   * @route POST /api/migration/ae-to-do
   * @param {string} startDate - 开始日期 (ISO 格式)
   * @param {string} endDate - 结束日期 (ISO 格式)
   * @param {number} batchSize - 批量大小
   * @param {boolean} dryRun - 干运行模式
   */
  router.post('/ae-to-do', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const options = {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        batchSize: body.batchSize || 100,
        dryRun: body.dryRun || false,
      };

      const migrationService = createAETODOMigrationService(c.env);
      const result = await migrationService.migrate(options);

      return c.json(success(result), HTTP_STATUS.OK);
    } catch (err) {
      console.error('[Migration] Error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Migration failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * 验证迁移数据一致性
   * @route GET /api/migration/verify
   */
  router.get('/verify', async (c) => {
    try {
      const migrationService = createAETODOMigrationService(c.env);
      const result = await migrationService.verifyMigration();

      return c.json(success(result), HTTP_STATUS.OK);
    } catch (err) {
      console.error('[Migration] Verification error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Verification failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

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
