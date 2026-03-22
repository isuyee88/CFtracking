/**
 * @fileoverview Offer 类型定义
 * @description 定义 Offer 实体及其相关 DTO 类型
 * @module types/offer
 */

export type OfferStatus = 'active' | 'paused' | 'deleted';
export type PayoutType = 'fixed' | 'revshare' | 'cpa';

/**
 * 重定向类型
 * - http: HTTP 302 重定向
 * - meta: Meta 标签重定向
 * - js: JavaScript 重定向
 * - js_blank: 清除 referrer 的 JS 重定向
 * - double: 双重 Meta 重定向，隐藏来源
 * - remote: 请求 URL 获取重定向地址
 */
export type RedirectType = 'http' | 'meta' | 'js' | 'js_blank' | 'double' | 'remote';

export interface Offer {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  payout: number;
  currency: string;
  payoutType: PayoutType;
  redirectType: RedirectType;
  network: string;
  group: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferDTO {
  name: string;
  url: string;
  payout?: number;
  currency?: string;
  payoutType?: PayoutType;
  redirectType?: RedirectType;
  network?: string;
  group?: string;
}

export interface UpdateOfferDTO {
  name?: string;
  url?: string;
  payout?: number;
  currency?: string;
  payoutType?: PayoutType;
  redirectType?: RedirectType;
  network?: string;
  group?: string;
  status?: OfferStatus;
}
