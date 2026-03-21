/**
 * @fileoverview Offer 类型定义
 * @description 定义 Offer 实体及其相关 DTO 类型
 * @module types/offer
 */

export type OfferStatus = 'active' | 'paused' | 'deleted';
export type PayoutType = 'fixed' | 'revshare' | 'cpa';

export interface Offer {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  payout: number;
  currency: string;
  payoutType: PayoutType;
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
  network?: string;
  group?: string;
}

export interface UpdateOfferDTO {
  name?: string;
  url?: string;
  payout?: number;
  currency?: string;
  payoutType?: PayoutType;
  network?: string;
  group?: string;
  status?: OfferStatus;
}
