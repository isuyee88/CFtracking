/**
 * @fileoverview Revcontent Postback适配器
 * @description Revcontent平台专用的Postback适配器
 * @module services/postback/adapters/revcontent.adapter
 *
 * URL格式:
 * GET https://www.revcontent.com/postback?clickid={clickid}&payout={payout}&status=approved
 *
 * 特点:
 * - 使用标准S2S Postback格式
 * - 支持sub_id参数传递
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * Revcontent Postback适配器
 */
export class RevcontentPostbackAdapter extends PostbackPlatformAdapter {
  readonly platformName = 'revcontent';

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
   * @description Revcontent使用GET请求，不需要POST body
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    return undefined;
  }

  validateResponse(statusCode: number, _body: string): { valid: boolean; reason?: string } {
    if (statusCode >= 200 && statusCode < 300) {
      return { valid: true };
    }

    const reasons: Record<number, string> = {
      400: 'Bad Request - 无效参数或URL格式',
      401: 'Unauthorized - API密钥无效',
      403: 'Forbidden - IP或域名限制',
      429: 'Too Many Requests - 频率限制',
      500: 'Revcontent Server Error',
      502: 'Bad Gateway - 上游服务不可用',
      503: 'Service Unavailable - 服务暂时不可用',
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
