/**
 * @fileoverview Trends Service
 * @description Business logic for trends and analytics visualization
 * @module services/trends/trends.service
 *
 * Input: TrendFilter with date range and optional filters
 * Output: TrendsReport with data points and breakdowns
 * Logic Interaction: Uses AnalyticsQueryService (Analytics Engine)
 * Frontend-Backend: Provides data for Trends charts and reports
 */

import { AnalyticsQueryService, createAnalyticsQueryService } from '@/services/analytics/analytics-query.service';
import type { Env } from '@/config/env';
import type {
  TrendFilter,
  TrendDataPoint,
  TrendSummary,
  TrendsReport
} from '@/types/trends';

export class TrendsService {
  private analyticsQueryService: AnalyticsQueryService;

  constructor(env: Env) {
    this.analyticsQueryService = createAnalyticsQueryService(env);
  }

  /**
   * Generate trends report based on filter
   */
  async generateReport(filter: TrendFilter): Promise<TrendsReport> {
    const { startDate, endDate } = filter;
    const campaignId = filter.campaignId;
    const interval = filter.interval || 'day';

    // Get trend data from Analytics Engine
    const trendData = await this.analyticsQueryService.getTrendReport(
      startDate,
      endDate,
      interval,
      campaignId
    );

    // Calculate summary
    const summary = this.calculateSummary(trendData);

    // Map to TrendDataPoint
    const data: TrendDataPoint[] = trendData.map(point => {
      const clicks = point.clicks || 0;
      const conversions = point.conversions || 0;
      const revenue = point.revenue || 0;
      const spend = point.spend || 0;
      const profit = revenue - spend;

      return {
        timestamp: point.date || '',
        date: point.date || '',
        clicks: clicks,
        uniqueClicks: point.uniqueVisitors || clicks,
        conversions: conversions,
        revenue: revenue,
        cost: spend,
        profit: profit,
        roi: spend > 0 ? (profit / spend) * 100 : 0,
        epc: clicks > 0 ? revenue / clicks : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        ctr: point.impressions && point.impressions > 0 ? (clicks / point.impressions) * 100 : 0,
        cr: clicks > 0 ? (conversions / clicks) * 100 : 0,
      };
    });

    // Get breakdowns from entity stats
    const range = this.getRangeFromDates(startDate, endDate);
    let countryBreakdown: any[] = [];
    let deviceBreakdown: any[] = [];
    let browserBreakdown: any[] = [];

    if (campaignId) {
      [countryBreakdown, deviceBreakdown, browserBreakdown] = await Promise.all([
        this.analyticsQueryService.getEntityStats('countries', range),
        this.analyticsQueryService.getEntityStats('device_types', range),
        this.analyticsQueryService.getEntityStats('browsers', range),
      ]);
    }

    // Map breakdowns
    const mapBreakdown = (items: any[]) => {
      return items.map(item => {
        const clicks = item.clicks || 0;
        const conversions = item.conversions || 0;
        const revenue = item.revenue || 0;
        const spend = item.spend || 0;
        const profit = revenue - spend;

        return {
          dimension: '',
          value: item.name || 'unknown',
          clicks: clicks,
          uniqueClicks: item.unique_visitors || clicks,
          conversions: conversions,
          revenue: revenue,
          cost: spend,
          profit: profit,
          roi: spend > 0 ? (profit / spend) * 100 : 0,
          percentage: 0,
        };
      });
    };

    return {
      filter,
      summary,
      data,
      breakdowns: {
        country: mapBreakdown(countryBreakdown),
        device: mapBreakdown(deviceBreakdown),
        browser: mapBreakdown(browserBreakdown),
      },
    };
  }

  /**
   * Calculate summary statistics from trend data
   */
  private calculateSummary(data: any[]): TrendSummary {
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const totalUniqueClicks = data.reduce((sum, d) => sum + (d.uniqueVisitors || d.clicks || 0), 0);
    const totalConversions = data.reduce((sum, d) => sum + (d.conversions || 0), 0);
    const totalRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const totalCost = data.reduce((sum, d) => sum + (d.spend || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    const avgRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const avgEpc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
    const avgCpa = totalConversions > 0 ? totalCost / totalConversions : 0;
    const avgCtr = totalClicks > 0 ? (totalUniqueClicks / totalClicks) * 100 : 0;
    const avgCr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Calculate trend (compare first half vs second half)
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);

    const firstHalfClicks = firstHalf.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const secondHalfClicks = secondHalf.reduce((sum, d) => sum + (d.clicks || 0), 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changePercent = 0;

    if (firstHalfClicks > 0) {
      changePercent = ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100;
      if (changePercent > 5) trend = 'up';
      else if (changePercent < -5) trend = 'down';
    }

    return {
      totalClicks,
      totalUniqueClicks,
      totalConversions,
      totalRevenue,
      totalCost,
      totalProfit,
      avgRoi,
      avgEpc,
      avgCpa,
      avgCtr,
      avgCr,
      trend,
      changePercent,
    };
  }

  /**
   * Compare two date ranges
   */
  async compareDateRanges(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
    campaignId?: string
  ): Promise<{
    current: TrendSummary;
    previous: TrendSummary;
    changes: {
      clicks: number;
      conversions: number;
      revenue: number;
      profit: number;
      roi: number;
    };
  }> {
    const [currentData, previousData] = await Promise.all([
      this.analyticsQueryService.getTrendReport(currentStart, currentEnd, 'day', campaignId),
      this.analyticsQueryService.getTrendReport(previousStart, previousEnd, 'day', campaignId),
    ]);

    const current = this.calculateSummary(currentData);
    const previous = this.calculateSummary(previousData);

    return {
      current,
      previous,
      changes: {
        clicks: previous.totalClicks > 0
          ? ((current.totalClicks - previous.totalClicks) / previous.totalClicks) * 100
          : 0,
        conversions: previous.totalConversions > 0
          ? ((current.totalConversions - previous.totalConversions) / previous.totalConversions) * 100
          : 0,
        revenue: previous.totalRevenue > 0
          ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
          : 0,
        profit: previous.totalProfit !== 0
          ? ((current.totalProfit - previous.totalProfit) / Math.abs(previous.totalProfit)) * 100
          : 0,
        roi: previous.avgRoi !== 0
          ? ((current.avgRoi - previous.avgRoi) / Math.abs(previous.avgRoi)) * 100
          : 0,
      },
    };
  }

  /**
   * Convert date range to range string for entity stats
   */
  private getRangeFromDates(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'today';
    if (diffDays <= 7) return '7days';
    if (diffDays <= 30) return '30days';
    return '30days';
  }
}

export function createTrendsService(env: Env): TrendsService {
  return new TrendsService(env);
}
