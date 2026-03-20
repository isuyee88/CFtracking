/**
 * @fileoverview URL 生成工具
 * @description 生成 Campaign 追踪 URL
 * @module utils/url
 */

import type { Campaign } from '@/types/campaign';

/**
 * UTM 参数接口
 */
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * 默认 UTM 参数配置
 */
const DEFAULT_UTM: UTMParams = {
  utm_source: 'tracking',
  utm_medium: 'cpc',
  utm_campaign: 'default',
};

/**
 * 生成 Campaign 追踪 URL
 * @param campaign - Campaign 对象
 * @param utmParams - 可选的 UTM 参数
 * @returns 完整的追踪 URL
 *
 * @example
 * ```ts
 * const url = generateCampaignUrl(campaign);
 * // 输出: https://example.com/c/alias?utm_source=tracking&utm_medium=cpc&utm_campaign=default
 *
 * const urlWithUtm = generateCampaignUrl(campaign, { utm_source: 'google', utm_campaign: 'summer-sale' });
 * // 输出: https://example.com/c/alias?utm_source=google&utm_medium=cpc&utm_campaign=summer-sale
 * ```
 */
export function generateCampaignUrl(campaign: Campaign, utmParams?: UTMParams): string {
  const { domain, alias } = campaign;

  // 合并默认 UTM 参数和自定义参数
  const finalUtm = { ...DEFAULT_UTM, ...utmParams };

  // 构建 URL
  const protocol = 'https';
  const path = `/c/${alias}`;

  // 构建 UTM 查询字符串
  const queryParams = new URLSearchParams();
  if (finalUtm.utm_source) queryParams.set('utm_source', finalUtm.utm_source);
  if (finalUtm.utm_medium) queryParams.set('utm_medium', finalUtm.utm_medium);
  if (finalUtm.utm_campaign) queryParams.set('utm_campaign', finalUtm.utm_campaign);
  if (finalUtm.utm_term) queryParams.set('utm_term', finalUtm.utm_term);
  if (finalUtm.utm_content) queryParams.set('utm_content', finalUtm.utm_content);

  const queryString = queryParams.toString();
  const url = `${protocol}://${domain}${path}${queryString ? `?${queryString}` : ''}`;

  return url;
}

/**
 * 生成短链接（仅包含域名和路径，不含 UTM）
 * @param campaign - Campaign 对象
 * @returns 短链接
 */
export function generateShortUrl(campaign: Campaign): string {
  const { domain, alias } = campaign;
  return `https://${domain}/c/${alias}`;
}

/**
 * 解析 URL 中的 UTM 参数
 * @param url - 完整 URL
 * @returns UTM 参数对象
 */
export function parseUtmParams(url: string): UTMParams {
  try {
    const urlObj = new URL(url);
    const params: UTMParams = {};

    const utm_source = urlObj.searchParams.get('utm_source');
    const utm_medium = urlObj.searchParams.get('utm_medium');
    const utm_campaign = urlObj.searchParams.get('utm_campaign');
    const utm_term = urlObj.searchParams.get('utm_term');
    const utm_content = urlObj.searchParams.get('utm_content');

    if (utm_source) params.utm_source = utm_source;
    if (utm_medium) params.utm_medium = utm_medium;
    if (utm_campaign) params.utm_campaign = utm_campaign;
    if (utm_term) params.utm_term = utm_term;
    if (utm_content) params.utm_content = utm_content;

    return params;
  } catch {
    return {};
  }
}
