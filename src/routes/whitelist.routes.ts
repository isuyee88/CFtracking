/**
 * @fileoverview Whitelist API Routes
 * @description 白名单相关的 API 路由
 * @module routes/whitelist.routes
 */

import { Hono } from 'hono';
import { WhitelistService } from '@/services/whitelist/whitelist.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { validateStringField, getSafeErrorMessage } from '@/utils/validation';
import type { CreateWhitelistDTO, UpdateWhitelistDTO, BatchWhitelistDTO } from '@/types/whitelist';

/**
 * 验证白名单创建数据
 */
function validateCreateWhitelistData(data: Record<string, unknown>): { valid: boolean; data?: CreateWhitelistDTO; error?: string } {
  // 验证名称（可选）
  let name: string | undefined;
  if (data.name !== undefined && data.name !== null) {
    const nameResult = validateStringField(data.name, '名称', {
      required: false,
      maxLength: 200,
      sanitize: true,
    });
    if (!nameResult.valid) {
      return { valid: false, error: nameResult.error };
    }
    name = nameResult.value;
  }

  // 验证原因（可选）
  let reason: string | undefined;
  if (data.reason !== undefined && data.reason !== null) {
    const reasonResult = validateStringField(data.reason, '原因', {
      required: false,
      maxLength: 500,
      sanitize: true,
    });
    if (!reasonResult.valid) {
      return { valid: false, error: reasonResult.error };
    }
    reason = reasonResult.value;
  }

  // 构建验证后的数据
  const validatedData: CreateWhitelistDTO = {
    trafficSourceId: data.trafficSourceId as string,
    type: data.type as CreateWhitelistDTO['type'],
    value: data.value as string,
  };

  if (name) validatedData.name = name;
  if (reason) validatedData.reason = reason;
  if (data.campaignId) validatedData.campaignId = data.campaignId as string;
  if (data.ipMatchMode) validatedData.ipMatchMode = data.ipMatchMode as CreateWhitelistDTO['ipMatchMode'];
  if (data.uaMatchMode) validatedData.uaMatchMode = data.uaMatchMode as CreateWhitelistDTO['uaMatchMode'];
  if (data.syncToPlatform !== undefined) validatedData.syncToPlatform = data.syncToPlatform as boolean;

  return { valid: true, data: validatedData };
}

/**
 * 验证白名单更新数据
 */
function validateUpdateWhitelistData(data: Record<string, unknown>): { valid: boolean; data?: UpdateWhitelistDTO; error?: string } {
  const validatedData: UpdateWhitelistDTO = {};

  // 验证名称（可选）
  if (data.name !== undefined && data.name !== null) {
    const nameResult = validateStringField(data.name, '名称', {
      required: false,
      maxLength: 200,
      sanitize: true,
    });
    if (!nameResult.valid) {
      return { valid: false, error: nameResult.error };
    }
    validatedData.name = nameResult.value;
  }

  // 验证原因（可选）
  if (data.reason !== undefined && data.reason !== null) {
    const reasonResult = validateStringField(data.reason, '原因', {
      required: false,
      maxLength: 500,
      sanitize: true,
    });
    if (!reasonResult.valid) {
      return { valid: false, error: reasonResult.error };
    }
    validatedData.reason = reasonResult.value;
  }

  if (data.status) validatedData.status = data.status as UpdateWhitelistDTO['status'];
  if (data.ipMatchMode) validatedData.ipMatchMode = data.ipMatchMode as UpdateWhitelistDTO['ipMatchMode'];
  if (data.uaMatchMode) validatedData.uaMatchMode = data.uaMatchMode as UpdateWhitelistDTO['uaMatchMode'];
  if (data.syncToPlatform !== undefined) validatedData.syncToPlatform = data.syncToPlatform as boolean;

  return { valid: true, data: validatedData };
}

/**
 * 验证批量白名单数据
 */
