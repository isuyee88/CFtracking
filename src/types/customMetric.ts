/**
 * @fileoverview 自定义指标类型定义
 * @description 定义自定义指标相关的数据类型
 * @module types/customMetric
 */

export type CustomMetricType = 'calculated' | 'aggregated';
export type CustomMetricDataType = 'number' | 'currency' | 'percent';
export type CustomMetricFormat = 'number' | 'currency' | 'percent' | 'custom';
export type CustomMetricStatus = 'active' | 'inactive' | 'deleted';

export interface CustomMetric {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  
  // 指标类型
  type: CustomMetricType;
  
  // 计算公式
  formula: string;
  
  // 数据类型
  dataType: CustomMetricDataType;
  
  // 格式化配置
  format: CustomMetricFormat;
  decimals: number;
  prefix?: string;
  suffix?: string;
  
  // 可用性
  status: CustomMetricStatus;
  isSystem: boolean;
  
  // 元数据
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomMetricDTO {
  name: string;
  displayName: string;
  description?: string;
  type?: CustomMetricType;
  formula: string;
  dataType?: CustomMetricDataType;
  format?: CustomMetricFormat;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface UpdateCustomMetricDTO {
  displayName?: string;
  description?: string;
  formula?: string;
  dataType?: CustomMetricDataType;
  format?: CustomMetricFormat;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  status?: CustomMetricStatus;
}

export interface CustomMetricListParams {
  status?: CustomMetricStatus;
  type?: CustomMetricType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomMetricListResult {
  list: CustomMetric[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MetricCalculationContext {
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
  spend: number;
  cost: number;
  profit: number;
  uniqueVisitors: number;
  [key: string]: number;
}

export interface MetricCalculationResult {
  value: number;
  formatted: string;
  error?: string;
}
