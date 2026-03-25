/**
 * @fileoverview Data Aggregation Service
 * @description Service for aggregating tracking data into daily summaries
 * @module services/analytics/aggregation.service
 */

import type { Env } from '@/config/env';

export class AggregationService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Aggregate daily data
   */
  async aggregateDailyData(date?: string): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
    errors?: string[];
  }> {
    try {
      // Get TrackingStatsDO instance
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName('global-stats')
      );

      const response = await trackingDO.fetch('http://do/aggregate-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date }),
      });

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Aggregation completed',
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
      };
    } catch (error) {
      console.error('[AggregationService] Error:', error);
      return {
        success: false,
        message: 'Aggregation failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Aggregate historical data
   */
  async aggregateHistoricalData(
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
    errors?: string[];
  }> {
    try {
      // Get TrackingStatsDO instance
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName('global-stats')
      );

      const response = await trackingDO.fetch('http://do/aggregate-historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Historical aggregation completed',
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
      };
    } catch (error) {
      console.error('[AggregationService] Historical aggregation error:', error);
      return {
        success: false,
        message: 'Historical aggregation failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

export function createAggregationService(env: Env): AggregationService {
  return new AggregationService(env);
}
