/**
 * @fileoverview Dashboard 鏁版嵁鏌ヨ鏈嶅姟
 * @description 浠?D1 鑾峰彇鏁版嵁
 * @module services/analytics/dashboard-query.service
 *
 * 鏁版嵁瀛樺偍鏋舵瀯:
 *   - DO (Durable Objects): 鍞竴鎬ф鏌ュ拰璁℃暟鍣?
 *   - D1: 涓诲瓨鍌紝鐢ㄤ簬鎵€鏈夋暟鎹煡璇?
 *
 * 鏁版嵁娴?
 *   鐐瑰嚮璇锋眰 鈫?DO(鍞竴鎬ф鏌? 鈫?D1(涓诲瓨鍌?
 *
 * Dashboard鏁版嵁璇诲彇閫昏緫:
 *   - 鎵€鏈夋暟鎹?鈹€鈹€鈻?D1璇诲彇
 *     浼樼偣: 瀹屾暣鍑嗙‘銆佹案涔呭瓨鍌?
 *
 * 杈撳叆: 鏌ヨ鍙傛暟锛坮ange, campaignId, filters锛?
 * 杈撳嚭: Dashboard 缁熻鏁版嵁
 * 閫昏緫浜や簰:
 *   - 琚?analytics.routes.ts 璋冪敤
 *   - 鍐呴儴璋冪敤 TrafficRepository (D1)
 * 鍓嶅悗绔氦浜? 閫氳繃 API 杩斿洖缁熶竴鏍煎紡鐨勬暟鎹?
 */

