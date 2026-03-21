/**
 * File: trafficSource.ts
 * Purpose: Traffic Source 前端类型定义
 * Input/Output: 定义 Traffic Source 相关的前端类型
 * Logic: 与后端类型保持一致，用于前端类型检查
 */

export type TrafficSourceStatus = 'active' | 'paused' | 'deleted';
export type TrafficSourceType = 'social' | 'search' | 'native' | 'push' | 'pop' | 'display' | 'email' | 'other';
export type CostModel = 'cpc' | 'cpm' | 'cpa' | 'fixed';
export type ConversionStatus = 'lead' | 'sale' | 'rejected' | 'pending';

/**
 * 流量平台 API 配置
 */
export interface TrafficSourceApiConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  enabled: boolean;
}

/**
 * UTM 参数模板项
 * 参考 Keitaro 的三列结构：别名、参数名、宏
 */
export interface ParameterTemplate {
  alias: string;      // tracker 中使用的别名，用于报表
  paramName: string;  // URL 参数名
  macro: string;      // 流量源提供的宏/token
}

/**
 * S2S Postback 配置
 */
export interface PostbackConfig {
  url: string;                    // Postback URL
  sendOnlyStatuses: ConversionStatus[];  // 只发送指定状态的转化
  customParams?: Record<string, string>; // 自定义参数
  taboolaKey?: string;            // Taboola Client Secret API key
}

/**
 * 预定义流量源模板
 */
export interface TrafficSourceTemplate {
  id: string;
  name: string;
  domain: string;
  type: TrafficSourceType;
  parameters: ParameterTemplate[];
  postbackUrl: string;
  postbackMacros: Record<string, string>;
}

export interface TrafficSource {
  id: string;
  displayId?: string;
  name: string;
  type: TrafficSourceType;
  status: TrafficSourceStatus;
  postbackUrl?: string;
  costModel: CostModel;
  costValue: number;
  currency: string;
  parameters?: string | ParameterTemplate[];
  postbackConfig?: string | PostbackConfig;
  apiConfig?: string | TrafficSourceApiConfig;
  templateId?: string;
  campaignCount?: number;
  clicks: number;
  conversions: number;
  revenue: number | string;
  cost?: number;
  profit: number | string;
  roi: number | string;
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
  parameters?: ParameterTemplate[];
  postbackConfig?: PostbackConfig;
  apiConfig?: TrafficSourceApiConfig;
  templateId?: string;
}

export interface UpdateTrafficSourceDTO {
  name?: string;
  type?: TrafficSourceType;
  postbackUrl?: string;
  costModel?: CostModel;
  costValue?: number;
  currency?: string;
  parameters?: ParameterTemplate[];
  postbackConfig?: PostbackConfig;
  apiConfig?: TrafficSourceApiConfig;
  templateId?: string;
  status?: TrafficSourceStatus;
}
