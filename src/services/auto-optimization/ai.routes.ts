/**
 * @fileoverview AI optimization routes
 * @description Exposes AI optimization engine status, recent decisions, manual triggers, and rollback actions.
 * @module services/auto-optimization/ai.routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '@/config/env';
import { AiOptimizationOrchestratorService } from './ai-orchestrator.service';

const aiRoutes = new Hono<{ Bindings: Env }>();

aiRoutes.get('/ai-operations/config', async (c: Context<{ Bindings: Env }>) => {
  const service = new AiOptimizationOrchestratorService(c.env);
  return c.json({ success: true, data: await service.getEngineConfig() });
});

aiRoutes.get('/ai-operations/recent', async (c: Context<{ Bindings: Env }>) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const service = new AiOptimizationOrchestratorService(c.env);
  const decisions = await service.getRecentDecisions(limit);
  return c.json({ success: true, data: decisions, count: decisions.length });
});

aiRoutes.get('/ai-operations/stats', async (c: Context<{ Bindings: Env }>) => {
  const days = parseInt(c.req.query('days') || '7', 10);
  const service = new AiOptimizationOrchestratorService(c.env);
  return c.json({ success: true, data: await service.getDecisionStats(days) });
});

aiRoutes.post('/ai-operations/run-now', async (c: Context<{ Bindings: Env }>) => {
  const body: { campaignId?: string; window?: '24h' | '7d'; limit?: number } =
    await c.req.json<{ campaignId?: string; window?: '24h' | '7d'; limit?: number }>().catch(() => ({}));
  const service = new AiOptimizationOrchestratorService(c.env);
  const result = await service.runOptimizationCycle({
    campaignId: body.campaignId,
    timeWindow: body.window || '24h',
    limit: body.limit || 20,
    triggerType: 'manual',
  });

  return c.json({
    success: true,
    data: result,
    message: `Processed ${result.processed} AI optimization candidates`,
  });
});

aiRoutes.post('/ai-operations/trigger-anomaly/:campaignId', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;
  const service = new AiOptimizationOrchestratorService(c.env);
  const result = await service.triggerConditionalOptimization(campaignId);

  return c.json({
    success: true,
    data: result,
    message: `Triggered conditional AI optimization for campaign ${campaignId}`,
  });
});

aiRoutes.post('/ai-operations/:decisionId/rollback', async (c: Context<{ Bindings: Env }>) => {
  const decisionId = c.req.param('decisionId')!;
  const service = new AiOptimizationOrchestratorService(c.env);
  const result = await service.rollbackDecision(decisionId);

  return c.json({
    success: result.success,
    data: result,
    message: result.message,
  }, result.success ? 200 : 400);
});

export default aiRoutes;
