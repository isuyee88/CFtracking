/**
 * @fileoverview 分析数据 API 路由
 * @description 提供仪表板和分析数据的 HTTP 接口
 * @module services/analytics/analytics.routes
 *
 * 数据源策略 (Option C 混合方案):
 * - 近期数据 (< 3个月): Analytics Engine 直接查询
 * - Dashboard 统计: Analytics Engine 实时聚合
 * - 历史聚合报表: D1 trafficSummary (待实现 aggregation service)
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { createAnalyticsQueryService } from './analytics-query.service';

export function createAnalyticsRouter() {
  const router = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/analytics/dashboard
   * 获取仪表板统计数据
   *
   * 数据源: Analytics Engine (实时聚合，保留 3 个月)
   * 用途: Dashboard 核心指标显示
   */
  router.get('/dashboard', async (c) => {
    try {
      const range = c.req.query('range') || 'today';
      const analyticsQuery = createAnalyticsQueryService(c.env);

      const stats = await analyticsQuery.getDashboardStats(range);
      const chartData = await analyticsQuery.getChartData(range);

      return c.json(success({
        ...stats,
        chartData,
        range,
        timestamp: new Date().toISOString(),
      }));
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
   * 数据源: Analytics Engine (实时数据，保留 3 个月)
   * 用途: 查看最近点击详情，支持实时监控
   */
  router.get('/recent-clicks', async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const afterTimestamp = c.req.query('after') || undefined;
      const campaignId = c.req.query('campaignId') || undefined;
      const country = c.req.query('country') || undefined;
      const device = c.req.query('device') || undefined;

      const analyticsQuery = createAnalyticsQueryService(c.env);

      const result = await analyticsQuery.getRecentClicks({
        limit,
        afterTimestamp,
        campaignId,
        country,
        device,
      });

      const formattedList = result.list.map((item) => ({
        event_id: item.clickId,
        datetime: item.timestamp,
        campaign: item.campaignId,
        stream: item.flowId,
        landing: item.landingPageId,
        offer: item.offerId,
        source: '',
        ip: item.ip || '127.0.0.1',
        country: item.country || '',
        region: '',
        city: item.city || '',
        isp: '',
        operator: '',
        device_type: item.device || '',
        device_model: '',
        os: item.os || '',
        os_version: '',
        browser: item.browser || '',
        browser_version: '',
        os_icon: '',
        browser_icon: '',
        connection_type: '',
        proxy: item.cfBotScore > 50 ? 'Yes' : 'No',
        creative_id: '',
        external_id: '',
        ad_campaign_id: '',
        sub_id: '',
        sub1: item.subId1 || '',
        sub2: item.subId2 || '',
        sub3: item.subId3 || '',
        sub4: '',
        sub5: '',
        referrer: item.referer || '',
        referrer_domain: '',
        search_engine: '',
        keyword: '',
        destination: '',
        cost: item.cost ? `$${item.cost.toFixed(2)}` : '$0.00',
        bot: item.cfBotScore > 50 ? 'Yes' : 'No',
        unique_stream: 'Yes',
        unique_campaign: 'Yes',
        user_agent: item.visitorId ? `vst_${item.visitorId}` : '',
        visitor_code: item.visitorId || '',
      }));

      return c.json(success({
        list: formattedList,
        total: result.total,
        dataSource: result.dataSource,
        queryTime: result.queryTime,
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

      const analyticsQuery = createAnalyticsQueryService(c.env);

      let stats;
      try {
        stats = await analyticsQuery.getEntityStats(type, range);
      } catch (entityError) {
        console.warn(`[Analytics API] Entity stats for ${type} failed, returning empty:`, entityError);
        stats = [];
      }

      return c.json(success(stats));
    } catch (err) {
      console.error('[Analytics API] Entity stats error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to fetch entity stats'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
