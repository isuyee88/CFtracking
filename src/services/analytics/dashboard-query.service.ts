/**
 * @fileoverview Dashboard 数据源自动切换服务
 * @description 根据时间范围自动从 AE 或 D1 获取数据
 * @module services/analytics/dashboard-query.service
 *
 * 数据存储架构:
 *   - DO (Durable Objects): 唯一性检查和计数器
 *   - AE (Analytics Engine): 主存储，免费3个月，用于时序数据和趋势分析
 *   - D1: 归档存储，3个月前历史数据，用于精确报表
 *
 * 数据流:
 *   点击请求 → DO(唯一性检查) → AE(主存储) → 每天汇总 → D1(归档)
 *
 * Dashboard数据读取逻辑:
 *   - < 3个月数据 ──► AE读取
 *     优点: 写入即查、高吞吐
 *     缺点: 数分钟延迟
 *   - > 3个月数据 ──► D1读取
 *     优点: 完整准确、永久存储
 *     缺点: 需要等待每日汇总
 *
 * 输入: 查询参数（range, campaignId, filters）
 * 输出: Dashboard 统计数据
 * 逻辑交互:
 *   - 被 analytics.routes.ts 调用
 *   - 内部调用 AnalyticsQueryService (AE) 或 TrafficRepository (D1)
 * 前后端交互: 通过 API 返回统一格式的数据
 */

import type { Env } from '@/config/env';
import { getD1Connection, TrafficRepository } from '@/handlers/d1';
import { AnalyticsQueryService, createAnalyticsQueryService } from './analytics-query.service';

export type DataSource = 'AE' | 'D1';

export interface DashboardMetric {
  key: string;
  label: string;
  value: string;
  isPositive: boolean;
  format: 'number' | 'currency' | 'percentage';
}

export interface ChartDataPoint {
  date: string;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  impressions: number;
}

export interface EntityStatItem {
  name: string;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  revenue: number;
  unique_visitors: number;
}

export interface DashboardQueryResult {
  metrics: DashboardMetric[];
  chartData: ChartDataPoint[];
  entityStats: Record<string, EntityStatItem[]>;
  dataSource: DataSource | 'MIXED';
  queryTime: string;
  range: string;
}

const AE_FREE_TIER_DAYS = 90;

export function determineDataSource(startDate: string, _endDate: string): DataSource {
  const now = new Date();
  const start = new Date(startDate);

  const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > AE_FREE_TIER_DAYS) {
    return 'D1';
  }
  return 'AE';
}

export function isWithinAEFreeTier(startDate: string, endDate: string): boolean {
  return determineDataSource(startDate, endDate) === 'AE';
}

export class DashboardQueryService {
  private analyticsQueryService: AnalyticsQueryService;
  private trafficRepo: TrafficRepository;

  constructor(env: Env) {
    this.analyticsQueryService = createAnalyticsQueryService(env);
    this.trafficRepo = new TrafficRepository(getD1Connection(env));
  }

  /**
   * 获取 Dashboard 统计数据
   * 根据时间范围自动选择数据源
   */
  async getDashboardStats(range: string): Promise<DashboardQueryResult> {
    const { startDate, endDate } = this.getDateRange(range);
    const dataSource = determineDataSource(startDate, endDate);

    console.log(`[DashboardQueryService] Range: ${range}, DataSource: ${dataSource}, Start: ${startDate}, End: ${endDate}`);

    let metrics: DashboardMetric[];
    let chartData: ChartDataPoint[];
    let entityStats: Record<string, EntityStatItem[]>;

    if (dataSource === 'AE') {
      const aeResult = await this.analyticsQueryService.getDashboardStats(range);
      metrics = aeResult.metrics as DashboardMetric[];
      chartData = await this.analyticsQueryService.getChartData(range);
      entityStats = await this.getEntityStatsFromAE(range);
    } else {
      const d1Result = await this.trafficRepo.getDashboardStats(range);
      const d1ChartData = await this.trafficRepo.getChartData(range);
      metrics = this.formatD1Metrics(d1Result);
      chartData = this.formatD1ChartData(d1ChartData);
      entityStats = await this.getEntityStatsFromD1(range);
    }

    return {
      metrics,
      chartData,
      entityStats,
      dataSource,
      queryTime: new Date().toISOString(),
      range,
    };
  }

