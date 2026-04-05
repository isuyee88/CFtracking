/**
 * @fileoverview Traffic 数据仓库
 * @description 封装 Traffic Summary 相关的所有数据库操作
 * @module handlers/d1/traffic.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { TrafficSummary, TrackingMetrics } from '@/types/tracking';

export class TrafficRepository extends BaseRepository<TrafficSummary> {
  constructor(db: D1Database) {
    super(db, 'trafficSummary');
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

  private async getRawDashboardMetrics(range: string): Promise<TrackingMetrics> {
    const { start, end } = this.getTimestampRange(range);
    const result = await this.db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM clicks WHERE timestamp >= ? AND timestamp <= ?) AS clicks,
          (SELECT COUNT(DISTINCT visitorId) FROM clicks WHERE timestamp >= ? AND timestamp <= ?) AS uniqueClicks,
          (SELECT COALESCE(SUM(cost), 0) FROM clicks WHERE timestamp >= ? AND timestamp <= ?) AS spend,
          (SELECT COUNT(*) FROM conversions WHERE timestamp >= ? AND timestamp <= ? AND status = 'approved') AS conversions,
          (SELECT COALESCE(SUM(revenue), 0) FROM conversions WHERE timestamp >= ? AND timestamp <= ? AND status = 'approved') AS revenue
      `)
      .bind(start, end, start, end, start, end, start, end, start, end)
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

  private async getRawChartData(range: string): Promise<any[]> {
    const { start, end } = this.getTimestampRange(range);
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
          WHERE timestamp >= ? AND timestamp <= ?
          GROUP BY substr(timestamp, 1, 10)

          UNION ALL

          SELECT
            substr(timestamp, 1, 10) AS date,
            0 AS clicks,
            COUNT(*) AS conversions,
            0 AS spend,
            COALESCE(SUM(revenue), 0) AS revenue
          FROM conversions
          WHERE timestamp >= ? AND timestamp <= ? AND status = 'approved'
          GROUP BY substr(timestamp, 1, 10)
        )
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(start, end, start, end)
      .all();

    return (result.results as unknown as any[]) || [];
  }

  private async getRawEntityStats(fieldName: string, range: string): Promise<any[]> {
    const { start, end } = this.getTimestampRange(range);
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
          WHERE timestamp >= ? AND timestamp <= ? AND ${fieldName} IS NOT NULL
          GROUP BY ${fieldName}

          UNION ALL

          SELECT
            COALESCE(${fieldName}, 'Unknown') AS name,
            0 AS clicks,
            COUNT(*) AS conversions,
            0 AS spend,
            COALESCE(SUM(revenue), 0) AS revenue
          FROM conversions
          WHERE timestamp >= ? AND timestamp <= ? AND status = 'approved' AND ${fieldName} IS NOT NULL
          GROUP BY ${fieldName}
        )
        GROUP BY name
        ORDER BY clicks DESC, conversions DESC
        LIMIT 10
      `)
      .bind(start, end, start, end)
      .all();

    return (result.results as unknown as any[]) || [];
  }

  /**
   * 获取仪表板统计数据
   */
  async getDashboardStats(range: string): Promise<any[]> {
    const dateRange = this.getDateRange(range);
    
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
      `)
      .bind(dateRange.start, dateRange.end)
      .first();

    const summaryData = {
      impressions: Number(result?.impressions) || 0,
      clicks: Number(result?.clicks) || 0,
      conversions: Number(result?.conversions) || 0,
      spend: Number(result?.spend) || 0,
      revenue: Number(result?.revenue) || 0,
    };
    const rawMetrics = await this.getRawDashboardMetrics(range);
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
  async getChartData(range: string): Promise<any[]> {
    const dateRange = this.getDateRange(range);
    
    const result = await this.db
      .prepare(`
        SELECT 
          date,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(dateRange.start, dateRange.end)
      .all();

    const summaryRows = (result.results as unknown as any[]) || [];
    if (summaryRows.length > 0) {
      return summaryRows;
    }

    return this.getRawChartData(range);
  }

  /**
   * 获取最近点击数据 - 从clicks表读取真实数据
   */
  async getRecentClicks(limit: number): Promise<any[]> {
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
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .bind(limit)
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
  async getEntityStats(entityType: string, range: string): Promise<any[]> {
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
        WHERE date >= ? AND date <= ? AND ${fieldName} IS NOT NULL
        GROUP BY ${fieldName}
        ORDER BY clicks DESC
        LIMIT 10
      `)
      .bind(dateRange.start, dateRange.end)
      .all();

    const summaryRows = (result.results as unknown as any[]) || [];
    if (summaryRows.length > 0) {
      return summaryRows;
    }

    return this.getRawEntityStats(fieldName, range);
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
}
