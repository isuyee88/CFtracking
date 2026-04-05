/**
 * @fileoverview Dashboard 数据查询服务
 * @description 从 D1 获取数据
 * @module services/analytics/dashboard-query.service
 *
 * 数据存储架构:
 *   - DO (Durable Objects): 唯一性检查和计数器
 *   - D1: 主存储，用于所有数据查询
 *
 * 数据流:
 *   点击请求 → DO(唯一性检查) → D1(主存储)
 *
 * Dashboard数据读取逻辑:
 *   - 所有数据 ──► D1读取
 *     优点: 完整准确、永久存储
 *
 * 输入: 查询参数（range, campaignId, filters）
 * 输出: Dashboard 统计数据
 * 逻辑交互:
 *   - 被 analytics.routes.ts 调用
 *   - 内部调用 TrafficRepository (D1)
 * 前后端交互: 通过 API 返回统一格式的数据
 */

import type { Env } from '@/config/env';
import { getD1Connection, TrafficRepository } from '@/handlers/d1';
import { getTrackingStatsStub } from '@/handlers/do';

export type DataSource = 'D1' | 'DO';

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

interface DOStatsResponse {
  todayClicks?: number;
  uniqueClicks?: number;
  todayConversions?: number;
  todayCost?: number;
  todayRevenue?: number;
  todayProfit?: number;
  todayROI?: number;
}

interface DOChartResponse {
  chartData?: ChartDataPoint[];
}

interface DOEntityStatsResponse {
  stats?: Record<string, EntityStatItem[]>;
}

export class DashboardQueryService {
  private trafficRepo: TrafficRepository;

  constructor(env: Env) {
    this.trafficRepo = new TrafficRepository(getD1Connection(env));
  }

  /**
   * 获取 Dashboard 统计数据
   * 根据时间范围从不同数据源获取数据
   * - < 90天数据 ──► DO读取
   * - > 90天数据 ──► D1读取
   */
  async getDashboardStats(range: string, env: Env): Promise<DashboardQueryResult> {
    // Only keep DO on the hot "today" path until DO/D1 aggregates are fully aligned.
    const useDO = range === 'today';
    const dataSource: DataSource = useDO ? 'DO' : 'D1';

    console.log(`[DashboardQueryService] Range: ${range}, DataSource: ${dataSource}`);

    if (useDO) {
      // 从 DO 获取数据
      return this.getDashboardStatsFromDO(range, env);
    } else {
      // 从 D1 获取数据
      return this.getDashboardStatsFromD1(range);
    }
  }

  /**
   * 从 D1 获取 Dashboard 统计数据
   */
  private async getDashboardStatsFromD1(range: string): Promise<DashboardQueryResult> {
    const d1Result = await this.trafficRepo.getDashboardStats(range);
    const d1ChartData = await this.trafficRepo.getChartData(range);
    const metrics = this.formatD1Metrics(d1Result);
    const chartData = this.formatD1ChartData(d1ChartData);
    const entityStats = await this.getEntityStatsFromD1(range);

    return {
      metrics,
      chartData,
      entityStats,
      dataSource: 'D1',
      queryTime: new Date().toISOString(),
      range,
    };
  }

  /**
   * 从 DO 获取 Dashboard 统计数据
   */
  private async getDashboardStatsFromDO(range: string, env: Env): Promise<DashboardQueryResult> {
    try {
      const trackingDO = getTrackingStatsStub(env, 'global-stats');
      
      // 并行获取统计数据、图表数据和实体统计
      const [statsResponse, chartResponse, entityStatsResponse] = await Promise.all([
        trackingDO.fetch('http://do/stats'),
        trackingDO.fetch(`http://do/chart-data?range=${range}`),
        trackingDO.fetch(`http://do/entity-stats?range=${range}`),
      ]);
      
      const stats = await statsResponse.json() as DOStatsResponse;
      const chartData = await chartResponse.json() as DOChartResponse;
      const entityStatsData = await entityStatsResponse.json() as DOEntityStatsResponse;
      
      // 格式化指标数据
      const metrics = this.formatDOMetrics(stats);
      
      // 格式化图表数据
      const formattedChartData = chartData.chartData || [];
      
      // 格式化实体统计数据
      const entityStats = entityStatsData.stats || {};
      
      return {
        metrics,
        chartData: formattedChartData,
        entityStats,
        dataSource: 'DO',
        queryTime: new Date().toISOString(),
        range,
      };
    } catch (error) {
      console.error('[DashboardQueryService] Error fetching from DO:', error);
      // 降级到 D1
      return this.getDashboardStatsFromD1(range);
    }
  }

