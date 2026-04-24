/**
 * @fileoverview Postback URL模板引擎
 * @description 解析Postback URL模板，替换宏变量为实际值
 * @module services/postback/url-template.engine
 *
 * 输入:
 *   - URL模板字符串 (如: https://postback.example.com?clickid={clickid}&payout={payout})
 *   - PostbackContext (转化上下文数据)
 *   - 自定义参数 (可选)
 *
 * 输出:
 *   - 解析后的完整URL (所有宏已替换为实际值)
 *
 * 逻辑交互:
 *   - 被PostbackService和各平台适配器调用
 *   - 支持标准宏替换 + 自定义参数追加
 *   - RFC 3986 URL编码
 */

import type { PostbackContext, PostbackSendConfig } from '@/types/postback';

/**
 * URL模板引擎
 * @description 负责解析Postback URL模板中的宏变量并替换为实际值
 */
export class UrlTemplateEngine {
  /**
   * 标准宏定义映射表
   * @description 键为宏名称 (如 {clickid})，值为从PostbackContext提取值的函数
   */
  private static readonly MACROS: Record<string, (ctx: PostbackContext) => string> = {
    // 核心标识符
    '{clickid}': ctx => ctx.clickId,
    '{conversion_id}': ctx => ctx.conversionId,
    '{offer_id}': ctx => ctx.offerId,
    '{offer_name}': ctx => ctx.offerName || '',

    // 收支信息
    '{payout}': ctx => ctx.payout.toFixed(2),
    '{revenue}': ctx => ctx.revenue.toFixed(2),

    // 状态信息
    '{status}': ctx => ctx.status,
    '{conversion_type}': ctx => ctx.conversionType,

    // 时间相关
    '{timestamp}': ctx => ctx.timestamp || '',
    '{date}': ctx => ctx.timestamp ? (new Date(ctx.timestamp).toISOString().split('T')[0] || '') : '',

    // 地理位置
    '{ip}': ctx => ctx.ip || '',
    '{country}': ctx => ctx.country || '',

    // 设备信息
    '{device}': ctx => ctx.device || '',
    '{browser}': ctx => ctx.browser || '',
    '{os}': ctx => ctx.os || '',

    // 子ID追踪参数 (支持1-30个, 对标Keitaro完整Sub ID支持)
    '{sub_id_1}': ctx => ctx.subId1 || '',
    '{sub_id_2}': ctx => ctx.subId2 || '',
    '{sub_id_3}': ctx => ctx.subId3 || '',
    '{sub_id_4}': ctx => ctx.subId4 || '',
    '{sub_id_5}': ctx => ctx.subId5 || '',
    '{sub_id_6}': ctx => ctx.subId6 || '',
    '{sub_id_7}': ctx => ctx.subId7 || '',
    '{sub_id_8}': ctx => ctx.subId8 || '',
    '{sub_id_9}': ctx => ctx.subId9 || '',
    '{sub_id_10}': ctx => ctx.subId10 || '',
    '{sub_id_11}': ctx => ctx.subId11 || '',
    '{sub_id_12}': ctx => ctx.subId12 || '',
    '{sub_id_13}': ctx => ctx.subId13 || '',
    '{sub_id_14}': ctx => ctx.subId14 || '',
    '{sub_id_15}': ctx => ctx.subId15 || '',
    '{sub_id_16}': ctx => ctx.subId16 || '',
    '{sub_id_17}': ctx => ctx.subId17 || '',
    '{sub_id_18}': ctx => ctx.subId18 || '',
    '{sub_id_19}': ctx => ctx.subId19 || '',
    '{sub_id_20}': ctx => ctx.subId20 || '',
    '{sub_id_21}': ctx => ctx.subId21 || '',
    '{sub_id_22}': ctx => ctx.subId22 || '',
    '{sub_id_23}': ctx => ctx.subId23 || '',
    '{sub_id_24}': ctx => ctx.subId24 || '',
    '{sub_id_25}': ctx => ctx.subId25 || '',
    '{sub_id_26}': ctx => ctx.subId26 || '',
    '{sub_id_27}': ctx => ctx.subId27 || '',
    '{sub_id_28}': ctx => ctx.subId28 || '',
    '{sub_id_29}': ctx => ctx.subId29 || '',
    '{sub_id_30}': ctx => ctx.subId30 || '',

    // UTM参数
    '{utm_source}': ctx => ctx.utmSource || '',
    '{utm_medium}': ctx => ctx.utmMedium || '',
    '{utm_campaign}': ctx => ctx.utmCampaign || '',

    // Cloudflare特定
    '{cf_ray_id}': ctx => ctx.cfRayId || '',
  };

