/**
 * @fileoverview 实时ROI计算引擎
 * @description 多维度、多时间窗口的实时ROI计算，支持缓存优化
 * @module services/auto-optimization/roi-calculator
 *
 * 核心能力:
 * 1. 多时间窗口: 1h/6h/24h/7d/30d/custom
 * 2. 多维度分解: 按Zone/Creative/Geo/Device等
 * 3. 缓存策略: 5分钟TTL，支持强制刷新
 * 4. 异常检测: SPC统计过程控制
 *
 * 数据流:
 * 前端/API → ROI计算请求 → 缓存检查 → D1查询(缓存未命中) → 结果返回
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  ROICalculationParams,
  ROICalculationResult,
  ROIMetrics,
  TimeWindow,
} from '@/types/auto-optimization';

export class ROICalculatorService {
  private repo: AutoOptimizationRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
  }

  /**
   * 计算ROI（带缓存）
   */
  async calculateROI(params: ROICalculationParams, options?: { forceRefresh?: boolean }): Promise<ROICalculationResult> {
    const cacheKey = this.buildCacheKey(params);

    if (!options?.forceRefresh) {
      const cached = await this.repo.getCachedROI(cacheKey);
      if (cached) {
        return this.buildResult(params, cached.result as unknown as ROIMetrics, 'cache', true);
      }
    }

    const metrics = await this.calculateRealtimeROI(params);
    const timeRange = this.parseTimeWindow(params);

    await this.repo.setROICache({
      cacheKey,
      campaignId: params.campaignId,
      zoneId: params.zoneId,
      timeWindow: params.timeWindow,
      dimensions: params.dimensions || [],
      result: metrics as unknown as Record<string, unknown>,
      ttlSeconds: this.getTTLByTimeWindow(params.timeWindow),
    });

    return this.buildResult(params, metrics, 'realtime', false, timeRange);
  }

  /**
   * 批量计算多个Campaign的ROI
   */
  async batchCalculateROI(
    campaignIds: string[],
    timeWindow: TimeWindow = '24h'
  ): Promise<ROICalculationResult[]> {
    const results = await Promise.all(
      campaignIds.map(id =>
        this.calculateROI({ campaignId: id, timeWindow })
      )
    );
    return results;
  }

  /**
   * 获取Campaign ROI趋势（多个时间窗口对比）
   */
  async getROITrend(campaignId: string): Promise<{
    current: ROICalculationResult;
    previous: ROICalculationResult;
    change: number;
    changePercent: number;
  }> {
    const [current, previous] = await Promise.all([
      this.calculateROI({ campaignId, timeWindow: '24h' }),
      this.calculateROI({ campaignId, timeWindow: '7d' }),
    ]);

    const change = current.metrics.roi - (previous.metrics.roi / 7 * 1);
    const baseValue = Math.abs(previous.metrics.roi / 7) || 0.001;
    const changePercent = (change / baseValue) * 100;

    return { current, previous, change, changePercent };
  }

  /**
   * 检测ROI异常（SPC统计过程控制）
   */
  async detectAnomaly(campaignId: string): Promise<{
    isAnomalous: boolean;
    type?: 'spike' | 'drop' | 'trend';
    severity?: 'low' | 'medium' | 'high';
    details: {
      currentROI: number;
      meanROI: number;
      stdDev: number;
      zScore: number;
      deviationStd: number;
    };
  }> {
    const windows: TimeWindow[] = ['1h', '6h', '24h', '7d'];
    const results = await Promise.all(
      windows.map(w => this.calculateROI({ campaignId, timeWindow: w }))
    );

    const currentROI = results[0]?.metrics?.roi ?? 0;
    const historicalROIs = results.slice(1).map(r => r.metrics.roi);

    const { mean, stdDev } = this.calculateStatistics(historicalROIs);
    const zScore = stdDev > 0 ? (currentROI - mean) / stdDev : 0;
    const deviationStd = Math.abs(zScore);

    const isAnomalous = deviationStd > 2;
    let type: 'spike' | 'drop' | 'trend' | undefined;
    let severity: 'low' | 'medium' | 'high' | undefined;

    if (isAnomalous) {
      type = currentROI > mean ? 'spike' : 'drop';
      severity = deviationStd > 4 ? 'high' : deviationStd > 3 ? 'medium' : 'low';
    }

    return {
      isAnomalous,
      type,
      severity,
      details: {
        currentROI,
        meanROI: mean,
        stdDev,
        zScore,
        deviationStd,
      },
    };
  }

  /**
   * 获取需要关注的Campaign列表（基于ROI异常检测）
   */
  async getAttentionNeededCampaigns(limit: number = 10): Promise<{
    campaignId: string;
    anomaly: {
      isAnomalous: boolean;
      type?: 'spike' | 'drop' | 'trend';
      severity?: 'low' | 'medium' | 'high';
      details: {
        currentROI: number;
        meanROI: number;
        stdDev: number;
        zScore: number;
        deviationStd: number;
      };
    };
  }[]> {
    const db = this.getDB();

    const activeCampaigns = await db.prepare(`
      SELECT DISTINCT c.id FROM campaigns c
      JOIN clicks cl ON cl.campaignId = c.id
      WHERE cl.timestamp > datetime('now', '-24 hours')
      LIMIT ?
    `).bind(limit * 3).all<{ id: string }>();

    const results = await Promise.all(
      (activeCampaigns.results || []).slice(0, limit).map(async ({ id }) => ({
        campaignId: id,
        anomaly: await this.detectAnomaly(id),
      }))
    );

    return results.filter(r => r.anomaly.isAnomalous);
  }

  // ============================================
  // 私有方法
  // ============================================

  private async calculateRealtimeROI(params: ROICalculationParams): Promise<ROIMetrics> {
    const db = this.getDB();
    const { start, end } = this.parseTimeWindow(params);

    const query = params.zoneId ? `
      SELECT
        COUNT(DISTINCT cl.id) as clicks,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cl.cost), 0) as cost,
        COALESCE(SUM(cv.payout), 0) as revenue
      FROM clicks cl
      LEFT JOIN conversions cv ON cv.clickId = cl.id
      WHERE cl.campaignId = ? AND cl.zoneId = ?
        AND cl.timestamp >= ? AND cl.timestamp <= ?
    ` : `
      SELECT
        COUNT(DISTINCT cl.id) as clicks,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cl.cost), 0) as cost,
        COALESCE(SUM(cv.payout), 0) as revenue
      FROM clicks cl
      LEFT JOIN conversions cv ON cv.clickId = cl.id
      WHERE cl.campaignId = ?
        AND cl.timestamp >= ? AND cl.timestamp <= ?
    `;

    const bindings = params.zoneId
      ? [params.campaignId, params.zoneId, start, end]
      : [params.campaignId, start, end];

    const result = await db.prepare(query).bind(...bindings).first<{
      clicks: number;
      conversions: number;
      cost: number;
      revenue: number;
    }>();

    if (!result || result.clicks === 0) {
      return this.emptyMetrics();
    }

    return this.computeMetrics(result);
  }

  private computeMetrics(raw: { clicks: number; conversions: number; cost: number; revenue: number }): ROIMetrics {
    const { clicks, conversions, cost, revenue } = raw;

    const profit = revenue - cost;
    const roi = cost > 0 ? profit / cost : 0;
    // Impressions are not part of this query, so avoid returning a fake 100% CTR.
    const ctr = 0;
    const cr = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const avgOrderValue = conversions > 0 ? revenue / conversions : 0;

    return {
      roi,
      revenue,
      cost,
      profit,
      clicks,
      conversions,
      ctr,
      cr,
      cpc,
      epc,
      cpa,
      avgOrderValue,
    };
  }

  private emptyMetrics(): ROIMetrics {
    return {
      roi: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cr: 0,
      cpc: 0,
      epc: 0,
      cpa: 0,
    };
  }

  private buildCacheKey(params: ROICalculationParams): string {
    const parts = [
      `campaign:${params.campaignId}`,
      `window:${params.timeWindow}`,
    ];

    if (params.zoneId) parts.push(`zone:${params.zoneId}`);
    if (params.dimensions?.length) parts.push(`dims:${params.dimensions.sort().join(',')}`);

    return parts.join('|');
  }

  private parseTimeWindow(params: ROICalculationParams): { start: string; end: string } {
    if (params.customStart && params.customEnd) {
      return { start: params.customStart, end: params.customEnd };
    }

    const now = new Date();
    const windowMap: Record<TimeWindow, () => Date> = {
      '1h': () => new Date(now.getTime() - 60 * 60 * 1000),
      '6h': () => new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': () => new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': () => new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      'custom': () => new Date(now.getTime() - 24 * 60 * 60 * 1000),
    };

    const start = (windowMap[params.timeWindow] || windowMap['24h'])();
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  }

  private getTTLByTimeWindow(window: TimeWindow): number {
    const ttlMap: Record<TimeWindow, number> = {
      '1h': 60,
      '6h': 300,
      '24h': 300,
      '7d': 900,
      '30d': 3600,
      'custom': 300,
    };
    return ttlMap[window] || 300;
  }

  private buildResult(
    params: ROICalculationParams,
    metrics: ROIMetrics,
    dataSource: 'cache' | 'realtime',
    cacheHit: boolean,
    timeRange?: { start: string; end: string }
  ): ROICalculationResult {
    return {
      params,
      metrics,
      calculatedAt: new Date().toISOString(),
      dataSource,
      cacheHit,
      timeWindowActual: timeRange || this.parseTimeWindow(params),
    };
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  private getDB(): D1Database {
    return getD1Connection(this.env);
  }
}
