/**
 * @fileoverview Traffic Source 类型定义
 * @description 定义 Traffic Source 实体及其相关 DTO 类型
 * @module types/trafficSource
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
  alias: string;      //  tracker 中使用的别名，用于报表
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
  parameters?: ParameterTemplate[] | string;
  postbackConfig?: PostbackConfig | string;
  apiConfig?: TrafficSourceApiConfig | string;
  templateId?: string;      // 引用的预定义模板ID
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
  parameters?: ParameterTemplate[] | string;
  postbackConfig?: PostbackConfig | string;
  apiConfig?: TrafficSourceApiConfig | string;
  templateId?: string;
}

export interface UpdateTrafficSourceDTO {
  name?: string;
  type?: TrafficSourceType;
  postbackUrl?: string;
  costModel?: CostModel;
  costValue?: number;
  currency?: string;
  parameters?: ParameterTemplate[] | string;
  postbackConfig?: PostbackConfig | string;
  apiConfig?: TrafficSourceApiConfig | string;
  templateId?: string;
  status?: TrafficSourceStatus;
}
