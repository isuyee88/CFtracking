/**
 * @fileoverview OddBytes Postback适配器
 * @description OddBytes平台专用的Postback适配器
 * @module services/postback/adapters/oddbytes.adapter
 *
 * URL格式:
 * GET https://postback.oddbytes.com/track?clickid={clickid}&payout={payout}&status=approved
 *
 * 特点:
 * - 标准S2S Postback格式
 * - 支持自定义事件类型
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * OddBytes Postback适配器
 */
export class OddBytesPostbackAdapter extends PostbackPlatformAdapter {
  readonly platformName = 'oddbytes';

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
   * @description OddBytes使用GET请求，不需要POST body
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    return undefined;
  }

  /**
   * 验证OddBytes HTTP响应
   *
   * @description OddBytes响应验证规则:
   * - 2xx: 成功
   * - 其他: 失败
   */
  validateResponse(statusCode: number, _body: string): { valid: boolean; reason?: string } {
    if (statusCode >= 200 && statusCode < 300) {
      return { valid: true };
    }

    const reasons: Record<number, string> = {
      400: 'Bad Request - 参数无效或缺失',
      401: 'Unauthorized - API Key无效',
      403: 'Forbidden - 账户权限问题',
      404: 'Not Found - Postback URL不正确',
      429: 'Too Many Requests - API限流',
      500: 'OddBytes Server Error',
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
