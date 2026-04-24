/**
 * @fileoverview 增强防欺诈类型定义
 * @description 定义增强防欺诈相关的类型和接口
 * @module types/antiFraudEnhanced
 */

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudAction = 'allow' | 'log' | 'flag' | 'challenge' | 'block';
export type BotRuleType = 'user_agent' | 'js_detection' | 'cf_bot_score' | 'behavior' | 'custom';
export type AnomalyPatternType = 'velocity' | 'conversion' | 'geo' | 'device' | 'referrer' | 'custom';
export type HumanVerificationProvider = 'turnstile' | 'recaptcha';
export type HumanVerificationMode = 'managed' | 'invisible' | 'checkbox';

export interface IPBlacklistEntry {
  id: string;
  ip: string;
  ipRange?: string;
  reason: 'manual' | 'auto_detected' | 'threat_intel' | 'abuse' | 'spam';
  source: 'manual' | 'auto' | 'api' | 'import';
  severity: FraudSeverity;
  autoExpire: boolean;
  expiresAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPBlacklistCreateInput {
  ip: string;
  ipRange?: string;
  reason?: IPBlacklistEntry['reason'];
  source?: IPBlacklistEntry['source'];
  severity?: FraudSeverity;
  autoExpire?: boolean;
  expiresAt?: string;
  notes?: string;
  createdBy?: string;
}

export interface BotDetectionRule {
  id: string;
  name: string;
  type: BotRuleType;
  pattern: string;
  description?: string;
  severity: FraudSeverity;
  score: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotDetectionRuleCreateInput {
  name: string;
  type: BotRuleType;
  pattern: string;
  description?: string;
  severity?: FraudSeverity;
  score?: number;
  enabled?: boolean;
}

export interface TrafficAnomalyPattern {
  id: string;
  name: string;
  patternType: AnomalyPatternType;
  conditions: Record<string, any>;
  threshold: number;
  windowMinutes: number;
  severity: FraudSeverity;
  score: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrafficAnomalyPatternCreateInput {
  name: string;
  patternType: AnomalyPatternType;
  conditions: Record<string, any>;
  threshold?: number;
  windowMinutes?: number;
  severity?: FraudSeverity;
  score?: number;
  enabled?: boolean;
}

export interface FraudDetectionLog {
  id: string;
  campaignId?: string;
  ip: string;
  userAgent?: string;
  eventType: 'impression' | 'click' | 'conversion';
  totalScore: number;
  status: 'clean' | 'suspicious' | 'fraudulent' | 'blocked';
  reasons: string[];
  details: Record<string, any>;
  botScore?: number;
  cfBotManagement?: {
    score: number | null;
    verifiedBot: boolean;
    staticResource: boolean;
    jsDetectionPassed: boolean | null;
  };
  action: FraudAction;
  blocked: boolean;
  timestamp: string;
  createdAt: string;
}

export interface EnhancedAntiFraudConfig {
  enabled: boolean;
  thresholds: {
    suspicious: number;
    fraudulent: number;
    block: number;
  };
  rules: {
    ipVelocity: {
      enabled: boolean;
      maxClicksPerMinute: number;
      maxClicksPerHour: number;
    };
    duplicateCheck: {
      enabled: boolean;
      windowMinutes: number;
    };
    botDetection: {
      enabled: boolean;
      userAgentCheck: boolean;
      behaviorAnalysis: boolean;
      cfBotManagement: boolean;
      jsDetection: boolean;
    };
    geographic: {
      enabled: boolean;
      blockedCountries: string[];
    };
    ipBlacklist: {
      enabled: boolean;
      action: FraudAction;
    };
    anomalyDetection: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high';
    };
  };
  actions: {
    suspicious: FraudAction;
    fraudulent: FraudAction;
    block: FraudAction;
  };
  humanVerification: {
    enabled: boolean;
    provider: HumanVerificationProvider;
    mode: HumanVerificationMode;
    tokenField: string;
    onSuspicious: boolean;
    onFraudulent: boolean;
    bypassVerifiedBots: boolean;
    failOpen: boolean;
    scoreThreshold: number;
  };
}

export interface EnhancedFraudDetectionResult {
  score: number;
  status: 'clean' | 'suspicious' | 'fraudulent' | 'blocked';
  action: FraudAction;
  reasons: string[];
  details: Record<string, any>;
  blocked: boolean;
  challengeRequired: boolean;
}

export interface FraudStats {
  totalChecks: number;
  clean: number;
  suspicious: number;
  fraudulent: number;
  blocked: number;
  topReasons: Array<{ reason: string; count: number }>;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  botDetectionStats: {
    totalBots: number;
    verifiedBots: number;
    suspiciousBots: number;
  };
}

export interface IPCheckResult {
  isBlacklisted: boolean;
  blacklistEntry?: IPBlacklistEntry;
  riskScore: number;
  reasons: string[];
}

export interface BotCheckResult {
  isBot: boolean;
  isSuspicious: boolean;
  score: number;
  matchedRules: BotDetectionRule[];
  cfBotScore?: number;
  details: Record<string, any>;
}

export interface AnomalyCheckResult {
  hasAnomaly: boolean;
  score: number;
  matchedPatterns: TrafficAnomalyPattern[];
  details: Record<string, any>;
}

export interface CloudflareSignalContext {
  rayId?: string | null;
  asn?: number | null;
  asOrganization?: string | null;
  colo?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  httpProtocol?: string | null;
  tlsVersion?: string | null;
  tlsCipher?: string | null;
  tlsClientCiphersSha1?: string | null;
  tlsClientExtensionsSha1?: string | null;
  isEUCountry?: boolean;
  requestPriority?: string | null;
}

export interface EnhancedFraudDetectionEventInput {
  id?: string;
  campaignId: string;
  ip: string;
  userAgent: string;
  eventType: 'impression' | 'click' | 'conversion';
  url: string;
  timestamp: string;
  country?: string;
  city?: string;
  deviceType?: string;
  screenResolution?: string;
  referrer?: string;
  cfBotManagement?: {
    score: number | null;
    verifiedBot: boolean;
    staticResource: boolean;
    jsDetectionPassed: boolean | null;
  };
  cloudflare?: CloudflareSignalContext;
}

export interface BotListItem {
  ip: string;
  userAgent: string;
  hits: number;
  blockedHits: number;
  suspiciousHits: number;
  averageScore: number;
  maxScore: number;
  lastSeen: string;
  category: 'bot' | 'automation' | 'datacenter' | 'unknown';
}

export interface BotListResult {
  list: BotListItem[];
  total: number;
  summary: {
    totalHits: number;
    blockedHits: number;
    suspiciousHits: number;
    topCategory: string;
  };
}

export interface GeoProfileItem {
  country: string;
  total: number;
  risky: number;
  blocked: number;
  riskRate: number;
  blockedRate: number;
  avgScore: number;
  recommendation: 'allow' | 'challenge' | 'block';
}

export interface GeoProfileResult {
  list: GeoProfileItem[];
  recommendations: {
    block: string[];
    challenge: string[];
  };
}

export interface ArchiveImportResult {
  type: 'ip-blacklist' | 'bot-rules';
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    reason: string;
    value?: string;
  }>;
}

export interface HumanVerificationPublicConfig {
  enabled: boolean;
  provider: HumanVerificationProvider;
  mode: HumanVerificationMode;
  tokenField: string;
  onSuspicious: boolean;
  onFraudulent: boolean;
  bypassVerifiedBots: boolean;
  failOpen: boolean;
  scoreThreshold: number;
  siteKey?: string;
}

export interface HumanVerificationVerifyResult {
  success: boolean;
  provider: HumanVerificationProvider;
  challengeRequired: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challengeTs?: string;
  errorCodes?: string[];
  message?: string;
}
