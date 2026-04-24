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
import { createCustomMetricService } from '@/services/customMetric/customMetric.service';
import { createMetricCalculationEngine, type MetricCalculationEngine } from '@/services/customMetric/metric.engine';
import type { CustomMetric, MetricCalculationContext } from '@/types/customMetric';

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

const BUILTIN_REPORT_METRICS: ReportMetric[] = [
  'clicks',
  'impressions',
  'conversions',
  'revenue',
  'spend',
  'cost',
  'profit',
  'roi',
  'cr',
  'margin',
  'epc',
  'cpc',
  'unique_visitors',
  'fraud_clicks',
  'bot_clicks',
  'avg_fraud_score',
  'blacklist_hits',
  'blacklist_rate',
  'rule_hits',
  'blocked',
];

const BUILTIN_REPORT_METRIC_SET = new Set<ReportMetric>(BUILTIN_REPORT_METRICS);

const BUILTIN_METRIC_ALIASES: Record<string, ReportMetric> = {
  uniqueVisitors: 'unique_visitors',
};

export class DashboardQueryService {
  private trafficRepo: TrafficRepository;
  private readonly customMetricService: ReturnType<typeof createCustomMetricService>;
  private readonly metricEngine: MetricCalculationEngine;

  constructor(env: Env) {
    this.trafficRepo = new TrafficRepository(getD1Connection(env));
    this.customMetricService = createCustomMetricService(env);
    this.metricEngine = createMetricCalculationEngine();
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
    const groupBy = (options.groupBy || []).filter((item, index, array) => array.indexOf(item) === index);
    const requestedMetrics = (options.metrics || ['clicks']).filter(
      (item, index, array) => array.indexOf(item) === index
    );
    const filters = options.filters || [];
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
    const requestedLimit = Math.min(Math.max(Number(options.limit) || 100, 1), 5000);

    const activeCustomMetrics = await this.customMetricService.getActiveMetrics();
    const customMetricByName = new Map<string, CustomMetric>(
      activeCustomMetrics.map((metric) => [metric.name, metric])
    );

    const requestedCustomMetricNames = requestedMetrics.filter((metric) => customMetricByName.has(metric));
    const customFilterMetricNames = filters
      .map((filter) => filter.field)
      .filter((field, index, array) => array.indexOf(field) === index && customMetricByName.has(field));
    const customFilterFieldSet = new Set<string>(customFilterMetricNames);
    const customFilters = filters.filter((filter) => customFilterFieldSet.has(filter.field));
    const sortByCandidate = options.sortBy || requestedMetrics[0] || groupBy[0] || 'summary';
    const customSortMetricName = customMetricByName.has(sortByCandidate) ? sortByCandidate : null;

    const targetCustomMetricNames = Array.from(
      new Set([
        ...requestedCustomMetricNames,
        ...customFilterMetricNames,
        ...(customSortMetricName ? [customSortMetricName] : []),
      ])
    );

    const metricCalculationOrder: string[] = [];
    const metricVariables = new Map<string, string[]>();
    const requiredBaseMetrics = new Set<ReportMetric>();
    const visiting = new Set<string>();
    const visited = new Set<string>();

    for (const metric of requestedMetrics) {
      const normalized = this.normalizeBuiltinMetricName(metric);
      if (normalized) {
        requiredBaseMetrics.add(normalized);
      }
    }

    const visitCustomMetric = (metricName: string) => {
      if (visited.has(metricName)) {
        return;
      }

      if (visiting.has(metricName)) {
        throw new Error(`Circular custom metric dependency detected: ${metricName}`);
      }

      const metric = customMetricByName.get(metricName);
      if (!metric) {
        return;
      }

      visiting.add(metricName);
      const variables = this.metricEngine.extractVariables(metric.formula);
      metricVariables.set(metricName, variables);

      for (const variable of variables) {
        if (customMetricByName.has(variable)) {
          visitCustomMetric(variable);
          continue;
        }

        const normalizedBuiltin = this.normalizeBuiltinMetricName(variable);
        if (normalizedBuiltin) {
          requiredBaseMetrics.add(normalizedBuiltin);
        }
      }

      visiting.delete(metricName);
      visited.add(metricName);
      metricCalculationOrder.push(metricName);
    };

    for (const metricName of targetCustomMetricNames) {
      visitCustomMetric(metricName);
    }

    if (requiredBaseMetrics.size === 0) {
      requiredBaseMetrics.add('clicks');
    }

    const baseFilters = filters.filter((filter) => !customMetricByName.has(filter.field));
    const requiresInMemoryPostProcess =
      targetCustomMetricNames.length > 0 ||
      baseFilters.length !== filters.length ||
      Boolean(customSortMetricName);

    const baseLimit = requiresInMemoryPostProcess
      ? Math.min(Math.max(requestedLimit * 5, 500), 5000)
      : requestedLimit;
    const baseSortBy: ReportDimension | ReportMetric = customSortMetricName
      ? (Array.from(requiredBaseMetrics)[0] || groupBy[0] || 'summary')
      : sortByCandidate;

    const baseRows = await this.trafficRepo.getCustomReport({
      ...options,
      groupBy,
      metrics: Array.from(requiredBaseMetrics),
      filters: baseFilters,
      limit: baseLimit,
      sortBy: baseSortBy,
      sortOrder,
    });

    const rows = baseRows.map((item) => ({ ...item } as Record<string, unknown>));

    for (const row of rows) {
      if (metricCalculationOrder.length > 0) {
        this.populateCustomMetricValues(row, metricCalculationOrder, metricVariables, customMetricByName);
      }
    }

    const filteredRows = rows.filter((row) => this.matchesAllFilters(row, customFilters));
    filteredRows.sort((left, right) => this.compareRows(left, right, sortByCandidate, sortOrder));

    const projected = filteredRows.slice(0, requestedLimit).map((row) =>
      this.projectReportRow(row, groupBy, requestedMetrics)
    );

    return projected;
  }

