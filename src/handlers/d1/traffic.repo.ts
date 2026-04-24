/**
 * @fileoverview Traffic 数据仓库
 * @description 封装 Traffic Summary 相关的所有数据库操作
 * @module handlers/d1/traffic.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { TrafficSummary, TrackingMetrics } from '@/types/tracking';

export type ReportDimension = string;

export type ReportMetric = string;

export type ReportFilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator;
  value: string | number;
}

export interface ReportQueryOptions {
  startDate: string;
  endDate: string;
  groupBy?: ReportDimension[];
  metrics?: ReportMetric[];
  filters?: ReportFilter[];
  limit?: number;
  sortBy?: ReportDimension | ReportMetric;
  sortOrder?: 'asc' | 'desc';
}

export class TrafficRepository extends BaseRepository<TrafficSummary> {
  private static readonly REPORT_DIMENSION_MAP: Record<string, string> = {
    date: 'date',
    campaign: 'campaignId',
    offer: 'offerId',
    flow: 'flowId',
    landing: 'landingPageId',
    country: 'country',
    device: 'device',
    browser: 'browser',
    source: 'campaignId',
    zoneid: 'campaignId',
    utm_source: 'campaignId',
    utm_campaign: 'campaignId',
    subid1: 'campaignId',
    subid2: 'campaignId',
    subid3: 'campaignId',
  };

  private static readonly REPORT_METRIC_SQL: Record<string, string> = {
    clicks: 'COALESCE(SUM(clicks), 0)',
    impressions: 'COALESCE(SUM(impressions), 0)',
    conversions: 'COALESCE(SUM(conversions), 0)',
    revenue: 'COALESCE(SUM(revenue), 0)',
    spend: 'COALESCE(SUM(spend), 0)',
    cost: 'COALESCE(SUM(spend), 0)',
    profit: 'COALESCE(SUM(revenue) - SUM(spend), 0)',
    roi: 'CASE WHEN SUM(spend) > 0 THEN ROUND(((SUM(revenue) - SUM(spend)) * 100.0 / SUM(spend)), 2) ELSE 0 END',
    cr: 'CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(conversions) * 100.0 / SUM(clicks)), 2) ELSE 0 END',
    margin: 'CASE WHEN SUM(revenue) > 0 THEN ROUND(((SUM(revenue) - SUM(spend)) * 100.0 / SUM(revenue)), 2) ELSE 0 END',
    epc: 'CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(revenue) * 1.0 / SUM(clicks)), 4) ELSE 0 END',
    cpc: 'CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend) * 1.0 / SUM(clicks)), 4) ELSE 0 END',
    unique_visitors: '0',
    fraud_clicks: '0',
    bot_clicks: '0',
    avg_fraud_score: '0',
    blacklist_hits: '0',
    blacklist_rate: '0',
    rule_hits: '0',
    blocked: '0',
  };

  private static readonly CLICK_REPORT_DIMENSION_MAP: Record<string, string> = {
    date: 'substr(c.timestamp, 1, 10)',
    campaign: 'c.campaignId',
    offer: 'c.offerId',
    flow: 'c.flowId',
    landing: 'c.landingPageId',
    country: 'c.country',
    device: 'c.device',
    browser: 'c.browser',
    source: 'c.utmSource',
    zoneid: "COALESCE(NULLIF(c.subId1, ''), NULLIF(c.subId2, ''), NULLIF(c.subId3, ''))",
    utm_source: 'c.utmSource',
    utm_campaign: 'c.utmCampaign',
    subid1: 'c.subId1',
    subid2: 'c.subId2',
    subid3: 'c.subId3',
  };

  private static readonly FRAUD_METRIC_SET: Set<string> = new Set([
    'fraud_clicks',
    'bot_clicks',
    'avg_fraud_score',
    'blacklist_hits',
    'blacklist_rate',
    'rule_hits',
    'blocked',
  ]);

  private static readonly CLICK_ONLY_DIMENSION_SET: Set<string> = new Set([
    'source',
    'zoneid',
    'utm_source',
    'utm_campaign',
    'subid1',
    'subid2',
    'subid3',
  ]);

  private static readonly DEFAULT_REPORT_DIMENSIONS: Array<{ value: string; label: string; hint: string }> = [
    { value: 'date', label: 'Date', hint: 'Group by date (UTC day)' },
    { value: 'campaign', label: 'Campaign', hint: 'Campaign identifier' },
    { value: 'offer', label: 'Offer', hint: 'Offer identifier' },
    { value: 'flow', label: 'Flow', hint: 'Flow identifier' },
    { value: 'landing', label: 'Landing', hint: 'Landing page identifier' },
    { value: 'country', label: 'Country', hint: 'Visitor country' },
    { value: 'device', label: 'Device', hint: 'Device type' },
    { value: 'browser', label: 'Browser', hint: 'Browser family' },
    { value: 'source', label: 'Source', hint: 'Traffic source token (utmSource)' },
    { value: 'zoneid', label: 'Zone ID', hint: 'Primary zone signature (subId fallback chain)' },
    { value: 'utm_source', label: 'UTM Source', hint: 'UTM source' },
    { value: 'utm_campaign', label: 'UTM Campaign', hint: 'UTM campaign' },
    { value: 'subid1', label: 'SubID1', hint: 'First sub identifier' },
    { value: 'subid2', label: 'SubID2', hint: 'Second sub identifier' },
    { value: 'subid3', label: 'SubID3', hint: 'Third sub identifier' },
  ];

  private static readonly BUILTIN_METRIC_DEFINITIONS: Array<{
    value: string;
    label: string;
    format: 'number' | 'currency' | 'percent';
  }> = [
    { value: 'clicks', label: 'Clicks', format: 'number' },
    { value: 'impressions', label: 'Impressions', format: 'number' },
    { value: 'conversions', label: 'Conversions', format: 'number' },
    { value: 'revenue', label: 'Revenue', format: 'currency' },
    { value: 'spend', label: 'Spend', format: 'currency' },
    { value: 'cost', label: 'Cost', format: 'currency' },
    { value: 'profit', label: 'Profit', format: 'currency' },
    { value: 'roi', label: 'ROI', format: 'percent' },
    { value: 'cr', label: 'CR', format: 'percent' },
    { value: 'margin', label: 'Margin', format: 'percent' },
    { value: 'epc', label: 'EPC', format: 'currency' },
    { value: 'cpc', label: 'CPC', format: 'currency' },
    { value: 'unique_visitors', label: 'Unique Visitors', format: 'number' },
    { value: 'fraud_clicks', label: 'Fraud Clicks', format: 'number' },
    { value: 'bot_clicks', label: 'Bot Clicks', format: 'number' },
    { value: 'avg_fraud_score', label: 'Avg Fraud Score', format: 'number' },
    { value: 'blacklist_hits', label: 'Blacklist Hits', format: 'number' },
    { value: 'blacklist_rate', label: 'Blacklist Rate', format: 'percent' },
    { value: 'rule_hits', label: 'Rule Hits', format: 'number' },
    { value: 'blocked', label: 'Blocked', format: 'number' },
  ];

  constructor(db: D1Database) {
    super(db, 'trafficSummary');
  }

  async getReportMetadata(): Promise<{
    dimensions: Array<{ value: string; label: string; hint: string }>;
    metrics: Array<{ value: string; label: string; format: 'number' | 'currency' | 'percent' }>;
  }> {
    const dimensions = [...TrafficRepository.DEFAULT_REPORT_DIMENSIONS];
    const columns = await this.getClicksColumns();
    const known = new Set(dimensions.map((item) => item.value));

    for (const column of columns) {
      const aliasKey = `click.${column}`;
      if (known.has(aliasKey)) {
        continue;
      }

      if (['id', 'createdAt', 'clickId'].includes(column)) {
        continue;
      }

      dimensions.push({
        value: aliasKey,
        label: `Click.${column}`,
        hint: `Raw field from clicks table: ${column}`,
      });
      known.add(aliasKey);
    }

    return {
      dimensions,
      metrics: [...TrafficRepository.BUILTIN_METRIC_DEFINITIONS],
    };
  }

  private async getClicksColumns(): Promise<string[]> {
    const result = await this.db.prepare('PRAGMA table_info(clicks)').all<{
      name: string;
    }>();
    return (result.results || [])
      .map((item) => item.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
  }

  /**
   * 插入或更新流量汇总
   */
  async upsertSummary(data: Partial<TrafficSummary>): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO trafficSummary (
          campaignId, date, impressions, clicks, conversions, spend, revenue,
          country, device, browser, offerId, flowId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(campaignId, date, country, device, browser, offerId, flowId) 
        DO UPDATE SET 
          impressions = impressions + ?,
          clicks = clicks + ?,
          conversions = conversions + ?,
          spend = spend + ?,
          revenue = revenue + ?
      `)
      .bind(
        data.campaignId,
        data.date,
        data.impressions || 0,
        data.clicks || 0,
        data.conversions || 0,
        data.spend || 0,
        data.revenue || 0,
        data.country || null,
        data.device || null,
        data.browser || null,
        data.offerId || null,
        data.flowId || null,
        now,
        data.impressions || 0,
        data.clicks || 0,
        data.conversions || 0,
        data.spend || 0,
        data.revenue || 0
      )
      .run();
  }

  /**
   * 获取 Campaign 的流量指标
   */
  async getCampaignMetrics(campaignId: string, startDate: string, endDate: string): Promise<TrackingMetrics> {
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
      `)
      .bind(campaignId, startDate, endDate)
      .first();

    const data = result || { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };

    return this.calculateMetrics(data);
  }

  /**
   * 按维度获取统计数据
   */
  async getStatsByDimension(
    campaignId: string,
    dimension: string,
    startDate: string,
    endDate: string,
    limit = 20
  ): Promise<TrafficSummary[]> {
    const validDimensions = ['country', 'device', 'browser', 'offerId', 'flowId'];
    if (!validDimensions.includes(dimension)) {
      throw new Error(`Invalid dimension: ${dimension}`);
    }

    const result = await this.db
      .prepare(`
        SELECT 
          ${dimension},
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY ${dimension}
        ORDER BY clicks DESC
        LIMIT ?
      `)
      .bind(campaignId, startDate, endDate, limit)
      .all();

    return (result.results as unknown as TrafficSummary[]) || [];
  }

  /**
   * 获取Flow性能统计
   */
  async getFlowStats(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<TrafficSummary[]> {
    const result = await this.db
      .prepare(`
        SELECT 
          flowId,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY flowId
        ORDER BY clicks DESC
      `)
      .bind(campaignId, startDate, endDate)
      .all();

    return (result.results as unknown as TrafficSummary[]) || [];
  }

  /**
   * 获取日期范围内的趋势数据
   */
  async getTrend(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<TrafficSummary[]> {
    const result = await this.db
      .prepare(`
        SELECT 
          date,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(campaignId, startDate, endDate)
      .all();

    return (result.results as unknown as TrafficSummary[]) || [];
  }

  /**
   * 获取系统总览
   */
  async getSystemOverview(startDate: string, endDate: string): Promise<TrackingMetrics & { activeCampaigns: number }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(DISTINCT campaignId) as activeCampaigns,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
      `)
      .bind(startDate, endDate)
      .first();

    const data = result || { activeCampaigns: 0, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    const metrics = this.calculateMetrics(data);

    return {
      ...metrics,
      activeCampaigns: data.activeCampaigns as number,
    };
  }

  /**
   * 计算指标
   */
  private calculateMetrics(data: Record<string, unknown>): TrackingMetrics {
    const impressions = Number(data.impressions) || 0;
    const clicks = Number(data.clicks) || 0;
    const conversions = Number(data.conversions) || 0;
    const spend = Number(data.spend) || 0;
    const revenue = Number(data.revenue) || 0;

    return {
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cr: clicks > 0 ? (conversions / clicks) * 100 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      roi: spend > 0 ? (revenue - spend) / spend : 0,
      epc: clicks > 0 ? revenue / clicks : 0,
    };
  }

  private hasAggregateData(data: { clicks?: number; conversions?: number; spend?: number; revenue?: number; impressions?: number }): boolean {
    return [data.clicks, data.conversions, data.spend, data.revenue, data.impressions].some((value) => Number(value) > 0);
  }

  private getTimestampRange(range: string): { start: string; end: string } {
    const { start, end } = this.getDateRange(range);
    return {
      start: `${start}T00:00:00.000Z`,
      end: `${end}T23:59:59.999Z`,
    };
  }

  private async getRawDashboardMetrics(range: string, campaignId?: string): Promise<TrackingMetrics> {
    const { start, end } = this.getTimestampRange(range);
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';
    const bindings: Array<string> = [];
    const pushRangeBinding = () => {
      bindings.push(start, end);
      if (campaignId) {
        bindings.push(campaignId);
      }
    };

    pushRangeBinding();
    pushRangeBinding();
    pushRangeBinding();
    pushRangeBinding();
    pushRangeBinding();

    const result = await this.db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM clicks WHERE timestamp >= ? AND timestamp <= ?${campaignFilter}) AS clicks,
          (SELECT COUNT(DISTINCT visitorId) FROM clicks WHERE timestamp >= ? AND timestamp <= ?${campaignFilter}) AS uniqueClicks,
          (SELECT COALESCE(SUM(cost), 0) FROM clicks WHERE timestamp >= ? AND timestamp <= ?${campaignFilter}) AS spend,
          (SELECT COUNT(*) FROM conversions WHERE timestamp >= ? AND timestamp <= ?${campaignFilter} AND status = 'approved') AS conversions,
          (SELECT COALESCE(SUM(revenue), 0) FROM conversions WHERE timestamp >= ? AND timestamp <= ?${campaignFilter} AND status = 'approved') AS revenue
      `)
      .bind(...bindings)
      .first();

    const metrics = this.calculateMetrics({
      impressions: 0,
      clicks: Number(result?.clicks) || 0,
      conversions: Number(result?.conversions) || 0,
      spend: Number(result?.spend) || 0,
      revenue: Number(result?.revenue) || 0,
    });

    return {
      ...metrics,
      uniqueClicks: Number(result?.uniqueClicks) || 0,
    };
  }

  private async getRawChartData(range: string, campaignId?: string): Promise<any[]> {
    const { start, end } = this.getTimestampRange(range);
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';
    const bindings: Array<string> = [start, end];

    if (campaignId) {
      bindings.push(campaignId);
    }

    bindings.push(start, end);

    if (campaignId) {
      bindings.push(campaignId);
    }

    const result = await this.db
      .prepare(`
        SELECT
          date,
          SUM(clicks) AS clicks,
          SUM(conversions) AS conversions,
          SUM(spend) AS spend,
          SUM(revenue) AS revenue
        FROM (
          SELECT
            substr(timestamp, 1, 10) AS date,
            COUNT(*) AS clicks,
            0 AS conversions,
            COALESCE(SUM(cost), 0) AS spend,
            0 AS revenue
          FROM clicks
          WHERE timestamp >= ? AND timestamp <= ?${campaignFilter}
          GROUP BY substr(timestamp, 1, 10)

          UNION ALL

          SELECT
            substr(timestamp, 1, 10) AS date,
            0 AS clicks,
            COUNT(*) AS conversions,
            0 AS spend,
            COALESCE(SUM(revenue), 0) AS revenue
          FROM conversions
          WHERE timestamp >= ? AND timestamp <= ?${campaignFilter} AND status = 'approved'
          GROUP BY substr(timestamp, 1, 10)
        )
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(...bindings)
      .all();

    return (result.results as unknown as any[]) || [];
  }

  private async getRawEntityStats(fieldName: string, range: string, campaignId?: string): Promise<any[]> {
    const { start, end } = this.getTimestampRange(range);
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';
    const bindings: Array<string> = [start, end];

    if (campaignId) {
      bindings.push(campaignId);
    }

    bindings.push(start, end);

    if (campaignId) {
      bindings.push(campaignId);
    }

    const result = await this.db
      .prepare(`
        SELECT
          name,
          0 AS impressions,
          SUM(clicks) AS clicks,
          SUM(conversions) AS conversions,
          SUM(spend) AS spend,
          SUM(revenue) AS revenue
        FROM (
          SELECT
            COALESCE(${fieldName}, 'Unknown') AS name,
            COUNT(*) AS clicks,
            0 AS conversions,
            COALESCE(SUM(cost), 0) AS spend,
            0 AS revenue
          FROM clicks
          WHERE timestamp >= ? AND timestamp <= ?${campaignFilter} AND ${fieldName} IS NOT NULL
          GROUP BY ${fieldName}

          UNION ALL

          SELECT
            COALESCE(${fieldName}, 'Unknown') AS name,
            0 AS clicks,
            COUNT(*) AS conversions,
            0 AS spend,
            COALESCE(SUM(revenue), 0) AS revenue
          FROM conversions
          WHERE timestamp >= ? AND timestamp <= ?${campaignFilter} AND status = 'approved' AND ${fieldName} IS NOT NULL
          GROUP BY ${fieldName}
        )
        GROUP BY name
        ORDER BY clicks DESC, conversions DESC
        LIMIT 10
      `)
      .bind(...bindings)
      .all();

    return (result.results as unknown as any[]) || [];
  }

  /**
   * 获取仪表板统计数据
   */
  async getDashboardStats(range: string, campaignId?: string): Promise<any[]> {
    const dateRange = this.getDateRange(range);
    const bindings: Array<string> = [dateRange.start, dateRange.end];
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';

    if (campaignId) {
      bindings.push(campaignId);
    }
    
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?${campaignFilter}
      `)
      .bind(...bindings)
      .first();

    const summaryData = {
      impressions: Number(result?.impressions) || 0,
      clicks: Number(result?.clicks) || 0,
      conversions: Number(result?.conversions) || 0,
      spend: Number(result?.spend) || 0,
      revenue: Number(result?.revenue) || 0,
    };
    const rawMetrics = await this.getRawDashboardMetrics(range, campaignId);
    const metrics = this.hasAggregateData(summaryData)
      ? {
          ...this.calculateMetrics(summaryData),
          uniqueClicks: rawMetrics.uniqueClicks ?? summaryData.clicks,
        }
      : rawMetrics;
    
    return [
      { key: 'clicks', label: 'Clicks', value: metrics.clicks.toLocaleString(), isPositive: true, format: 'number' },
      { key: 'unique_clicks_campaign', label: 'Unique clicks (campaign)', value: (metrics.uniqueClicks ?? metrics.clicks).toLocaleString(), isPositive: true, format: 'number' },
      { key: 'conversions', label: 'Conversions', value: metrics.conversions.toLocaleString(), isPositive: true, format: 'number' },
      { key: 'spend', label: 'Cost', value: `$${metrics.spend.toFixed(2)}`, isPositive: false, format: 'currency' },
      { key: 'revenue_confirmed', label: 'Revenue (confirmed)', value: `$${metrics.revenue.toFixed(2)}`, isPositive: true, format: 'currency' },
      { key: 'profit_confirmed', label: 'Profit/Loss (confirmed)', value: `$${(metrics.revenue - metrics.spend).toFixed(2)}`, isPositive: (metrics.revenue - metrics.spend) > 0, format: 'currency' },
      { key: 'roi_confirmed', label: 'ROI (confirmed)', value: `${(metrics.roi * 100).toFixed(2)}%`, isPositive: metrics.roi > 0, format: 'percentage' },
    ];
  }

  /**
   * 获取图表数据
   */
  async getChartData(range: string, campaignId?: string): Promise<any[]> {
    const dateRange = this.getDateRange(range);
    const bindings: Array<string> = [dateRange.start, dateRange.end];
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';

    if (campaignId) {
      bindings.push(campaignId);
    }
    
    const result = await this.db
      .prepare(`
        SELECT 
          date,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?${campaignFilter}
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(...bindings)
      .all();

    const summaryRows = (result.results as unknown as any[]) || [];
    if (summaryRows.length > 0) {
      return summaryRows;
    }

    return this.getRawChartData(range, campaignId);
  }

  /**
   * 获取最近点击数据 - 从clicks表读取真实数据
   */
  async getRecentClicks(params: { limit: number; range?: string; campaignId?: string }): Promise<any[]> {
    const { start, end } = this.getTimestampRange(params.range || 'today');
    const bindings: Array<string | number> = [start, end];
    const campaignFilter = params.campaignId ? ' AND campaignId = ?' : '';

    if (params.campaignId) {
      bindings.push(params.campaignId);
    }

    bindings.push(params.limit);

    const result = await this.db
      .prepare(`
        SELECT 
          clickId,
          campaignId,
          flowId,
          landingPageId,
          offerId,
          timestamp,
          ip,
          userAgent,
          referer,
          country,
          city,
          device,
          browser,
          os,
          isp,
          connectionType,
          visitorId,
          subId1,
          subId2,
          subId3,
          cost,
          isUnique
        FROM clicks 
        WHERE timestamp >= ? AND timestamp <= ?${campaignFilter}
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .bind(...bindings)
      .all();

    const clicks = (result.results as unknown as any[]) || [];
    
    return clicks.map((item) => ({
      event_id: item.clickId,
      datetime: item.timestamp,
      campaign: item.campaignId,
      stream: item.flowId || '',
      landing: item.landingPageId || '',
      offer: item.offerId || '',
      source: '',
      ip: item.ip || '127.0.0.1',
      country: item.country || '',
      region: '',
      city: item.city || '',
      isp: item.isp || '',
      operator: '',
      device_type: item.device || '',
      device_model: '',
      os: item.os || '',
      os_version: '',
      browser: item.browser || '',
      browser_version: '',
      os_icon: '',
      browser_icon: '',
      connection_type: item.connectionType || '',
      proxy: 'No',
      creative_id: '',
      external_id: '',
      ad_campaign_id: '',
      sub_id: '',
      sub1: item.subId1 || '',
      sub2: item.subId2 || '',
      sub3: item.subId3 || '',
      sub4: '',
      sub5: '',
      referrer: item.referer || '',
      referrer_domain: '',
      search_engine: '',
      keyword: '',
      destination: '',
      cost: item.cost ? `$${item.cost.toFixed(2)}` : '$0.00',
      bot: 'No',
      unique_stream: item.isUnique ? 'Yes' : 'No',
      unique_campaign: item.isUnique ? 'Yes' : 'No',
      user_agent: item.userAgent || '',
      visitor_code: item.visitorId || '',
    }));
  }

  /**
   * 获取实体统计数据
   */
  async getEntityStats(entityType: string, range: string, campaignId?: string): Promise<any[]> {
    const dateRange = this.getDateRange(range);
    let fieldName = entityType;
    
    // 映射实体类型到数据库字段
    const fieldMap: Record<string, string> = {
      campaigns: 'campaignId',
      landings: 'landingPageId',
      offers: 'offerId',
      sources: 'campaignId', // 暂时使用 campaignId 作为流量源
      countries: 'country',
      device_types: 'device',
      os: 'os',
      browsers: 'browser',
    };
    
    if (fieldMap[entityType]) {
      fieldName = fieldMap[entityType];
    }
    
    const bindings: Array<string> = [dateRange.start, dateRange.end];
    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';

    if (campaignId) {
      bindings.push(campaignId);
    }

    const result = await this.db
      .prepare(`
        SELECT 
          ${fieldName} as name,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?${campaignFilter} AND ${fieldName} IS NOT NULL
        GROUP BY ${fieldName}
        ORDER BY clicks DESC
        LIMIT 10
      `)
      .bind(...bindings)
      .all();

    const summaryRows = (result.results as unknown as any[]) || [];
    if (summaryRows.length > 0) {
      return summaryRows;
    }

    return this.getRawEntityStats(fieldName, range, campaignId);
  }

  async getCustomReport(options: ReportQueryOptions): Promise<any[]> {
    const groupBy = (options.groupBy || []).filter((value, index, array) => array.indexOf(value) === index);
    const metrics = (options.metrics || ['clicks', 'conversions', 'revenue']).filter(
      (value, index, array) => array.indexOf(value) === index
    ) as string[];
    const filters = options.filters || [];
    const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 5000);
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const requiresClickQuery =
      metrics.some((metric) => TrafficRepository.FRAUD_METRIC_SET.has(metric)) ||
      groupBy.some((dimension) => TrafficRepository.CLICK_ONLY_DIMENSION_SET.has(dimension) || this.isClickColumnDimension(dimension)) ||
      filters.some((filter) => {
        const field = filter.field;
        return (
          TrafficRepository.CLICK_ONLY_DIMENSION_SET.has(field) ||
          TrafficRepository.FRAUD_METRIC_SET.has(field) ||
          this.isClickColumnDimension(field)
        );
      });

    if (requiresClickQuery) {
      return this.getCustomReportFromClicks({
        ...options,
        groupBy,
        metrics,
        filters,
        limit,
        sortOrder: sortOrder === 'ASC' ? 'asc' : 'desc',
      });
    }

    const selectClauses: string[] = [];
    const groupByClauses: string[] = [];
    const whereClauses: string[] = ['date >= ?', 'date <= ?'];
    const havingClauses: string[] = [];
    const bindings: Array<string | number> = [options.startDate, options.endDate];

    for (const dimension of groupBy) {
      const column = TrafficRepository.REPORT_DIMENSION_MAP[dimension];
      if (!column) {
        continue;
      }

      selectClauses.push(`COALESCE(${column}, 'Unknown') AS ${dimension}`);
      groupByClauses.push(column);
    }

    if (groupBy.length === 0) {
      selectClauses.push(`'Total' AS summary`);
    }

    for (const metric of metrics) {
      const expression = TrafficRepository.REPORT_METRIC_SQL[metric];
      if (!expression) {
        continue;
      }

      selectClauses.push(`${expression} AS ${metric}`);
    }

    for (const filter of filters) {
      const dimensionColumn = TrafficRepository.REPORT_DIMENSION_MAP[filter.field];
      const metricExpression = TrafficRepository.REPORT_METRIC_SQL[filter.field];

      if (dimensionColumn) {
        const clause = this.buildFilterClause(dimensionColumn, filter.operator, filter.value, bindings, false);
        if (clause) {
          whereClauses.push(clause);
        }
        continue;
      }

      if (metricExpression) {
        const clause = this.buildFilterClause(metricExpression, filter.operator, filter.value, bindings, true);
        if (clause) {
          havingClauses.push(clause);
        }
      }
    }

    const selectedKeys = new Set<string>([
      ...groupBy,
      ...(groupBy.length === 0 ? ['summary'] : []),
      ...metrics,
    ]);

    const sortBy = selectedKeys.has(options.sortBy || '')
      ? options.sortBy || ''
      : metrics[0] || groupBy[0] || 'summary';

    const sql = `
      SELECT
        ${selectClauses.join(',\n        ')}
      FROM trafficSummary
      WHERE ${whereClauses.join(' AND ')}
      ${groupByClauses.length > 0 ? `GROUP BY ${groupByClauses.join(', ')}` : ''}
      ${havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ?
    `;

    bindings.push(limit);

    const result = await this.db.prepare(sql).bind(...bindings).all();
    return (result.results as unknown as any[]) || [];
  }

  private async getCustomReportFromClicks(options: ReportQueryOptions): Promise<any[]> {
    const groupBy = options.groupBy || [];
    const metrics = options.metrics || ['clicks'];
    const filters = options.filters || [];
    const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 5000);
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const startDate = options.startDate.includes('T') ? options.startDate : `${options.startDate}T00:00:00.000Z`;
    const endDate = options.endDate.includes('T') ? options.endDate : `${options.endDate}T23:59:59.999Z`;
    const clickColumns = new Set(await this.getClicksColumns());

    const selectClauses: string[] = [];
    const groupByClauses: string[] = [];
    const whereClauses: string[] = ['c.timestamp >= ?', 'c.timestamp <= ?'];
    const havingClauses: string[] = [];
    const bindings: Array<string | number> = [startDate, endDate];

    for (const dimension of groupBy) {
      const expression = this.resolveClickDimensionExpression(dimension);
      if (!expression) {
        continue;
      }

      selectClauses.push(`COALESCE(${expression}, 'Unknown') AS ${dimension}`);
      groupByClauses.push(expression);
    }

    if (groupBy.length === 0) {
      selectClauses.push(`'Total' AS summary`);
    }

    for (const metric of metrics) {
      const expression = this.getClickMetricSql(metric, clickColumns);
      if (!expression) {
        continue;
      }
      selectClauses.push(`${expression} AS ${metric}`);
    }

    for (const filter of filters) {
      const dimensionExpression = this.resolveClickDimensionExpression(filter.field);
      if (dimensionExpression) {
        const clause = this.buildFilterClause(
          `COALESCE(${dimensionExpression}, 'Unknown')`,
          filter.operator,
          filter.value,
          bindings,
          false
        );
        if (clause) {
          whereClauses.push(clause);
        }
        continue;
      }

      const metricExpression = this.getClickMetricSql(filter.field, clickColumns);
      if (metricExpression) {
        const clause = this.buildFilterClause(metricExpression, filter.operator, filter.value, bindings, true);
        if (clause) {
          havingClauses.push(clause);
        }
      }
    }

    const selectedKeys = new Set<string>([
      ...groupBy,
      ...(groupBy.length === 0 ? ['summary'] : []),
      ...metrics,
    ]);

    const sortBy = selectedKeys.has(options.sortBy || '')
      ? options.sortBy || ''
      : metrics[0] || groupBy[0] || 'summary';

    const sql = `
      SELECT
        ${selectClauses.join(',\n        ')}
      FROM clicks c
      LEFT JOIN (
        SELECT
          clickId,
          COUNT(*) AS convCount,
          COALESCE(SUM(revenue), 0) AS convRevenue
        FROM conversions
        WHERE status = 'approved'
        GROUP BY clickId
      ) cv ON cv.clickId = c.clickId
      WHERE ${whereClauses.join(' AND ')}
      ${groupByClauses.length > 0 ? `GROUP BY ${groupByClauses.join(', ')}` : ''}
      ${havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ?
    `;

    bindings.push(limit);
    const result = await this.db.prepare(sql).bind(...bindings).all();
    return (result.results as unknown as any[]) || [];
  }

  private getClickMetricSql(metric: ReportMetric, clickColumns?: Set<string>): string | null {
    const hasMatchedRuleLayer = !clickColumns || clickColumns.has('matchedRuleLayer');

    switch (metric) {
      case 'clicks':
        return 'COALESCE(COUNT(*), 0)';
      case 'impressions':
        return 'COALESCE(COUNT(*), 0)';
      case 'conversions':
        return 'COALESCE(SUM(COALESCE(cv.convCount, 0)), 0)';
      case 'revenue':
        return 'COALESCE(SUM(COALESCE(cv.convRevenue, 0)), 0)';
      case 'spend':
      case 'cost':
        return 'COALESCE(SUM(COALESCE(c.cost, 0)), 0)';
      case 'profit':
        return 'COALESCE(SUM(COALESCE(cv.convRevenue, 0)) - SUM(COALESCE(c.cost, 0)), 0)';
      case 'roi':
        return "CASE WHEN SUM(COALESCE(c.cost, 0)) > 0 THEN ROUND(((SUM(COALESCE(cv.convRevenue, 0)) - SUM(COALESCE(c.cost, 0))) * 100.0 / SUM(COALESCE(c.cost, 0))), 2) ELSE 0 END";
      case 'cr':
        return 'CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(COALESCE(cv.convCount, 0)) * 100.0 / COUNT(*)), 2) ELSE 0 END';
      case 'margin':
        return 'CASE WHEN SUM(COALESCE(cv.convRevenue, 0)) > 0 THEN ROUND(((SUM(COALESCE(cv.convRevenue, 0)) - SUM(COALESCE(c.cost, 0))) * 100.0 / SUM(COALESCE(cv.convRevenue, 0))), 2) ELSE 0 END';
      case 'epc':
        return 'CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(COALESCE(cv.convRevenue, 0)) * 1.0 / COUNT(*)), 4) ELSE 0 END';
      case 'cpc':
        return 'CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(COALESCE(c.cost, 0)) * 1.0 / COUNT(*)), 4) ELSE 0 END';
      case 'unique_visitors':
        return 'COALESCE(COUNT(DISTINCT c.visitorId), 0)';
      case 'fraud_clicks':
        return 'COALESCE(SUM(CASE WHEN c.isSuspicious = 1 OR c.isBot = 1 OR COALESCE(c.riskScore, 0) >= 4 THEN 1 ELSE 0 END), 0)';
      case 'bot_clicks':
        return 'COALESCE(SUM(CASE WHEN c.isBot = 1 THEN 1 ELSE 0 END), 0)';
      case 'avg_fraud_score':
        return 'ROUND(COALESCE(AVG(COALESCE(c.riskScore, 0)), 0), 2)';
      case 'blacklist_hits':
        return hasMatchedRuleLayer
          ? "COALESCE(SUM(CASE WHEN COALESCE(c.matchedRuleLayer, '') = 'blacklist' THEN 1 ELSE 0 END), 0)"
          : `COALESCE(SUM(CASE WHEN ${this.getGovernanceRiskReasonPredicate('blacklist')} THEN 1 ELSE 0 END), 0)`;
      case 'blacklist_rate':
        return hasMatchedRuleLayer
          ? "CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN COALESCE(c.matchedRuleLayer, '') = 'blacklist' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) ELSE 0 END"
          : `CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN ${this.getGovernanceRiskReasonPredicate('blacklist')} THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) ELSE 0 END`;
      case 'rule_hits':
        return hasMatchedRuleLayer
          ? "COALESCE(SUM(CASE WHEN COALESCE(c.matchedRuleLayer, '') IN ('campaign', 'flow') OR (COALESCE(c.ruleMatched, 0) = 1 AND COALESCE(c.matchedRuleLayer, '') = '') THEN 1 ELSE 0 END), 0)"
          : 'COALESCE(SUM(CASE WHEN COALESCE(c.ruleMatched, 0) = 1 THEN 1 ELSE 0 END), 0)';
      case 'blocked':
        return 'COALESCE(SUM(CASE WHEN COALESCE(c.ruleBlocked, 0) = 1 THEN 1 ELSE 0 END), 0)';
      default:
        return null;
    }
  }

  private getGovernanceRiskReasonPredicate(layer: 'blacklist' | 'campaign' | 'flow' | 'whitelist'): string {
    return `COALESCE(c.riskReasons, '') LIKE '%"governance_layer:${layer}"%'`;
  }

  private isClickColumnDimension(dimension: string): boolean {
    return /^click\.[A-Za-z_][A-Za-z0-9_]*$/.test(dimension);
  }

  private resolveClickDimensionExpression(dimension: string): string | null {
    const preset = TrafficRepository.CLICK_REPORT_DIMENSION_MAP[dimension];
    if (preset) {
      return preset;
    }

    if (!this.isClickColumnDimension(dimension)) {
      return null;
    }

    const column = dimension.slice('click.'.length);
    return `c."${column}"`;
  }

  /**
   * 根据时间范围获取日期区间
   */
  private getDateRange(range: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0] || '';
    let start = end;
    
    switch (range) {
      case 'today':
        start = end;
        break;
      case 'yesterday':
        start = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0] || '';
        break;
      case 'last7days':
        start = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0] || '';
        break;
      case 'last30days':
        start = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0] || '';
        break;
      case 'thismonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] || '';
        break;
      case 'lastmonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0] || '';
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0] || '';
        return { start, end: lastDayOfLastMonth };
      default:
        start = end;
    }
    
    return { start, end };
  }

  private buildFilterClause(
    expression: string,
    operator: ReportFilterOperator,
    value: string | number,
    bindings: Array<string | number>,
    numericOnly: boolean
  ): string | null {
    switch (operator) {
      case 'eq':
        bindings.push(value);
        return `${expression} = ?`;
      case 'neq':
        bindings.push(value);
        return `${expression} != ?`;
      case 'contains':
        if (numericOnly) {
          return null;
        }
        bindings.push(`%${String(value)}%`);
        return `${expression} LIKE ?`;
      case 'gt':
        bindings.push(value);
        return `${expression} > ?`;
      case 'gte':
        bindings.push(value);
        return `${expression} >= ?`;
      case 'lt':
        bindings.push(value);
        return `${expression} < ?`;
      case 'lte':
        bindings.push(value);
        return `${expression} <= ?`;
      default:
        return null;
    }
  }
}
