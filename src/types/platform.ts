/**
 * @fileoverview Platform 类型定义
 * @description 定义流量平台适配器相关类型
 * @module types/platform
 */

export type PlatformType = 'soap' | 'rest';
export type PlatformStatus = 'active' | 'inactive';

export interface PlatformInfo {
  id: string;
  name: string;
  type: PlatformType;
  version: string;
  description: string;
  actions: string[];
}

export interface PlatformConfig {
  platformId: string;
  config: Record<string, unknown>;
  status: PlatformStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  wsdlUrl?: string;
  apiUrl?: string;
}

export interface PlatformActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface OddBytesConfig extends PlatformCredentials {
  wsdlUrl: string;
  apiKey: string;
}

export interface PropellerAdsConfig extends PlatformCredentials {
  apiKey: string;
  apiUrl?: string;
}
