/**
 * @fileoverview Affiliate Network 类型定义
 * @description 定义 Affiliate Network 实体及其相关 DTO 类型
 * @module types/affiliateNetwork
 */

export type AffiliateNetworkStatus = 'active' | 'paused' | 'deleted';
export type AffiliateNetworkType = 'soap' | 'rest' | 'api' | 'other';

export interface AffiliateNetworkOfferParameter {
  name: string;
  value: string;
  description?: string;
}

export interface AffiliateNetwork {
  id: string;
  displayId?: string;
  name: string;
  type: AffiliateNetworkType;
  status: AffiliateNetworkStatus;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  postbackUrl?: string;
  offerParameters?: AffiliateNetworkOfferParameter[];
  notes?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAffiliateNetworkDTO {
  name: string;
  type?: AffiliateNetworkType;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  postbackUrl?: string;
  offerParameters?: AffiliateNetworkOfferParameter[];
  notes?: string;
  templateId?: string;
}

export interface UpdateAffiliateNetworkDTO {
  name?: string;
  type?: AffiliateNetworkType;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  postbackUrl?: string;
  offerParameters?: AffiliateNetworkOfferParameter[];
  notes?: string;
  status?: AffiliateNetworkStatus;
  templateId?: string;
}