  /**
   * 获取趋势报告数据
   * 支持跨时间段查询，自动合并 AE 和 D1 数据
   */
  async getTrendReport(
    startDate: string,
    endDate: string,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    campaignId?: string
  ): Promise<ChartDataPoint[]> {
    const dataSource = determineDataSource(startDate, endDate);

    if (dataSource === 'AE') {
      return this.analyticsQueryService.getTrendReport(startDate, endDate, interval, campaignId);
    }

    const trendData = await this.trafficRepo.getTrend(campaignId || '', startDate, endDate);
    return this.formatD1TrendData(trendData);
  }

  /**
   * 获取近期点击数据
   * 根据时间范围选择数据源
   */
  async getRecentClicks(params: {
    limit?: number;
    range?: string;
    campaignId?: string;
  }): Promise<{ list: any[]; total: number; dataSource: DataSource }> {
    const { startDate, endDate } = this.getDateRange(params.range || 'today');
    const dataSource = determineDataSource(startDate, endDate);

    if (dataSource === 'AE') {
      const result = await this.analyticsQueryService.getRecentClicks({
        limit: params.limit || 50,
        campaignId: params.campaignId,
      });
      return {
        list: result.list,
        total: result.total,
        dataSource: 'AE',
      };
    }

    const clicks = await this.trafficRepo.getRecentClicks(params.limit || 50);
    return {
      list: clicks,
      total: clicks.length,
      dataSource: 'D1',
    };
  }

  /**
   * 获取实体统计数据
   */
  async getEntityStats(entityType: string, range: string): Promise<EntityStatItem[]> {
    const { startDate, endDate } = this.getDateRange(range);
    const dataSource = determineDataSource(startDate, endDate);

    if (dataSource === 'AE') {
      return this.analyticsQueryService.getEntityStats(entityType, range);
    }

    const stats = await this.trafficRepo.getEntityStats(entityType, range);
    return stats.map((item: any) => ({
      name: item.name || 'Unknown',
      clicks: Number(item.clicks) || 0,
      impressions: Number(item.impressions) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      unique_visitors: 0,
    }));
  }

  /**
   * 从 AE 获取实体统计数据
   */
  private async getEntityStatsFromAE(range: string): Promise<Record<string, EntityStatItem[]>> {
    const entityTypes = ['campaigns', 'countries', 'device_types', 'browsers'];
    const stats: Record<string, EntityStatItem[]> = {};

    for (const entityType of entityTypes) {
      try {
        stats[entityType] = await this.analyticsQueryService.getEntityStats(entityType, range);
      } catch (error) {
        console.error(`[DashboardQueryService] Failed to get ${entityType} stats from AE:`, error);
        stats[entityType] = [];
      }
    }

    return stats;
  }

  /**
   * 从 D1 获取实体统计数据
   */
  private async getEntityStatsFromD1(range: string): Promise<Record<string, EntityStatItem[]>> {
    const entityTypes = ['campaigns', 'countries', 'device_types', 'browsers'];
    const stats: Record<string, EntityStatItem[]> = {};

    for (const entityType of entityTypes) {
      try {
        const entityStats = await this.trafficRepo.getEntityStats(entityType, range);
        stats[entityType] = entityStats.map((item: any) => ({
          name: item.name || 'Unknown',
          clicks: Number(item.clicks) || 0,
          impressions: Number(item.impressions) || 0,
          conversions: Number(item.conversions) || 0,
          spend: Number(item.spend) || 0,
          revenue: Number(item.revenue) || 0,
          unique_visitors: 0,
        }));
      } catch (error) {
        console.error(`[DashboardQueryService] Failed to get ${entityType} stats from D1:`, error);
        stats[entityType] = [];
      }
    }

    return stats;
  }

