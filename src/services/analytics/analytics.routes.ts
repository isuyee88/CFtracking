/**
 * @fileoverview 分析数据 API 路由
 * @description 提供仪表板和分析数据的 HTTP 接口
 * @module services/analytics/analytics.routes
 *
 * 数据存储架构:
 *   - DO (Durable Objects): 唯一性检查和计数器
 *   - D1: 主存储，用于所有数据查询
 *
 * 数据流:
 *   点击请求 → DO(唯一性检查) → D1(主存储)
 *
 * Dashboard数据读取逻辑:
 *   - 所有数据 ──► D1读取
 *
 * 输入: HTTP 查询参数
 * 输出: JSON 格式的分析数据
 * 逻辑交互:
 *   - 调用 DashboardQueryService 从 D1 获取数据
 * 前后端交互: 前端通过 /api/analytics/* 调用
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { createDashboardQueryService } from './dashboard-query.service';
import { ETagCacheManager } from '@/services/cache/etag-cache-manager';
import { CacheKeyBuilder } from '@/services/cache/unified-cache-manager';
import type { ReportDimension, ReportFilter, ReportMetric } from '@/handlers/d1/traffic.repo';

export function createAnalyticsRouter() {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/analytics/dashboard
   * 获取仪表板统计数据
   * 
   * 缓存策略:
   * - today: 实时数据, 5分钟TTL
   * - last7days/last30days: 近期数据, 6小时TTL
   * - 历史数据: 24小时TTL
   * 
   * 数据源: 自动选择 (DO < 90天, D1 > 90天)
   * 用途: Dashboard 核心指标显示
   */
  router.get('/dashboard', async (c) => {
    try {
      const range = c.req.query('range') || 'today';
      const cacheManager = new ETagCacheManager(c.env);
      
      // 根据时间范围推断缓存类型
      const cacheType = ETagCacheManager.inferCacheType('/dashboard', range);
      
      return await cacheManager.fetch(
        c.req.raw,
        async () => {
          const dashboardQuery = createDashboardQueryService(c.env);
          return dashboardQuery.getDashboardStats(range, c.env);
        },
        {
          cacheType,
          cacheKey: CacheKeyBuilder.dashboard(range),
        }
      );
    } catch (err) {
      console.error('[Analytics API] Dashboard error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch dashboard stats'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/recent-clicks
   * 获取最近点击数据
   *
   * 数据源: 自动选择 (DO < 90天, D1 > 90天)
   * 用途: 查看最近点击详情，支持实时监控
   */
  router.get('/recent-clicks', async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const range = c.req.query('range') || 'today';
      const campaignId = c.req.query('campaignId') || undefined;

      const dashboardQuery = createDashboardQueryService(c.env);

      const result = await dashboardQuery.getRecentClicks({
        limit,
        range,
        campaignId,
      });

      const formattedList = result.list.map((item: any) => ({
        event_id: item.event_id || item.clickId || '',
        datetime: item.datetime || item.timestamp || '',
        campaign: item.campaign || item.campaignId || '',
        stream: item.stream || item.flowId || '',
        landing: item.landing || item.landingPageId || '',
        offer: item.offer || item.offerId || '',
        source: item.source || '',
        ip: item.ip || '127.0.0.1',
        country: item.country || '',
        region: item.region || '',
        city: item.city || '',
        isp: item.isp || '',
        operator: item.operator || '',
        device_type: item.device_type || item.device || '',
        device_model: item.device_model || '',
        os: item.os || '',
        os_version: item.os_version || '',
        browser: item.browser || '',
        browser_version: item.browser_version || '',
        os_icon: item.os_icon || '',
        browser_icon: item.browser_icon || '',
        connection_type: item.connection_type || '',
        proxy: item.proxy || 'No',
        creative_id: item.creative_id || '',
        external_id: item.external_id || '',
        ad_campaign_id: item.ad_campaign_id || '',
        sub_id: item.sub_id || '',
        sub1: item.sub1 || item.subId1 || '',
        sub2: item.sub2 || item.subId2 || '',
        sub3: item.sub3 || item.subId3 || '',
        sub4: item.sub4 || '',
        sub5: item.sub5 || '',
        referrer: item.referrer || item.referer || '',
        referrer_domain: item.referrer_domain || '',
        search_engine: item.search_engine || '',
        keyword: item.keyword || '',
        destination: item.destination || '',
        cost: item.cost || '$0.00',
        bot: item.bot || 'No',
        unique_stream: item.unique_stream || 'Yes',
        unique_campaign: item.unique_campaign || 'Yes',
        user_agent: item.user_agent || item.userAgent || '',
        visitor_code: item.visitor_code || item.visitorId || '',
        fingerprint: item.fingerprint || '',
        risk_score: item.risk_score || item.riskScore || 0,
        cf_bot_score: item.cf_bot_score || item.cfBotScore || 0,
      }));

      return c.json(success({
        list: formattedList,
        total: result.total,
        dataSource: result.dataSource,
        queryTime: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[Analytics API] Recent clicks error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch recent clicks'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/entity-stats
   * 获取实体统计数据
   *
   * 数据源: 自动选择 (DO < 90天, D1 > 90天)
   * 用途: 按维度查看统计分布
   */
  router.get('/entity-stats', async (c) => {
    try {
      const type = c.req.query('type');
      const range = c.req.query('range') || 'today';

      if (!type) {
        return c.json(
          error('Entity type is required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const dashboardQuery = createDashboardQueryService(c.env);

      let stats: any[];
      try {
        stats = await dashboardQuery.getEntityStats(type, range);
      } catch (entityError) {
        // 静默处理错误，返回空数组
        // 常见原因：数据源中没有该类型的数据，或者引用了已删除的实体
        console.warn(`[Analytics API] Entity stats for ${type} unavailable, returning empty array`);
        stats = [];
      }

      return c.json(success(stats));
    } catch (err) {
      // 捕获所有未处理的错误，返回友好的错误信息
      console.warn('[Analytics API] Entity stats error:', err instanceof Error ? err.message : err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch entity stats'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/trend-report
   * 获取趋势报告数据
   *
   * 数据源: 自动选择 (DO < 90天, D1 > 90天)
   * 用途: 查看流量趋势变化
   */
  router.get('/trend-report', async (c) => {
    try {
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const interval = (c.req.query('interval') || 'day') as 'hour' | 'day' | 'week' | 'month';
      const campaignId = c.req.query('campaignId') || undefined;

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const dashboardQuery = createDashboardQueryService(c.env);
      const trendData = await dashboardQuery.getTrendReport(startDate, endDate, interval, campaignId);

      return c.json(success({
        data: trendData,
        startDate,
        endDate,
        interval,
        queryTime: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[Analytics API] Trend report error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch trend report'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/reports/:type
   * 获取指定类型的统计报表
   *
   * 数据源: 自动选择 (DO < 90天, D1 > 90天)
   * 类型: traffic | conversion | financial | roi
   * 用途: 生成详细的统计分析报表
   */
  router.get('/reports/:type', async (c) => {
    try {
      const reportType = c.req.param('type') as 'traffic' | 'conversion' | 'financial' | 'roi';
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const groupBy = parseCsvParam(c.req.query('groupBy')) as ReportDimension[];
      const metrics = parseCsvParam(c.req.query('metrics')) as ReportMetric[];
      const limit = parseInt(c.req.query('limit') || '100');
      const sortBy = (c.req.query('sortBy') || 'clicks') as ReportDimension | ReportMetric;
      const sortOrder = (c.req.query('sortOrder') || 'desc') as 'asc' | 'desc';
      const filters = parseReportFilters(c.req.query('filters'));

      if (!['traffic', 'conversion', 'financial', 'roi'].includes(reportType)) {
        return c.json(
          error('Invalid report type. Must be: traffic, conversion, financial, or roi'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const dashboardQuery = createDashboardQueryService(c.env);
      const reportData = await dashboardQuery.getReport(reportType, {
        startDate,
        endDate,
        groupBy: groupBy.length > 0 ? groupBy : ['campaign'],
        metrics,
        filters,
        limit,
        sortBy,
        sortOrder,
      });

      return c.json(success({
        type: reportType,
        data: reportData,
        params: { startDate, endDate, groupBy, metrics, filters, limit, sortBy, sortOrder },
        queryTime: new Date().toISOString(),
      }));
    } catch (err) {
      console.error(`[Analytics API] Report ${c.req.param('type')} error:`, err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch report'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/reports/query', async (c) => {
    try {
      const body = await c.req.json();
      const { startDate, endDate } = body;

      if (!startDate || !endDate) {
        return c.json(error('startDate and endDate are required'), HTTP_STATUS.BAD_REQUEST);
      }

      const dashboardQuery = createDashboardQueryService(c.env);
      const groupBy = normalizeDimensions(body.groupBy);
      const metrics = normalizeMetrics(body.metrics);
      const filters = normalizeFilters(body.filters);
      const sortBy = (body.sortBy || metrics[0] || groupBy[0] || 'summary') as ReportDimension | ReportMetric;
      const sortOrder = body.sortOrder === 'asc' ? 'asc' : 'desc';
      const limit = Number(body.limit) || 250;

      const reportData = await dashboardQuery.getCustomReport({
        startDate,
        endDate,
        groupBy,
        metrics,
        filters,
        limit,
        sortBy,
        sortOrder,
      });

      return c.json(success({
        data: reportData,
        params: { startDate, endDate, groupBy, metrics, filters, limit, sortBy, sortOrder },
        queryTime: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[Analytics API] Report builder query error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to query report'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/analytics/reports/export
   * 导出报表为CSV或Excel格式
   *
   * Body: { type, format, startDate, endDate, groupBy, columns }
   * 格式: csv | excel
   * 用途: 导出报表进行进一步分析
   */
  router.post('/reports/export', async (c) => {
    try {
      const body = await c.req.json();
      const {
        type = 'traffic',
        format = 'csv',
        startDate,
        endDate,
        groupBy = ['date'],
        metrics,
        filters,
        limit,
        sortBy,
        sortOrder,
        columns,
      } = body;

      if (!['traffic', 'conversion', 'financial', 'roi'].includes(type)) {
        return c.json(
          error('Invalid report type'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      if (!startDate || !endDate) {
        return c.json(
          error('startDate and endDate are required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const dashboardQuery = createDashboardQueryService(c.env);
      const reportData = await dashboardQuery.getReport(type, {
        startDate,
        endDate,
        groupBy: normalizeDimensions(groupBy),
        metrics: normalizeMetrics(metrics),
        filters: normalizeFilters(filters),
        limit: Number(limit) || 10000,
        sortBy: (sortBy || 'date') as ReportDimension | ReportMetric,
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${type}-report-${timestamp}`;

      if (format === 'csv') {
        const csv = generateCSV(reportData, columns);
        c.header('Content-Type', 'text/csv; charset=utf-8');
        c.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return c.body(csv);
      }

      if (format === 'excel') {
        c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        c.header('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        const excelBuffer = generateExcel(reportData, columns);
        return c.body(excelBuffer);
      }

      return c.json(error('Unsupported format. Use: csv or excel'), HTTP_STATUS.BAD_REQUEST);
    } catch (err) {
      console.error('[Analytics API] Report export error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to export report'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}

/**
 * 生成CSV格式数据
 */
function parseCsvParam(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseReportFilters(value?: string): ReportFilter[] {
  if (!value) {
    return [];
  }

  try {
    return normalizeFilters(JSON.parse(value));
  } catch {
    return [];
  }
}

function normalizeDimensions(value: unknown): ReportDimension[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ReportDimension => typeof item === 'string' && item.length > 0);
}

function normalizeMetrics(value: unknown): ReportMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ReportMetric => typeof item === 'string' && item.length > 0);
}

function normalizeFilters(value: unknown): ReportFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ReportFilter => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Partial<ReportFilter>;
    return (
      typeof candidate.field === 'string' &&
      typeof candidate.operator === 'string' &&
      (typeof candidate.value === 'string' || typeof candidate.value === 'number')
    );
  });
}

function generateCSV(data: any[], columns?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = columns || Object.keys(data[0]);
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return '\ufeff' + csvRows.join('\n');
}

/**
 * 生成Excel格式数据
 */
function generateExcel(data: any[], columns?: string[]): ArrayBuffer {
  const headers = columns || Object.keys(data[0] || {});
  const rows = [headers];

  for (const row of data) {
    rows.push(headers.map(h => row[h] ?? ''));
  }

  const sheetContent = rows.map(r => r.join('\t')).join('\n');

  const encoder = new TextEncoder();
  return encoder.encode(sheetContent).buffer as ArrayBuffer;
}
