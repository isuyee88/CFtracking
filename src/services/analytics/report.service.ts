/**
 * @fileoverview Report 服务
 * @description 处理报告生成和缓存
 * @module services/analytics/report.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  ReportConfig,
  ReportData,
  FunnelReport,
  FunnelStepData,
  CohortReport,
  CohortPeriod,
  ComparisonReport,
  ScheduledReport,
} from '@/types/report';
import { nanoid } from 'nanoid';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class ReportService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = getD1Connection(env);
  }

  async generateReport(config: ReportConfig): Promise<ReportData | FunnelReport | CohortReport[] | ComparisonReport> {
    const cacheKey = this.getCacheKey(config);
    const cached = await this.getCachedReport(cacheKey);
    if (cached) return cached;

    let data: ReportData | FunnelReport | CohortReport[] | ComparisonReport;

    switch (config.type) {
      case 'funnel':
        data = await this.generateFunnelReport(config as any);
        break;
      case 'cohort':
        data = await this.generateCohortReport(config as any);
        break;
      case 'comparison':
        data = await this.generateComparisonReport(config as any);
        break;
      default:
        data = await this.generateStandardReport(config);
    }

    await this.cacheReport(cacheKey, config, data);
    return data;
  }

  private async generateStandardReport(config: ReportConfig): Promise<ReportData> {
    const startDate = config.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = config.endDate || new Date().toISOString().split('T')[0];
    const groupBy = config.groupBy;
    const filters = config.filters;
    
    const groupByClause = this.buildGroupByClause(groupBy);
    
    let sql = `
      SELECT 
        ${groupByClause},
        COUNT(*) as clicks,
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as conversions,
        SUM(CASE WHEN converted = 1 THEN revenue ELSE 0 END) as revenue,
        SUM(cost) as cost
      FROM clicks
      WHERE timestamp >= ? AND timestamp <= ?
    `;

    const params: any[] = [startDate, endDate];

    if (filters && filters.length > 0) {
      const filterClauses: string[] = [];
      for (const f of filters) {
        switch (f.operator) {
          case 'eq':
            filterClauses.push(`${f.field} = ?`);
            params.push(f.value);
            break;
          case 'in':
            if (Array.isArray(f.value)) {
              filterClauses.push(`${f.field} IN (${f.value.map(() => '?').join(',')})`);
              params.push(...f.value);
            }
            break;
        }
      }
      
      if (filterClauses.length > 0) {
        sql += ` AND ${filterClauses.join(' AND ')}`;
      }
    }

    sql += ` GROUP BY ${groupByClause}`;

    try {
      const results = await this.db.prepare(sql).bind(...params).all();
      
      return {
        metrics: {
          totalClicks: (results.results || []).reduce((sum: number, r: any) => sum + (r.clicks || 0), 0),
          totalConversions: (results.results || []).reduce((sum: number, r: any) => sum + (r.conversions || 0), 0),
          totalRevenue: (results.results || []).reduce((sum: number, r: any) => sum + (r.revenue || 0), 0),
          totalCost: (results.results || []).reduce((sum: number, r: any) => sum + (r.cost || 0), 0),
        },
        rows: (results.results || []).map((r: any) => ({
          dimension: r.dimension || r.campaignId || r.date || 'all',
          metrics: {
            clicks: r.clicks || 0,
            conversions: r.conversions || 0,
            revenue: r.revenue || 0,
            cost: r.cost || 0,
          },
        })),
      };
    } catch (error) {
      // 如果表不存在，返回空数据
      return {
        metrics: {
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
        rows: [],
      };
    }
  }

  private buildGroupByClause(groupBy?: string[]): string {
    if (!groupBy || groupBy.length === 0) {
      return "'all'";
    }
    return groupBy.map(g => {
      switch (g) {
        case 'campaign':
          return 'campaignId';
        case 'day':
          return "date(timestamp)";
        default:
          return g;
      }
    }).join(', ');
  }

  async generateFunnelReport(config: any): Promise<FunnelReport> {
    const { steps, startDate, endDate } = config;
    
    if (!steps || steps.length === 0) {
      return {
        steps: [],
        totalUsers: 0,
        completedUsers: 0,
      };
    }

    try {
      // 获取时间范围内的所有唯一访客
      const visitorsResult = await this.db
        .prepare(`
          SELECT DISTINCT visitorId 
          FROM clicks 
          WHERE timestamp >= ? AND timestamp <= ?
        `)
        .bind(startDate, endDate)
        .all<{ visitorId: string }>();

      const allVisitors = (visitorsResult.results || []).map(r => r.visitorId);
      const totalUsers = allVisitors.length;

      if (totalUsers === 0) {
        return {
          steps: [],
          totalUsers: 0,
          completedUsers: 0,
        };
      }

      // 分析每个步骤的用户数量
      const stepData: FunnelStepData[] = [];
      let previousCount = totalUsers;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const { field, operator, value } = step.condition;

        // 构建查询条件
        let whereClause = `timestamp >= ? AND timestamp <= ?`;
        const params: any[] = [startDate, endDate];

        // 添加步骤条件
        switch (operator) {
          case 'eq':
            whereClause += ` AND ${field} = ?`;
            params.push(value);
            break;
          case 'in':
            if (Array.isArray(value)) {
              whereClause += ` AND ${field} IN (${value.map(() => '?').join(',')})`;
              params.push(...value);
            }
            break;
          case 'gt':
            whereClause += ` AND ${field} > ?`;
            params.push(value);
            break;
          case 'lt':
            whereClause += ` AND ${field} < ?`;
            params.push(value);
            break;
          default:
            whereClause += ` AND ${field} = ?`;
            params.push(value);
        }

        // 查询满足该步骤条件的唯一访客数
        const stepResult = await this.db
          .prepare(`
            SELECT COUNT(DISTINCT visitorId) as count
            FROM clicks
            WHERE ${whereClause}
          `)
          .bind(...params)
          .first<{ count: number }>();

        const count = stepResult?.count || 0;
        const dropoff = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;
        const conversionRate = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

        stepData.push({
          step: step.name,
          count,
          dropoff: Math.round(dropoff * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
        });

        previousCount = count;
      }

      const completedUsers = stepData.length > 0 ? (stepData[stepData.length - 1]?.count ?? 0) : 0;

      return {
        steps: stepData,
        totalUsers,
        completedUsers,
      };
    } catch (error) {
      console.error('Error generating funnel report:', error);
      return {
        steps: [],
        totalUsers: 0,
        completedUsers: 0,
      };
    }
  }

  async generateCohortReport(config: any): Promise<CohortReport[]> {
    const { cohortBy = 'day', periods = 7, startDate, endDate } = config;

    try {
      // 获取时间范围内的所有用户首次访问记录
      const firstVisits = await this.db
        .prepare(`
          SELECT 
            visitorId,
            MIN(date(timestamp)) as firstVisitDate
          FROM clicks
          WHERE timestamp >= ? AND timestamp <= ?
          GROUP BY visitorId
        `)
        .bind(startDate, endDate)
        .all<{ visitorId: string; firstVisitDate: string }>();

      if (!firstVisits.results || firstVisits.results.length === 0) {
        return [];
      }

      // 按队列分组
      const cohortGroups: Map<string, Set<string>> = new Map();

      for (const visit of firstVisits.results) {
        let cohortKey: string;
        
        switch (cohortBy) {
          case 'week':
            // 计算周起始日期
            const weekStart = new Date(visit.firstVisitDate);
            const dayOfWeek = weekStart.getDay();
            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            cohortKey = weekStart.toISOString().split('T')[0] || visit.firstVisitDate;
            break;
          case 'month':
            // 计算月起始日期
            const monthStart = new Date(visit.firstVisitDate);
            cohortKey = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString().split('T')[0] || visit.firstVisitDate;
            break;
          default:
            cohortKey = visit.firstVisitDate;
        }

        if (!cohortGroups.has(cohortKey)) {
          cohortGroups.set(cohortKey, new Set());
        }
        cohortGroups.get(cohortKey)!.add(visit.visitorId);
      }

      // 为每个队列计算留存率
      const cohortReports: CohortReport[] = [];
      const sortedCohorts = Array.from(cohortGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [cohortDate, visitors] of sortedCohorts) {
        const totalUsers = visitors.size;
        const periodData: CohortPeriod[] = [];

        for (let period = 0; period <= periods; period++) {
          // 计算该周期的日期范围
          let periodStart: Date;
          let periodEnd: Date;
          
          const cohortDateObj = new Date(cohortDate);
          
          switch (cohortBy) {
            case 'week':
              periodStart = new Date(cohortDateObj.getTime() + period * 7 * 24 * 60 * 60 * 1000);
              periodEnd = new Date(periodStart.getTime() + 6 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              periodStart = new Date(cohortDateObj.getFullYear(), cohortDateObj.getMonth() + period, 1);
              periodEnd = new Date(cohortDateObj.getFullYear(), cohortDateObj.getMonth() + period + 1, 0);
              break;
            default:
              periodStart = new Date(cohortDateObj.getTime() + period * 24 * 60 * 60 * 1000);
              periodEnd = periodStart;
          }

          const periodStartStr = periodStart.toISOString().split('T')[0];
          const periodEndStr = periodEnd.toISOString().split('T')[0];

          // 查询该周期内活跃的用户
          const activeUsers = await this.db
            .prepare(`
              SELECT COUNT(DISTINCT visitorId) as count
              FROM clicks
              WHERE visitorId IN (${Array.from(visitors).map(() => '?').join(',')})
                AND date(timestamp) >= ?
                AND date(timestamp) <= ?
            `)
            .bind(...Array.from(visitors), periodStartStr, periodEndStr)
            .first<{ count: number }>();

          const activeCount = activeUsers?.count || 0;
          const retention = totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0;

          // 查询该周期的收入
          const revenueResult = await this.db
            .prepare(`
              SELECT COALESCE(SUM(revenue), 0) as revenue
              FROM conversions
              WHERE visitorId IN (${Array.from(visitors).map(() => '?').join(',')})
                AND date(timestamp) >= ?
                AND date(timestamp) <= ?
            `)
            .bind(...Array.from(visitors), periodStartStr, periodEndStr)
            .first<{ revenue: number }>();

          const revenue = revenueResult?.revenue || 0;

          periodData.push({
            period,
            users: activeCount,
            retention: Math.round(retention * 100) / 100,
            revenue,
          });
        }

        cohortReports.push({
          cohortDate,
          totalUsers,
          periods: periodData,
        });
      }

      return cohortReports;
    } catch (error) {
      console.error('Error generating cohort report:', error);
      return [];
    }
  }

  async generateComparisonReport(config: any): Promise<ComparisonReport> {
    const baseline = await this.generateStandardReport({
      ...config,
      startDate: config.baselineStart || config.startDate,
      endDate: config.baselineEnd || config.endDate,
    });

    const comparison = await this.generateStandardReport({
      ...config,
      startDate: config.comparisonStart || config.startDate,
      endDate: config.comparisonEnd || config.endDate,
    });

    const diff = {
      absolute: {
        clicks: (comparison.metrics.totalClicks || 0) - (baseline.metrics.totalClicks || 0),
        conversions: (comparison.metrics.totalConversions || 0) - (baseline.metrics.totalConversions || 0),
        revenue: (comparison.metrics.totalRevenue || 0) - (baseline.metrics.totalRevenue || 0),
      },
      percentage: {
        clicks: baseline.metrics.totalClicks 
          ? ((comparison.metrics.totalClicks || 0) - (baseline.metrics.totalClicks || 0)) / baseline.metrics.totalClicks * 100 
          : 0,
        conversions: baseline.metrics.totalConversions
          ? ((comparison.metrics.totalConversions || 0) - (baseline.metrics.totalConversions || 0)) / baseline.metrics.totalConversions * 100
          : 0,
        revenue: baseline.metrics.totalRevenue
          ? ((comparison.metrics.totalRevenue || 0) - (baseline.metrics.totalRevenue || 0)) / baseline.metrics.totalRevenue * 100
          : 0,
      },
    };

    return { baseline, comparison, diff };
  }

  private getCacheKey(config: ReportConfig): string {
    return `${config.type}-${config.startDate}-${config.endDate}-${JSON.stringify(config.groupBy)}-${JSON.stringify(config.filters)}`;
  }

  async cacheReport(_cacheKey: string, config: ReportConfig, result: any): Promise<void> {
    try {
      const id = nanoid();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await this.db
        .prepare(`
          INSERT INTO report_cache (id, reportType, config, result, createdAt, expiresAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(id, config.type, JSON.stringify(config), JSON.stringify(result), new Date().toISOString(), expiresAt)
        .run();
    } catch {
      // 忽略缓存错误
    }
  }

  async getCachedReport(cacheKey: string): Promise<ReportData | null> {
    try {
      const result = await this.db
        .prepare(`
          SELECT result FROM report_cache 
          WHERE id = ? AND expiresAt > datetime('now')
        `)
        .bind(cacheKey)
        .first<{ result: string }>();

      if (!result) return null;
      return JSON.parse(result.result);
    } catch {
      return null;
    }
  }

  async createScheduledReport(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO scheduled_reports (id, name, reportType, config, schedule, recipients, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        report.name,
        report.reportType,
        JSON.stringify(report.config),
        report.schedule,
        JSON.stringify(report.recipients),
        report.enabled ? 1 : 0,
        now,
        now
      )
      .run();

    return (await this.getScheduledReportById(id))!;
  }

  async getScheduledReportById(id: string): Promise<ScheduledReport | null> {
    const result = await this.db
      .prepare('SELECT * FROM scheduled_reports WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!result) return null;

    return {
      ...result,
      config: JSON.parse(result.config),
      recipients: JSON.parse(result.recipients),
    };
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    const results = await this.db
      .prepare('SELECT * FROM scheduled_reports ORDER BY createdAt DESC')
      .all<any>();

    return (results.results || []).map(r => ({
      ...r,
      config: JSON.parse(r.config),
      recipients: JSON.parse(r.recipients),
    }));
  }

  async deleteScheduledReport(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM scheduled_reports WHERE id = ?').bind(id).run();
  }
}

export function createReportService(env: Env): ReportService {
  return new ReportService(env);
}
