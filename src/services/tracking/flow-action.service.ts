/**
 * @fileoverview Flow Action 服务
 * @description 处理 Flow 的动作执行逻辑，支持多种动作类型和重定向方式
 * @module services/tracking/flow-action.service
 *
 * 输入: Flow action 配置和点击请求信息
 * 输出: 动作执行结果（重定向 URL、Offer 等）
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 无直接交互
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
  offer?: Offer;
  landingPage?: LandingPage;
}

/**
 * Flow Action 服务类
 * 处理不同类型的 Flow 动作
 */
export class FlowActionService {
  /**
   * 执行 Flow 动作
   */
  async execute(context: FlowActionContext): Promise<FlowActionResult> {
    const { flow, request, offer, landingPage } = context;
    const actionConfig = flow.actionConfig || { type: flow.actionType || 'redirect' };

    switch (actionConfig.type) {
      case 'redirect':
        return this.executeRedirect(actionConfig, request);

      case 'show_offer':
        return this.executeShowOffer(actionConfig, offer, request);

      case 'show_landing':
        return this.executeShowLanding(actionConfig, landingPage, request);

      case 'traffic_loss':
        return this.executeTrafficLoss();

      default:
        return this.executeRedirect(actionConfig, request);
    }
  }

  /**
   * 执行重定向动作
   * P0-002 修复: 无有效 URL 时返回 traffic-loss 而不是 about:blank
   */
  private executeRedirect(
    config: FlowActionConfig,
    request: ClickRequest
  ): FlowActionResult {
    let redirectUrl = config.redirectUrl || '';

    // 如果没有配置 URL，检查是否有其他目标
    if (!redirectUrl) {
      console.warn('[FlowActionService] No redirectUrl configured, falling back to traffic_loss');
      return this.executeTrafficLoss();
    }

    // 替换 URL 中的参数占位符
    redirectUrl = this.replaceUrlParams(redirectUrl, request);

    // 如果替换后 URL 为空，返回 traffic-loss
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
   * 执行显示 Offer 动作
   */
  private executeShowOffer(
    _config: FlowActionConfig,
    offer: Offer | undefined,
    request: ClickRequest
  ): FlowActionResult {
    if (!offer) {
      return this.executeTrafficLoss();
    }

    const redirectUrl = this.replaceUrlParams(offer.url, request);
    const redirectType = offer.redirectType || 'http';

    return this.buildRedirectResult(redirectType, redirectUrl, offer);
  }

  /**
   * 根据重定向类型构建结果
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
   * 构建 Meta 重定向 HTML
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
   * 构建 JS 重定向 HTML
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
   * 构建 JS 清除 Referrer 重定向 HTML
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
   * 构建双重 Meta 重定向 HTML
   * 通过两次重定向来隐藏来源
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
   * HTML 转义
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
   * JS 字符串转义
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
   * 执行显示落地页动作
   */
  private executeShowLanding(
    _config: FlowActionConfig,
    landingPage: LandingPage | undefined,
    request: ClickRequest
  ): FlowActionResult {
    if (!landingPage) {
      // 如果没有落地页，返回 traffic loss
      return this.executeTrafficLoss();
    }

    const redirectUrl = this.replaceUrlParams(landingPage.url, request);

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
   * 执行流量丢失动作
   */
  private executeTrafficLoss(): FlowActionResult {
    return {
      actionType: 'traffic_loss',
      statusCode: 204,
    };
  }

  /**
   * 替换 URL 中的参数占位符
   * 支持 {clickid}, {campaign}, {subid1}-{subid30} 等格式
   */
  private replaceUrlParams(url: string, request: ClickRequest): string {
    const params = request.urlParams || new URLSearchParams();

    // 基础参数替换
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
    };

    // 动态添加所有 Sub ID 参数 (支持1-30个)
    for (let i = 1; i <= 30; i++) {
      const subIdValue = request[`subId${i}` as keyof ClickRequest] as string | undefined;
      replacements[`{subid${i}}`] = subIdValue || '';
      replacements[`{sub_id_${i}}`] = subIdValue || '';
    }

    // 添加 URL 参数中的所有值
    params.forEach((value, key) => {
      replacements[`{${key}}`] = value;
      replacements[`{${key.toLowerCase()}}`] = value;
    });

    // 执行替换
    let result = url;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'gi'), encodeURIComponent(value));
    }

    return result;
  }

  /**
   * 验证动作配置
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
        // 无需额外配置
        break;

      default:
        return { valid: false, error: `Unknown action type: ${config.type}` };
    }

    return { valid: true };
  }
}

// 导出单例
export const flowActionService = new FlowActionService();
