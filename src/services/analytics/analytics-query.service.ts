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
  userAgent: string;
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
   * blob1=clickId, blob2=campaignId, blob3=flowId, blob4=landingPageId, blob5=offerId
   * blob6=ip, blob7=userAgent, blob8=referer, blob9=country, blob10=city
   * blob11=device, blob12=browser, blob13=os, blob14=visitorId
   * blob15=subId1, blob16=subId2, blob17=subId3
   * double1=cost, double2=riskScore, double3=cfBotScore
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
      conditions.push(`blob2 = '${params.campaignId}'`);
    }

    if (params.country) {
      conditions.push(`blob9 = '${params.country}'`);
    }

    if (params.device) {
      conditions.push(`blob11 = '${params.device}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return `
      SELECT
        blob1 as clickId,
        blob2 as campaignId,
        blob3 as flowId,
        blob4 as landingPageId,
        blob5 as offerId,
        blob6 as ip,
        blob7 as userAgent,
        blob8 as referer,
        blob9 as country,
        blob10 as city,
        blob11 as device,
        blob12 as browser,
        blob13 as os,
        blob14 as visitorId,
        blob15 as subId1,
        blob16 as subId2,
        blob17 as subId3,
        double1 as cost,
        double2 as riskScore,
        double3 as cfBotScore,
        timestamp
      FROM ANALYTICS
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

    const response = await fetch(
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics Engine query failed: ${response.status} ${errorText}`);
    }

    const result = await response.json() as AnalyticsEngineResponse;

    if (!result.success) {
      throw new Error(`Analytics Engine query error: ${JSON.stringify(result.errors)}`);
    }

    return result;
  }

  /**
   * 解析 Analytics Engine 查询结果
   */
  private parseQueryResult(response: AnalyticsEngineResponse): AnalyticsClickRecord[] {
    const data = response.data || [];

    return data.map((row: any) => ({
      clickId: row.clickId || '',
      campaignId: row.campaignId || '',
      flowId: row.flowId || '',
      landingPageId: row.landingPageId || '',
      offerId: row.offerId || '',
      ip: row.ip || '',
      userAgent: row.userAgent || '',
      referer: row.referer || '',
      country: row.country || '',
      city: row.city || '',
      device: row.device || '',
      browser: row.browser || '',
      os: row.os || '',
      visitorId: row.visitorId || '',
      subId1: row.subId1 || '',
      subId2: row.subId2 || '',
      subId3: row.subId3 || '',
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
      const testQuery = 'SELECT count() as cnt FROM ANALYTICS LIMIT 1';
      await this.executeQuery(testQuery);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
