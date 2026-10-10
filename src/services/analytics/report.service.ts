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
  ReportRow,
  FunnelReport,
  FunnelStepData,
  CohortReport,
  CohortPeriod,
  ComparisonReport,
  ScheduledReport,
  ReportPreset,
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
    const groupBy = config.groupBy || [];
    const filters = config.filters;

    // ---- 维度白名单解析（同时是 SQL 注入防线）----
    const dims: { key: string; expr: string }[] = [];
    for (const g of groupBy) {
      const dim = ReportService.DIMENSIONS[g];
      if (!dim) {
        throw new Error(`Unsupported groupBy dimension: ${g}`);
      }
      dims.push({ key: g, expr: dim.expr });
    }

    // ---- 收集维度所需的 JOIN（去重）----
    const joinKeys = new Set<string>();
    for (const g of groupBy) {
      const j = ReportService.DIMENSIONS[g]?.join;
      if (j) joinKeys.add(j);
    }
    // traffic_source 依赖 campaigns JOIN
    if (joinKeys.has('trafficSources')) joinKeys.add('campaigns');
    for (const f of filters || []) {
      const fieldExpr = ReportService.FILTER_FIELDS[f.field];
      if (fieldExpr?.includes('ts.')) joinKeys.add('trafficSources');
      if (fieldExpr?.includes('ts.') || fieldExpr?.includes('cmp.')) joinKeys.add('campaigns');
    }

    // ---- 转化/出站聚合子查询（先按 clickId 聚合，避免多平台 postback 放大 conversion/revenue）----
    // conversions.status=approved 是已确认的 conversion；postback delivery state
    // 则按 conversion/platform 唯一记录聚合为 sent/pending/failed 三类，
    // 让报表同时展示收入事实和 outbound 是否成功送达。
    const conversionsJoin = `LEFT JOIN (
        SELECT clickId,
          COUNT(*) AS convCount,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS confirmedConversions,
          SUM(revenue) AS convRevenue
        FROM conversions
        GROUP BY clickId
      ) cv ON cv.clickId = c.clickId
      LEFT JOIN (
        SELECT cv2.clickId,
          SUM(CASE WHEN pid.status = 'sent' THEN 1 ELSE 0 END) AS outboundPostbacksSent,
          SUM(CASE WHEN pid.status IN ('pending', 'sending', 'retry') THEN 1 ELSE 0 END) AS outboundPostbacksPending,
          SUM(CASE WHEN pid.status = 'dead_letter' THEN 1 ELSE 0 END) AS outboundPostbacksFailed
        FROM conversions cv2
        INNER JOIN postback_idempotency pid ON pid.conversion_id = cv2.conversionId
        GROUP BY cv2.clickId
      ) pb ON pb.clickId = c.clickId`;

    const joinsSql = Array.from(joinKeys).map((k) => ReportService.DIMENSION_JOINS[k]).join('\n');

    const selectParts = [
      ...dims.map((d, i) => `${d.expr} as dim${i}`),
      'COUNT(*) as clicks',
      'COUNT(DISTINCT CASE WHEN c.isUnique = 1 THEN c.visitorId END) as uniqueClicks',
      'COALESCE(SUM(cv.convCount), 0) as conversions',
      'COALESCE(SUM(cv.confirmedConversions), 0) as confirmedConversions',
      'COALESCE(SUM(pb.outboundPostbacksSent), 0) as outboundPostbacksSent',
      'COALESCE(SUM(pb.outboundPostbacksPending), 0) as outboundPostbacksPending',
      'COALESCE(SUM(pb.outboundPostbacksFailed), 0) as outboundPostbacksFailed',
      'COALESCE(SUM(cv.convRevenue), 0) as revenue',
      'COALESCE(SUM(c.cost), 0) as cost',
    ];

    let sql = `SELECT ${selectParts.join(', ')} FROM clicks c ${conversionsJoin} ${joinsSql} WHERE c.timestamp >= ? AND c.timestamp <= ?`;
    const params: any[] = [startDate, endDate];

    // ---- 过滤条件（字段白名单 + 全 operator）----
    if (filters && filters.length > 0) {
      const filterClauses: string[] = [];
      for (const f of filters) {
        const fieldExpr = ReportService.FILTER_FIELDS[f.field];
        if (!fieldExpr) {
          throw new Error(`Unsupported filter field: ${f.field}`);
        }
        const clause = this.buildFilterClause(fieldExpr, f.operator, f.value, params);
        if (clause) filterClauses.push(clause);
      }
      if (filterClauses.length > 0) {
        sql += ` AND ${filterClauses.join(' AND ')}`;
      }
    }

    if (dims.length > 0) {
      sql += ` GROUP BY ${dims.map((d) => d.expr).join(', ')}`;
    }

    let rows: ReportRow[];
    try {
      const results = await this.db.prepare(sql).bind(...params).all();
      rows = (results.results || []).map((r: any) => {
        const dimensions: Record<string, string> = {};
        dims.forEach((d, i) => {
          dimensions[d.key] = String(r[`dim${i}`] ?? 'all');
        });
        return {
          dimension: dims.map((_, i) => String(r[`dim${i}`] ?? 'all')).join(' / ') || 'all',
          dimensions,
          metrics: {
            clicks: r.clicks || 0,
            uniqueClicks: r.uniqueClicks || 0,
            conversions: r.conversions || 0,
            confirmedConversions: r.confirmedConversions || 0,
            outboundPostbacksSent: r.outboundPostbacksSent || 0,
            outboundPostbacksPending: r.outboundPostbacksPending || 0,
            outboundPostbacksFailed: r.outboundPostbacksFailed || 0,
            revenue: this.round2(r.revenue || 0),
            cost: this.round2(r.cost || 0),
          },
        };
      });
    } catch (err) {
      // 维度/过滤非法等查询错误必须暴露，不能静默吞掉后返回"合法的空报表"
      console.error('[ReportService] standard report query failed:', err);
      throw err instanceof Error ? err : new Error('Report query failed');
    }

    // ---- 衍生指标（JS 计算，规避 SQLite 除零方言差异）----
    for (const row of rows) {
      const clicks = row.metrics.clicks || 0;
      const conversions = row.metrics.conversions || 0;
      const revenue = row.metrics.revenue || 0;
      const cost = row.metrics.cost || 0;
      row.metrics.profit = this.round2(revenue - cost);
      row.metrics.roi = cost > 0 ? this.round2(((revenue - cost) / cost) * 100) : 0;
      row.metrics.cr = clicks > 0 ? this.round2((conversions / clicks) * 100) : 0;
      row.metrics.epc = clicks > 0 ? this.round2(revenue / clicks) : 0;
      row.metrics.cpc = clicks > 0 ? this.round2(cost / clicks) : 0;
    }

    // ---- 排序（白名单键）+ 截断 ----
    const sortableKeys = ['clicks', 'uniqueClicks', 'conversions', 'revenue', 'cost', 'profit', 'roi', 'cr', 'epc', 'cpc'];
    if (config.sortBy && sortableKeys.includes(config.sortBy)) {
      const dir = config.sortOrder === 'asc' ? 1 : -1;
      rows.sort((a, b) => ((a.metrics[config.sortBy!] || 0) - (b.metrics[config.sortBy!] || 0)) * dir);
    }
    const limit = Math.min(Math.max(config.limit || 500, 1), 5000);
    if (rows.length > limit) rows = rows.slice(0, limit);

    // ---- 汇总 ----
    const totalClicks = rows.reduce((s, r) => s + (r.metrics.clicks || 0), 0);
    const totalConversions = rows.reduce((s, r) => s + (r.metrics.conversions || 0), 0);
    const totalRevenue = this.round2(rows.reduce((s, r) => s + (r.metrics.revenue || 0), 0));
    const totalCost = this.round2(rows.reduce((s, r) => s + (r.metrics.cost || 0), 0));

    return {
      metrics: {
        totalClicks,
        totalUniqueClicks: rows.reduce((s, r) => s + (r.metrics.uniqueClicks || 0), 0),
        totalConversions,
        totalConfirmedConversions: this.round2(rows.reduce((s, r) => s + (r.metrics.confirmedConversions || 0), 0)),
        totalOutboundPostbacksSent: this.round2(rows.reduce((s, r) => s + (r.metrics.outboundPostbacksSent || 0), 0)),
        totalOutboundPostbacksPending: this.round2(rows.reduce((s, r) => s + (r.metrics.outboundPostbacksPending || 0), 0)),
        totalOutboundPostbacksFailed: this.round2(rows.reduce((s, r) => s + (r.metrics.outboundPostbacksFailed || 0), 0)),
        totalRevenue,
        totalCost,
        profit: this.round2(totalRevenue - totalCost),
        roi: totalCost > 0 ? this.round2(((totalRevenue - totalCost) / totalCost) * 100) : 0,
        cr: totalClicks > 0 ? this.round2((totalConversions / totalClicks) * 100) : 0,
        epc: totalClicks > 0 ? this.round2(totalRevenue / totalClicks) : 0,
        cpc: totalClicks > 0 ? this.round2(totalCost / totalClicks) : 0,
      },
      rows,
    };
  }

  /**
   * 构建单个过滤子句。fieldExpr 已过白名单，值全部参数化绑定。
   * @returns SQL 子句（无需过滤时返回 null）
   */
  private buildFilterClause(
    fieldExpr: string,
    operator: string,
    value: string | string[] | number,
    params: any[]
  ): string | null {
    switch (operator) {
      case 'eq':
        params.push(value);
        return `${fieldExpr} = ?`;
      case 'neq':
        params.push(value);
        return `${fieldExpr} != ?`;
      case 'in':
      case 'notin': {
        if (!Array.isArray(value) || value.length === 0) return null;
        params.push(...value);
        const placeholders = value.map(() => '?').join(',');
        return operator === 'in' ? `${fieldExpr} IN (${placeholders})` : `${fieldExpr} NOT IN (${placeholders})`;
      }
      case 'gt':
        params.push(value);
        return `${fieldExpr} > ?`;
      case 'gte':
        params.push(value);
        return `${fieldExpr} >= ?`;
      case 'lt':
        params.push(value);
        return `${fieldExpr} < ?`;
      case 'lte':
        params.push(value);
        return `${fieldExpr} <= ?`;
      case 'contains':
        params.push(`%${value}%`);
        return `${fieldExpr} LIKE ?`;
      case 'notcontains':
        params.push(`%${value}%`);
        return `${fieldExpr} NOT LIKE ?`;
      default:
        return null;
    }
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * 报表维度白名单：key → SQL 表达式（带名称回退显示）。
   * 这是 SQL 注入防线——不在表内的 groupBy key 直接拒绝。
   * join 字段标注该维度依赖的关联表（DIMENSION_JOINS 的 key）。
   */
  private static readonly DIMENSIONS: Record<string, { expr: string; join?: string }> = {
    campaign: { expr: "COALESCE(NULLIF(cmp.name, ''), c.campaignId, 'unknown')", join: 'campaigns' },
    campaign_id: { expr: 'c.campaignId' },
    offer: { expr: "COALESCE(NULLIF(o.name, ''), c.offerId, 'none')", join: 'offers' },
    offer_id: { expr: 'c.offerId' },
    flow: { expr: "COALESCE(NULLIF(fl.name, ''), c.flowId, 'none')", join: 'flows' },
    flow_id: { expr: 'c.flowId' },
    landing_page: { expr: "COALESCE(NULLIF(lp.name, ''), c.landingPageId, 'none')", join: 'landingPages' },
    landing_page_id: { expr: 'c.landingPageId' },
    traffic_source: { expr: "COALESCE(NULLIF(ts.name, ''), cmp.trafficSource, 'direct')", join: 'trafficSources' },
    country: { expr: "COALESCE(NULLIF(c.country, ''), 'unknown')" },
    city: { expr: "COALESCE(NULLIF(c.city, ''), 'unknown')" },
    device: { expr: "COALESCE(NULLIF(c.device, ''), 'unknown')" },
    browser: { expr: "COALESCE(NULLIF(c.browser, ''), 'unknown')" },
    os: { expr: "COALESCE(NULLIF(c.os, ''), 'unknown')" },
    isp: { expr: "COALESCE(NULLIF(c.isp, ''), 'unknown')" },
    connection_type: { expr: "COALESCE(NULLIF(c.connectionType, ''), 'unknown')" },
    day: { expr: 'date(c.timestamp)' },
    week: { expr: "strftime('%Y-W%W', c.timestamp)" },
    month: { expr: "strftime('%Y-%m', c.timestamp)" },
    hour: { expr: "strftime('%Y-%m-%d %H:00', c.timestamp)" },
    utm_source: { expr: "COALESCE(NULLIF(c.utmSource, ''), 'none')" },
    utm_medium: { expr: "COALESCE(NULLIF(c.utmMedium, ''), 'none')" },
    utm_campaign: { expr: "COALESCE(NULLIF(c.utmCampaign, ''), 'none')" },
    utm_term: { expr: "COALESCE(NULLIF(c.utmTerm, ''), 'none')" },
    utm_content: { expr: "COALESCE(NULLIF(c.utmContent, ''), 'none')" },
    is_unique: { expr: "CASE WHEN c.isUnique = 1 THEN 'unique' ELSE 'repeat' END" },
    is_bot: { expr: "CASE WHEN c.isBot = 1 THEN 'bot' ELSE 'human' END" },
    ...Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `sub${i + 1}`,
        { expr: `COALESCE(NULLIF(c.subId${i + 1}, ''), 'none')` },
      ])
    ),
  };

  /** 维度/过滤依赖的 JOIN 片段白名单 */
  private static readonly DIMENSION_JOINS: Record<string, string> = {
    campaigns: 'LEFT JOIN campaigns cmp ON c.campaignId = cmp.id',
    offers: 'LEFT JOIN offers o ON c.offerId = o.id',
    flows: 'LEFT JOIN flows fl ON c.flowId = fl.id',
    landingPages: 'LEFT JOIN landingPages lp ON c.landingPageId = lp.id',
    trafficSources: 'LEFT JOIN trafficSources ts ON cmp.trafficSource = ts.id',
  };

  /** 过滤字段白名单：入参字段名 → 安全 SQL 表达式 */
  private static readonly FILTER_FIELDS: Record<string, string> = {
    clickId: 'c.clickId',
    campaignId: 'c.campaignId',
    offerId: 'c.offerId',
    flowId: 'c.flowId',
    landingPageId: 'c.landingPageId',
    visitorId: 'c.visitorId',
    ip: 'c.ip',
    country: 'c.country',
    city: 'c.city',
    device: 'c.device',
    browser: 'c.browser',
    os: 'c.os',
    isp: 'c.isp',
    fingerprint: 'c.fingerprint',
    utmSource: 'c.utmSource',
    utmMedium: 'c.utmMedium',
    utmCampaign: 'c.utmCampaign',
    utmTerm: 'c.utmTerm',
    utmContent: 'c.utmContent',
    cost: 'c.cost',
    isUnique: 'c.isUnique',
    isBot: 'c.isBot',
    riskScore: 'c.riskScore',
    source: "COALESCE(NULLIF(ts.name, ''), cmp.trafficSource)",
    zoneId: "COALESCE(NULLIF(c.subId1, ''), NULLIF(c.subId2, ''), NULLIF(c.subId3, ''))",
    ...Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`subId${i + 1}`, `c.subId${i + 1}`])
    ),
  };

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
    // 缓存键必须覆盖全部影响结果的入参；读取侧按此键查 id，写入侧用同键
    // INSERT OR REPLACE（旧实现写入随机 id、按键读取，缓存永不命中）。
    const parts = [
      config.type,
      config.startDate,
      config.endDate,
      JSON.stringify(config.groupBy || []),
      JSON.stringify(config.filters || []),
      config.sortBy || '',
      config.sortOrder || '',
      config.limit || 0,
    ];
    return parts.join('|');
  }

  async cacheReport(cacheKey: string, config: ReportConfig, result: any): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await this.db
        .prepare(`
          INSERT OR REPLACE INTO report_cache (id, reportType, config, result, createdAt, expiresAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(cacheKey, config.type, JSON.stringify(config), JSON.stringify(result), new Date().toISOString(), expiresAt)
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

  // ==================== 报表预设（Keitaro 式保存的报表组合） ====================

  /**
   * 查询报表预设列表
   * @param reportType 可选按报表类型过滤
   */
  async listReportPresets(reportType?: string): Promise<ReportPreset[]> {
    let sql = 'SELECT * FROM report_presets';
    const params: string[] = [];
    if (reportType) {
      sql += ' WHERE reportType = ?';
      params.push(reportType);
    }
    sql += ' ORDER BY createdAt DESC';

    const results = await this.db
      .prepare(sql)
      .bind(...params)
      .all<any>();

    return (results.results || []).map((r) => ({
      id: r.id,
      name: r.name,
      reportType: r.reportType,
      config: JSON.parse(r.config),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createReportPreset(data: { name: string; reportType: string; config: unknown }): Promise<ReportPreset> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO report_presets (id, name, reportType, config, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(id, data.name, data.reportType, JSON.stringify(data.config), now, now)
      .run();

    const preset = await this.db.prepare('SELECT * FROM report_presets WHERE id = ?').bind(id).first<any>();
    return { ...preset, config: JSON.parse(preset.config) };
  }

  async updateReportPreset(id: string, data: { name?: string; config?: unknown }): Promise<ReportPreset | null> {
    const existing = await this.db.prepare('SELECT * FROM report_presets WHERE id = ?').bind(id).first<any>();
    if (!existing) return null;

    const name = data.name ?? existing.name;
    const config = data.config !== undefined ? JSON.stringify(data.config) : existing.config;

    await this.db
      .prepare('UPDATE report_presets SET name = ?, config = ?, updatedAt = ? WHERE id = ?')
      .bind(name, config, new Date().toISOString(), id)
      .run();

    const updated = await this.db.prepare('SELECT * FROM report_presets WHERE id = ?').bind(id).first<any>();
    return updated ? { ...updated, config: JSON.parse(updated.config) } : null;
  }

  async deleteReportPreset(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM report_presets WHERE id = ?').bind(id).run();
    return (result.meta?.changes || 0) > 0;
  }
}

export function createReportService(env: Env): ReportService {
  return new ReportService(env);
}
