/**
 * @fileoverview 通用/标准S2S Postback适配器
 * @description 适用于大多数流量平台的通用Postback适配器
 * @module services/postback/adapters/generic.adapter
 *
 * 适用平台:
 * - PropellerAds
 * - Revcontent (基础模式)
 * - Outbrain (基础模式)
 * - OddBytes
 * - Rumble
 * - 其他标准S2S Postback平台
 *
 * URL格式:
 * GET https://domain.com/path?clickid={clickid}&payout={payout}&status=approved
 *
 * 特点:
 * - 默认使用GET方法
 * - 支持所有标准宏替换
 * - 简单的响应验证 (2xx视为成功)
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';

/**
 * 通用Postback适配器
 * @description 标准S2S Postback的实现，适用于大多数流量平台
 */
export class GenericPostbackAdapter extends PostbackPlatformAdapter {
  /** 平台名称标识符 */
  readonly platformName = 'generic';

  /** URL模板引擎实例 */
  private urlEngine: UrlTemplateEngine;

  constructor() {
    super();
    this.urlEngine = new UrlTemplateEngine();
  }

  /**
   * 构建完整的Postback URL
   *
   * @param context 转化上下文数据
   * @param config Postback发送配置
   * @returns 解析后的完整URL (宏已替换)
   *
   * @example
   * 输入:
   * - config.urlTemplate = "https://postback.example.com?clickid={clickid}&payout={payout}"
   * - context.clickId = "clk_123"
   * - context.payout = 5.50
   *
   * 输出:
   * - "https://postback.example.com?clickid=clk_123&payout=5.50"
   */
  buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string> {
    return Promise.resolve(this.urlEngine.buildBaseUrl(config, context));
  }

  /**
   * 构建POST请求体 (可选方法)
   *
   * @description Generic适配器默认不构建POST body，
   * 因为大多数平台使用GET方法。如果需要POST，子类可以覆盖此方法。
   *
   * @param _context 转化上下文数据 (未使用)
   * @param _config Postback发送配置 (未使用)
   * @returns undefined (表示不需要POST body)
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    // Generic适配器通常使用GET请求，不需要POST body
    return undefined;
  }

  /**
   * 验证HTTP响应是否有效
   *
   * @param statusCode HTTP状态码
   * @param _body 响应体内容 (未使用，Generic适配器只检查状态码)
   * @returns 验证结果及原因说明
   *
   * @description Generic验证规则:
   * - 2xx状态码: 成功
   * - 其他状态码: 失败
   */
  validateResponse(statusCode: number, _body: string): { valid: boolean; reason?: string } {
    if (statusCode >= 200 && statusCode < 300) {
      return { valid: true };
    }

    // 根据状态码范围返回具体的失败原因
    let reason: string;
    if (statusCode >= 400 && statusCode < 500) {
      reason = `Client error: ${statusCode} (可能URL格式错误或参数无效)`;
    } else if (statusCode >= 500) {
      reason = `Server error: ${statusCode} (目标服务器内部错误)`;
    } else {
      reason = `Unexpected status code: ${statusCode}`;
    }

    return { valid: false, reason };
  }

  /**
   * 获取推荐的HTTP方法
   *
   * @returns 推荐使用GET方法
   *
   * @description 大多数S2S Postback平台使用GET方法，
   * 参数通过查询字符串传递。
   */
  getRecommendedMethod(): HttpMethod {
    return 'GET';
  }
}