  /**
   * 格式化 D1 指标数据
   */
  private formatD1Metrics(data: any[]): DashboardMetric[] {
    const metricsMap: Record<string, any> = {};
    for (const item of data) {
      metricsMap[item.key] = item;
    }

    return [
      { key: 'clicks', label: 'Clicks', value: metricsMap.clicks?.value || '0', isPositive: true, format: 'number' as const },
      { key: 'unique_clicks_campaign', label: 'Unique clicks (campaign)', value: metricsMap.unique_clicks_campaign?.value || '0', isPositive: true, format: 'number' as const },
      { key: 'conversions', label: 'Conversions', value: metricsMap.conversions?.value || '0', isPositive: true, format: 'number' as const },
      { key: 'spend', label: 'Cost', value: metricsMap.spend?.value || '$0.00', isPositive: false, format: 'currency' as const },
      { key: 'revenue_confirmed', label: 'Revenue (confirmed)', value: metricsMap.revenue_confirmed?.value || '$0.00', isPositive: true, format: 'currency' as const },
      { key: 'profit_confirmed', label: 'Profit/Loss (confirmed)', value: metricsMap.profit_confirmed?.value || '$0.00', isPositive: true, format: 'currency' as const },
      { key: 'roi_confirmed', label: 'ROI (confirmed)', value: metricsMap.roi_confirmed?.value || '0%', isPositive: true, format: 'percentage' as const },
    ];
  }

  /**
   * 格式化 D1 图表数据
   */
  private formatD1ChartData(data: any[]): ChartDataPoint[] {
    return data.map((item: any) => ({
      date: item.date || '',
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      impressions: Number(item.impressions) || 0,
    }));
  }

  /**
   * 格式化 D1 趋势数据
   */
  private formatD1TrendData(data: any[]): ChartDataPoint[] {
    return data.map((item: any) => ({
      date: item.date || '',
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      impressions: Number(item.impressions) || 0,
    }));
  }

  /**
   * 获取指定类型的报表数据
   * 支持 traffic | conversion | financial | roi
   */
  async getReport(
    reportType: 'traffic' | 'conversion' | 'financial' | 'roi',
    options: {
      startDate: string;
      endDate: string;
      groupBy: string[];
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    }
  ): Promise<any[]> {
    const { startDate, endDate, groupBy, limit, sortBy, sortOrder } = options;
    const dataSource = determineDataSource(startDate, endDate);

    const baseQuery = {
      startDate,
      endDate,
      groupBy,
      limit,
      sortBy,
      sortOrder,
    };

    switch (reportType) {
      case 'traffic':
        return this.getTrafficReport(dataSource, baseQuery);
      case 'conversion':
        return this.getConversionReport(dataSource, baseQuery);
      case 'financial':
        return this.getFinancialReport(dataSource, baseQuery);
      case 'roi':
        return this.getROIReport(dataSource, baseQuery);
      default:
        return [];
    }
  }

  /**
   * 获取流量报表
   */
  private async getTrafficReport(
    dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
    if (dataSource === 'AE') {
      const stats = await this.analyticsQueryService.getEntityStats('campaigns', 'last30days');
      return stats.map((s: any) => ({
        date: s.name || 'N/A',
        clicks: s.clicks,
        impressions: s.impressions,
        unique_visitors: s.unique_visitors,
        conversions: s.conversions,
        cr: s.clicks > 0 ? ((s.conversions / s.clicks) * 100).toFixed(2) + '%' : '0%',
      }));
    }

    const stats = await this.trafficRepo.getEntityStats('campaigns', 'last30days');
    return stats.map((item: any) => ({
      date: item.name || 'N/A',
      clicks: Number(item.clicks) || 0,
      impressions: Number(item.impressions) || 0,
      unique_visitors: 0,
      conversions: Number(item.conversions) || 0,
      cr: Number(item.clicks) > 0 ? ((Number(item.conversions) / Number(item.clicks)) * 100).toFixed(2) + '%' : '0%',
    }));
  }

