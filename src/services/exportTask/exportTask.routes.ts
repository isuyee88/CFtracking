/**
 * @fileoverview 导出任务 API 路由
 * @description 处理导出任务相关的 HTTP 请求
 * @module services/exportTask/exportTask.routes
 */

import { Hono } from 'hono';
import { createExportTaskService } from './exportTask.service';
import type { Env } from '@/config/env';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>();

// 验证模式
const CreateExportTaskSchema = z.object({
  name: z.string().min(1),
  entityType: z.enum([
    'campaigns',
    'landing-pages',
    'offers',
    'traffic-sources',
    'affiliate-networks',
    'clicks',
    'conversions',
    'flows',
    'reports',
  ]),
  format: z.enum(['csv', 'excel', 'json']).default('csv'),
  filters: z.record(z.unknown()).optional(),
  dateRange: z
    .object({
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
  fields: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
});

/**
 * 创建导出任务
 * POST /api/export-tasks
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateExportTaskSchema.parse(body);
    
    const service = createExportTaskService(c.env);
    const task = await service.createTask(validated, false);
    c.executionCtx.waitUntil(
      service.startTaskExecution(task.id).catch((executionError) => {
        console.error('Export task background execution failed:', executionError);
      })
    );
    
    return c.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Create export task error:', error);
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 获取导出任务列表
 * GET /api/export-tasks
 */
app.get('/', async (c) => {
  try {
    const params = {
      status: c.req.query('status') as any,
      entityType: c.req.query('entityType') as any,
      createdBy: c.req.query('createdBy'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
    };

    const service = createExportTaskService(c.env);
    const result = await service.getTasks(params);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get export tasks error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 获取导出任务统计
 * GET /api/export-tasks/stats
 */
app.get('/stats', async (c) => {
  try {
    const service = createExportTaskService(c.env);
    const stats = await service.getStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get export task stats error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 获取导出任务详情
 * GET /api/export-tasks/:id
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createExportTaskService(c.env);
    const task = await service.getTask(id);

    if (!task) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get export task error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 下载导出文件
 * GET /api/export-tasks/:id/download
 */
app.get('/:id/download', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createExportTaskService(c.env);
    const result = await service.downloadFile(id);

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'File not found',
        },
        404
      );
    }

    return new Response(result.data, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    console.error('Download export file error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 取消导出任务
 * POST /api/export-tasks/:id/cancel
 */
app.post('/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createExportTaskService(c.env);
    const success = await service.cancelTask(id);

    return c.json({
      success,
      message: success ? 'Task cancelled' : 'Failed to cancel task',
    });
  } catch (error) {
    console.error('Cancel export task error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 重试导出任务
 * POST /api/export-tasks/:id/retry
 */
app.post('/:id/retry', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createExportTaskService(c.env);
    const success = await service.retryTask(id);

    return c.json({
      success,
      message: success ? 'Task retry started' : 'Failed to retry task',
    });
  } catch (error) {
    console.error('Retry export task error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 删除导出任务
 * DELETE /api/export-tasks/:id
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createExportTaskService(c.env);
    const success = await service.deleteTask(id);

    return c.json({
      success,
      message: success ? 'Task deleted' : 'Failed to delete task',
    });
  } catch (error) {
    console.error('Delete export task error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
