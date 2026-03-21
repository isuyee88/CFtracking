/**
 * @fileoverview Analytics Engine 数据聚合服务
 * @description 定时从 Analytics Engine 查询原始点击数据，聚合后写入 D1 数据库
 * @module services/analytics/aggregation.service
 * 
 * 输入: Analytics Engine 中的原始点击数据
 * 输出: D1 数据库中的聚合报表数据
 * 逻辑交互:
 *   - 查询 Analytics Engine SQL API
 *   - 调用 TrafficRepository 写入聚合数据
 *   - 支持按多种维度聚合
 */

import { TrafficRepository } from '@/handlers/d1/traffic.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { TrafficSummary } from '@/types/tracking';

export interface AggregationConfig {
  /** 聚合日期 (YYYY-MM-DD) */
  date: string;
  /** 聚合维度 */
  dimensions: ('campaignId' | 'country' | 'device' | 'browser' | 'os' | 'offerId' | 'landingPageId' | 'flowId')[];
}

export interface AggregationResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  errors: string[];
}

export class AggregationService {
  private trafficRepo: TrafficRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.trafficRepo = new TrafficRepository(db);
  }

  /**
   * 执行每日数据聚合
   * 从 Analytics Engine 查询前一天的数据，聚合后写入 D1
   */
  async aggregateDailyData(date?: string): Promise<AggregationResult> {
    const targetDate = date || this.getYesterday();
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      console.log(`[Aggregation] Starting daily aggregation for ${targetDate}`);

      // 1. 查询 Analytics Engine 获取聚合数据
      const aggregatedData = await this.queryAnalyticsEngine(targetDate);
      
      if (aggregatedData.length === 0) {
        console.log(`[Aggregation] No data found for ${targetDate}`);
        return {
          success: true,
          message: `No data to aggregate for ${targetDate}`,
          recordsProcessed: 0,
          errors: []
        };
      }

      console.log(`[Aggregation] Found ${aggregatedData.length} aggregated records`);

      // 2. 处理聚合数据
      const summaryData = this.aggregateByDimensions(aggregatedData, targetDate);
      
      console.log(`[Aggregation] Processed into ${summaryData.length} summary records`);

      // 3. 写入 D1 数据库
      for (const record of summaryData) {
        try {
          await this.trafficRepo.upsertSummary(record);
          recordsProcessed++;
        } catch (err) {
          const errorMsg = `Failed to upsert record: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[Aggregation] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`[Aggregation] Completed: ${recordsProcessed} records processed, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        message: `Aggregated ${recordsProcessed} records for ${targetDate}`,
        recordsProcessed,
        errors
      };

    } catch (err) {
      const errorMsg = `Aggregation failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[Aggregation] ${errorMsg}`);
      return {
        success: false,
        message: errorMsg,
        recordsProcessed,
        errors: [...errors, errorMsg]
      };
    }
  }

  /**
   * 从 Analytics Engine 查询聚合数据
   */
  private async queryAnalyticsEngine(date: string): Promise<AggregatedClickData[]> {
    const accountId = this.env.CF_ACCOUNT_ID;
    const apiToken = this.env.CF_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error('CF_ACCOUNT_ID or CF_API_TOKEN not configured');
    }

    // 构建 SQL 查询，使用 Analytics Engine 聚合函数
    const sql = `
      SELECT 
        blob2 as campaignId,
        blob3 as flowId,
        blob4 as landingPageId,
        blob5 as offerId,
        blob9 as country,
        blob11 as device,
        blob12 as browser,
        blob13 as os,
        blob20 as utmSource,
        blob21 as utmMedium,
        blob22 as utmCampaign,
        count() as clicks,
        sum(double1) as totalCost,
        avg(double1) as avgCost,
        count(distinct blob14) as uniqueVisitors,
        countIf(double1 > 0) as paidClicks,
        countIf(double3 > 0) as botScoreClicks,
        avg(double3) as avgBotScore,
        countIf(double2 > 0) as highRiskClicks
      FROM cf_tracking_events
      WHERE toDate(timestamp) = '${date}'
      GROUP BY 
        campaignId,
        flowId,
        landingPageId,
        offerId,
        country,
        device,
        browser,
        os,
        utmSource,
        utmMedium,
        utmCampaign
      HAVING clicks > 0
      ORDER BY campaignId, clicks DESC
    `;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'text/plain',
        },
        body: sql,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics Engine query failed: ${response.status} ${errorText}`);
    }

    const result = await response.json() as AnalyticsEngineAggregatedResponse;
    
    if (!result.success) {
      throw new Error(`Analytics Engine query error: ${JSON.stringify(result.errors)}`);
    }

    return result.data || [];
  }

  /**
   * 处理从 Analytics Engine 返回的聚合数据
   */
  private aggregateByDimensions(data: AggregatedClickData[], date: string): TrafficSummary[] {
    return data.map(record => ({
      campaignId: record.campaignId || 'unknown',
      date,
      impressions: record.clicks, // 简化处理：每个点击都算一次展示
      clicks: record.clicks,
      conversions: 0, // 转化数据需要从其他数据源获取
      spend: record.totalCost || 0,
      revenue: 0, // 收入数据需要从其他数据源获取
      country: record.country || null,
      device: record.device || null,
      browser: record.browser || null,
      offerId: record.offerId || null,
      flowId: record.flowId || null,
      // UTM 参数
      utmSource: record.utmSource || null,
      utmMedium: record.utmMedium || null,
      utmCampaign: record.utmCampaign || null,
      // 新增指标
      avgCost: record.avgCost || 0,
      uniqueVisitors: record.uniqueVisitors || 0,
      paidClicks: record.paidClicks || 0,
      botScoreClicks: record.botScoreClicks || 0,
      avgBotScore: record.avgBotScore || 0,
      highRiskClicks: record.highRiskClicks || 0,
    }));
  }

  /**
   * 获取昨天的日期字符串
   */
  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0] as string;
  }

  /**
   * 手动触发历史数据聚合
   */
  async aggregateHistoricalData(startDate: string, endDate: string): Promise<AggregationResult> {
    const errors: string[] = [];
    let totalRecords = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const result = await this.aggregateDailyData(dateStr);
      
      totalRecords += result.recordsProcessed;
      if (!result.success) {
        errors.push(...result.errors);
      }
    }

    return {
      success: errors.length === 0,
      message: `Historical aggregation completed: ${totalRecords} records from ${startDate} to ${endDate}`,
      recordsProcessed: totalRecords,
      errors
    };
  }
}

// 类型定义
interface AggregatedClickData {
  campaignId: string;
  flowId: string;
  landingPageId: string;
  offerId: string;
  country: string;
  device: string;
  browser: string;
  os: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  clicks: number;
  totalCost: number;
  avgCost: number;
  uniqueVisitors: number;
  paidClicks: number;
  botScoreClicks: number;
  avgBotScore: number;
  highRiskClicks: number;
}

interface AnalyticsEngineAggregatedResponse {
  success: boolean;
  errors?: unknown[];
  data?: AggregatedClickData[];
}

export function createAggregationService(env: Env): AggregationService {
  return new AggregationService(env);
}