  /**
   * 解析URL模板，替换所有宏变量
   *
   * @param template URL模板字符串
   *   示例: "https://trk.taboola.com/campaign/postback?clickid={clickid}&payout={payout}"
   * @param context 转化上下文数据
   * @param customParams 自定义参数 (可选，会追加到URL查询字符串末尾)
   * @returns 解析后的完整URL (所有宏已替换)
   *
   * @example
   * ```typescript
   * const engine = new UrlTemplateEngine();
   * const url = engine.parse(
   *   'https://postback.example.com?clickid={clickid}&payout={payout}',
   *   { clickId: 'clk_123', payout: 5.50 }
   * );
   * // 结果: "https://postback.example.com?clickid=clk_123&payout=5.50"
   * ```
   */
  parse(template: string, context: PostbackContext, customParams?: Record<string, string>): string {
    let result = template;

    // 替换所有标准宏
    for (const [macro, resolver] of Object.entries(UrlTemplateEngine.MACROS)) {
      if (result.includes(macro)) {
        const value = resolver(context);
        result = result.replaceAll(macro, this.encodeParam(value));
      }
    }

    // 追加自定义参数 (如果有的话)
    if (customParams && Object.keys(customParams).length > 0) {
      const separator = result.includes('?') ? '&' : '?';
      const customQueryString = Object.entries(customParams)
        .map(([key, value]) => `${this.encodeParam(key)}=${this.encodeParam(value)}`)
        .join('&');
      result = `${separator}${customQueryString}`;
    }

    return result;
  }

  /**
   * 提取URL中的查询参数并返回键值对
   *
   * @param url 完整URL或查询字符串
   * @returns 参数键值对对象
   *
   * @example
   * ```typescript
   * const params = engine.extractQueryParams('https://example.com?a=1&b=2');
   * // 结果: { a: '1', b: '2' }
   * ```
   */
  extractQueryParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};

    try {
      // 解析URL获取查询字符串
      let queryString: string;
      if (url.includes('?')) {
        const parts = url.split('?');
        queryString = parts[1] ? (parts[1].split('#')[0] || '') : '';
      } else if (url.startsWith('?')) {
        queryString = url.substring(1);
      } else {
        return params;
      }

      // 分割参数对
      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(valueParts.join('=') || '');
        }
      }
    } catch (error) {
      console.error('[UrlTemplateEngine] extractQueryParams error:', error);
    }

    return params;
  }

  /**
   * 编码URL参数值 (RFC 3986 compliant)
   *
   * @param value 待编码的值
   * @returns 编码后的字符串
   *
   * @description 使用RFC 3986标准编码，保留特殊字符如 / ? : @ & = + $ , #
   * 与encodeURIComponent的区别: 不编码 ~ ! ' ( ) *
   */
  encodeParam(value: string): string {
    if (!value) return '';

    try {
      return encodeURIComponent(value)
        .replace(/%20/g, '+')  // 空格转为+号 (更符合query string惯例)
        .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    } catch (error) {
      console.error('[UrlTemplateEngine] encodeParam error:', error);
      return '';
    }
  }

  /**
   * 验证URL模板是否包含必要的宏
   *
   * @param template URL模板字符串
   * @param requiredMacros 必须存在的宏列表 (如 ['{clickid}'])
   * @returns 验证结果及缺失的宏列表
   *
   * @example
   * ```typescript
   * const result = engine.validateTemplate(
   *   'https://example.com?payout={payout}',
   *   ['{clickid}', '{payout}']
   * );
   * // 结果: { valid: false, missingMacros: ['{clickid}'] }
   * ```
   */
  validateTemplate(template: string, requiredMacros: string[]): {
    valid: boolean;
    missingMacros: string[];
  } {
    const missingMacros: string[] = [];

    for (const macro of requiredMacros) {
      if (!template.includes(macro)) {
        missingMacros.push(macro);
      }
    }

    return {
      valid: missingMacros.length === 0,
      missingMacros,
    };
  }

  /**
   * 检测URL模板中使用的所有宏
   *
   * @param template URL模板字符串
   * @returns 模板中找到的所有宏列表
   *
   * @example
   * ```typescript
   * const macros = engine.detectMacros('https://example.com?{clickid}&{payout}');
   * // 结果: ['{clickid}', '{payout}']
   * ```
   */
  detectMacros(template: string): string[] {
    const macroPattern = /\{[^{}]+\}/g;
    const matches = template.match(macroPattern);
    return matches || [];
  }

  /**
   * 从配置中构建基础URL (不含自定义参数)
   * @description 用于平台适配器内部调用
   *
   * @param config Postback发送配置
   * @param context 转化上下文数据
   * @returns 基础URL (仅替换config.urlTemplate中的宏)
   */
  buildBaseUrl(config: PostbackSendConfig, context: PostbackContext): string {
    return this.parse(config.urlTemplate, context);
  }
}
