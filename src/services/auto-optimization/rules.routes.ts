/**
 * @fileoverview 自动规则管理API
 * @description 规则评估、Campaign规则关联、预定义规则查询等
 * @module services/auto-optimization/auto-routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { AutoRuleEvaluatorService } from './rule-evaluator.service';
import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';

const autoRulesRoutes = new Hono<{ Bindings: Env }>();

autoRulesRoutes.get('/rules/predefined', async (c: Context<{ Bindings: Env }>) => {
  const db = getD1Connection(c.env);
  const repo = new AutoOptimizationRepository(db);
  const rules = await repo.getAllPredefinedRules();

  return c.json({ success: true, data: rules, count: rules.length });
});

autoRulesRoutes.get('/rules/campaign/:campaignId', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;
  const db = getD1Connection(c.env);
  const repo = new AutoOptimizationRepository(db);
  const rules = await repo.getCampaignRules(campaignId);

  return c.json({ success: true, data: rules, count: rules.length });
});

autoRulesRoutes.post('/rules/campaign/:campaignId/enable-all', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;

  try {
    const evaluator = new AutoRuleEvaluatorService(c.env);
    await evaluator.enableDefaultRulesForCampaign(campaignId);

    return c.json({ success: true, message: `Enabled all default rules for campaign ${campaignId}` });
  } catch (error) {
    console.error('[Enable Rules API] Error:', error);
    return c.json({ success: false, error: 'Failed to enable rules' }, 500);
  }
});

autoRulesRoutes.post('/rules/campaign/:campaignId/rule/:ruleCode/toggle', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;
  const ruleCode = c.req.param('ruleCode')!;
  const body = await c.req.json<{ enabled: boolean }>();

  const db = getD1Connection(c.env);
  const repo = new AutoOptimizationRepository(db);

  const predefinedRule = await repo.getPredefinedRuleByCode(ruleCode);
  if (!predefinedRule) {
    return c.json({ success: false, error: `Rule ${ruleCode} not found` }, 404);
  }

  if (body.enabled) {
    await repo.enableCampaignRule(campaignId, predefinedRule.id);
  } else {
    await repo.disableCampaignRule(campaignId, predefinedRule.id);
  }

  return c.json({
    success: true,
    message: `Rule ${ruleCode} ${body.enabled ? 'enabled' : 'disabled'} for campaign ${campaignId}`,
  });
});

autoRulesRoutes.post('/rules/evaluate/:campaignId', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;
  const zoneId = c.req.query('zone');
  const creativeId = c.req.query('creative');

  try {
    const evaluator = new AutoRuleEvaluatorService(c.env);
    const result = await evaluator.evaluateCampaign(campaignId, zoneId ?? undefined, creativeId ?? undefined);

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[Evaluate Rules API] Error:', error);
    return c.json({ success: false, error: 'Failed to evaluate rules' }, 500);
  }
});

autoRulesRoutes.post('/rules/evaluate-all', async (c: Context<{ Bindings: Env }>) => {
  try {
    const evaluator = new AutoRuleEvaluatorService(c.env);
    const result = await evaluator.evaluateAllActiveCampaigns();

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[Evaluate All API] Error:', error);
    return c.json({ success: false, error: 'Failed to evaluate all campaigns' }, 500);
  }
});

export default autoRulesRoutes;
