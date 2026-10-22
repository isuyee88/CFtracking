/**
 * @fileoverview Bulk campaign HTTP routes.
 *
 * A successful bulk write changes the control-plane state for every id in the
 * request, so each one must republish its click snapshot (`clickcfg:{alias}`).
 * Skipping that leaves clicks redirecting to a pre-write offer URL until the
 * alias key expires; `CacheUpdateService.onDataChanged` already swallows its
 * own failures, and the loop is wrapped so cache maintenance never turns a
 * committed bulk write into a 500.
 *
 * Delete is special: the alias is read before the rows disappear, then passed
 * as `previousAlias` so the publisher can drop the orphaned key.
 *
 * @see src/services/cache/cache-update-service.ts
 * @see src/services/campaign/campaign.routes.ts (single-campaign equivalent)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { BulkOperationsService } from '../services/campaign/bulk-operations.service';
import { CacheUpdateService } from '../services/cache/cache-update-service';
import type { Env } from '../config/env';

const app = new Hono<{ Bindings: Env }>();

// Zod Schema for bulk operations
const bulkActivateSchema = z.object({
  campaignIds: z.array(z.string()).min(1).max(50),
});

const bulkPauseSchema = z.object({
  campaignIds: z.array(z.string()).min(1).max(50),
});

const bulkDeleteSchema = z.object({
  campaignIds: z.array(z.string()).min(1).max(50),
  confirm: z.boolean().refine(val => val === true, {
    message: 'Confirmation is required for delete operation',
  }),
});

const bulkUpdateSchema = z.object({
  campaignIds: z.array(z.string()).min(1).max(50),
  updates: z.object({
    costModel: z.enum(['cpc', 'cpm', 'cpa', 'flat']).optional(),
    costValue: z.number().min(0).optional(),
    trafficSource: z.string().optional(),
    group: z.string().optional(),
    status: z.enum(['active', 'paused']).optional(),
  }).refine(obj => Object.keys(obj).length > 0, {
    message: 'At least one field must be updated',
  }),
});

/**
 * Republish every campaign touched by a bulk write.
 *
 * Sequential on purpose: each call may issue several KV/D1 operations and the
 * admin API is low-QPS. Errors are logged, never rethrown, so the caller can
 * still answer with the committed BulkResult.
 */
async function notifyCampaignsChanged(
  env: Env,
  ids: string[],
  action: 'update' | 'delete',
  aliases: Record<string, string> = {}
): Promise<void> {
  let cacheUpdate: CacheUpdateService;
  try {
    cacheUpdate = new CacheUpdateService(env);
  } catch (err) {
    console.error('[BulkOperations] Cache service unavailable after committed write:', err);
    return;
  }

  for (const id of ids) {
    try {
      const context = action === 'delete' ? { previousAlias: aliases[id] } : undefined;
      await cacheUpdate.onDataChanged('campaign', id, action, undefined, context);
    } catch (err) {
      // One campaign's cache failure must not skip the remaining ids.
      console.error(`[BulkOperations] Cache sync failed for campaign ${id}:`, err);
    }
  }
}

/**
 * POST /api/campaigns/bulk-activate
 * 批量启动 Campaigns
 */
app.post('/bulk-activate', zValidator('json', bulkActivateSchema), async (c) => {
  try {
    const { campaignIds } = c.req.valid('json');
    const db = c.env.DB;

    const service = new BulkOperationsService(db);

    // 验证 Campaigns 是否存在
    const validation = await service.validateCampaigns(campaignIds);
    if (validation.invalid.length > 0) {
      return c.json({
        error: 'Some campaigns not found',
        invalid: validation.invalid,
      }, 404);
    }

    // 执行批量启动
    const result = await service.bulkActivate(campaignIds);
    if (result.success) {
      await notifyCampaignsChanged(c.env, campaignIds, 'update');
    }

    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/campaigns/bulk-pause
 * 批量暂停 Campaigns
 */
app.post('/bulk-pause', zValidator('json', bulkPauseSchema), async (c) => {
  try {
    const { campaignIds } = c.req.valid('json');
    const db = c.env.DB;

    const service = new BulkOperationsService(db);

    // 验证 Campaigns 是否存在
    const validation = await service.validateCampaigns(campaignIds);
    if (validation.invalid.length > 0) {
      return c.json({
        error: 'Some campaigns not found',
        invalid: validation.invalid,
      }, 404);
    }

    // 执行批量暂停
    const result = await service.bulkPause(campaignIds);
    if (result.success) {
      await notifyCampaignsChanged(c.env, campaignIds, 'update');
    }

    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/campaigns/bulk-delete
 * 批量删除 Campaigns
 */
app.post('/bulk-delete', zValidator('json', bulkDeleteSchema), async (c) => {
  try {
    const { campaignIds } = c.req.valid('json');
    const db = c.env.DB;

    const service = new BulkOperationsService(db);

    // 验证 Campaigns 是否存在
    const validation = await service.validateCampaigns(campaignIds);
    if (validation.invalid.length > 0) {
      return c.json({
        error: 'Some campaigns not found',
        invalid: validation.invalid,
      }, 404);
    }

    // Capture aliases before the cascade removes the rows that map id -> alias.
    const aliases = await service.getAliases(campaignIds);

    // 执行批量删除
    const result = await service.bulkDelete(campaignIds);
    if (result.success) {
      await notifyCampaignsChanged(c.env, campaignIds, 'delete', aliases);
    }

    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/campaigns/bulk-update
 * 批量更新 Campaign 字段
 */
app.post('/bulk-update', zValidator('json', bulkUpdateSchema), async (c) => {
  try {
    const { campaignIds, updates } = c.req.valid('json');
    const db = c.env.DB;

    const service = new BulkOperationsService(db);

    // 验证 Campaigns 是否存在
    const validation = await service.validateCampaigns(campaignIds);
    if (validation.invalid.length > 0) {
      return c.json({
        error: 'Some campaigns not found',
        invalid: validation.invalid,
      }, 404);
    }

    // 执行批量更新
    const result = await service.bulkUpdate(campaignIds, updates);
    if (result.success) {
      await notifyCampaignsChanged(c.env, campaignIds, 'update');
    }

    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
