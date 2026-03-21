/**
 * @fileoverview Analytics Engine 数据查询服务
 * @description 直接查询 Analytics Engine 获取点击原始数据，支持近期数据实时查询
 * @module services/analytics/analytics-query.service
 *
 * 输入: 查询参数（limit, afterTimestamp, filters）
 * 输出: Analytics Engine 中的原始点击数据
 * 逻辑交互:
 *   - 被 analytics.routes.ts 调用获取 recent-clicks
 *   - 支持近期数据（< 3个月）实时查询
 *   - 历史数据（> 7天）建议使用 D1 trafficSummary
 * 前后端交互: 通过 CF Analytics Engine SQL API 查询
 */

import type { Env } from '@/config/env';

export interface AnalyticsClickRecord {
  clickId: string;
  campaignId: string;
  flowId: string;
  landingPageId: string;
  offerId: string;
  ip: string;
  referer: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  visitorId: string;
  subId1: string;
  subId2: string;
  subId3: string;
  subId4: string;
  subId5: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  cost: number;
  riskScore: number;
  cfBotScore: number;
  timestamp: string;
}

export interface AnalyticsQueryParams {
  limit?: number;
  afterTimestamp?: string;
  campaignId?: string;
  country?: string;
  device?: string;
}

export interface AnalyticsQueryResult {
  list: AnalyticsClickRecord[];
  total: number;
  queryTime: string;
  dataSource: 'analytics_engine';
}

export class AnalyticsQueryService {
  private env: Env;
  private accountId: string;
  private apiToken: string;

  constructor(env: Env) {
    this.env = env;
    this.accountId = env.CF_ACCOUNT_ID || '';
    this.apiToken = env.CF_API_TOKEN || '';
  }

  /**
   * 查询最近的点击数据
   * 用于 recent-clicks API，直接从 Analytics Engine 获取
   *
   * @param params 查询参数
   * @returns 最近的点击记录列表
   */
  async getRecentClicks(params: AnalyticsQueryParams = {}): Promise<AnalyticsQueryResult> {
    const {
      limit = 50,
      afterTimestamp,
      campaignId,
      country,
      device,
    } = params;

    const sql = this.buildRecentClicksSQL({
      limit,
      afterTimestamp,
      campaignId,
      country,
      device,
    });

    try {
      console.log('[AnalyticsQueryService] Executing SQL:', sql);
      const response = await this.executeQuery(sql);
      const list = this.parseQueryResult(response);

      return {
        list,
        total: list.length,
        queryTime: new Date().toISOString(),
        dataSource: 'analytics_engine',
      };
    } catch (error) {
      console.error('[AnalyticsQueryService] Failed to query Analytics Engine:', error);
      throw error;
    }
  }

