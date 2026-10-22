/**
 * @fileoverview Campaign clone API route.
 *
 * `POST /api/campaigns/:id/clone` deep-copies a campaign through
 * {@link CampaignCloneService}. The clone is committed by the service in one
 * atomic D1 batch; cache maintenance runs only after that, and a cache failure
 * must never turn a committed clone into a 500.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { CampaignCloneService } from '../services/campaign/campaign-clone.service';
import { CacheUpdateService } from '../services/cache/cache-update-service';
import type { Env } from '../config/env';

const cloneRouter = new Hono<{ Bindings: Env }>();

// 请求体验证 Schema
const CloneRequestSchema = z.object({
  newName: z.string().min(1, 'Campaign name is required').max(255),
  options: z.object({
    cloneStatus: z.boolean().optional().default(false),
    cloneFlows: z.boolean().optional().default(true),
    cloneOffers: z.boolean().optional().default(true),
    cloneLandings: z.boolean().optional().default(true),
    cloneAutorules: z.boolean().optional().default(true),
    cloneCostSettings: z.boolean().optional().default(true),
  }).optional().default({})
});

/**
 * POST /api/campaigns/:id/clone
 * 克隆一个 Campaign 及其关联数据
 */
cloneRouter.post('/campaigns/:id/clone', async (c) => {
  try {
    const campaignId = c.req.param('id');
    
    // 验证请求体
    const body = await c.req.json();
    const validated = CloneRequestSchema.parse(body);
    
    // 创建 Service
    const cloneService = new CampaignCloneService(c.env.DB);
    
    // 执行克隆（service 内部单 batch 提交）
    const result = await cloneService.clone(
      campaignId,
      validated.newName,
      validated.options
    );

    // The clone is already committed. Cache maintenance is best-effort here:
    // onDataChanged already logs internally, and this catch keeps a constructor
    // failure (e.g. no Cache API binding) from masquerading as a failed clone.
    try {
      await new CacheUpdateService(c.env).onDataChanged('campaign', result.data.clonedId, 'create');
    } catch (cacheError) {
      console.error('Clone campaign committed but cache refresh failed:', cacheError);
    }

    // 返回成功响应
    return c.json({
      success: true,
      data: result.data,
      message: result.message
    }, 200);
    
  } catch (error) {
    // 错误处理
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, 400);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found')) {
      return c.json({
        success: false,
        error: errorMessage
      }, 404);
    }
    
    console.error('Clone campaign error:', error);
    return c.json({
      success: false,
      error: 'Failed to clone campaign',
      details: errorMessage
    }, 500);
  }
});

export { cloneRouter };
