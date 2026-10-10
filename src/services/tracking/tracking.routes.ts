/**
 * @fileoverview Tracking API 璺敱
 * @description 澶勭悊杩借釜鐩稿叧鐨?HTTP 璇锋眰锛屽寘鍚幓閲嶅拰 Cookie 澶勭悊
 * @module services/tracking/tracking.routes
 * 
 * 杈撳叆: HTTP 璇锋眰锛堢偣鍑汇€佽浆鍖栵級
 * 杈撳嚭: HTTP 鍝嶅簲锛堥噸瀹氬悜銆丣SON锛?
 * 閫昏緫浜や簰: 
 *   - 璋冪敤 ClickService 澶勭悊鐐瑰嚮
 *   - 璋冪敤 ConversionService 澶勭悊杞寲
 * 鍓嶅悗绔氦浜? 
 *   - 瑙ｆ瀽 Cookie 鑾峰彇 visitorId
 *   - 璁剧疆 Cookie 鍝嶅簲澶?
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
import { createCacheUpdateRoutes } from '@/services/cache/cache-update-service';

export function createTrackingRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  // 娉ㄥ唽 Tracking Script 璺敱
  router.route('/script', createTrackingScriptRouter());
  router.route('/kclient', createTrackingScriptRouter());

  /**
   * GET /click/:campaignAlias
   * 澶勭悊鐐瑰嚮杩借釜璇锋眰锛堥噸瀹氬悜妯″紡锛?
   * 鏀寔鍘婚噸鍙傛暟锛?
   *   - uniq: 鍘婚噸鏂规硶 (ip|cookie|fingerprint|parameter|none)
   *   - uniq_param: 鍙傛暟鍘婚噸鏃剁殑鍙傛暟鍚?
   *   - uniq_ttl: 鍘婚噸鏈夋晥鏈燂紙绉掞級
   */
  router.get('/click/:campaignAlias', async (c) => {
    const campaignAlias = c.req.param('campaignAlias');
    const service = new ClickService(c.env);

    // 鎻愬彇瀹屾暣鐨?Cloudflare 璇锋眰淇℃伅
    const cfInfo = extractCloudflareInfo(c);
    
    // 鐢熸垚璁垮鎸囩汗
    const fingerprint = generateFingerprint(cfInfo);
    
    // 椋庨櫓璇勪及
    const riskAssessment = assessRisk(cfInfo);

    const ip = getClientIP(c);
    const userAgent = c.req.header('User-Agent') || 'unknown';
    const referer = c.req.header('Referer');
    
    // 浣跨敤 Cloudflare 鎻愪緵鐨勫湴鐞嗕綅缃俊鎭?
    const country = cfInfo.country || cfInfo.ipCountry || undefined;
    const city = cfInfo.city || undefined;
    const region = cfInfo.region || undefined;
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);

    // 鍔ㄦ€佽В鏋愭墍鏈?Sub ID 鍙傛暟 (鏀寔1-30涓? 鍏煎澶氱鍛藉悕鏍煎紡: sub1/subid1/sub_id_1)
    const subIds: Record<string, string | undefined> = {};
    for (let i = 1; i <= 30; i++) {
      // 鏀寔澶氱鍙傛暟鍛藉悕鏍煎紡
      const value = c.req.query(`sub${i}`) ||
                   c.req.query(`subid${i}`) ||
                   c.req.query(`sub_id_${i}`) ||
                   undefined;
      if (value) {
        subIds[`subId${i}`] = value;
      }
    }

    const cost = c.req.query('cost') ? parseFloat(c.req.query('cost')!) : undefined;

    // 瑙ｆ瀽鍘婚噸鍙傛暟
    const uniquenessMethod = (c.req.query('uniq') as UniquenessMethod) || undefined;
    const uniquenessParameter = c.req.query('uniq_param') || undefined;
    const uniquenessTTL = c.req.query('uniq_ttl') ? parseInt(c.req.query('uniq_ttl')!, 10) : undefined;

    // 浠?Cookie 瑙ｆ瀽 visitorId
    const cookieHeader = c.req.header('Cookie') || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || undefined;

    try {
      // 淇濆瓨鍘熷URL锛岀敤浜庢瀯寤洪噸瀹氬悜URL
      const urlParams = new URL(c.req.url).searchParams;
      urlParams.set('__originalUrl', c.req.url);

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
        // 鍔ㄦ€佸睍寮€鎵€鏈?Sub ID 鍙傛暟 (1-30)
        ...subIds,
        cost,
        uniquenessMethod,
        uniquenessParameter,
        uniquenessTTL,
        existingVisitorId,
        urlParams,
        // Cloudflare 鐗瑰畾淇℃伅
        cfInfo,
        fingerprint,
        riskAssessment,
      });

      // 濡傛灉鏄祦閲忔崯澶憋紝杩斿洖 200 骞舵樉绀轰俊鎭?
      if (result.isTrafficLoss) {
        if (!result.skipPersistence) {
          c.executionCtx.waitUntil(
            (async () => {
              try {
                await service.persistPreparedClick(result.clickId);
                const cacheUpdate = createCacheUpdateRoutes(c.env);
                await cacheUpdate.onDataChanged('click', result.clickId, 'create');
                await cacheUpdate.onDataChanged('campaign', campaignAlias, 'update');
              } catch (cacheError) {
                console.error('[Tracking] Failed to persist traffic-loss click:', cacheError);
              }
            })()
          );
        }

        return c.json(
          success({
            message: 'Traffic loss - no matching flow',
            clickId: result.clickId,
            isUnique: result.isUnique,
          }),
          HTTP_STATUS.OK
        );
      }

      // 鏍规嵁閲嶅畾鍚戠被鍨嬭繑鍥炰笉鍚岀殑鍝嶅簲
      if (result.redirectType && result.redirectType !== 'http' && result.responseBody) {
        // 闈?HTTP 閲嶅畾鍚戠被鍨嬶紝杩斿洖 HTML body
        const response = new Response(result.responseBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });

        // 濡傛灉闇€瑕佽缃?Cookie锛屾坊鍔?Set-Cookie 澶?
        if (result.shouldSetCookie) {
          response.headers.set(
            'Set-Cookie',
            generateCookieHeader(result.visitorId, uniquenessTTL || 86400 * 30)
          );
        }

        if (!result.skipPersistence) {
          c.executionCtx.waitUntil(
            (async () => {
              try {
                await service.persistPreparedClick(result.clickId);
                const cacheUpdate = createCacheUpdateRoutes(c.env);
                await cacheUpdate.onDataChanged('click', result.clickId, 'create');
                await cacheUpdate.onDataChanged('campaign', campaignAlias, 'update');
              } catch (cacheError) {
                console.error('[Tracking] Failed to persist click before non-http response:', cacheError);
              }
            })()
          );
        }

        return response;
      }

      // HTTP 閲嶅畾鍚?
      if (!result.skipPersistence) {
        c.executionCtx.waitUntil(
          (async () => {
            try {
              await service.persistPreparedClick(result.clickId);
              const cacheUpdate = createCacheUpdateRoutes(c.env);
              await cacheUpdate.onDataChanged('click', result.clickId, 'create');
              await cacheUpdate.onDataChanged('campaign', campaignAlias, 'update');
            } catch (cacheError) {
              console.error('[Tracking] Failed to trigger cache update after click:', cacheError);
            }
          })()
        );
      }

      const response = c.redirect(result.redirectUrl, 302);
      
      // 濡傛灉闇€瑕佽缃?Cookie锛屾坊鍔?Set-Cookie 澶?
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
   * 澶勭悊鐐瑰嚮杩借釜璇锋眰锛圓PI 妯″紡锛?
   */
  router.post('/click', async (c) => {
    const body = await c.req.json();

    const campaignValidation = validateRequired(body.campaignId, 'campaignId');
    if (!campaignValidation.valid) {
      return c.json(error(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ClickService(c.env);
    const cfInfo = extractCloudflareInfo(c);
    const fingerprint = generateFingerprint(cfInfo);
    const riskAssessment = assessRisk(cfInfo);

    // 浠?Cookie 瑙ｆ瀽 visitorId
    const cookieHeader = c.req.header('Cookie') || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || undefined;

    try {
      // 淇濆瓨鍘熷URL锛岀敤浜庢瀯寤洪噸瀹氬悜URL
      const urlParams = body.urlParams ? new URLSearchParams(body.urlParams) : new URLSearchParams();
      urlParams.set('__originalUrl', c.req.url);

      const result = await service.handleClick({
        campaignId: body.campaignId,
        ip: body.ip || getClientIP(c),
        userAgent: body.userAgent || c.req.header('User-Agent') || 'unknown',
        referer: body.referer,
        country: body.country || cfInfo.country || cfInfo.ipCountry,
        city: body.city || cfInfo.city || undefined,
        region: body.region || cfInfo.region || undefined,
        isp: body.isp || undefined,
        connectionType: body.connectionType || undefined,
        device: body.device,
        browser: body.browser,
        os: body.os,
        // 鍔ㄦ€佸睍寮€鎵€鏈?Sub ID 鍙傛暟 (1-30, 浠庤姹備綋涓鍙?
        ...extractSubIdsFromBody(body),
        cost: body.cost,
        uniquenessMethod: body.uniquenessMethod,
        uniquenessParameter: body.uniquenessParameter,
        uniquenessTTL: body.uniquenessTTL,
        existingVisitorId,
        urlParams,
        cfInfo,
        fingerprint,
        riskAssessment,
      });

      // 鏋勫缓鍝嶅簲
      if (!result.skipPersistence) {
        c.executionCtx.waitUntil(
          (async () => {
            try {
              await service.persistPreparedClick(result.clickId);
              const cacheUpdate = createCacheUpdateRoutes(c.env);
              await cacheUpdate.onDataChanged('click', result.clickId, 'create');
              await cacheUpdate.onDataChanged('campaign', String(body.campaignId), 'update');
            } catch (cacheError) {
              console.error('[Tracking] Failed to trigger cache update after click POST:', cacheError);
            }
          })()
        );
      }

      const response = c.json(success(result), HTTP_STATUS.CREATED);
      
      // 濡傛灉闇€瑕佽缃?Cookie锛屾坊鍔?Set-Cookie 澶?
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

    c.executionCtx.waitUntil(
      (async () => {
        try {
          const cacheUpdate = createCacheUpdateRoutes(c.env);
          await cacheUpdate.onDataChanged('conversion', result.conversionId, 'create');
          await cacheUpdate.onDataChanged('click', String(body.clickId), 'update');
          await cacheUpdate.onDataChanged('campaign', String(body.campaignId), 'update');
        } catch (cacheError) {
          console.error('[Tracking] Failed to trigger cache update after conversion:', cacheError);
        }
      })()
    );

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

    c.executionCtx.waitUntil(
      (async () => {
        try {
          const cacheUpdate = createCacheUpdateRoutes(c.env);
          await cacheUpdate.onDataChanged('conversion', result.conversionId, 'create');
          await cacheUpdate.onDataChanged('click', String(clickId), 'update');
          const campaignId = c.req.query('campaign_id');
          if (campaignId) {
            await cacheUpdate.onDataChanged('campaign', campaignId, 'update');
          }
        } catch (cacheError) {
          console.error('[Tracking] Failed to trigger cache update after postback conversion:', cacheError);
        }
      })()
    );

    return c.json(success(result));
  });

  router.post('/conversion/batch', async (c) => {
    const body = await c.req.json();

    if (!Array.isArray(body.conversions) || body.conversions.length === 0) {
      return c.json(error('conversions array is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new ConversionService(c.env);
    const results = await service.handleBatchConversions(body.conversions);

    c.executionCtx.waitUntil(
      (async () => {
        try {
          const cacheUpdate = createCacheUpdateRoutes(c.env);
          for (const item of results) {
            if (!item?.conversionId) {
              continue;
            }
            await cacheUpdate.onDataChanged('conversion', item.conversionId, 'create');
          }
        } catch (cacheError) {
          console.error('[Tracking] Failed to trigger cache update after batch conversions:', cacheError);
        }
      })()
    );

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

/**
 * 浠嶱OST璇锋眰浣撲腑鎻愬彇鎵€鏈塖ub ID鍙傛暟 (鏀寔1-30涓?
 * @param body POST璇锋眰浣?
 * @returns 鍖呭惈subId1-subId30鐨勮褰曞璞?
 */
function extractSubIdsFromBody(body: Record<string, unknown>): Record<string, string | undefined> {
  const subIds: Record<string, string | undefined> = {};

  for (let i = 1; i <= 30; i++) {
    // 鏀寔澶氱瀛楁鍛藉悕鏍煎紡
    const value = body[`subId${i}`] ||
                 body[`subid${i}`] ||
                 body[`sub_id_${i}`] ||
                 body[`sub${i}`];
    if (value && typeof value === 'string') {
      subIds[`subId${i}`] = value;
    }
  }

  return subIds;
}
