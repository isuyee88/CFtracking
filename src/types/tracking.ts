/**
 * @fileoverview Tracking 类型定义
 * @description 定义流量追踪相关类型
 * @module types/tracking
 */

export interface ClickData {
  clickId: string;
  campaignId: string;
  flowId: string | null;
  landingPageId: string | null;
  offerId: string | null;
  timestamp: string;
  ip: string;
  userAgent: string;
  referer: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  isp: string | null;
  connectionType: string | null;
  visitorId: string;
  subId1: string | null;
  subId2: string | null;
  subId3: string | null;
  subId4: string | null;
  subId5: string | null;
  cost: number;
  redirectUrl?: string | null;
  // UTM 参数
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  utmId?: string | null;
  // 设备指纹信息
  deviceFingerprint?: string | null;
  screenResolution?: string | null;
  screenColorDepth?: number | null;
  timezone?: string | null;
  timezoneOffset?: number | null;
  language?: string | null;
  languages?: string | null;
  platform?: string | null;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  touchSupport?: number | null;
  cookieEnabled?: boolean | null;
  doNotTrack?: string | null;
  // Cloudflare 特定信息
  cfRayId?: string | null;
  cfConnectingIP?: string | null;
  cfIPCountry?: string | null;
  cfIsEUCountry?: boolean;
  cfASN?: number | null;
  cfASOrganization?: string | null;
  cfColo?: string | null;
  cfLatitude?: string | null;
  cfLongitude?: string | null;
  cfPostalCode?: string | null;
  cfMetroCode?: string | null;
  cfTimezone?: string | null;
  cfContinent?: string | null;
  cfHTTPProtocol?: string | null;
  cfTLSVersion?: string | null;
  cfTLSCipher?: string | null;
  cfTLSClientRandom?: string | null;
  cfTLSClientHelloLength?: string | null;
  cfTLSClientCiphersSha1?: string | null;
  cfTLSClientExtensionsSha1?: string | null;
  // Bot Management
  cfBotScore?: number | null;
  cfBotVerified?: boolean;
  cfBotStaticResource?: boolean;
  cfBotJA3Hash?: string | null;
  cfBotJA4?: string | null;
  cfBotDetectionIds?: number[];
  cfBotJSDetectionPassed?: boolean | null;
  // TLS Client Auth
  cfTLSClientAuthCertVerified?: boolean;
  cfTLSClientAuthCertFingerprintSHA1?: string | null;
  cfTLSClientAuthCertFingerprintSHA256?: string | null;
  cfTLSClientAuthCertIssuerDN?: string | null;
  cfTLSClientAuthCertSubjectDN?: string | null;
  cfTLSClientAuthCertSerial?: string | null;
  cfTLSClientAuthCertNotBefore?: string | null;
  cfTLSClientAuthCertNotAfter?: string | null;
  cfTLSClientAuthCertRevoked?: boolean | null;
  cfTLSClientAuthCertPresented?: boolean | null;
  // 指纹和风险评估
  fingerprint?: string | null;
  riskScore?: number;
  isBot?: boolean;
  isProxy?: boolean;
  isSuspicious?: boolean;
  riskReasons?: string[];
}

export interface ConversionData {
  conversionId: string;
  clickId: string;
  campaignId: string;
  offerId: string;
  timestamp: string;
  revenue: number;
  payout: number;
  currency: string;
  conversionType: string;
  offerName: string | null;
}

export interface TrafficSummary {
  campaignId?: string;
  date?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  offerId?: string | null;
  // Dynamic dimension fields for getStatsByDimension
  [key: string]: string | number | null | undefined;
}

export interface TrackingMetrics {
  impressions: number;
  clicks: number;
  uniqueClicks?: number;
  conversions: number;
  spend: number;
  cost?: number;
  revenue: number;
  profit?: number;
  ctr: number;
  cr: number;
  cpa: number;
  cpc: number;
  cpm: number;
  roi: number;
  epc: number;
}

export interface TrackingQuery {
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  device?: string;
  browser?: string;
  offerId?: string;
  groupBy?: 'day' | 'country' | 'device' | 'browser' | 'offer';
}
