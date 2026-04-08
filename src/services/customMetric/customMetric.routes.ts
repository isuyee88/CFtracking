/**
 * @fileoverview 自定义指标 API 路由
 * @description 处理自定义指标相关的 HTTP 请求
 * @module services/customMetric/customMetric.routes
 */

import { Hono } from 'hono';
import { createCustomMetricService } from './customMetric.service';
import type { Env } from '@/config/env';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>();

// 验证模式
const CreateCustomMetricSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['calculated', 'aggregated']).default('calculated'),
  formula: z.string().min(1),
  dataType: z.enum(['number', 'currency', 'percent']).default('number'),
  format: z.enum(['number', 'currency', 'percent', 'custom']).default('number'),
  decimals: z.number().int().min(0).max(10).default(2),
  prefix: z.string().max(10).optional(),
  suffix: z.string().max(10).optional(),
});

const UpdateCustomMetricSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  formula: z.string().min(1).optional(),
  dataType: z.enum(['number', 'currency', 'percent']).optional(),
  format: z.enum(['number', 'currency', 'percent', 'custom']).optional(),
  decimals: z.number().int().min(0).max(10).optional(),
  prefix: z.string().max(10).optional(),
  suffix: z.string().max(10).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const ValidateFormulaSchema = z.object({
  formula: z.string().min(1),
});

const PreviewCalculationSchema = z.object({
  formula: z.string().min(1),
  context: z.record(z.number()),
});

/**
 * 创建自定义指标
 * POST /api/custom-metrics
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateCustomMetricSchema.parse(body);
    
    const service = createCustomMetricService(c.env);
    const metric = await service.createMetric(validated);
    
    return c.json({
      success: true,
      data: metric,
    });
  } catch (error) {
    console.error('Create custom metric error:', error);
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
 * 获取自定义指标列表
 * GET /api/custom-metrics
 */
app.get('/', async (c) => {
  try {
    const params = {
      status: c.req.query('status') as any,
      type: c.req.query('type') as any,
      search: c.req.query('search'),
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
    };

    const service = createCustomMetricService(c.env);
    const result = await service.getMetrics(params);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get custom metrics error:', error);
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
 * 获取活跃的自定义指标
 * GET /api/custom-metrics/active
 */
app.get('/active', async (c) => {
  try {
    const service = createCustomMetricService(c.env);
    const metrics = await service.getActiveMetrics();

    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Get active custom metrics error:', error);
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
 * 验证公式
 * POST /api/custom-metrics/validate-formula
 */
app.post('/validate-formula', async (c) => {
  try {
    const body = await c.req.json();
    const validated = ValidateFormulaSchema.parse(body);
    
    const service = createCustomMetricService(c.env);
    const result = service.validateFormula(validated.formula);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Validate formula error:', error);
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
 * 预览计算结果
 * POST /api/custom-metrics/preview
 */
app.post('/preview', async (c) => {
  try {
    const body = await c.req.json();
    const validated = PreviewCalculationSchema.parse(body);
    
    const service = createCustomMetricService(c.env);
    const result = service.previewCalculation(validated.formula, validated.context as any);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Preview calculation error:', error);
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
 * 获取自定义指标详情
 * GET /api/custom-metrics/:id
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createCustomMetricService(c.env);
    const metric = await service.getMetric(id);

    if (!metric) {
      return c.json(
        {
          success: false,
          error: 'Metric not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: metric,
    });
  } catch (error) {
    console.error('Get custom metric error:', error);
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
 * 更新自定义指标
 * PUT /api/custom-metrics/:id
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = UpdateCustomMetricSchema.parse(body);
    
    const service = createCustomMetricService(c.env);
    const metric = await service.updateMetric(id, validated);

    if (!metric) {
      return c.json(
        {
          success: false,
          error: 'Metric not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: metric,
    });
  } catch (error) {
    console.error('Update custom metric error:', error);
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
 * 删除自定义指标
 * DELETE /api/custom-metrics/:id
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = createCustomMetricService(c.env);
    const success = await service.deleteMetric(id);

    return c.json({
      success,
      message: success ? 'Metric deleted' : 'Failed to delete metric',
    });
  } catch (error) {
    console.error('Delete custom metric error:', error);
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
