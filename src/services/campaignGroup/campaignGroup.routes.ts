/**
 * @fileoverview Campaign Group API 路由
 * @description 提供 Campaign 分组的 HTTP 接口
 * @module services/campaignGroup/campaignGroup.routes
 */

import { Hono } from 'hono';
import { createCampaignGroupService } from './campaignGroup.service';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';
import { validateStringField, validateColor, getSafeErrorMessage } from '@/utils/validation';
import type { CreateCampaignGroupDTO } from '@/types/campaignGroup';

/**
 * 验证 Campaign Group 数据
 */
function validateCampaignGroupData(data: Record<string, unknown>): { valid: boolean; data?: CreateCampaignGroupDTO; error?: string } {
  // 验证名称
  const nameResult = validateStringField(data.name, '名称', {
    required: true,
    minLength: 1,
    maxLength: 100,
    sanitize: true,
  });

  if (!nameResult.valid) {
    return { valid: false, error: nameResult.error };
  }

  // 验证描述（可选）
  const descriptionResult = validateStringField(data.description, '描述', {
    required: false,
    maxLength: 500,
    sanitize: true,
  });

  // 验证颜色（可选）
  const colorResult = validateColor(data.color);

  if (!colorResult.valid) {
    return { valid: false, error: colorResult.error };
  }

  const validatedData: CreateCampaignGroupDTO = {
    name: nameResult.value!,
  };

  if (descriptionResult.value) {
    validatedData.description = descriptionResult.value;
  }

  if (colorResult.value) {
    validatedData.color = colorResult.value;
  }

  return {
    valid: true,
    data: validatedData,
  };
}

export function registerCampaignGroupRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => createCampaignGroupService(env);

  // 获取所有分组
  router.get('/', async (c) => {
    const env = c.env;
    try {
      const groups = await service(env).getAll();
      return c.json(success(groups));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get campaign groups', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取单个分组
  router.get('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const group = await service(env).getById(id);
      if (!group) {
        return c.json(error('Campaign group not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      return c.json(success(group));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get campaign group', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取分组统计
  router.get('/:id/stats', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    try {
      const stats = await service(env).getStats(id, startDate, endDate);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get group stats', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建分组
  router.post('/', async (c) => {
    const env = c.env;
    try {
      const rawData = await c.req.json();
      
      // 输入验证
      const validation = validateCampaignGroupData(rawData);
      if (!validation.valid) {
        return c.json(
          error(validation.error || '输入验证失败', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      const group = await service(env).create(validation.data!);
      return c.json(success(group), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 更新分组
  router.put('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const rawData = await c.req.json();
      
      // 输入验证
      const validation = validateCampaignGroupData(rawData);
      if (!validation.valid) {
        return c.json(
          error(validation.error || '输入验证失败', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      const group = await service(env).update(id, validation.data!);
      return c.json(success(group));
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 删除分组
  router.delete('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      await service(env).delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete campaign group', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 批量分配 Campaign 到分组
  router.post('/:id/assign', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const { campaignIds } = await c.req.json();
      await service(env).assignCampaigns(id, campaignIds);
      return c.json(success({ assigned: campaignIds.length }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to assign campaigns', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 取消分配
  router.post('/unassign', async (c) => {
    const env = c.env;
    try {
      const { campaignIds } = await c.req.json();
      await service(env).unassignCampaigns(campaignIds);
      return c.json(success({ unassigned: campaignIds.length }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to unassign campaigns', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}

export default registerCampaignGroupRoutes();
