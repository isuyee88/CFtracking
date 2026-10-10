/**
 * @fileoverview Flow Action 鏈嶅姟
 * @description 澶勭悊 Flow 鐨勫姩浣滄墽琛岄€昏緫锛屾敮鎸佸绉嶅姩浣滅被鍨嬪拰閲嶅畾鍚戞柟寮?
 * @module services/tracking/flow-action.service
 *
 * 杈撳叆: Flow action 閰嶇疆鍜岀偣鍑昏姹備俊鎭?
 * 杈撳嚭: 鍔ㄤ綔鎵ц缁撴灉锛堥噸瀹氬悜 URL銆丱ffer 绛夛級
 * 閫昏緫浜や簰: 琚?click.service.ts 璋冪敤
 * 鍓嶅悗绔氦浜? 鏃犵洿鎺ヤ氦浜?
 */

import type { Flow, FlowActionType, FlowActionConfig } from '@/types/flow';
import type { ClickRequest } from './click.service';
import type { Offer, RedirectType } from '@/types/offer';
import type { LandingPage } from '@/types/landingPage';

export interface FlowActionResult {
  actionType: FlowActionType;
  redirectUrl?: string;
  offer?: Offer;
  landingPage?: LandingPage;
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  redirectType?: RedirectType;
}

export interface FlowActionContext {
  flow: Flow;
  request: ClickRequest;
  clickId?: string;
  visitorId?: string;
  offer?: Offer;
  landingPage?: LandingPage;
}

/**
 * Flow Action 鏈嶅姟绫?
 * 澶勭悊涓嶅悓绫诲瀷鐨?Flow 鍔ㄤ綔
 */
export class FlowActionService {
  /**
   * 鎵ц Flow 鍔ㄤ綔
   */
  async execute(context: FlowActionContext): Promise<FlowActionResult> {
    const { flow, request, offer, landingPage, clickId, visitorId } = context;
    const actionConfig = this.normalizeActionConfig(flow);
    const trackingParams = this.buildTrackingParams(request, clickId, visitorId);

    switch (actionConfig.type) {
      case 'redirect':
        return this.executeRedirect(actionConfig, request, trackingParams);

      case 'show_offer':
        return this.executeShowOffer(actionConfig, offer, request, trackingParams);

      case 'show_landing':
        return this.executeShowLanding(actionConfig, landingPage, request, trackingParams);

      case 'traffic_loss':
        return this.executeTrafficLoss();

      default:
        return this.executeRedirect(actionConfig, request, trackingParams);
    }
  }

  /**
   * 鎵ц閲嶅畾鍚戝姩浣?
   * P0-002 淇: 鏃犳湁鏁?URL 鏃惰繑鍥?traffic-loss 鑰屼笉鏄?about:blank
   */
  private executeRedirect(
    config: FlowActionConfig,
    _request: ClickRequest,
    trackingParams: URLSearchParams
  ): FlowActionResult {
    let redirectUrl = config.redirectUrl || '';

    // 濡傛灉娌℃湁閰嶇疆 URL锛屾鏌ユ槸鍚︽湁鍏朵粬鐩爣
    if (!redirectUrl) {
      console.warn('[FlowActionService] No redirectUrl configured, falling back to traffic_loss');
      return this.executeTrafficLoss();
    }

    // 鏇挎崲 URL 涓殑鍙傛暟鍗犱綅绗?    redirectUrl = this.replaceUrlParams(redirectUrl, request);
    redirectUrl = this.appendTrackingParams(redirectUrl, trackingParams);

    // 濡傛灉鏇挎崲鍚?URL 涓虹┖锛岃繑鍥?traffic-loss
    if (!redirectUrl || redirectUrl === 'about:blank') {
      console.warn('[FlowActionService] Invalid redirectUrl after param replacement, falling back to traffic_loss');
      return this.executeTrafficLoss();
    }

    return {
      actionType: 'redirect',
      redirectUrl,
      statusCode: config.statusCode || 302,
      headers: {
        'Location': redirectUrl,
      },
    };
  }