  /**
   * 格式化 DO 指标数据
   */
  private formatDOMetrics(data: any): DashboardMetric[] {
    return [
      { key: 'clicks', label: 'Clicks', value: data.todayClicks?.toString() || '0', isPositive: true, format: 'number' as const },
      { key: 'unique_clicks_campaign', label: 'Unique clicks (campaign)', value: data.uniqueClicks?.toString() || '0', isPositive: true, format: 'number' as const },
      { key: 'conversions', label: 'Conversions', value: data.todayConversions?.toString() || '0', isPositive: true, format: 'number' as const },
      { key: 'spend', label: 'Cost', value: `$${data.todayCost?.toFixed(2) || '0.00'}`, isPositive: false, format: 'currency' as const },
      { key: 'revenue_confirmed', label: 'Revenue (confirmed)', value: `$${data.todayRevenue?.toFixed(2) || '0.00'}`, isPositive: true, format: 'currency' as const },
      { key: 'profit_confirmed', label: 'Profit/Loss (confirmed)', value: `$${data.todayProfit?.toFixed(2) || '0.00'}`, isPositive: true, format: 'currency' as const },
      { key: 'roi_confirmed', label: 'ROI (confirmed)', value: `${data.todayROI?.toFixed(2) || '0'}%`, isPositive: true, format: 'percentage' as const },
    ];
  }

  /**
   * 获取趋势报告数据
   * 从 D1 获取数据
   */
  async getTrendReport(
    startDate: string,
    endDate: string,
    _interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    campaignId?: string
  ): Promise<ChartDataPoint[]> {
    const trendData = await this.trafficRepo.getTrend(campaignId || '', startDate, endDate);
    return this.formatD1TrendData(trendData);
  }

  /**
   * 获取近期点击数据
   * 从 D1 获取数据
   */
  async getRecentClicks(params: {
    limit?: number;
    range?: string;
    campaignId?: string;
    country?: string;
    device?: string;
  }): Promise<{ list: any[]; total: number; dataSource: DataSource }> {
    const clicks = await this.trafficRepo.getRecentClicks(params.limit || 50);
    return {
      list: clicks,
      total: clicks.length,
      dataSource: 'D1',
    };
  }

  /**
   * 获取实体统计数据
   * 从 D1 获取数据
   */
  async getEntityStats(entityType: string, range: string): Promise<EntityStatItem[]> {
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
        // 静默处理错误，避免影响其他实体类型的数据加载
        // 常见原因：数据源中没有该类型的数据，或者引用了已删除的实体
        console.warn(`[DashboardQueryService] ${entityType} stats from D1: No data available`);
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
   * 从 D1 获取数据
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
    const dataSource: DataSource = 'D1';

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
   * 从 D1 获取数据
   */
  private async getTrafficReport(
    _dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
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
   * 从 D1 获取数据
   */
  private async getConversionReport(
    _dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
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
   * 从 D1 获取数据
   */
  private async getFinancialReport(
    _dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
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
   * 从 D1 获取数据
   */
  private async getROIReport(
    _dataSource: DataSource,
    _query: { startDate: string; endDate: string; groupBy: string[]; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<any[]> {
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

}

export function createDashboardQueryService(env: Env): DashboardQueryService {
  return new DashboardQueryService(env);
}
