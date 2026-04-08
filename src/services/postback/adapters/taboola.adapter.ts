/**
 * @fileoverview Taboola Postback适配器
 * @description Taboola平台专用的Postback适配器，支持HMAC-SHA256签名
 * @module services/postback/adapters/taboola.adapter
 *
 * 特殊需求:
 * - 需要HMAC-SHA256签名 (使用client_secret)
 * - 需要timestamp参数
 * - 特定的URL格式和参数要求
 *
 * URL格式:
 * GET https://trk.taboola.com/campaign/postback?
 *   clickid={clickid}&
 *   name=conversion&
 *   revenue={payout}&
 *   timestamp={unix_timestamp}&
 *   signature={hmac_sha256_signature}
 *
 * 参考文档:
 * - Taboola Postback API文档
 */

import { PostbackPlatformAdapter, PostbackContext, PostbackSendConfig, HttpMethod } from '@/types/postback';
import { UrlTemplateEngine } from '../url-template.engine';
import { HmacService } from '../hmac.service';

/**
 * Taboola Postback适配器
 * @description 支持Taboola特定的Postback格式，包括HMAC-SHA256签名
 */
export class TaboolaPostbackAdapter extends PostbackPlatformAdapter {
  /** 平台名称标识符 */
  readonly platformName = 'taboola';

  /** URL模板引擎实例 */
  private urlEngine: UrlTemplateEngine;

  /** HMAC签名服务 */
  private hmacService: HmacService;

  constructor() {
    super();
    this.urlEngine = new UrlTemplateEngine();
    this.hmacService = new HmacService();
  }

  /**
   * 构建Taboola格式的Postback URL (含HMAC签名)
   *
   * @param context 转化上下文数据
   * @param config Postback发送配置 (必须包含hmacSecret)
   * @returns Promise<string> 解析后的完整URL (含signature参数)
   *
   * @description 构建步骤:
   * 1. 使用UrlTemplateEngine替换基础宏
   * 2. 添加必需的Taboola特定参数 (name, timestamp)
   * 3. 生成HMAC-SHA256签名并追加到URL
   *
   * @throws Error 如果缺少hmacSecret配置
   */
  async buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string> {
    // 检查必需的HMAC密钥
    if (!config.hmacSecret) {
      throw new Error('[TaboolaAdapter] Missing hmacSecret in configuration. Taboola requires HMAC-SHA256 signing.');
    }

    // 步骤1: 替换基础宏变量
    let baseUrl = this.urlEngine.buildBaseUrl(config, context);

    // 步骤2: 添加Taboola必需参数
    const separator = baseUrl.includes('?') ? '&' : '?';
    const timestamp = Math.floor(Date.now() / 1000); // Unix时间戳 (秒)

    // 追加必需参数
    const taboolaParams = [
      `name=conversion`, // 固定值
      `revenue=${context.payout.toFixed(2)}`,
      `timestamp=${timestamp}`,
    ].join('&');

    baseUrl = `${baseUrl}${separator}${taboolaParams}`;

    // 步骤3: 生成HMAC-SHA256签名
    // Taboola签名规则: HMAC-SHA256(clickid + timestamp, client_secret)
    const signature = await this.hmacService.signTaboola(
      context.clickId,
      timestamp,
      config.hmacSecret
    );

    // 追加签名参数
    return `${baseUrl}&signature=${signature}`;
  }

  /**
   * 构建POST请求体 (可选方法)
   *
   * @description Taboola通常使用GET请求，此方法返回undefined。
   * 如果未来Taboola支持POST模式，可以在此实现。
   *
   * @param _context 转化上下文数据 (未使用)
   * @param _config Postback发送配置 (未使用)
   * @returns undefined (不需要POST body)
   */
  buildPayload?(_context: PostbackContext, _config: PostbackSendConfig): Record<string, string> | undefined {
    // Taboola使用GET请求，不需要POST body
    return undefined;
  }

  /**
   * 验证Taboola HTTP响应
   *
   * @param statusCode HTTP状态码
   * @param body 响应体内容
   * @returns 验证结果及原因说明
   *
   * @description Taboola响应验证规则:
   * - 200 OK: 成功 (响应体可能包含 "OK" 或空)
   * - 其他状态码: 失败，需检查具体错误信息
   */
  validateResponse(statusCode: number, body: string): { valid: boolean; reason?: string } {
    // Taboola成功响应通常是200且body为"OK"或空
    if (statusCode === 200) {
      // 检查响应体是否包含错误信息
      if (body && body.toLowerCase().includes('error')) {
        return {
          valid: false,
          reason: `Taboola returned error in response body: ${body.substring(0, 100)}`,
        };
      }
      return { valid: true };
    }

    // 根据状态码返回具体原因
    let reason: string;
    switch (statusCode) {
      case 400:
        reason = 'Bad Request - 可能URL格式或签名无效';
        break;
      case 401:
        reason = 'Unauthorized - HMAC签名验证失败或client_secret错误';
        break;
      case 403:
        reason = 'Forbidden - IP白名单限制或账户权限问题';
        break;
      case 404:
        reason = 'Not Found - Postback URL路径不正确';
        break;
      case 429:
        reason = 'Too Many Requests - 触发频率限制';
        break;
      default:
        if (statusCode >= 500) {
          reason = `Taboola Server Error: ${statusCode}`;
        } else {
          reason = `Unexpected status code: ${statusCode}`;
        }
    }

    return { valid: false, reason };
  }

  /**
   * 获取推荐的HTTP方法
   *
   * @returns 推荐使用GET方法
   *
   * @description Taboola Postback API使用GET方法，
   * 所有参数通过查询字符串传递。
   */
  getRecommendedMethod(): HttpMethod {
    return 'GET';
  }
}
