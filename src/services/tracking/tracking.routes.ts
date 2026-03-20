/**
 * @fileoverview Tracking API 路由
 * @description 处理追踪相关的 HTTP 请求，包含去重和 Cookie 处理
 * @module services/tracking/tracking.routes
 * 
 * 输入: HTTP 请求（点击、转化）
 * 输出: HTTP 响应（重定向、JSON）
 * 逻辑交互: 
 *   - 调用 ClickService 处理点击
 *   - 调用 ConversionService 处理转化
 * 前后端交互: 
 *   - 解析 Cookie 获取 visitorId
 *   - 设置 Cookie 响应头
 */

import { Hono } from 'hono';
import { ClickService } from './click.service';
import { ConversionService } from './conversion.service';
import { 
  parseVisitorIdFromCookie, 
  generateCookieHeader,
  type UniquenessMethod 
} from './uniqueness.service';
import { createTrackingScriptRouter } from './tracking-script.routes';
import { success, error } from '@/utils/response';
import { validateRequired } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import { extractCloudflareInfo, getClientIP, generateFingerprint, assessRisk } from '@/utils/cloudflare';

export function createTrackingRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  // 注册 Tracking Script 路由
  router.route('/script', createTrackingScriptRouter());
  router.route('/kclient', createTrackingScriptRouter());

  /**
   * GET /click/:campaignAlias
   * 处理点击追踪请求（重定向模式）
   * 支持去重参数：
   *   - uniq: 去重方法 (ip|cookie|fingerprint|parameter|none)
   *   - uniq_param: 参数去重时的参数名
   *   - uniq_ttl: 去重有效期（秒）
   */
  router.get('/click/:campaignAlias', async (c) => {
    const campaignAlias = c.req.param('campaignAlias');
    const service = new ClickService(c.env);

    // 提取完整的 Cloudflare 请求信息
    const cfInfo = extractCloudflareInfo(c);
    
    // 生成访客指纹
    const fingerprint = generateFingerprint(cfInfo);
    
    // 风险评估
    const riskAssessment = assessRisk(cfInfo);

    const ip = getClientIP(c);
    const userAgent = c.req.header('User-Agent') || 'unknown';
    const referer = c.req.header('Referer');
    
    // 使用 Cloudflare 提供的地理位置信息
    const country = cfInfo.country || cfInfo.ipCountry || undefined;
    const city = cfInfo.city || undefined;
    const region = cfInfo.region || undefined;
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);

    const subId1 = c.req.query('sub1') || c.req.query('subid1');
    const subId2 = c.req.query('sub2') || c.req.query('subid2');
    const subId3 = c.req.query('sub3') || c.req.query('subid3');
    const subId4 = c.req.query('sub4') || c.req.query('subid4');
    const subId5 = c.req.query('sub5') || c.req.query('subid5');
    const cost = c.req.query('cost') ? parseFloat(c.req.query('cost')!) : undefined;

    // 解析去重参数
    const uniquenessMethod = (c.req.query('uniq') as UniquenessMethod) || undefined;
    const uniquenessParameter = c.req.query('uniq_param') || undefined;
    const uniquenessTTL = c.req.query('uniq_ttl') ? parseInt(c.req.query('uniq_ttl')!, 10) : undefined;

    // 从 Cookie 解析 visitorId
    const cookieHeader = c.req.header('Cookie') || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || undefined;

    try {
      const result = await service.handleClick({
        campaignId: campaignAlias,
        ip,
        userAgent,
        referer,
        country,
        city,
        region,
        device,
        browser,
        os,
        subId1,
        subId2,
        subId3,
        subId4,
        subId5,
        cost,
        uniquenessMethod,
        uniquenessParameter,
        uniquenessTTL,
        existingVisitorId,
        urlParams: new URL(c.req.url).searchParams,
        // Cloudflare 特定信息
        cfInfo,
        fingerprint,
        riskAssessment,
      });

      // 如果是流量损失，返回 200 并显示信息
      if (result.isTrafficLoss) {
        return c.json(
          success({
            message: 'Traffic loss - no matching flow',
            clickId: result.clickId,
            isUnique: result.isUnique,
          }),
          HTTP_STATUS.OK
        );
      }

      // 构建重定向响应
      const response = c.redirect(result.redirectUrl, 302);
      
      // 如果需要设置 Cookie，添加 Set-Cookie 头
      if (result.shouldSetCookie) {
        response.headers.set(
          'Set-Cookie',
          generateCookieHeader(result.visitorId, uniquenessTTL || 86400 * 30)
        );
      }

      return response;
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * POST /click
   * 处理点击追踪请求（API 模式）
   */
  router.post('/click', async (c) => {
    const body = await c.req.json();

    const campaignValidation = validateRequired(body.campaignId, 'campaignId');
    if (!campaignValidation.valid) {
      return c.json(error(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ClickService(c.env);

    // 从 Cookie 解析 visitorId
    const cookieHeader = c.req.header('Cookie') || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || undefined;

    try {
      const result = await service.handleClick({
        campaignId: body.campaignId,
        ip: body.ip || c.req.header('CF-Connecting-IP') || 'unknown',
        userAgent: body.userAgent || c.req.header('User-Agent') || 'unknown',
        referer: body.referer,
        country: body.country,
        city: body.city,
        device: body.device,
        browser: body.browser,
        os: body.os,
        subId1: body.subId1,
        subId2: body.subId2,
        subId3: body.subId3,
        cost: body.cost,
        uniquenessMethod: body.uniquenessMethod,
        uniquenessParameter: body.uniquenessParameter,
        uniquenessTTL: body.uniquenessTTL,
        existingVisitorId,
        urlParams: body.urlParams ? new URLSearchParams(body.urlParams) : new URLSearchParams(),
      });

      // 构建响应
      const response = c.json(success(result), HTTP_STATUS.CREATED);
      
      // 如果需要设置 Cookie，添加 Set-Cookie 头
      if (result.shouldSetCookie) {
        response.headers.set(
          'Set-Cookie',
          generateCookieHeader(result.visitorId, 86400 * 30)
        );
      }

      return response;
    } catch (err) {
      if (err instanceof Error && err.message === 'Campaign not found') {
        return c.json(error('Campaign not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/conversion', async (c) => {
    const body = await c.req.json();

    const clickIdValidation = validateRequired(body.clickId, 'clickId');
    if (!clickIdValidation.valid) {
      return c.json(error(clickIdValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const campaignValidation = validateRequired(body.campaignId, 'campaignId');
    if (!campaignValidation.valid) {
      return c.json(error(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const offerValidation = validateRequired(body.offerId, 'offerId');
    if (!offerValidation.valid) {
      return c.json(error(offerValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ConversionService(c.env);
    const result = await service.handleConversion(body);

    return c.json(success(result), HTTP_STATUS.CREATED);
  });

  router.post('/conversion/postback', async (c) => {
    const clickId = c.req.query('clickid') || c.req.query('click_id');
    const revenue = parseFloat(c.req.query('revenue') || c.req.query('payout') || '0');
    const offerId = c.req.query('offer_id') || c.req.query('offerid');

    if (!clickId) {
      return c.json(error('clickId is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ConversionService(c.env);

    const result = await service.handleConversion({
      clickId,
      campaignId: c.req.query('campaign_id') || '',
      offerId: offerId || '',
      revenue,
      payout: revenue,
    });

    return c.json(success(result));
  });

  router.post('/conversion/batch', async (c) => {
    const body = await c.req.json();

    if (!Array.isArray(body.conversions) || body.conversions.length === 0) {
      return c.json(error('conversions array is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ConversionService(c.env);
    const results = await service.handleBatchConversions(body.conversions);

    return c.json(success(results));
  });

  return router;
}

function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  if (/msie|trident/i.test(ua)) return 'IE';
  return 'Unknown';
}

function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os|macos/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/ios|iphone|ipad/i.test(ua)) return 'iOS';
  return 'Unknown';
}
