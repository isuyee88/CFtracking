/**
 * @fileoverview Tracking Script API 路由
 * @description 处理客户端跟踪脚本的 HTTP 请求
 * @module services/tracking/tracking-script.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { createTrackingScriptService } from './tracking-script.service';
import { createClickService } from './click.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { generateClickId, generateVisitorId } from '@/utils/crypto';

export function createTrackingScriptRouter() {
  const router = new Hono<{ Bindings: Env }>();
  const scriptService = createTrackingScriptService({} as Env);

  /**
   * GET /api/tracking/script/code
   * 获取跟踪脚本代码
   */
  router.get('/script/code', async (c) => {
    try {
      const campaignId = c.req.query('campaignId');
      const domain = c.req.query('domain') || new URL(c.req.url).host;
      const type = c.req.query('type') || 'tracking'; // 'tracking' | 'kclient'
      const base64 = c.req.query('base64') === 'true';

      if (!campaignId) {
        return c.json(error('campaignId is required'), HTTP_STATUS.BAD_REQUEST);
      }

      const config = {
        campaignId,
        domain,
        base64Encode: base64
      };

      let code: string;
      if (type === 'kclient') {
        code = scriptService.generateKClientJS(config);
      } else {
        code = scriptService.generateTrackingScript(config);
      }

      return c.json(success({
        code,
        type,
        campaignId,
        domain
      }));
    } catch (err) {
      console.error('[TrackingScript] Generate code error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate code'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/tracking/script/track
   * 处理页面访问跟踪
   * 
   * 数据写入格式与 AnalyticsService.trackClick() 保持一致
   * 确保所有点击事件在 Analytics Engine 中使用相同的字段映射
   */
  router.post('/script/track', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        clickId?: string;
        visitorId: string;
        url: string;
        referrer?: string;
        userAgent?: string;
        subId1?: string;
        subId2?: string;
        subId3?: string;
        subId4?: string;
        subId5?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmTerm?: string;
        utmContent?: string;
        utmId?: string;
        deviceFingerprint?: string;
        screenResolution?: string;
        screenColorDepth?: number;
        timezone?: string;
        timezoneOffset?: number;
        language?: string;
        languages?: string;
        platform?: string;
        hardwareConcurrency?: number;
        deviceMemory?: number;
        touchSupport?: number;
        cookieEnabled?: number;
        doNotTrack?: string;
        timestamp: string;
      }>();

      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';

      const clickId = body.clickId || generateClickId();
      const visitorId = body.visitorId || generateVisitorId();

      const cf = c.req.raw.cf as any || {};

      // 写入 TrackingStatsDO
      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName('global-stats')
      );
      
      await trackingDO.fetch('http://do/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: clickId,
          campaignId: body.campaignId,
          ip: clientIP,
          country: cf.country || '',
          city: cf.city || '',
          region: cf.region || '',
          timestamp: new Date(body.timestamp || Date.now()).getTime(),
          cost: 0,
        }),
      });

      return c.json(success({
        tracked: true,
        clickId,
        visitorId,
        token: null
      }));
    } catch (err) {
      console.error('[TrackingScript] Track error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Track failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/tracking/script/conversion
   * 处理转化上报
   */
  router.post('/script/conversion', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        clickId?: string;
        payout: number;
        status: 'lead' | 'sale' | 'rejected';
        tid?: string;
        subIds?: Record<string, string>;
      }>();

      if (!body.campaignId) {
        return c.json(error('campaignId is required'), HTTP_STATUS.BAD_REQUEST);
      }

      // 创建转化记录
      const conversionId = body.tid || crypto.randomUUID();

      // 写入 TrackingStatsDO
      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName('global-stats')
      );
      
      await trackingDO.fetch('http://do/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clickId: body.clickId,
          revenue: body.payout || 0,
        }),
      });

      return c.json(success({
        conversionId: conversionId,
        status: body.status,
        recorded: true
      }));
    } catch (err) {
      console.error('[TrackingScript] Conversion error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Conversion failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/tracking/script/update
   * 更新点击参数
   */
  router.post('/script/update', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        clickId?: string;
        subIds: Record<string, string>;
      }>();

      if (!body.campaignId || !body.clickId) {
        return c.json(error('campaignId and clickId are required'), HTTP_STATUS.BAD_REQUEST);
      }

      return c.json(success({
        updated: true,
        clickId: body.clickId,
        subIds: body.subIds
      }));
    } catch (err) {
      console.error('[TrackingScript] Update error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Update failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  /**
   * POST /api/tracking/kclient/process
   * KClient JS 流量处理
   */
  router.post('/kclient/process', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        visitorId: string;
        url: string;
        referrer?: string;
        userAgent?: string;
        timestamp: string;
      }>();

      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';

      // 创建点击服务处理流量
      const clickService = createClickService(c.env);

      // 模拟点击处理逻辑
      const clickResult = await clickService.handleClick({
        campaignId: body.campaignId,
        ip: clientIP,
        userAgent: body.userAgent || '',
        referer: body.referrer,
        existingVisitorId: body.visitorId
      });

      // 根据处理结果返回动作
      let action: string;
      let resultData: any = {};

      if (clickResult.isTrafficLoss) {
        action = 'do_nothing';
      } else if (clickResult.redirectUrl) {
        action = 'redirect';
        resultData.url = clickResult.redirectUrl;
      } else {
        action = 'do_nothing';
      }

      return c.json(success({
        action,
        clickId: clickResult.clickId,
        ...resultData
      }));
    } catch (err) {
      console.error('[TrackingScript] KClient process error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Process failed'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
