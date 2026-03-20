/**
 * @fileoverview Trends API Routes
 * @description HTTP endpoints for trends and analytics data
 * @module services/trends/trends.routes
 */

import { Hono } from 'hono';
import { createTrendsService } from './trends.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { TrendFilter } from '@/types/trends';

export function createTrendsRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/trends/report
   * Generate trends report
   * Query params: startDate, endDate, campaignId, interval, etc.
   */
  router.get('/report', async (c) => {
    try {
      const query = c.req.query();
      
      const filter: TrendFilter = {
        startDate: query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: query.endDate || new Date().toISOString(),
        campaignId: query.campaignId,
        flowId: query.flowId,
        landingPageId: query.landingPageId,
        offerId: query.offerId,
        trafficSourceId: query.trafficSourceId,
        country: query.country,
        device: query.device,
        browser: query.browser,
        os: query.os,
        interval: (query.interval as 'hour' | 'day' | 'week' | 'month') || 'day',
      };

      const service = createTrendsService(c.env);
      const report = await service.generateReport(filter);

      return c.json(success(report));
    } catch (err) {
      console.error('[Trends] Failed to generate report:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to generate report',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/trends/compare
   * Compare two date ranges
   * Query params: currentStart, currentEnd, previousStart, previousEnd, campaignId
   */
  router.get('/compare', async (c) => {
    try {
      const query = c.req.query();
      
      const currentStart = query.currentStart;
      const currentEnd = query.currentEnd;
      const previousStart = query.previousStart;
      const previousEnd = query.previousEnd;
      const campaignId = query.campaignId;

      if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
        return c.json(
          error('Missing required date parameters', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const service = createTrendsService(c.env);
      const comparison = await service.compareDateRanges(
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        campaignId
      );

      return c.json(success(comparison));
    } catch (err) {
      console.error('[Trends] Failed to compare date ranges:', err);
      return c.json(
        error(
          err instanceof Error ? err.message : 'Failed to compare date ranges',
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
