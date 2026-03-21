/**
 * @fileoverview Flow Action 服务
 * @description 处理 Flow 的动作执行逻辑，支持多种动作类型
 * @module services/tracking/flow-action.service
 *
 * 输入: Flow action 配置和点击请求信息
 * 输出: 动作执行结果（重定向 URL、Offer 等）
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 无直接交互
 */

import type { Flow, FlowActionType, FlowActionConfig } from '@/types/flow';
import type { ClickRequest } from './click.service';
import type { Offer } from '@/types/offer';
import type { LandingPage } from '@/types/landingPage';

export interface FlowActionResult {
  actionType: FlowActionType;
  redirectUrl?: string;
  offer?: Offer;
  landingPage?: LandingPage;
  statusCode: number;
  headers?: Record<string, string>;
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
   */
  private executeRedirect(
    config: FlowActionConfig,
    request: ClickRequest
  ): FlowActionResult {
    let redirectUrl = config.redirectUrl || '';

    // 如果没有配置 URL，使用默认行为
    if (!redirectUrl) {
      redirectUrl = this.buildDefaultRedirectUrl(request);
    }

    // 替换 URL 中的参数占位符
    redirectUrl = this.replaceUrlParams(redirectUrl, request);

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
      // 如果没有 Offer，返回 traffic loss
      return this.executeTrafficLoss();
    }

    const redirectUrl = this.replaceUrlParams(offer.url, request);

    return {
      actionType: 'show_offer',
      offer,
      redirectUrl,
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
      },
    };
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
   * 构建默认重定向 URL
   */
  private buildDefaultRedirectUrl(request: ClickRequest): string {
    // 默认重定向到原始 URL 或空白页
    return request.referer || 'about:blank';
  }

  /**
   * 替换 URL 中的参数占位符
   * 支持 {clickid}, {campaign}, {subid1} 等格式
   */
  private replaceUrlParams(url: string, request: ClickRequest): string {
    const params = request.urlParams || new URLSearchParams();
    
    // 基础参数替换
    const replacements: Record<string, string> = {
      '{campaign}': request.campaignId || '',
      '{campaign_id}': request.campaignId || '',
      '{subid1}': request.subId1 || '',
      '{subid2}': request.subId2 || '',
      '{subid3}': request.subId3 || '',
      '{subid4}': request.subId4 || '',
      '{subid5}': request.subId5 || '',
      '{referer}': request.referer || '',
      '{ip}': request.ip || '',
      '{country}': request.country || '',
      '{city}': request.city || '',
      '{device}': request.device || '',
      '{browser}': request.browser || '',
      '{os}': request.os || '',
      '{useragent}': request.userAgent || '',
    };

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
