/**
 * @fileoverview ROI 监控服务
 * @description 聚合流量数据，计算 ROI 指标，填充 optimization_targets
 */

import type { Env } from '@/config/env';

export interface ROIMetrics {
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roi: number;
  cr: number;
  epc: number;
}

export class ROIMonitoringService {
  constructor(private env: Env) {}

  /**
   * 聚合指定时间窗口的性能数据
   */
  async aggregatePerformanceData(windowHours: number = 24): Promise<void> {
    const startTime = Date.now();
    console.log(`[ROIMonitoring] Starting aggregation for last ${windowHours} hours`);

    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    
    // 聚合数据：按 platform, zone_id, pubid, subid, device, geo 分组
    const aggregated = await this.aggregateByDimensions(windowStart);
    
    console.log(`[ROIMonitoring] Aggregated ${aggregated.length} target combinations`);

    // 插入或更新 optimization_targets
    let inserted = 0;
    let updated = 0;

    for (const target of aggregated) {
      const existing = await this.findExistingTarget(target);
      
      if (existing) {
        await this.updateTarget(existing.id, target);
        updated++;
      } else {
        await this.insertTarget(target);
        inserted++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ROIMonitoring] Completed in ${duration}ms: ${inserted} inserted, ${updated} updated`);
  }

  /**
   * 按维度聚合数据
   */
  private async aggregateByDimensions(windowStart: Date): Promise<any[]> {
    // 从 clicks 表聚合
    const clickQuery = `
      SELECT 
        trafficSourceId as platform,
        zone_id,
        pubid,
        subid,
        device,
        geo,
        COUNT(*) as clicks,
        SUM(CASE WHEN conversion = 1 THEN 1 ELSE 0 END) as conversions,
        SUM(cost) as spend
      FROM clicks
      WHERE timestamp >= ?
      GROUP BY trafficSourceId, zone_id, pubid, subid, device, geo
    `;

    const { results: clickResults } = await this.env.DB.prepare(clickQuery)
      .bind(windowStart.toISOString())
      .all();

    // 从 conversions 表获取收入
    const revenueQuery = `
      SELECT 
        trafficSourceId as platform,
        zone_id,
        pubid,
        subid,
        device,
        geo,
        SUM(payout) as revenue
      FROM conversions
      WHERE timestamp >= ?
      GROUP BY trafficSourceId, zone_id, pubid, subid, device, geo
    `;

    const { results: revenueResults } = await this.env.DB.prepare(revenueQuery)
      .bind(windowStart.toISOString())
      .all();

    // 合并数据
    const combined = this.combineClicksAndRevenue(clickResults, revenueResults);

    // 计算 ROI 指标
    return combined.map(row => this.calculateMetrics(row, windowStart));
  }

  /**
   * 合并点击和收入数据
   */
  private combineClicksAndRevenue(clicks: any[], revenues: any[]): any[] {
    const revenueMap = new Map();
    
    for (const rev of revenues) {
      const key = `${rev.platform}_${rev.zone_id}_${rev.pubid}_${rev.subid}_${rev.device}_${rev.geo}`;
      revenueMap.set(key, rev.revenue);
    }

    return clicks.map(click => {
      const key = `${click.platform}_${click.zone_id}_${click.pubid}_${click.subid}_${click.device}_${click.geo}`;
      const revenue = revenueMap.get(key) || 0;
      
      return { ...click, revenue };
    });
  }

  /**
   * 计算 ROI 指标
   */
  private calculateMetrics(row: any, windowStart: Date): any {
    const clicks = row.clicks || 0;
    const conversions = row.conversions || 0;
    const spend = row.spend || 0;
    const revenue = row.revenue || 0;

    const cr = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;
    const roi = spend > 0 ? (revenue - spend) / spend : 0;

    return {
      platform: row.platform,
      zone_id: row.zone_id,
      pubid: row.pubid,
      subid: row.subid,
      device: row.device,
      geo: row.geo,
      clicks,
      conversions,
      spend,
      revenue,
      cr,
      epc,
      roi,
      window_start: windowStart.toISOString(),
      window_end: new Date().toISOString()
    };
  }

  /**
   * 查找现有目标
   */
  private async findExistingTarget(target: any): Promise<any> {
    const query = `
      SELECT id FROM optimization_targets
      WHERE platform = ? AND zone_id = ? AND pubid = ? AND subid = ? AND device = ? AND geo = ?
      AND status = 'active'
      LIMIT 1
    `;

    return await this.env.DB.prepare(query)
      .bind(
        target.platform,
        target.zone_id || null,
        target.pubid || null,
        target.subid || null,
        target.device || null,
        target.geo || null
      )
      .first();
  }

  /**
   * 插入新目标
   */
  private async insertTarget(target: any): Promise<void> {
    const id = `target-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await this.env.DB.prepare(`
      INSERT INTO optimization_targets (
        id, platform, zone_id, pubid, subid, device, geo,
        clicks, conversions, spend, revenue, roi, cr, epc,
        status, window_start, window_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      target.platform,
      target.zone_id,
      target.pubid,
      target.subid,
      target.device,
      target.geo,
      target.clicks,
      target.conversions,
      target.spend,
      target.revenue,
      target.roi,
      target.cr,
      target.epc,
      target.window_start,
      target.window_end
    ).run();
  }

  /**
   * 更新现有目标
   */
  private async updateTarget(id: string, target: any): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE optimization_targets
      SET clicks = ?, conversions = ?, spend = ?, revenue = ?,
          roi = ?, cr = ?, epc = ?,
          window_start = ?, window_end = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      target.clicks,
      target.conversions,
      target.spend,
      target.revenue,
      target.roi,
      target.cr,
      target.epc,
      target.window_start,
      target.window_end,
      id
    ).run();
  }
}