import type { Env } from '@/config/env';
import { getD1Connection, TrafficRepository } from '@/handlers/d1';
import { getTrackingStatsStub } from '@/handlers/do';
import type { ReportDimension, ReportFilter, ReportMetric, ReportQueryOptions } from '@/handlers/d1/traffic.repo';

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
   * 鑾峰彇 Dashboard 缁熻鏁版嵁
   * 鏍规嵁鏃堕棿鑼冨洿浠庝笉鍚屾暟鎹簮鑾峰彇鏁版嵁
   * - < 90澶╂暟鎹?鈹€鈹€鈻?DO璇诲彇
   * - > 90澶╂暟鎹?鈹€鈹€鈻?D1璇诲彇
   */
  async getDashboardStats(range: string, env: Env, campaignId?: string): Promise<DashboardQueryResult> {
    // Only keep DO on the hot "today" path until DO/D1 aggregates are fully aligned.
    const useDO = range === 'today' && !campaignId;
    const dataSource: DataSource = useDO ? 'DO' : 'D1';

    console.log(`[DashboardQueryService] Range: ${range}, Campaign: ${campaignId || 'all'}, DataSource: ${dataSource}`);

    if (useDO) {
      // 浠?DO 鑾峰彇鏁版嵁
      return this.getDashboardStatsFromDO(range, env);
    } else {
      // 浠?D1 鑾峰彇鏁版嵁
      return this.getDashboardStatsFromD1(range, campaignId);
    }
  }

  /**
   * 浠?D1 鑾峰彇 Dashboard 缁熻鏁版嵁
   */
  private async getDashboardStatsFromD1(range: string, campaignId?: string): Promise<DashboardQueryResult> {
    const d1Result = await this.trafficRepo.getDashboardStats(range, campaignId);
    const d1ChartData = await this.trafficRepo.getChartData(range, campaignId);
    const metrics = this.formatD1Metrics(d1Result);
    const chartData = this.formatD1ChartData(d1ChartData);
    const entityStats = await this.getEntityStatsFromD1(range, campaignId);

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
   * 浠?DO 鑾峰彇 Dashboard 缁熻鏁版嵁
   */
  private async getDashboardStatsFromDO(range: string, env: Env): Promise<DashboardQueryResult> {
    try {
      const trackingDO = getTrackingStatsStub(env, 'global-stats');

      // 骞惰鑾峰彇缁熻鏁版嵁銆佸浘琛ㄦ暟鎹拰瀹炰綋缁熻
      const [statsResponse, chartResponse, entityStatsResponse] = await Promise.all([
        trackingDO.fetch('http://do/stats'),
        trackingDO.fetch(`http://do/chart-data?range=${range}`),
        trackingDO.fetch(`http://do/entity-stats?range=${range}`),
      ]);

      const stats = await statsResponse.json() as DOStatsResponse;
      const chartData = await chartResponse.json() as DOChartResponse;
      const entityStatsData = await entityStatsResponse.json() as DOEntityStatsResponse;

      // 鏍煎紡鍖栨寚鏍囨暟鎹?
      const metrics = this.formatDOMetrics(stats);

      // 鏍煎紡鍖栧浘琛ㄦ暟鎹?
      const formattedChartData = chartData.chartData || [];

      // 鏍煎紡鍖栧疄浣撶粺璁℃暟鎹?
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
      // 闄嶇骇鍒?D1
      return this.getDashboardStatsFromD1(range);
    }
  }

  /**
   * 鏍煎紡鍖?DO 鎸囨爣鏁版嵁
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
   * 鑾峰彇瓒嬪娍鎶ュ憡鏁版嵁
   * 浠?D1 鑾峰彇鏁版嵁
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
   * 鑾峰彇杩戞湡鐐瑰嚮鏁版嵁
   * 浠?D1 鑾峰彇鏁版嵁
   */
  async getRecentClicks(params: {
    limit?: number;
    range?: string;
    campaignId?: string;
    country?: string;
    device?: string;
  }): Promise<{ list: any[]; total: number; dataSource: DataSource }> {
    const clicks = await this.trafficRepo.getRecentClicks({
      limit: params.limit || 50,
      range: params.range,
      campaignId: params.campaignId,
    });
    return {
      list: clicks,
      total: clicks.length,
      dataSource: 'D1',
    };
  }

  /**
   * 鑾峰彇瀹炰綋缁熻鏁版嵁
   * 浠?D1 鑾峰彇鏁版嵁
   */
  async getEntityStats(entityType: string, range: string, campaignId?: string): Promise<EntityStatItem[]> {
    const stats = await this.trafficRepo.getEntityStats(entityType, range, campaignId);
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
   * 浠?D1 鑾峰彇瀹炰綋缁熻鏁版嵁
   */
  private async getEntityStatsFromD1(range: string, campaignId?: string): Promise<Record<string, EntityStatItem[]>> {
    const entityTypes = ['campaigns', 'countries', 'device_types', 'browsers'];
    const stats: Record<string, EntityStatItem[]> = {};

    for (const entityType of entityTypes) {
      try {
        const entityStats = await this.trafficRepo.getEntityStats(entityType, range, campaignId);
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
        // 闈欓粯澶勭悊閿欒锛岄伩鍏嶅奖鍝嶅叾浠栧疄浣撶被鍨嬬殑鏁版嵁鍔犺浇
        // 甯歌鍘熷洜锛氭暟鎹簮涓病鏈夎绫诲瀷鐨勬暟鎹紝鎴栬€呭紩鐢ㄤ簡宸插垹闄ょ殑瀹炰綋
        console.warn(`[DashboardQueryService] ${entityType} stats from D1: No data available`);
        stats[entityType] = [];
      }
    }

    return stats;
  }

  /**
   * 鏍煎紡鍖?D1 鎸囨爣鏁版嵁
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
   * 鏍煎紡鍖?D1 鍥捐〃鏁版嵁
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
   * 鏍煎紡鍖?D1 瓒嬪娍鏁版嵁
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
   * 鑾峰彇鎸囧畾绫诲瀷鐨勬姤琛ㄦ暟鎹?
   * 鏀寔 traffic | conversion | financial | roi
   * 浠?D1 鑾峰彇鏁版嵁
   */
  async getReport(
    reportType: 'traffic' | 'conversion' | 'financial' | 'roi',
    options: {
      startDate: string;
      endDate: string;
      groupBy: ReportDimension[];
      metrics?: ReportMetric[];
      filters?: ReportFilter[];
      limit: number;
      sortBy: ReportDimension | ReportMetric;
      sortOrder: 'asc' | 'desc';
    }
  ): Promise<any[]> {
    return this.getCustomReport({
      ...options,
      metrics: options.metrics?.length ? options.metrics : this.getDefaultMetricsForReportType(reportType),
    });
  }

  async getCustomReport(options: ReportQueryOptions): Promise<any[]> {
    return this.trafficRepo.getCustomReport(options);
  }

  private getDefaultMetricsForReportType(reportType: 'traffic' | 'conversion' | 'financial' | 'roi'): ReportMetric[] {
    switch (reportType) {
      case 'traffic':
        return ['clicks', 'impressions', 'unique_visitors', 'conversions', 'cr'];
      case 'conversion':
        return ['conversions', 'revenue', 'cost', 'profit', 'roi'];
      case 'financial':
        return ['spend', 'revenue', 'profit', 'margin'];
      case 'roi':
        return ['spend', 'revenue', 'profit', 'roi', 'epc', 'cpc'];
      default:
        return ['clicks', 'conversions', 'revenue'];
    }
  }
}

export function createDashboardQueryService(env: Env): DashboardQueryService {
  return new DashboardQueryService(env);
}
