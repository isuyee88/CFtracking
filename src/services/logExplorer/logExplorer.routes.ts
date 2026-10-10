/**
 * @fileoverview Log Explorer API 路由
 * @description 处理统一日志查询、过滤和导出的 HTTP 请求
 * @module services/logExplorer/logExplorer.routes
 * 
 * @input HTTP Request
 * @output JSON Response
 * @logic 路由处理 -> LogExplorerService -> Response
 * @frontend API 调用
 * @backend LogExplorerService
 */

import { Hono } from 'hono';
import { LogExplorerService } from './logExplorer.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { LogType, ExportFormat, LogFilter, SortOrder } from '@/types/logExplorer';

type Variables = {
  userId: string;
};

export function createLogExplorerRouter(): Hono<{ Bindings: Env; Variables: Variables }> {
  const router = new Hono<{ Bindings: Env; Variables: Variables }>();

  /**
   * 查询日志
   */
  router.post('/query', async (c) => {
    const body = await c.req.json();

    const logType = body.logType as LogType;
    if (!logType) {
      return c.json(error('logType is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LogExplorerService(c.env);
    const result = await service.queryLogs({
      logType,
      filters: body.filters,
      sort: body.sort,
      page: body.page || 1,
      pageSize: body.pageSize || 50,
    });

    return c.json(success(result));
  });

  /**
   * 获取日志统计
   */
  router.post('/stats', async (c) => {
    const body = await c.req.json();

    const logType = body.logType as LogType;
    if (!logType) {
      return c.json(error('logType is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LogExplorerService(c.env);
    const stats = await service.getStats({
      logType,
      filters: body.filters,
    });

    return c.json(success(stats));
  });

  /**
   * 创建导出任务
   */
  router.post('/export', async (c) => {
    const body = await c.req.json();

    const logType = body.logType as LogType;
    if (!logType) {
      return c.json(error('logType is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    // 从 JWT 获取用户 ID
    const userId = c.get('userId') || 'system';

    const service = new LogExplorerService(c.env);
    const task = await service.createExportTask(userId, {
      logType,
      filters: body.filters as LogFilter[] | undefined,
      sort: body.sort as Array<{ field: string; order: SortOrder }> | undefined,
      exportFormat: (body.exportFormat as ExportFormat) || 'csv',
    });

    return c.json(success(task), HTTP_STATUS.CREATED);
  });

  /**
   * 获取导出任务状态
   */
  router.get('/export/:taskId', async (c) => {
    const taskId = c.req.param('taskId');
    const service = new LogExplorerService(c.env);

    const task = await service.getExportTask(taskId);
    if (!task) {
      return c.json(error('Export task not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(task));
  });

  /**
   * 获取用户的导出任务列表
   */
  router.get('/exports', async (c) => {
    const userId = c.get('userId') || 'system';
    const limit = parseInt(c.req.query('limit') || '20');

    const service = new LogExplorerService(c.env);
    const tasks = await service.getExportTasks(userId, limit);

    return c.json(success(tasks));
  });

  /**
   * 写入日志（内部 API）
   */
  router.post('/write', async (c) => {
    const body = await c.req.json();

    if (!body.logType || !body.timestamp) {
      return c.json(error('logType and timestamp are required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LogExplorerService(c.env);
    const log = await service.writeLog(body);

    return c.json(success(log), HTTP_STATUS.CREATED);
  });

  /**
   * 批量写入日志（内部 API）
   */
  router.post('/write-batch', async (c) => {
    const body = await c.req.json();

    if (!Array.isArray(body.logs) || body.logs.length === 0) {
      return c.json(error('logs is required and must be a non-empty array', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LogExplorerService(c.env);
    const count = await service.writeLogs(body.logs);

    return c.json(success({ written: count }));
  });

  /**
   * 清理过期日志（管理员 API）
   */
  router.post('/cleanup', async (c) => {
    const body = await c.req.json();
    const daysToKeep = body.daysToKeep || 30;

    const service = new LogExplorerService(c.env);
    const deleted = await service.cleanupOldLogs(daysToKeep);

    return c.json(success({ deleted }));
  });

  return router;
}
