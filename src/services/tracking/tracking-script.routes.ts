/**
 * @fileoverview Tracking Script API 路由
 * @description 处理客户端跟踪脚本的 HTTP 请求，包括点击追踪和转化上报
 * @module services/tracking/tracking-script.routes
 * 
 * 数据流:
 * 1. 点击追踪: 写入 TrackingStatsDO + 触发缓存刷新
 * 2. 转化上报: 写入 TrackingStatsDO + 持久化到 D1 conversions 表 + 触发缓存刷新
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { createTrackingScriptService } from './tracking-script.service';
import { createClickService } from './click.service';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { generateClickId, generateVisitorId } from '@/utils/crypto';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { createCacheUpdateRoutes } from '@/services/cache/cache-update-service';

export function createTrackingScriptRouter() {
  const router = new Hono<{ Bindings: Env }>();
  const scriptService = createTrackingScriptService({} as Env);

  /**
   * GET /code
   * 获取跟踪脚本代码
   * 完整路径: /api/tracking/script/code
   */
  router.get('/code', async (c) => {
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
   * POST /track
   * 处理页面访问跟踪
   * 完整路径: /api/tracking/script/track
   * 
   * 数据写入格式与 AnalyticsService.trackClick() 保持一致
   * 确保所有点击事件在 Analytics Engine 中使用相同的字段映射
   */
  router.post('/track', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        clickId?: string;
        visitorId: string;
        url: string;
        // 为什么白名单透传而非直接透传：/track 原语义即 pageview，affiliate-landing /go
        // 302 点击复用此端点时必须区分口径（landing-stats 按 type 分列 pv/clicks），
        // 未知值一律回落 pageview，防止伪造脏数据污染统计
        type?: string;
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

      // 为什么不用 new Date(body.timestamp).getTime()：数字字符串会得到 Invalid Date→NaN→落库 NULL
      const eventTs = typeof body.timestamp === 'number' && Number.isFinite(body.timestamp)
        ? body.timestamp
        : (Date.parse(String(body.timestamp || '')) || Date.now());

      const eventType = body.type === 'click' ? 'click' : 'pageview';

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
          visitorId,
          type: eventType,
          // 维度归因透传：subId1=slot/offer，subId2=A/B 实验组（affiliate-landing /go），
          // pageview 无维度时 undefined → DO 侧落 ''
          subId1: body.subId1,
          subId2: body.subId2,
          ip: clientIP,
          country: cf.country || '',
          city: cf.city || '',
          region: cf.region || '',
          timestamp: eventTs,
          cost: 0,
        }),
      });

      // P0-003: 触发缓存刷新和 SSE 推送
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const cacheUpdate = createCacheUpdateRoutes(c.env);
            
            // 触发点击数据变更
            await cacheUpdate.onDataChanged('click', clickId, 'create');
            
            // 如果有关联的 campaign，也触发 campaign 更新
            if (body.campaignId) {
              await cacheUpdate.onDataChanged('campaign', body.campaignId, 'update');
            }
          } catch (error) {
            console.error('[TrackingScript] Cache update failed:', error);
          }
        })()
      );

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
   * POST /conversion
   * 处理转化上报
   * 完整路径: /api/tracking/script/conversion
   * 
   * P0-001: 持久化转化记录到 D1 conversions 表
   * P0-003: 触发缓存刷新和 SSE 推送
   */
  router.post('/conversion', async (c) => {
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

      if (typeof body.campaignId !== 'string' || body.campaignId.length > 128) {
        return c.json(error('campaignId is invalid'), HTTP_STATUS.BAD_REQUEST);
      }

      if (body.clickId !== undefined && (typeof body.clickId !== 'string' || body.clickId.length > 256)) {
        return c.json(error('clickId is invalid'), HTTP_STATUS.BAD_REQUEST);
      }

      if (!Number.isFinite(body.payout) || body.payout < 0 || body.payout > 1_000_000) {
        return c.json(error('payout must be a finite non-negative amount'), HTTP_STATUS.BAD_REQUEST);
      }

      if (!['lead', 'sale', 'rejected'].includes(body.status)) {
        return c.json(error('status is invalid'), HTTP_STATUS.BAD_REQUEST);
      }

      if (body.tid !== undefined && (typeof body.tid !== 'string' || body.tid.length > 256)) {
        return c.json(error('tid is invalid'), HTTP_STATUS.BAD_REQUEST);
      }

      // 创建转化记录
      const conversionId = body.tid || crypto.randomUUID();
      const now = new Date().toISOString();

      // P0-001: 持久化转化记录到 D1 conversions 表
      const conversionRepo = new ConversionRepository(c.env.DB);
      await conversionRepo.saveConversion({
        conversionId,
        clickId: body.clickId || '',
        campaignId: body.campaignId,
        offerId: '',
        timestamp: now,
        revenue: body.payout || 0,
        payout: body.payout || 0,
        currency: 'USD',
        conversionType: body.status || 'lead',
        offerName: null,
      });

      // 写入 TrackingStatsDO (实时统计)
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

      // P0-003: 触发缓存刷新和 SSE 推送
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const cacheUpdate = createCacheUpdateRoutes(c.env);
            
            // 触发转化数据变更
            await cacheUpdate.onDataChanged('conversion', conversionId, 'create');
            
            // 如果有关联的 click，也触发 click 更新
            if (body.clickId) {
              await cacheUpdate.onDataChanged('click', body.clickId, 'update');
            }
            
            // 如果有关联的 campaign，也触发 campaign 更新
            if (body.campaignId) {
              await cacheUpdate.onDataChanged('campaign', body.campaignId, 'update');
            }
          } catch (error) {
            console.error('[TrackingScript] Cache update failed:', error);
          }
        })()
      );

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
   * POST /update
   * 更新点击参数；durationMs 存在时记录访问时长（affiliate-landing beacon）
   * 完整路径: /api/tracking/script/update
   * 为什么保持旧契约兼容：既有调用方只传 subIds+clickId，不能因本次改造被破坏
   */
  router.post('/update', async (c) => {
    try {
      const body = await c.req.json<{
        campaignId: string;
        clickId?: string;
        durationMs?: number;
        subIds?: Record<string, string>;
      }>();

      if (!body.campaignId) {
        return c.json(error('campaignId is required'), HTTP_STATUS.BAD_REQUEST);
      }

      let durationRecorded = false;
      if (typeof body.durationMs === 'number' && body.durationMs > 0) {
        const trackingDO = c.env.TRACKING_STATS_DO.get(
          c.env.TRACKING_STATS_DO.idFromName('global-stats')
        );
        await trackingDO.fetch('http://do/track-duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: body.campaignId,
            clickId: body.clickId,
            durationMs: body.durationMs,
          }),
        });
        durationRecorded = true;
      }

      return c.json(success({
        updated: true,
        durationRecorded,
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
   * POST /process
   * KClient JS 流量处理
   * 完整路径: /api/tracking/kclient/process
   */
  router.post('/process', async (c) => {
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
