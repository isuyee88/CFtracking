/**
 * @fileoverview Analytics Query Service
 * @description Service for querying analytics data from Durable Objects
 * @module services/analytics/analytics-query.service
 */

import type { Env } from '@/config/env';

export class AnalyticsQueryService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get trend report data
   */
  async getTrendReport(
    startDate: string,
    endDate: string,
    interval: string,
    campaignId?: string
  ): Promise<any[]> {
    // Get TrackingStatsDO instance
    const trackingDO = this.env.TRACKING_STATS_DO.get(
      this.env.TRACKING_STATS_DO.idFromName('global-stats')
    );

    const response = await trackingDO.fetch('http://do/trends', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        interval,
        campaignId,
      }),
    });

    const data = await response.json();
    return data.trends || [];
  }

  /**
   * Get entity stats
   */
  async getEntityStats(
    entityType: string,
    range: string
  ): Promise<any[]> {
    // Get TrackingStatsDO instance
    const trackingDO = this.env.TRACKING_STATS_DO.get(
      this.env.TRACKING_STATS_DO.idFromName('global-stats')
    );

    const response = await trackingDO.fetch('http://do/entity-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType,
        range,
      }),
    });

    const data = await response.json();
    return data.stats || [];
  }
}

export function createAnalyticsQueryService(env: Env): AnalyticsQueryService {
  return new AnalyticsQueryService(env);
}