function validateBatchWhitelistData(data: Record<string, unknown>): { valid: boolean; data?: BatchWhitelistDTO; error?: string } {
  const validatedData: BatchWhitelistDTO = {
    trafficSourceId: data.trafficSourceId as string,
    type: data.type as BatchWhitelistDTO['type'],
    items: (data.items as Array<Record<string, unknown>>).map(item => {
      const validatedItem: BatchWhitelistDTO['items'][0] = {
        value: item.value as string,
      };
      
      if (item.name) {
        const nameResult = validateStringField(item.name, '名称', { required: false, maxLength: 200, sanitize: true });
        if (nameResult.valid && nameResult.value) {
          validatedItem.name = nameResult.value;
        }
      }
      
      if (item.reason) {
        const reasonResult = validateStringField(item.reason, '原因', { required: false, maxLength: 500, sanitize: true });
        if (reasonResult.valid && reasonResult.value) {
          validatedItem.reason = reasonResult.value;
        }
      }
      
      if (item.campaignId) validatedItem.campaignId = item.campaignId as string;
      if (item.ipMatchMode) validatedItem.ipMatchMode = item.ipMatchMode as BatchWhitelistDTO['items'][0]['ipMatchMode'];
      if (item.uaMatchMode) validatedItem.uaMatchMode = item.uaMatchMode as BatchWhitelistDTO['items'][0]['uaMatchMode'];
      if (item.syncToPlatform !== undefined) validatedItem.syncToPlatform = item.syncToPlatform as boolean;
      
      return validatedItem;
    }),
  };

  return { valid: true, data: validatedData };
}

export function createWhitelistRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => new WhitelistService(env);

  // 获取白名单列表
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
        error(err instanceof Error ? err.message : 'Failed to fetch whitelist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建单个白名单条目
  router.post('/', async (c) => {
    const env = c.env;
    const rawData = await c.req.json();

    try {
      // 输入验证
      const validation = validateCreateWhitelistData(rawData);
      if (!validation.valid) {
        return c.json(
          error(validation.error || '输入验证失败', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const entry = await service(env).create(validation.data!);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取单个白名单条目
  router.get('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).getById(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch whitelist entry', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.NOT_FOUND
      );
    }
  });

  // 更新白名单条目
  router.put('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    const rawData = await c.req.json();

    try {
      // 输入验证
      const validation = validateUpdateWhitelistData(rawData);
      if (!validation.valid) {
        return c.json(
          error(validation.error || '输入验证失败', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const entry = await service(env).update(id, validation.data!);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 批量添加白名单
  router.post('/batch', async (c) => {
    const env = c.env;
    const rawData = await c.req.json();

    try {
      // 输入验证
      const validation = validateBatchWhitelistData(rawData);
      if (!validation.valid) {
        return c.json(
          error(validation.error || '输入验证失败', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const entries = await service(env).batchAdd(validation.data!);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 从报告候选项目批量添加白名单
  router.post('/batch-from-candidates', async (c) => {
    const env = c.env;
    const rawData = await c.req.json();
    const { trafficSourceId, candidates, reason } = rawData;

    try {
      // 输入验证
      let validatedReason: string | undefined;
      if (reason !== undefined && reason !== null) {
        const reasonResult = validateStringField(reason, '原因', {
          required: false,
          maxLength: 500,
          sanitize: true,
        });
        if (!reasonResult.valid) {
          return c.json(
            error(reasonResult.error || '输入验证失败', ERROR_CODES.VALIDATION),
            HTTP_STATUS.BAD_REQUEST
          );
        }
        validatedReason = reasonResult.value;
      }

      const entries = await service(env).batchAddFromCandidates(trafficSourceId, candidates, validatedReason);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(getSafeErrorMessage(err), ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取白名单候选项目
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
        error(err instanceof Error ? err.message : 'Failed to fetch candidates', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 同步白名单到流量平台
  router.post('/sync/:trafficSourceId', async (c) => {
    const env = c.env;
    const trafficSourceId = c.req.param('trafficSourceId');

    try {
      const result = await service(env).syncToPlatform(trafficSourceId);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to sync whitelist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 获取白名单统计
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

  // 从白名单中移除
  router.delete('/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const entry = await service(env).remove(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to remove from whitelist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}
