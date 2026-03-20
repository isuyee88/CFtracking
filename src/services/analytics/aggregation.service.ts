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

      // 1. 查询 Analytics Engine 获取原始点击数据
      const clickData = await this.queryAnalyticsEngine(targetDate);
      
      if (clickData.length === 0) {
        console.log(`[Aggregation] No data found for ${targetDate}`);
        return {
          success: true,
          message: `No data to aggregate for ${targetDate}`,
          recordsProcessed: 0,
          errors: []
        };
      }

      console.log(`[Aggregation] Found ${clickData.length} raw records`);

      // 2. 按维度聚合数据
      const aggregatedData = this.aggregateByDimensions(clickData, targetDate);
      
      console.log(`[Aggregation] Aggregated into ${aggregatedData.length} summary records`);

      // 3. 写入 D1 数据库
      for (const record of aggregatedData) {
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
   * 从 Analytics Engine 查询原始点击数据
   */
  private async queryAnalyticsEngine(date: string): Promise<RawClickData[]> {
    const accountId = this.env.CF_ACCOUNT_ID;
    const apiToken = this.env.CF_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error('CF_ACCOUNT_ID or CF_API_TOKEN not configured');
    }

    // 构建 SQL 查询
    const sql = `
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
        timestamp
      FROM ANALYTICS
      WHERE toDate(timestamp) = '${date}'
      ORDER BY timestamp
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

    const result = await response.json() as AnalyticsEngineResponse;
    
    if (!result.success) {
      throw new Error(`Analytics Engine query error: ${JSON.stringify(result.errors)}`);
    }

    return result.data || [];
  }

  /**
   * 按维度聚合数据
   */
  private aggregateByDimensions(data: RawClickData[], date: string): TrafficSummary[] {
    const groups = new Map<string, TrafficSummary>();

    for (const record of data) {
      // 创建聚合键（按 campaign + country + device + browser + offer）
      const key = `${record.campaignId || 'unknown'}|${record.country || 'unknown'}|${record.device || 'unknown'}|${record.browser || 'unknown'}|${record.offerId || 'unknown'}`;

      let summary = groups.get(key);
      if (!summary) {
        summary = {
          campaignId: record.campaignId || 'unknown',
          date,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
          revenue: 0,
          country: record.country || null,
          device: record.device || null,
          browser: record.browser || null,
          offerId: record.offerId || null,
        };
        groups.set(key, summary);
      }

      // 累加统计
      summary.clicks++;
      summary.spend += record.cost || 0;
      
      // 这里可以根据业务逻辑判断是否计入转化
      // 简化处理：每个点击都算一次展示和点击
      summary.impressions++;
    }

    return Array.from(groups.values());
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
interface RawClickData {
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
  timestamp: string;
}

interface AnalyticsEngineResponse {
  success: boolean;
  errors?: unknown[];
  data?: RawClickData[];
}

export function createAggregationService(env: Env): AggregationService {
  return new AggregationService(env);
}
