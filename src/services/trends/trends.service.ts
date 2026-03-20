/**
 * @fileoverview Trends Service
 * @description Business logic for trends and analytics visualization
 * @module services/trends/trends.service
 * 
 * Input: TrendFilter with date range and optional filters
 * Output: TrendsReport with data points and breakdowns
 * Logic Interaction: Uses TrafficRepository
 * Frontend-Backend: Provides data for Trends charts and reports
 */

import { TrafficRepository } from '@/handlers/d1/traffic.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { 
  TrendFilter, 
  TrendDataPoint, 
  TrendSummary, 
  TrendsReport 
} from '@/types/trends';
import type { TrafficSummary } from '@/types/tracking';

export class TrendsService {
  private trafficRepo: TrafficRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.trafficRepo = new TrafficRepository(db);
  }

  /**
   * Generate trends report based on filter
   */
  async generateReport(filter: TrendFilter): Promise<TrendsReport> {
    const { startDate, endDate } = filter;
    const campaignId = filter.campaignId;

    let trendData: TrafficSummary[] = [];
    let countryBreakdown: TrafficSummary[] = [];
    let deviceBreakdown: TrafficSummary[] = [];
    let browserBreakdown: TrafficSummary[] = [];

    if (campaignId) {
      // Get trend data for specific campaign
      trendData = await this.trafficRepo.getTrend(campaignId, startDate, endDate);
      
      // Get dimension breakdowns
      [countryBreakdown, deviceBreakdown, browserBreakdown] = await Promise.all([
        this.trafficRepo.getStatsByDimension(campaignId, 'country', startDate, endDate),
        this.trafficRepo.getStatsByDimension(campaignId, 'device', startDate, endDate),
        this.trafficRepo.getStatsByDimension(campaignId, 'browser', startDate, endDate),
      ]);
    } else {
      // Without campaignId, return empty data
      trendData = [];
    }

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
        uniqueClicks: clicks, // Use clicks as uniqueClicks for now
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

    // Map breakdowns
    const mapBreakdown = (items: TrafficSummary[]) => {
      return items.map(item => {
        const clicks = item.clicks || 0;
        const conversions = item.conversions || 0;
        const revenue = item.revenue || 0;
        const spend = item.spend || 0;
        const profit = revenue - spend;
        
        return {
          dimension: '',
          value: (item as any).country || (item as any).device || (item as any).browser || 'unknown',
          clicks: clicks,
          uniqueClicks: clicks,
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
  private calculateSummary(data: TrafficSummary[]): TrendSummary {
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const totalUniqueClicks = totalClicks; // Use clicks as uniqueClicks for now
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
    let currentData: TrafficSummary[] = [];
    let previousData: TrafficSummary[] = [];

    if (campaignId) {
      [currentData, previousData] = await Promise.all([
        this.trafficRepo.getTrend(campaignId, currentStart, currentEnd),
        this.trafficRepo.getTrend(campaignId, previousStart, previousEnd),
      ]);
    }

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
}

export function createTrendsService(env: Env): TrendsService {
  return new TrendsService(env);
}
