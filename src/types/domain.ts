/**
 * @fileoverview Domain entity type definitions.
 * @description 定义 Domain 实体及其相关 DTO 类型
 * @module types/domain
 * 
 * 数据流:
 * 1. Domain 用于跟踪、落地页、管理界面
 * 2. 支持实时校验 Zone、SSL、DNS 状态
 * 3. 校验历史存储在 domainValidationHistory 表
 */

export type DomainStatus = 'active' | 'paused' | 'pending' | 'error';
export type DomainUsage = 'tracking' | 'landing' | 'admin' | 'mixed';
export type DomainSslStatus = 'auto' | 'custom' | 'pending' | 'disabled';
export type DomainDnsProvider = 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'manual' | 'other';
export type ValidationStatus = 'valid' | 'invalid' | 'pending' | 'unknown' | 'error';

export interface Domain {
  id: string;
  displayId?: string;
  hostname: string;
  usage: DomainUsage;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  dnsProvider: DomainDnsProvider;
  registrar: string | null;
  cloudflareZoneId: string | null;
  cloudflareProxyEnabled: boolean;
  defaultCampaignId: string | null;
  defaultLandingPageId: string | null;
  notes: string | null;
  zoneStatus: ValidationStatus;
  sslValidationStatus: ValidationStatus;
  dnsStatus: ValidationStatus;
  zoneId: string | null;
  lastValidatedAt: string | null;
  validationEnabled: boolean;
  validationInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDomainDTO {
  hostname: string;
  usage?: DomainUsage;
  status?: DomainStatus;
  sslStatus?: DomainSslStatus;
  dnsProvider?: DomainDnsProvider;
  registrar?: string;
  cloudflareZoneId?: string;
  cloudflareProxyEnabled?: boolean;
  defaultCampaignId?: string;
  defaultLandingPageId?: string;
  notes?: string;
  validationEnabled?: boolean;
  validationInterval?: number;
}

export interface UpdateDomainDTO {
  hostname?: string;
  usage?: DomainUsage;
  status?: DomainStatus;
  sslStatus?: DomainSslStatus;
  dnsProvider?: DomainDnsProvider;
  registrar?: string | null;
  cloudflareZoneId?: string | null;
  cloudflareProxyEnabled?: boolean;
  defaultCampaignId?: string | null;
  defaultLandingPageId?: string | null;
  notes?: string | null;
  validationEnabled?: boolean;
  validationInterval?: number;
}

export interface DomainValidationHistory {
  id: string;
  domainId: string;
  zoneStatus: ValidationStatus;
  sslStatus: ValidationStatus;
  dnsStatus: ValidationStatus;
  zoneId: string | null;
  errors: string | null;
  validatedAt: string;
  createdAt: string;
}

export interface ValidationResult {
  domainId: string;
  hostname: string;
  zoneStatus: ValidationStatus;
  sslStatus: ValidationStatus;
  dnsStatus: ValidationStatus;
  zoneId: string | null;
  errors: string[];
  validatedAt: string;
}

export interface CloudflareZoneInfo {
  id: string;
  name: string;
  status: string;
  nameServers: string[];
  sslStatus: string;
  dnsSecStatus: string;
}

export interface DomainValidationConfig {
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  timeout: number;
  retries: number;
  cacheTTL: number;
}

export const DEFAULT_VALIDATION_CONFIG: Partial<DomainValidationConfig> = {
  timeout: 30000,
  retries: 3,
  cacheTTL: 3600,
};