  /**
   * 获取转化报表
   */
  private async getConversionReport(
    dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
    if (dataSource === 'AE') {
      const stats = await this.analyticsQueryService.getEntityStats('campaigns', 'last30days');
      return stats.map((s: any) => ({
        date: s.name || 'N/A',
        conversions: s.conversions,
        revenue: s.revenue,
        cost: s.spend,
        profit: s.revenue - s.spend,
        roi: s.spend > 0 ? (((s.revenue - s.spend) / s.spend) * 100).toFixed(2) + '%' : '0%',
      }));
    }

    const stats = await this.trafficRepo.getEntityStats('campaigns', 'last30days');
    return stats.map((item: any) => ({
      date: item.name || 'N/A',
      conversions: Number(item.conversions) || 0,
      revenue: Number(item.revenue) || 0,
      cost: Number(item.spend) || 0,
      profit: (Number(item.revenue) || 0) - (Number(item.spend) || 0),
      roi: Number(item.spend) > 0 ? (((Number(item.revenue) - Number(item.spend)) / Number(item.spend)) * 100).toFixed(2) + '%' : '0%',
    }));
  }

  /**
   * 获取财务报表
   */
  private async getFinancialReport(
    dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
    if (dataSource === 'AE') {
      const stats = await this.analyticsQueryService.getEntityStats('campaigns', 'last30days');
      return stats.map((s: any) => ({
        date: s.name || 'N/A',
        spend: s.spend,
        revenue: s.revenue,
        profit: s.revenue - s.spend,
        margin: s.revenue > 0 ? (((s.revenue - s.spend) / s.revenue) * 100).toFixed(2) + '%' : '0%',
      }));
    }

    const stats = await this.trafficRepo.getEntityStats('campaigns', 'last30days');
    return stats.map((item: any) => ({
      date: item.name || 'N/A',
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      profit: (Number(item.revenue) || 0) - (Number(item.spend) || 0),
      margin: Number(item.revenue) > 0 ? (((Number(item.revenue) - Number(item.spend)) / Number(item.revenue)) * 100).toFixed(2) + '%' : '0%',
    }));
  }

  /**
   * 获取ROI报表
   */
  private async getROIReport(
    dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
    if (dataSource === 'AE') {
      const stats = await this.analyticsQueryService.getEntityStats('campaigns', 'last30days');
      return stats.map((s: any) => ({
        date: s.name || 'N/A',
        spend: s.spend,
        revenue: s.revenue,
        profit: s.revenue - s.spend,
        roi: s.spend > 0 ? (((s.revenue - s.spend) / s.spend) * 100).toFixed(2) + '%' : '0%',
        epc: s.clicks > 0 ? (s.revenue / s.clicks).toFixed(2) : '0',
        cpc: s.clicks > 0 ? (s.spend / s.clicks).toFixed(2) : '0',
      }));
    }

    const stats = await this.trafficRepo.getEntityStats('campaigns', 'last30days');
    return stats.map((item: any) => {
      const clicks = Number(item.clicks) || 0;
      const spend = Number(item.spend) || 0;
      const revenue = Number(item.revenue) || 0;
      return {
        date: item.name || 'N/A',
        spend,
        revenue,
        profit: revenue - spend,
        roi: spend > 0 ? (((revenue - spend) / spend) * 100).toFixed(2) + '%' : '0%',
        epc: clicks > 0 ? (revenue / clicks).toFixed(2) : '0',
        cpc: clicks > 0 ? (spend / clicks).toFixed(2) : '0',
      };
    });
  }

  /**
   * 根据 range 获取日期范围
   */
  private getDateRange(range: string): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0]!;
    let startDate: string = endDate;

    switch (range) {
      case 'today':
        break;
      case 'yesterday':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
        break;
      case 'last30days':
      case 'last3months':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
        break;
      case 'thismonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
        break;
      case 'lastmonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]!;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
        break;
    }

    return { startDate, endDate };
  }
}

export function createDashboardQueryService(env: Env): DashboardQueryService {
  return new DashboardQueryService(env);
}
