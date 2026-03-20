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
          country, device, browser, offerId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(campaignId, date, country, device, browser, offerId) 
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
    const validDimensions = ['country', 'device', 'browser', 'offerId'];
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
}
