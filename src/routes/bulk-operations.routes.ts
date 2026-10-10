// Bulk Operations API Routes
// 批量操作 Campaigns 的 API 路由

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { BulkOperationsService } from '../services/campaign/bulk-operations.service';

const app = new Hono();

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
    
    // 执行批量删除
    const result = await service.bulkDelete(campaignIds);
    
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
    
    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
