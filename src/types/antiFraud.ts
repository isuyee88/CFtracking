/**
 * @fileoverview 防作弊类型定义
 * @description 定义防作弊相关的类型和接口
 * @module types/antiFraud
 */

export type FraudScore = 0 | 1 | 2 | 3 | 4 | 5;
export type FraudStatus = 'clean' | 'suspicious' | 'fraudulent';
export type FraudReason = 
  | 'ip_abuse'
  | 'click_farm'
  | 'bot_traffic'
  | 'duplicate_clicks'
  | 'unusual_pattern'
  | 'geographic_anomaly'
  | 'device_fingerprint'
  | 'velocity_check';

export interface FraudDetectionResult {
  score: FraudScore;
  status: FraudStatus;
  reasons: FraudReason[];
  details: Record<string, any>;
}

export interface TrafficQualityMetrics {
  totalTraffic: number;
  cleanTraffic: number;
  suspiciousTraffic: number;
  fraudulentTraffic: number;
  cleanPercentage: number;
  suspiciousPercentage: number;
  fraudulentPercentage: number;
  topFraudReasons: Array<{ reason: FraudReason; count: number }>;
}

export interface AntiFraudConfig {
  enabled: boolean;
  thresholds: {
    suspicious: number;
    fraudulent: number;
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
    };
    geographic: {
      enabled: boolean;
      blockedCountries: string[];
    };
  };
}

export interface TrafficEvent {
  id: string;
  campaignId: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  deviceId?: string;
  eventType: 'impression' | 'click' | 'conversion';
  url: string;
  referrer?: string;
  country?: string;
  city?: string;
  region?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  language?: string;
  flowId?: string;
  landingId?: string;
  offerId?: string;
}

export interface FraudRecord {
  id: string;
  trafficEventId: string;
  campaignId: string;
  score: FraudScore;
  status: FraudStatus;
  reasons: FraudReason[];
  ip: string;
  userAgent: string;
  timestamp: string;
  details: Record<string, any>;
}
