/**
 * @fileoverview 鍒嗘瀽鏁版嵁 API 璺敱
 * @description 鎻愪緵浠〃鏉垮拰鍒嗘瀽鏁版嵁鐨?HTTP 鎺ュ彛
 * @module services/analytics/analytics.routes
 *
 * 鏁版嵁瀛樺偍鏋舵瀯:
 *   - DO (Durable Objects): 鍞竴鎬ф鏌ュ拰璁℃暟鍣?
 *   - D1: 涓诲瓨鍌紝鐢ㄤ簬鎵€鏈夋暟鎹煡璇?
 *
 * 鏁版嵁娴?
 *   鐐瑰嚮璇锋眰 鈫?DO(鍞竴鎬ф鏌? 鈫?D1(涓诲瓨鍌?
 *
 * Dashboard鏁版嵁璇诲彇閫昏緫:
 *   - 鎵€鏈夋暟鎹?鈹€鈹€鈻?D1璇诲彇
 *
 * 杈撳叆: HTTP 鏌ヨ鍙傛暟
 * 杈撳嚭: JSON 鏍煎紡鐨勫垎鏋愭暟鎹?
 * 閫昏緫浜や簰:
 *   - 璋冪敤 DashboardQueryService 浠?D1 鑾峰彇鏁版嵁
 * 鍓嶅悗绔氦浜? 鍓嶇閫氳繃 /api/analytics/* 璋冪敤
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { createDashboardQueryService } from './dashboard-query.service';
import {
  buildDashboardPageBundle,
  buildDashboardPageCacheKey,
  createDashboardPageScope,
} from './dashboard-page-bundle';
import { ETagCacheManager } from '@/services/cache/etag-cache-manager';
import { CacheKeyBuilder } from '@/services/cache/unified-cache-manager';
import type { ReportDimension, ReportFilter, ReportMetric } from '@/handlers/d1/traffic.repo';
import { getWorkerVersionInfo } from '@/services/cache/version-utils';

function normalizeCampaignId(value: string | undefined | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized && normalized !== 'all' ? normalized : undefined;
}

export function createAnalyticsRouter() {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/analytics/dashboard
   * 鑾峰彇浠〃鏉跨粺璁℃暟鎹?
   * 
   * 缂撳瓨绛栫暐:
   * - today: 瀹炴椂鏁版嵁, 5鍒嗛挓TTL
   * - last7days/last30days: 杩戞湡鏁版嵁, 6灏忔椂TTL
   * - 鍘嗗彶鏁版嵁: 24灏忔椂TTL
   * 
   * 鏁版嵁婧? 鑷姩閫夋嫨 (DO < 90澶? D1 > 90澶?
   * 鐢ㄩ€? Dashboard 鏍稿績鎸囨爣鏄剧ず
   */
  router.get('/dashboard', async (c) => {
    try {
      const range = c.req.query('range') || 'today';
      const campaignId = normalizeCampaignId(c.req.query('campaignId') || c.req.query('campaign'));
      const cacheManager = new ETagCacheManager(c.env);
      
      // 鏍规嵁鏃堕棿鑼冨洿鎺ㄦ柇缂撳瓨绫诲瀷
      const cacheType = ETagCacheManager.inferCacheType('/dashboard', range);
      
      return await cacheManager.fetch(
        c.req.raw,
        async () => {
          const dashboardQuery = createDashboardQueryService(c.env);
          return dashboardQuery.getDashboardStats(range, c.env, campaignId);
        },
        {
          cacheType,
          cacheKey: CacheKeyBuilder.dashboard(range, campaignId || 'all'),
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

  router.get('/dashboard-bundle', async (c) => {
    try {
      const url = new URL(c.req.url);
      const layerParam = c.req.query('layer');
      const layer = layerParam === 'critical' || layerParam === 'secondary' ? layerParam : 'full';
      const scope = createDashboardPageScope(url);
      const cacheManager = new ETagCacheManager(c.env);
      const cacheType = ETagCacheManager.inferCacheType('/dashboard', scope.range);

      return await cacheManager.fetch(
        c.req.raw,
        async () => success(await buildDashboardPageBundle(c.env, scope, layer)),
        {
          cacheType,
          cacheKey: buildDashboardPageCacheKey(scope, layer, getWorkerVersionInfo(c.env).namespace),
        }
      );
    } catch (err) {
      console.error('[Analytics API] Dashboard bundle error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch dashboard bundle'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/recent-clicks
   * 鑾峰彇鏈€杩戠偣鍑绘暟鎹?
   *
   * 鏁版嵁婧? 鑷姩閫夋嫨 (DO < 90澶? D1 > 90澶?
   * 鐢ㄩ€? 鏌ョ湅鏈€杩戠偣鍑昏鎯咃紝鏀寔瀹炴椂鐩戞帶
   */
  router.get('/recent-clicks', async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const range = c.req.query('range') || 'today';
      const campaignId = normalizeCampaignId(c.req.query('campaignId') || c.req.query('campaign'));
      const cacheManager = new ETagCacheManager(c.env);
      const cacheType = ETagCacheManager.inferCacheType('/recent-clicks', range);

      return await cacheManager.fetch(
        c.req.raw,
        async () => {
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

          return success({
            list: formattedList,
            total: result.total,
            dataSource: result.dataSource,
            queryTime: new Date().toISOString(),
          });
        },
        {
          cacheType,
          cacheKey: CacheKeyBuilder.recentClicks(range, limit, campaignId || 'all'),
        }
      );
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
   * 鑾峰彇瀹炰綋缁熻鏁版嵁
   *
   * 鏁版嵁婧? 鑷姩閫夋嫨 (DO < 90澶? D1 > 90澶?
   * 鐢ㄩ€? 鎸夌淮搴︽煡鐪嬬粺璁″垎甯?
   */
  router.get('/entity-stats', async (c) => {
    try {
      const type = c.req.query('type');
      const range = c.req.query('range') || 'today';
      const campaignId = normalizeCampaignId(c.req.query('campaignId') || c.req.query('campaign'));

      if (!type) {
        return c.json(
          error('Entity type is required'),
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const cacheManager = new ETagCacheManager(c.env);
      const cacheType = ETagCacheManager.inferCacheType('/entity-stats', range);

      return await cacheManager.fetch(
        c.req.raw,
        async () => {
          const dashboardQuery = createDashboardQueryService(c.env);

          let stats: any[];
          try {
            stats = await dashboardQuery.getEntityStats(type, range, campaignId);
          } catch {
            console.warn(`[Analytics API] Entity stats for ${type} unavailable, returning empty array`);
            stats = [];
          }

          return success(stats);
        },
        {
          cacheType,
          cacheKey: CacheKeyBuilder.entityStats(type, range, campaignId || 'all'),
        }
      );
    } catch (err) {
      // 鎹曡幏鎵€鏈夋湭澶勭悊鐨勯敊璇紝杩斿洖鍙嬪ソ鐨勯敊璇俊鎭?
      console.warn('[Analytics API] Entity stats error:', err instanceof Error ? err.message : err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch entity stats'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * GET /api/analytics/trend-report
   * 鑾峰彇瓒嬪娍鎶ュ憡鏁版嵁
   *
   * 鏁版嵁婧? 鑷姩閫夋嫨 (DO < 90澶? D1 > 90澶?
   * 鐢ㄩ€? 鏌ョ湅娴侀噺瓒嬪娍鍙樺寲
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
   * 鑾峰彇鎸囧畾绫诲瀷鐨勭粺璁℃姤琛?
   *
   * 鏁版嵁婧? 鑷姩閫夋嫨 (DO < 90澶? D1 > 90澶?
   * 绫诲瀷: traffic | conversion | financial | roi
   * 鐢ㄩ€? 鐢熸垚璇︾粏鐨勭粺璁″垎鏋愭姤琛?
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
   * 瀵煎嚭鎶ヨ〃涓篊SV鎴朎xcel鏍煎紡
   *
   * Body: { type, format, startDate, endDate, groupBy, columns }
   * 鏍煎紡: csv | excel
   * 鐢ㄩ€? 瀵煎嚭鎶ヨ〃杩涜杩涗竴姝ュ垎鏋?
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
 * 鐢熸垚CSV鏍煎紡鏁版嵁
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
 * 鐢熸垚Excel鏍煎紡鏁版嵁
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