  /**
   * 鎵ц鏄剧ず Offer 鍔ㄤ綔
   */
  private executeShowOffer(
    _config: FlowActionConfig,
    offer: Offer | undefined,
    _request: ClickRequest,
    trackingParams: URLSearchParams
  ): FlowActionResult {
    if (!offer) {
      return this.executeTrafficLoss();
    }

    const redirectUrl = this.appendTrackingParams(this.replaceUrlParams(offer.url, _request), trackingParams);
    const redirectType = offer.redirectType || 'http';

    return this.buildRedirectResult(redirectType, redirectUrl, offer);
  }

  /**
   * 鏍规嵁閲嶅畾鍚戠被鍨嬫瀯寤虹粨鏋?
   */
  private buildRedirectResult(
    redirectType: RedirectType,
    redirectUrl: string,
    offer?: Offer
  ): FlowActionResult {
    const baseResult: FlowActionResult = {
      actionType: 'show_offer',
      offer,
      redirectUrl,
      redirectType,
      statusCode: 200,
    };

    switch (redirectType) {
      case 'http':
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            'Location': redirectUrl,
          },
        };

      case 'meta':
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: this.buildMetaRedirectHtml(redirectUrl),
        };

      case 'js':
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: this.buildJsRedirectHtml(redirectUrl),
        };

      case 'js_blank':
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: this.buildJsBlankRedirectHtml(redirectUrl),
        };

      case 'double':
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: this.buildDoubleMetaRedirectHtml(redirectUrl),
        };

      case 'remote':
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            'Location': redirectUrl,
          },
        };

      default:
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            'Location': redirectUrl,
          },
        };
    }
  }

  /**
   * 鏋勫缓 Meta 閲嶅畾鍚?HTML
   */
  private buildMetaRedirectHtml(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${this.escapeHtml(url)}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="${this.escapeHtml(url)}">${this.escapeHtml(url)}</a></p>
</body>
</html>`;
  }

  /**
   * 鏋勫缓 JS 閲嶅畾鍚?HTML
   */
  private buildJsRedirectHtml(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script type="text/javascript">
    window.location.href = "${this.escapeJs(url)}";
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }

  /**
   * 鏋勫缓 JS 娓呴櫎 Referrer 閲嶅畾鍚?HTML
   */
  private buildJsBlankRedirectHtml(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script type="text/javascript">
    (function() {
      var url = "${this.escapeJs(url)}";
      var a = document.createElement('a');
      a.href = url;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
    })();
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }

  /**
   * 鏋勫缓鍙岄噸 Meta 閲嶅畾鍚?HTML
   * 閫氳繃涓ゆ閲嶅畾鍚戞潵闅愯棌鏉ユ簮
   */
  private buildDoubleMetaRedirectHtml(url: string): string {
    const intermediateUrl = 'about:blank';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${this.escapeHtml(intermediateUrl)}">
  <title>Redirecting...</title>
  <script type="text/javascript">
    (function() {
      var targetUrl = "${this.escapeJs(url)}";
      setTimeout(function() {
        var a = document.createElement('a');
        a.href = targetUrl;
        a.rel = 'noreferrer';
        document.body.appendChild(a);
        a.click();
      }, 100);
    })();
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }

  /**
   * HTML 杞箟
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * JS 瀛楃涓茶浆涔?
   */
  private escapeJs(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * 鎵ц鏄剧ず钀藉湴椤靛姩浣?
   */
  private executeShowLanding(
    _config: FlowActionConfig,
    landingPage: LandingPage | undefined,
    _request: ClickRequest,
    trackingParams: URLSearchParams
  ): FlowActionResult {
    if (!landingPage) {
      // 濡傛灉娌℃湁钀藉湴椤碉紝杩斿洖 traffic loss
      return this.executeTrafficLoss();
    }

    const redirectUrl = this.appendTrackingParams(this.replaceUrlParams(landingPage.url, _request), trackingParams);

    return {
      actionType: 'show_landing',
      landingPage,
      redirectUrl,
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
      },
    };
  }

  /**
   * 鎵ц娴侀噺涓㈠け鍔ㄤ綔
   */
  private executeTrafficLoss(): FlowActionResult {
    return {
      actionType: 'traffic_loss',
      statusCode: 204,
    };
  }

  /**
   * 鏇挎崲 URL 涓殑鍙傛暟鍗犱綅绗?
   * 鏀寔 {clickid}, {campaign}, {subid1}-{subid30} 绛夋牸寮?
   */
  private replaceUrlParams(url: string, request: ClickRequest): string {
    const trackingClickId = (request as ClickRequest & { __trackingClickId?: string }).__trackingClickId || '';
    const trackingVisitorId = (request as ClickRequest & { __trackingVisitorId?: string }).__trackingVisitorId || '';
    const params = request.urlParams || new URLSearchParams();

    // 鍩虹鍙傛暟鏇挎崲
    const replacements: Record<string, string> = {
      '{campaign}': request.campaignId || '',
      '{campaign_id}': request.campaignId || '',
      '{referer}': request.referer || '',
      '{ip}': request.ip || '',
      '{country}': request.country || '',
      '{city}': request.city || '',
      '{device}': request.device || '',
      '{browser}': request.browser || '',
      '{os}': request.os || '',
      '{useragent}': request.userAgent || '',
      '{clickid}': trackingClickId,
      '{click_id}': trackingClickId,
      '{visitor}': trackingVisitorId,
    };

    // 鍔ㄦ€佹坊鍔犳墍鏈?Sub ID 鍙傛暟 (鏀寔1-30涓?
    for (let i = 1; i <= 30; i++) {
      const subIdValue = request[`subId${i}` as keyof ClickRequest] as string | undefined;
      replacements[`{subid${i}}`] = subIdValue || '';
      replacements[`{sub_id_${i}}`] = subIdValue || '';
    }

    // 娣诲姞 URL 鍙傛暟涓殑鎵€鏈夊€?
    params.forEach((value, key) => {
      replacements[`{${key}}`] = value;
      replacements[`{${key.toLowerCase()}}`] = value;
    });

    // 鎵ц鏇挎崲
    let result = url;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'gi'), encodeURIComponent(value));
    }

    return result;
  }

  /**
   * 楠岃瘉鍔ㄤ綔閰嶇疆
   */
  validateActionConfig(config: FlowActionConfig): { valid: boolean; error?: string } {
    switch (config.type) {
      case 'redirect':
        if (!config.redirectUrl) {
          return { valid: false, error: 'redirectUrl is required for redirect action' };
        }
        break;

      case 'show_offer':
        if (!config.offerId) {
          return { valid: false, error: 'offerId is required for show_offer action' };
        }
        break;

      case 'show_landing':
        if (!config.landingPageId) {
          return { valid: false, error: 'landingPageId is required for show_landing action' };
        }
        break;

      case 'traffic_loss':
        // 鏃犻渶棰濆閰嶇疆
        break;

      default:
        return { valid: false, error: `Unknown action type: ${config.type}` };
    }

    return { valid: true };
  }

  private normalizeActionConfig(flow: Flow): FlowActionConfig {
    return {
      ...(flow.actionConfig || {}),
      type: flow.actionConfig?.type || flow.actionType || 'redirect',
    };
  }

  private buildTrackingParams(
    request: ClickRequest,
    clickId?: string,
    visitorId?: string
  ): URLSearchParams {
    const params = new URLSearchParams();

    if (clickId) {
      params.set('clickid', clickId);
    }

    if (visitorId) {
      params.set('visitor', visitorId);
    }

    for (let i = 1; i <= 30; i += 1) {
      const subIdValue = request[`subId${i}` as keyof ClickRequest] as string | undefined;
      if (subIdValue) {
        params.set(`subid${i}`, subIdValue);
      }
    }

    return params;
  }

  private appendTrackingParams(url: string, trackingParams: URLSearchParams): string {
    if (!url || trackingParams.size === 0) {
      return url;
    }

    try {
      const parsed = new URL(url);
      trackingParams.forEach((value, key) => {
        parsed.searchParams.set(key, value);
      });
      return parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${trackingParams.toString()}`;
    }
  }
}

// 瀵煎嚭鍗曚緥
export const flowActionService = new FlowActionService();
