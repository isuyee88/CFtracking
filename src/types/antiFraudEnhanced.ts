/**
 * @fileoverview 增强防欺诈类型定义
 * @description 定义增强防欺诈相关的类型和接口
 * @module types/antiFraudEnhanced
 */

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudAction = 'allow' | 'log' | 'flag' | 'challenge' | 'block';
export type BotRuleType = 'user_agent' | 'js_detection' | 'cf_bot_score' | 'behavior' | 'custom';
export type AnomalyPatternType = 'velocity' | 'conversion' | 'geo' | 'device' | 'referrer' | 'custom';

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
