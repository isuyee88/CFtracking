/**
 * @fileoverview Traffic Source 参数映射类型定义
 * @description 定义参数映射相关的类型
 * @module types/paramMapping
 */

export interface ParameterMappingRule {
  id: string;
  sourceParam: string;
  targetParam: string;
  defaultValue?: string;
  required: boolean;
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'custom';
  customTransform?: string;
}

export interface TrafficSourceTemplate {
  id: string;
  name: string;
  category?: string;
  type: string;
  parameters: ParameterMappingRule[];
  postbackUrl?: string;
  postbackMacros?: Record<string, string>;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParameterValidation {
  valid: boolean;
  errors: ParameterValidationError[];
  warnings: ParameterValidationWarning[];
}

export interface ParameterValidationError {
  param: string;
  message: string;
}

export interface ParameterValidationWarning {
  param: string;
  message: string;
}

export interface TrackingUrlConfig {
  campaignId: string;
  trafficSourceId: string;
  customParams?: Record<string, string>;
  useHttps?: boolean;
}
