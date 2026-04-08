/**
 * @fileoverview 自动化操作记录与审计API
 * @description 操作历史查询、回滚、统计等
 * @module services/auto-optimization/operations.routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import { AutoOperationExecutorService } from './operation-executor.service';
import type { Env } from '@/config/env';

const operationsRoutes = new Hono<{ Bindings: Env }>();

operationsRoutes.get('/operations', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.query('campaign');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  if (!campaignId) {
    return c.json({ success: false, error: 'campaignId is required' }, 400);
  }

  try {
    const db = getD1Connection(c.env);
    const repo = new AutoOptimizationRepository(db);
    const result = await repo.getOperationsByCampaign(campaignId, {
      status: status as any,
      limit,
      offset,
    });

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[Operations API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch operations' }, 500);
  }
});

operationsRoutes.get('/operations/recent', async (c: Context<{ Bindings: Env }>) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);

  try {
    const db = getD1Connection(c.env);
    const repo = new AutoOptimizationRepository(db);
    const operations = await repo.getRecentOperations(limit);

    return c.json({ success: true, data: operations, count: operations.length });
  } catch (error) {
    console.error('[Recent Ops API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch recent operations' }, 500);
  }
});

operationsRoutes.get('/operations/:operationId', async (c: Context<{ Bindings: Env }>) => {
  const operationId = c.req.param('operationId')!;

  try {
    const db = getD1Connection(c.env);
    const repo = new AutoOptimizationRepository(db);
    const operation = await repo.getOperation(operationId);

    if (!operation) {
      return c.json({ success: false, error: 'Operation not found' }, 404);
    }

    const rollbacks = await repo.getRollbacksByOperation(operationId);

    return c.json({
      success: true,
      data: {
        ...operation,
        rollbacks,
      },
    });
  } catch (error) {
    console.error('[Operation Detail API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch operation detail' }, 500);
  }
});

operationsRoutes.get('/operations/stats', async (c: Context<{ Bindings: Env }>) => {
  const days = parseInt(c.req.query('days') || '30', 10);

  try {
    const db = getD1Connection(c.env);
    const repo = new AutoOptimizationRepository(db);
    const stats = await repo.getOperationStats(days);

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Ops Stats API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

operationsRoutes.post('/operations/:operationId/execute', async (c: Context<{ Bindings: Env }>) => {
  const operationId = c.req.param('operationId')!;

  try {
    const executor = new AutoOperationExecutorService(c.env);
    const result = await executor.executeOperation(operationId);

    return c.json({
      success: result.success,
      data: result,
      message: result.message,
    }, result.success ? 200 : 400);
  } catch (error) {
    console.error('[Execute Operation API] Error:', error);
    return c.json({ success: false, error: 'Failed to execute operation' }, 500);
  }
});

operationsRoutes.post('/operations/process-ready', async (c: Context<{ Bindings: Env }>) => {
  const body = await c.req.json<{ limit?: number }>().catch(() => ({} as { limit?: number }));
  const queryLimit = parseInt(c.req.query('limit') || '', 10);
  const limit = Number.isFinite(queryLimit)
    ? queryLimit
    : (typeof body.limit === 'number' ? body.limit : 20);

  try {
    const executor = new AutoOperationExecutorService(c.env);
    const result = await executor.processPendingOperations(limit);

    return c.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} ready operations`,
    });
  } catch (error) {
    console.error('[Process Ready Operations API] Error:', error);
    return c.json({ success: false, error: 'Failed to process ready operations' }, 500);
  }
});

export default operationsRoutes;
