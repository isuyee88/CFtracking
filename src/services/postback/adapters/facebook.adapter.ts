/**
 * @fileoverview Facebook Conversions API (CAPI) 适配器
 * @description Facebook平台专用的Postback适配器，支持S2S模式和标准Postback双模式
 * @module services/postback/adapters/facebook.adapter
 *
 * 支持模式:
 * - CAPI (Conversions API): POST请求到Graph API，发送结构化事件数据
 * - 标准Postback: GET请求 (兼容旧版Facebook Pixel)
 *
 * CAPI URL格式:
 * POST https://graph.facebook.com/v18.0/{pixel_id}/events?access_token={token}
 *
 * Body格式:
 * {
 *   "data": [{
 *     "event_name": "Purchase",
 *     "event_time": {unix_timestamp},
 *     "user_data": {
 *       "em": "{hashed_email}",
 *       "fbc": "{click_id}",
 *       ...
 *     },
 *     "custom_data": {
 *       "value": {revenue},
 *       "currency": "USD"
 *     },
 *     ...
 *   }],
 *   ...
 * }
 *
 * 参考文档:
 * - Facebook Conversions API文档
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * Facebook Postback适配器
 * @description 支持Facebook CAPI和标准Postback两种模式
 */
export class FacebookPostbackAdapter extends PostbackPlatformAdapter {
  /** 平台名称标识符 */
  readonly platformName = 'facebook';

  /** URL模板引擎实例 */
  private urlEngine: UrlTemplateEngine;

  constructor() {
    super();
    this.urlEngine = new UrlTemplateEngine();
  }

  /**
   * 构建Facebook Postback URL
   *
   * @param context 转化上下文数据
   * @param config Postback发送配置
   * @returns 解析后的完整URL
   *
   * @description 根据config.method决定构建逻辑:
   * - POST (CAPI模式): 返回Graph API endpoint
   * - GET (标准Postback): 返回带宏替换的URL
   */
  buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string> {
    if (config.method === 'POST') {
      // CAPI模式: 直接返回URL模板 (access_token等已在模板中)
      return Promise.resolve(this.urlEngine.buildBaseUrl(config, context));
    } else {
      // 标准GET Postback
      return Promise.resolve(this.urlEngine.buildBaseUrl(config, context));
    }
  }

  /**
   * 构建POST请求体 (CAPI模式必需)
   *
   * @param context 转化上下文数据
   * @param config Postback发送配置
   * @returns POST body键值对 (仅CAPI/POST模式需要)
   *
   * @description 构建Facebook CAPI所需的事件数据结构:
   * - event_name: 基于 conversionType 映射
   * - event_time: Unix时间戳 (秒)
   * - user_data: 包含点击ID等信息
   * - custom_data: 包含收入、货币等信息
   */
  buildPayload?(context: PostbackContext, config: PostbackSendConfig): Record<string, string> | undefined {
    // 只有POST方法才需要body
    if (config.method !== 'POST') {
      return undefined;
    }

    // 构建事件名称 (基于conversionType)
    const eventName = this.mapConversionTypeToEvent(context.conversionType);

    // 构建Unix时间戳 (秒)
    const eventTime = Math.floor(new Date(context.timestamp).getTime() / 1000);

    // 构建CAPI事件数据
    const eventData = {
      data: JSON.stringify([{
        event_name: eventName,
        event_time: eventTime,
        action_source: 'website',
        user_data: {
          fbc: `fb.1.${eventTime}.${context.clickId}`, // Facebook click ID format
          ...(context.ip ? { client_ip_address: context.ip } : {}),
        },
        custom_data: {
          value: context.revenue.toFixed(2),
          currency: context.currency || 'USD',
          ...(context.offerName ? { content_name: context.offerName } : {}),
        },
      }]),
      access_token: config.customParams?.access_token || '',
    };

    return eventData;
  }

  /**
   * 验证Facebook HTTP响应
   *
   * @param statusCode HTTP状态码
   * @param body 响应体内容
   * @returns 验证结果及原因说明
   *
   * @description Facebook响应验证规则:
   * - 200 OK + body包含"success: true": 成功
   * - 其他情况: 失败，需检查错误代码和消息
   */
  validateResponse(statusCode: number, body: string): { valid: boolean; reason?: string } {
    if (statusCode === 200) {
      // 检查响应体是否表示成功
      try {
        const jsonResponse = JSON.parse(body);
        if (jsonResponse.success === true) {
          return { valid: true };
        }
        // 如果有错误信息
        if (jsonResponse.error) {
          const fbError = jsonResponse.error;
          return {
            valid: false,
            reason: `Facebook API Error: ${fbError.message} (Code: ${fbError.code})`,
          };
        }
        // 成功但可能有warnings
        return { valid: true };
      } catch {
        // 无法解析JSON，假设成功 (200通常意味着OK)
        return { valid: true };
      }
    }

    // 根据状态码返回具体原因
    let reason: string;
    switch (statusCode) {
      case 400:
        reason = 'Bad Request - 无效的参数或事件数据格式错误';
        break;
      case 401:
        reason = 'Unauthorized - Access token无效或过期';
        break;
      case 403:
        reason = 'Forbidden - 权限不足或IP限制';
        break;
      case 429:
        reason = 'Too Many Requests - 触发API频率限制';
        break;
      case 500:
        reason = 'Facebook Server Error - 内部服务器错误';
        break;
      default:
        reason = `Unexpected status code: ${statusCode}`;
    }

    return { valid: false, reason };
  }

  /**
   * 获取推荐的HTTP方法
   *
   * @returns 推荐使用POST方法 (CAPI模式)
   *
   * @description Facebook推荐使用Conversions API (POST)，
   * 但也支持传统的GET Postback。
   */
  getRecommendedMethod(): HttpMethod {
    return 'POST';
  }

  /**
   * 将转化类型映射为Facebook事件名称
   *
   * @param conversionType 转化类型 (sale/lead/click/install等)
   * @returns Facebook标准事件名称
   *
   * @private 内部方法
   */
  private mapConversionTypeToEvent(conversionType: string): string {
    const typeMapping: Record<string, string> = {
      sale: 'Purchase',
      lead: 'Lead',
      click: 'Click',
      install: 'CompleteRegistration',
      signup: 'CompleteRegistration',
      subscribe: 'Subscribe',
      addtocart: 'AddToCart',
      initiatecheckout: 'InitiateCheckout',
      viewcontent: 'ViewContent',
      default: 'Purchase', // 默认视为购买
    };

    return typeMapping[conversionType.toLowerCase()] || 'Purchase';
  }
}
