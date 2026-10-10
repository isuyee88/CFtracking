/**
 * @fileoverview ROI计算API路由
 * @description 提供实时ROI查询、趋势分析、异常检测等API端点
 * @module services/auto-optimization/roi.routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { ROICalculatorService } from './roi-calculator.service';
import type { Env } from '@/config/env';
import type { TimeWindow } from '@/types/auto-optimization';

const roiRoutes = new Hono<{ Bindings: Env }>();

roiRoutes.get('/roi/:campaignId', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;
  const window = (c.req.query('window') || '24h') as TimeWindow;
  const zoneId = c.req.query('zone');
  const forceRefresh = c.req.query('refresh') === 'true';

  try {
    const service = new ROICalculatorService(c.env);
    const result = await service.calculateROI({
      campaignId,
      zoneId: zoneId ?? undefined,
      timeWindow: window,
    }, { forceRefresh });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[ROI API] Error:', error);
    return c.json({ success: false, error: 'Failed to calculate ROI' }, 500);
  }
});

roiRoutes.get('/roi/:campaignId/trend', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;

  try {
    const service = new ROICalculatorService(c.env);
    const trend = await service.getROITrend(campaignId);

    return c.json({ success: true, data: trend });
  } catch (error) {
    console.error('[ROI Trend API] Error:', error);
    return c.json({ success: false, error: 'Failed to get ROI trend' }, 500);
  }
});

roiRoutes.get('/roi/:campaignId/anomaly', async (c: Context<{ Bindings: Env }>) => {
  const campaignId = c.req.param('campaignId')!;

  try {
    const service = new ROICalculatorService(c.env);
    const anomaly = await service.detectAnomaly(campaignId);

    return c.json({ success: true, data: anomaly });
  } catch (error) {
    console.error('[Anomaly API] Error:', error);
    return c.json({ success: false, error: 'Failed to detect anomaly' }, 500);
  }
});

roiRoutes.get('/roi/attention-needed', async (c: Context<{ Bindings: Env }>) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const service = new ROICalculatorService(c.env);
    const campaigns = await service.getAttentionNeededCampaigns(limit);

    return c.json({ success: true, data: campaigns, count: campaigns.length });
  } catch (error) {
    console.error('[Attention API] Error:', error);
    return c.json({ success: false, error: 'Failed to get attention list' }, 500);
  }
});

roiRoutes.post('/roi/batch', async (c: Context<{ Bindings: Env }>) => {
  const body = await c.req.json<{ campaignIds: string[]; window?: TimeWindow }>();

  if (!body.campaignIds?.length) {
    return c.json({ success: false, error: 'campaignIds is required' }, 400);
  }

  try {
    const service = new ROICalculatorService(c.env);
    const results = await service.batchCalculateROI(body.campaignIds, body.window || '24h');

    return c.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('[Batch ROI API] Error:', error);
    return c.json({ success: false, error: 'Failed to calculate batch ROI' }, 500);
  }
});

export default roiRoutes;
