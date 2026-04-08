/**
 * @fileoverview Rumble Postback适配器
 * @description Rumble平台专用的Postback适配器
 * @module services/postback/adapters/rumble.adapter
 *
 * URL格式:
 * GET https://rumble.com/postback?clickid={clickid}&payout={payout}&status=approved
 *
 * 特点:
 * - 标准S2S Postback格式
 * - 支持视频广告特定的参数
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * Rumble Postback适配器
 */
export class RumblePostbackAdapter extends PostbackPlatformAdapter {
  readonly platformName = 'rumble';

  private urlEngine: UrlTemplateEngine;

  constructor() {
    super();
    this.urlEngine = new UrlTemplateEngine();
  }

  buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string> {
    return Promise.resolve(this.urlEngine.buildBaseUrl(config, context));
  }

  /**
   * 构建POST请求体 (可选)
   * @description Rumble使用GET请求，不需要POST body
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    return undefined;
  }

  /**
   * 验证Rumble HTTP响应
   *
   * @description Rumble验证规则与通用规则类似，
   * 但可能有特定错误码。
   */
  validateResponse(statusCode: number, _body: string): { valid: boolean; reason?: string } {
    if (statusCode >= 200 && statusCode < 300) {
      return { valid: true };
    }

    const reasons: Record<number, string> = {
      400: 'Bad Request - 无效请求参数',
      401: 'Unauthorized - API认证失败',
      403: 'Forbidden - 访问被拒绝',
      404: 'Not Found - Endpoint不存在',
      422: 'Unprocessable Entity - 数据格式无效',
      429: 'Too Many Requests - 频率限制',
      500: 'Rumble Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return {
      valid: false,
      reason: reasons[statusCode] || `Unexpected status code: ${statusCode}`,
    };
  }

  getRecommendedMethod(): HttpMethod {
    return 'GET';
  }
}
