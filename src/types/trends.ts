/**
 * @fileoverview Trends Types
 * @description Type definitions for trends and analytics visualization
 * @module types/trends
 */

export interface TrendDataPoint {
  timestamp: string;
  date: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  epc: number;
  cpa: number;
  ctr: number;
  cr: number;
}

export interface TrendFilter {
  startDate: string;
  endDate: string;
  campaignId?: string;
  flowId?: string;
  landingPageId?: string;
  offerId?: string;
  trafficSourceId?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export interface TrendSummary {
  totalClicks: number;
  totalUniqueClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgRoi: number;
  avgEpc: number;
  avgCpa: number;
  avgCtr: number;
  avgCr: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface DimensionBreakdown {
  dimension: string;
  value: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  percentage: number;
}

export interface TrendsReport {
  filter: TrendFilter;
  summary: TrendSummary;
  data: TrendDataPoint[];
  breakdowns: {
    country?: DimensionBreakdown[];
    device?: DimensionBreakdown[];
    browser?: DimensionBreakdown[];
    os?: DimensionBreakdown[];
    trafficSource?: DimensionBreakdown[];
  };
}
