/**
 * @fileoverview Offer Payout 类型定义
 * @description 定义 Offer 支付相关的类型
 * @module types/offerPayout
 */

export type PayoutType = 'cpa' | 'cpl' | 'cps' | 'revshare' | 'hybrid';

export interface PayoutRule {
  id: string;
  name: string;
  condition: PayoutCondition;
  payoutValue: number;
  payoutType: PayoutType;
  priority: number;
  enabled: boolean;
}

export interface PayoutCondition {
  field: 'country' | 'device' | 'browser' | 'os' | 'custom';
  operator: 'eq' | 'neq' | 'in' | 'notin';
  value: string | string[];
}

export interface ConversionCap {
  total: number;
  daily: number;
  startDate?: string;
  endDate?: string;
}

export interface OfferConversionStats {
  offerId: string;
  date: string;
  conversions: number;
  revenue: number;
}

export interface PayoutCalculationResult {
  basePayout: number;
  finalPayout: number;
  appliedRule?: PayoutRule;
  capReached: boolean;
  capRemaining: number;
}

export interface PayoutPreviewContext {
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  customParams?: Record<string, string>;
}
