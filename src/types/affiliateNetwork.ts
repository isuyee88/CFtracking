/**
 * @fileoverview Affiliate Network 类型定义
 * @description 定义 Affiliate Network 实体及其相关 DTO 类型
 * @module types/affiliateNetwork
 */

export type AffiliateNetworkStatus = 'active' | 'paused' | 'deleted';
export type AffiliateNetworkType = 'soap' | 'rest' | 'api' | 'other';

export interface AffiliateNetwork {
  id: string;
  name: string;
  type: AffiliateNetworkType;
  status: AffiliateNetworkStatus;
  apiUrl?: string;
  apiKey?: string;
  postbackUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAffiliateNetworkDTO {
  name: string;
  type?: AffiliateNetworkType;
  apiUrl?: string;
  apiKey?: string;
  postbackUrl?: string;
  notes?: string;
}

export interface UpdateAffiliateNetworkDTO {
  name?: string;
  type?: AffiliateNetworkType;
  apiUrl?: string;
  apiKey?: string;
  postbackUrl?: string;
  notes?: string;
  status?: AffiliateNetworkStatus;
}
