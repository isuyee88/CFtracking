/**
 * @fileoverview IP检测类型定义
 * @description 定义IP检测、代理/VPN黑名单相关的类型和接口
 * @module types/ipDetection
 */

export type ProxyVPNType = 'proxy' | 'vpn' | 'tor' | 'datacenter' | 'mixed';
export type BlacklistSource = 'manual' | 'auto_detected' | 'api' | 'import';
export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IPDetectionResult {
  ip: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  riskScore: number;
  provider: string;
  isp?: string;
  country?: string;
  city?: string;
  asn?: string;
  details?: Record<string, any>;
  cached: boolean;
  cachedAt?: string;
}

export interface IPDetectionCache {
  id: string;
  ip: string;
  isProxy: number;
  isVpn: number;
  isTor: number;
  isDatacenter: number;
  riskScore: number;
  provider: string;
  isp?: string;
  country?: string;
  city?: string;
  asn?: string;
  details?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyVPNBlacklistEntry {
  id: string;
  ip: string;
  ipRange?: string;
  type: ProxyVPNType;
  reason: string;
  source: BlacklistSource;
  severity: DetectionSeverity;
  autoExpire: boolean;
  expiresAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyVPNBlacklistCreateInput {
  ip: string;
  ipRange?: string;
  type: ProxyVPNType;
  reason?: string;
  source?: BlacklistSource;
  severity?: DetectionSeverity;
  autoExpire?: boolean;
  expiresAt?: string;
  notes?: string;
  createdBy?: string;
}

export interface IPDetectionProvider {
  id: string;
  name: string;
  displayName?: string;
  apiKey?: string;
  apiEndpoint: string;
  enabled: boolean;
  priority: number;
  dailyLimit: number;
  dailyUsed: number;
  lastResetDate?: string;
  config?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPDetectionProviderCreateInput {
  name: string;
  displayName?: string;
  apiKey?: string;
  apiEndpoint: string;
  enabled?: boolean;
  priority?: number;
  dailyLimit?: number;
  config?: Record<string, any>;
}

export interface IPDetectionProviderConfig {
  fields?: string;
  vpn?: number;
  asn?: number;
  timeout?: number;
  [key: string]: any;
}

export interface ProxyVPNCheckResult {
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  riskScore: number;
  score: number;
  provider: string;
  details?: Record<string, any>;
}

export interface IPDetectionStats {
  totalChecks: number;
  cacheHits: number;
  cacheMisses: number;
  proxyDetected: number;
  vpnDetected: number;
  torDetected: number;
  datacenterDetected: number;
  topProviders: Array<{ provider: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

export interface BatchDetectionResult {
  results: IPDetectionResult[];
  total: number;
  cached: number;
  fresh: number;
  errors: Array<{ ip: string; error: string }>;
}

export interface IPDetectionServiceConfig {
  enabled: boolean;
  action: 'allow' | 'log' | 'flag' | 'block';
  riskThreshold: number;
  cacheTTL: number;
  providers: {
    primary: string;
    fallback: string[];
  };
  autoBlacklist: {
    enabled: boolean;
    threshold: number;
    types: ProxyVPNType[];
  };
}

export interface IIPDetectionProvider {
  checkIP(ip: string): Promise<IPDetectionResult>;
  getName(): string;
  isEnabled(): boolean;
  getRemainingQuota(): number;
  checkQuota(): boolean;
}

export interface IPDetectionRepository {
  findByIP(ip: string): Promise<IPDetectionCache | null>;
  upsert(result: Omit<IPDetectionCache, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  deleteByIP(ip: string): Promise<void>;
  deleteExpired(): Promise<number>;
  getStats(): Promise<IPDetectionStats>;
}

export interface ProxyVPNBlacklistRepository {
  findByIP(ip: string): Promise<ProxyVPNBlacklistEntry | null>;
  create(input: ProxyVPNBlacklistCreateInput): Promise<ProxyVPNBlacklistEntry>;
  update(id: string, input: Partial<ProxyVPNBlacklistCreateInput>): Promise<ProxyVPNBlacklistEntry>;
  delete(id: string): Promise<void>;
  list(options: { page?: number; pageSize?: number; type?: ProxyVPNType; severity?: DetectionSeverity }): Promise<{ list: ProxyVPNBlacklistEntry[]; total: number }>;
  batchCreate(entries: ProxyVPNBlacklistCreateInput[]): Promise<number>;
}

export interface IPDetectionProviderRepository {
  findByName(name: string): Promise<IPDetectionProvider | null>;
  findById(id: string): Promise<IPDetectionProvider | null>;
  listEnabled(): Promise<IPDetectionProvider[]>;
  listAll(): Promise<IPDetectionProvider[]>;
  create(input: IPDetectionProviderCreateInput): Promise<IPDetectionProvider>;
  update(id: string, input: Partial<IPDetectionProviderCreateInput>): Promise<IPDetectionProvider>;
  delete(id: string): Promise<void>;
  incrementUsage(id: string): Promise<void>;
  resetDailyUsage(): Promise<void>;
}