  async getReportMetadata(): Promise<{
    dimensions: Array<{ value: string; label: string; hint: string }>;
    metrics: Array<{ value: string; label: string; format: 'number' | 'currency' | 'percent' }>;
  }> {
    return this.trafficRepo.getReportMetadata();
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

  private normalizeBuiltinMetricName(metric: string): ReportMetric | null {
    if (BUILTIN_REPORT_METRIC_SET.has(metric)) {
      return metric as ReportMetric;
    }

    const alias = BUILTIN_METRIC_ALIASES[metric];
    return alias && BUILTIN_REPORT_METRIC_SET.has(alias) ? alias : null;
  }

  private buildMetricContext(row: Record<string, unknown>): MetricCalculationContext {
    const context: MetricCalculationContext = {
      clicks: 0,
      impressions: 0,
      conversions: 0,
      revenue: 0,
      spend: 0,
      cost: 0,
      profit: 0,
      uniqueVisitors: 0,
    };

    for (const [key, value] of Object.entries(row)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        context[key] = numeric;
      }
    }

    if (context.unique_visitors !== undefined && context.uniqueVisitors === undefined) {
      context.uniqueVisitors = context.unique_visitors;
    }
    if (context.uniqueVisitors !== undefined && context.unique_visitors === undefined) {
      context.unique_visitors = context.uniqueVisitors;
    }
    if (context.spend !== undefined && context.cost === undefined) {
      context.cost = context.spend;
    }
    if (context.cost !== undefined && context.spend === undefined) {
      context.spend = context.cost;
    }

    return context;
  }

  private populateCustomMetricValues(
    row: Record<string, unknown>,
    calculationOrder: string[],
    metricVariables: Map<string, string[]>,
    customMetricByName: Map<string, CustomMetric>
  ) {
    const context = this.buildMetricContext(row);

    for (const metricName of calculationOrder) {
      const metric = customMetricByName.get(metricName);
      if (!metric) {
        continue;
      }

      const variables = metricVariables.get(metricName) || [];
      for (const variable of variables) {
        const aliased = BUILTIN_METRIC_ALIASES[variable];
        if (aliased) {
          if (context[variable] === undefined && context[aliased] !== undefined) {
            context[variable] = context[aliased];
          }
          if (context[aliased] === undefined && context[variable] !== undefined) {
            context[aliased] = context[variable];
          }
        }

        if (context[variable] === undefined) {
          context[variable] = 0;
        }
      }

      const result = this.metricEngine.calculate(metric, context);
      const numericValue = Number(result.value);
      const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

      context[metricName] = safeValue;
      row[metricName] = safeValue;
    }
  }

  private matchesAllFilters(row: Record<string, unknown>, filters: ReportFilter[]): boolean {
    for (const filter of filters) {
      const actual = row[filter.field];
      if (!this.evaluateFilterCondition(actual, filter.operator, filter.value)) {
        return false;
      }
    }

    return true;
  }

  private evaluateFilterCondition(
    actual: unknown,
    operator: ReportFilter['operator'],
    expected: string | number
  ): boolean {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    const canCompareAsNumber = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber);

    switch (operator) {
      case 'eq':
        return canCompareAsNumber ? actualNumber === expectedNumber : String(actual ?? '') === String(expected);
      case 'neq':
        return canCompareAsNumber ? actualNumber !== expectedNumber : String(actual ?? '') !== String(expected);
      case 'contains':
        return String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());
      case 'gt':
        return canCompareAsNumber && actualNumber > expectedNumber;
      case 'gte':
        return canCompareAsNumber && actualNumber >= expectedNumber;
      case 'lt':
        return canCompareAsNumber && actualNumber < expectedNumber;
      case 'lte':
        return canCompareAsNumber && actualNumber <= expectedNumber;
      default:
        return true;
    }
  }

  private compareRows(
    left: Record<string, unknown>,
    right: Record<string, unknown>,
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): number {
    const leftValue = left[sortBy];
    const rightValue = right[sortBy];
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);

    const rawResult =
      Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'en-US', {
            numeric: true,
            sensitivity: 'base',
          });

    return sortOrder === 'asc' ? rawResult : -rawResult;
  }

  private projectReportRow(
    row: Record<string, unknown>,
    groupBy: ReportDimension[],
    metrics: ReportMetric[]
  ): Record<string, unknown> {
    const selectedColumns = groupBy.length > 0 ? [...groupBy, ...metrics] : ['summary', ...metrics];
    const projected: Record<string, unknown> = {};

    for (const column of selectedColumns) {
      projected[column] = row[column] ?? (column === 'summary' ? 'Total' : 0);
    }

    return projected;
  }
}

export function createDashboardQueryService(env: Env): DashboardQueryService {
  return new DashboardQueryService(env);
}
