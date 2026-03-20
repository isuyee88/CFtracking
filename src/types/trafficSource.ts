/**
 * @fileoverview Traffic Source 类型定义
 * @description 定义 Traffic Source 实体及其相关 DTO 类型
 * @module types/trafficSource
 */

export type TrafficSourceStatus = 'active' | 'paused' | 'deleted';
export type TrafficSourceType = 'social' | 'search' | 'native' | 'push' | 'pop' | 'display' | 'email' | 'other';
export type CostModel = 'cpc' | 'cpm' | 'cpa' | 'fixed';

/**
 * 流量平台 API 配置
 */
export interface TrafficSourceApiConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  enabled: boolean;
}

export interface TrafficSource {
  id: string;
  name: string;
  type: TrafficSourceType;
  status: TrafficSourceStatus;
  postbackUrl?: string;
  costModel: CostModel;
  costValue: number;
  currency: string;
  parameters?: string;
  apiConfig?: string; // JSON string of TrafficSourceApiConfig
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrafficSourceDTO {
  name: string;
  type?: TrafficSourceType;
  postbackUrl?: string;
  costModel?: CostModel;
  costValue?: number;
  currency?: string;
  parameters?: string;
  apiConfig?: TrafficSourceApiConfig;
}

export interface UpdateTrafficSourceDTO {
  name?: string;
  type?: TrafficSourceType;
  postbackUrl?: string;
  costModel?: CostModel;
  costValue?: number;
  currency?: string;
  parameters?: string;
  apiConfig?: TrafficSourceApiConfig;
  status?: TrafficSourceStatus;
}
