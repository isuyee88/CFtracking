/**
 * @fileoverview Outbrain Postback适配器
 * @description Outbrain平台专用的Postback适配器
 * @module services/postback/adapters/outbrain.adapter
 *
 * URL格式:
 * GET https://trk.outbrain.com/unifiedPixel?clickid={clickid}&payout={payout}&status=approved
 *
 * 特点:
 * - 使用unifiedPixel端点
 * - 支持conversion_id参数
 * - 可能需要additional_params
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * Outbrain Postback适配器
 */
export class OutbrainPostbackAdapter extends PostbackPlatformAdapter {
  readonly platformName = 'outbrain';

  private urlEngine: UrlTemplateEngine;

  constructor() {
    super();
    this.urlEngine = new UrlTemplateEngine();
  }

  /**
   * 构建Outbrain格式的Postback URL
   *
   * @description Outbrain可能需要额外的参数:
   * - markUserId (可选)
   * - obConversionId (可选，用于归因)
   */
  buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string> {
    let baseUrl = this.urlEngine.buildBaseUrl(config, context);

    // 如果配置中提供了额外参数，追加到URL
    if (config.customParams && Object.keys(config.customParams).length > 0) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      const extraParams = Object.entries(config.customParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      baseUrl = `${baseUrl}${separator}${extraParams}`;
    }

    return Promise.resolve(baseUrl);
  }

  /**
   * 构建POST请求体 (可选)
   * @description Outbrain使用GET请求，不需要POST body
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    return undefined;
  }

  /**
   * 验证Outbrain HTTP响应
   *
   * @description Outbrain成功响应:
   * - 状态码200
   * - 响应体通常为空或包含 "OK"
   */
  validateResponse(statusCode: number, body: string): { valid: boolean; reason?: string } {
    if (statusCode === 200) {
      // 检查是否有错误信息
      if (body && (body.toLowerCase().includes('error') || body.toLowerCase().includes('fail'))) {
        return {
          valid: false,
          reason: `Outbrain returned error: ${body.substring(0, 100)}`,
        };
      }
      return { valid: true };
    }

    const reasons: Record<number, string> = {
      400: 'Bad Request - 参数无效或缺失必需参数',
      401: 'Unauthorized - 认证失败',
      403: 'Forbidden - 权限不足或IP限制',
      404: 'Not Found - Pixel ID或endpoint无效',
      429: 'Too Many Requests - 触发频率限制',
      500: 'Outbrain Server Error',
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