  /**
   * 构建 Recent Clicks SQL 查询
   *
   * 数据模型 (Analytics Engine 限制: blobs≤20, doubles≤20, indexes≤1):
   * - indexes[0]: campaignId (用于索引查询)
   * - blobs: blob1=ip, blob2=country, blob3=city, blob4=device, blob5=browser, blob6=os
   *           blob7-11=subId1-5, blob12=utmSource, blob13=utmMedium, blob14=utmCampaign, blob15=referer
   * - doubles: double1=clickId, double2=flowId, double3=landingPageId, double4=offerId
   *            double5=visitorId, double6=cost, double7=riskScore, double8=cfBotScore
   *
   * 注意：数据集名称为 cf_tracking_events
   */
  private buildRecentClicksSQL(params: {
    limit: number;
    afterTimestamp?: string;
    campaignId?: string;
    country?: string;
    device?: string;
  }): string {
    const conditions: string[] = [];

    if (params.afterTimestamp) {
      conditions.push(`timestamp >= '${params.afterTimestamp}'`);
    }

    if (params.campaignId) {
      conditions.push(`index = '${params.campaignId}'`);
    }

    if (params.country) {
      conditions.push(`blob2 = '${params.country}'`);
    }

    if (params.device) {
      conditions.push(`blob4 = '${params.device}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return `
      SELECT
        double1 as clickIdNumeric,
        index as campaignId,
        double2 as flowIdNumeric,
        double3 as landingPageIdNumeric,
        double4 as offerIdNumeric,
        blob1 as ip,
        blob2 as country,
        blob3 as city,
        blob4 as device,
        blob5 as browser,
        blob6 as os,
        double5 as visitorIdNumeric,
        blob7 as subId1,
        blob8 as subId2,
        blob9 as subId3,
        blob10 as subId4,
        blob11 as subId5,
        blob12 as utmSource,
        blob13 as utmMedium,
        blob14 as utmCampaign,
        blob15 as referer,
        double6 as cost,
        double7 as riskScore,
        double8 as cfBotScore,
        timestamp
      FROM cf_tracking_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${params.limit}
    `;
  }

  /**
   * 执行 Analytics Engine SQL 查询
   */
  private async executeQuery(sql: string): Promise<AnalyticsEngineResponse> {
    if (!this.accountId || !this.apiToken) {
      throw new Error('CF_ACCOUNT_ID or CF_API_TOKEN not configured');
    }

    const httpResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'text/plain',
        },
        body: sql,
      }
    );

    if (!httpResponse.ok) {
      const errorText = await httpResponse.text();
      throw new Error(`Analytics Engine query failed: ${httpResponse.status} ${errorText}`);
    }

    const result = await httpResponse.json() as AnalyticsEngineResponse;

    console.log('[AnalyticsQueryService] Raw response:', JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * 解析 Analytics Engine 查询结果
   * 注意：clickId/flowId/landingPageId/offerId/visitorId 现在是 numeric，存储在 double 中
   */
  private parseQueryResult(response: AnalyticsEngineResponse): AnalyticsClickRecord[] {
    const data = response.data || [];

    return data.map((row: any) => ({
      clickId: row.clickIdNumeric ? `clk_${row.clickIdNumeric}` : '',
      campaignId: row.campaignId || '',
      flowId: row.flowIdNumeric ? String(row.flowIdNumeric) : '',
      landingPageId: row.landingPageIdNumeric ? String(row.landingPageIdNumeric) : '',
      offerId: row.offerIdNumeric ? String(row.offerIdNumeric) : '',
      ip: row.ip || '',
      referer: row.referer || '',
      country: row.country || '',
      city: row.city || '',
      device: row.device || '',
      browser: row.browser || '',
      os: row.os || '',
      visitorId: row.visitorIdNumeric ? String(row.visitorIdNumeric) : '',
      subId1: row.subId1 || '',
      subId2: row.subId2 || '',
      subId3: row.subId3 || '',
      subId4: row.subId4 || '',
      subId5: row.subId5 || '',
      utmSource: row.utmSource || '',
      utmMedium: row.utmMedium || '',
      utmCampaign: row.utmCampaign || '',
      cost: row.cost || 0,
      riskScore: row.riskScore || 0,
      cfBotScore: row.cfBotScore || 0,
      timestamp: row.timestamp || '',
    }));
  }

  /**
   * 检查 Analytics Engine 是否可用
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      const testQuery = 'SELECT count() as cnt FROM cf_tracking_events LIMIT 1';
      await this.executeQuery(testQuery);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取 Dashboard 统计数据
   * 直接从 Analytics Engine 聚合数据，用于 Dashboard 显示
   *
   * @param range 时间范围 (today, yesterday, 7days, 30days)
   * @returns 聚合统计数据
   */
  async getDashboardStats(range: string): Promise<{
    metrics: Array<{ key: string; label: string; value: string; isPositive: boolean; format: string }>;
    dataSource: 'analytics_engine';
  }> {
    const intervalDays = this.getIntervalDays(range);

    const sql = `
      SELECT
        count() as clicks,
        count(distinct double5) as uniqueVisitors,
        sum(double6) as totalCost,
        count(distinct index) as campaignCount,
        count(distinct blob2) as countryCount
      FROM cf_tracking_events
      WHERE timestamp >= NOW() - INTERVAL '${intervalDays}' DAY
    `;

    try {
      const result = await this.executeQuery(sql);
      const data = result.data?.[0] || {
        clicks: 0,
        uniqueVisitors: 0,
        totalCost: 0,
        campaignCount: 0,
        countryCount: 0,
      };

      const clicks = Number(data.clicks) || 0;
      const uniqueVisitors = Number(data.uniqueVisitors) || 0;
      const totalCost = Number(data.totalCost) || 0;
      const roi = totalCost > 0 ? ((0 - totalCost) / totalCost) : 0;

      const metrics = [
        { key: 'clicks', label: 'Clicks', value: clicks.toLocaleString(), isPositive: true, format: 'number' },
        { key: 'unique_clicks_campaign', label: 'Unique clicks (campaign)', value: uniqueVisitors.toLocaleString(), isPositive: true, format: 'number' },
        { key: 'conversions', label: 'Conversions', value: '0', isPositive: true, format: 'number' },
        { key: 'spend', label: 'Cost', value: `$${totalCost.toFixed(2)}`, isPositive: false, format: 'currency' },
        { key: 'revenue_confirmed', label: 'Revenue (confirmed)', value: '$0.00', isPositive: true, format: 'currency' },
        { key: 'profit_confirmed', label: 'Profit/Loss (confirmed)', value: `$${(-totalCost).toFixed(2)}`, isPositive: totalCost === 0, format: 'currency' },
        { key: 'roi_confirmed', label: 'ROI (confirmed)', value: `${(roi * 100).toFixed(2)}%`, isPositive: roi > 0, format: 'percentage' },
      ];

      return { metrics, dataSource: 'analytics_engine' };
    } catch (err) {
      console.error('[AnalyticsQueryService] Failed to get dashboard stats:', err);
      throw err;
    }
  }

  /**
   * 获取图表数据
   * 从 Analytics Engine 获取每日聚合数据
   *
   * @param range 时间范围
   * @returns 每日聚合数据
   */
  async getChartData(range: string): Promise<any[]> {
    const intervalDays = this.getIntervalDays(range);

    const sql = `
      SELECT
        toDate(timestamp) as date,
        count() as clicks,
        count(distinct double5) as uniqueVisitors,
        sum(double6) as cost
      FROM cf_tracking_events
      WHERE timestamp >= NOW() - INTERVAL '${intervalDays}' DAY
      GROUP BY date
      ORDER BY date
    `;

    try {
      const result = await this.executeQuery(sql);
      return result.data || [];
    } catch (err) {
      console.error('[AnalyticsQueryService] Failed to get chart data:', err);
      throw err;
    }
  }

  /**
   * 获取实体统计数据
   * 从 Analytics Engine 获取按实体类型聚合的数据
   *
   * @param entityType 实体类型 (campaigns, landings, offers, sources, countries, device_types, browsers)
   * @param range 时间范围
   * @returns 实体统计数据
   */
  async getEntityStats(entityType: string, range: string): Promise<any[]> {
    const intervalDays = this.getIntervalDays(range);

    // 映射实体类型到 blob 字段
    const fieldMap: Record<string, { field: string; label: string }> = {
      campaigns: { field: 'index', label: 'campaignId' },
      landings: { field: 'double3', label: 'landingPageId' },
      offers: { field: 'double4', label: 'offerId' },
      sources: { field: 'blob12', label: 'utmSource' },
      countries: { field: 'blob2', label: 'country' },
      device_types: { field: 'blob4', label: 'device' },
      browsers: { field: 'blob5', label: 'browser' },
      os: { field: 'blob6', label: 'os' },
    };

    const config = fieldMap[entityType] || { field: 'blob2', label: entityType };

    const sql = `
      SELECT
        ${config.field} as name,
        count() as clicks,
        count(distinct double5) as uniqueVisitors,
        count(distinct ${config.field}) as entityCount,
        sum(double6) as spend
      FROM cf_tracking_events
      WHERE timestamp >= NOW() - INTERVAL '${intervalDays}' DAY
        AND ${config.field} IS NOT NULL
        AND ${config.field} != ''
      GROUP BY ${config.field}
      ORDER BY clicks DESC
      LIMIT 10
    `;

    try {
      const result = await this.executeQuery(sql);
      const data = result.data || [];

      return data.map((row: any) => ({
        name: row.name || 'Unknown',
        clicks: Number(row.clicks) || 0,
        impressions: 0,
        conversions: 0,
        spend: Number(row.spend) || 0,
        revenue: 0,
        unique_visitors: Number(row.uniqueVisitors) || 0,
      }));
    } catch (err) {
      console.error('[AnalyticsQueryService] Failed to get entity stats:', err);
      throw err;
    }
  }

  /**
   * 根据 range 获取间隔天数
   */
  private getIntervalDays(range: string): number {
    switch (range) {
      case 'today':
      case 'yesterday':
        return 1;
      case '7days':
        return 7;
      case '30days':
      case 'last30days':
        return 30;
      default:
        return 1;
    }
  }

  /**
   * 获取趋势报告数据
   * 用于 Trends 页面，从 Analytics Engine 获取趋势数据
   *
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param interval 时间间隔 (hour, day, week, month)
   * @param campaignId 可选的 Campaign ID 过滤
   * @returns 趋势数据点数组
   */
  async getTrendReport(
    startDate: string,
    endDate: string,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    campaignId?: string
  ): Promise<any[]> {
    const start = new Date(startDate);
    const now = new Date();
    const diffStartDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.max(diffStartDays, 1);

    const conditions: string[] = [];
    conditions.push(`timestamp >= NOW() - INTERVAL '${intervalDays}' DAY`);

    if (campaignId) {
      conditions.push(`blob2 = '${campaignId}'`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let dateSelectExpr = 'toDate(timestamp)';
    if (interval === 'hour') {
      dateSelectExpr = 'toStartOfHour(timestamp)';
    } else if (interval === 'week') {
      dateSelectExpr = 'toStartOfWeek(timestamp)';
    } else if (interval === 'month') {
      dateSelectExpr = 'toStartOfMonth(timestamp)';
    }

    const sql = `
      SELECT
        ${dateSelectExpr} as date,
        count() as clicks,
        count(distinct double5) as uniqueVisitors,
        sum(double6) as cost
      FROM cf_tracking_events
      ${whereClause}
      GROUP BY date
      ORDER BY date
    `;

    try {
      const result = await this.executeQuery(sql);
      const data = result.data || [];

      return data.map((row: any) => ({
        date: row.date || '',
        clicks: Number(row.clicks) || 0,
        uniqueVisitors: Number(row.uniqueVisitors) || 0,
        conversions: 0,
        spend: Number(row.cost) || 0,
        revenue: 0,
        impressions: 0,
      }));
    } catch (err) {
      console.error('[AnalyticsQueryService] Failed to get trend report:', err);
      throw err;
    }
  }
}

interface AnalyticsEngineResponse {
  success: boolean;
  errors?: unknown[];
  data?: any[];
}

export function createAnalyticsQueryService(env: Env): AnalyticsQueryService {
  return new AnalyticsQueryService(env);
}
