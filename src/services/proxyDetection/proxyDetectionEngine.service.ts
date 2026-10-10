/**
 * @fileoverview 代理检测规则引擎
 * @description 多维度检测、规则匹配、威胁分数计算、处置动作执行
 * @module services/proxyDetection/proxyDetectionEngine.service
 * 
 * 核心策略（从严处理）:
 * 1. ISP关键词黑名单 - 直接拦截
 * 2. ASN黑名单 - 直接拦截或挑战
 * 3. IP信誉API - 按分数处理
 * 4. 地理位置风险 - 按配置处理
 * 5. 行为分析 - 动态调整
 * 
 * 威胁分数权重:
 * - IP信誉API: 40%
 * - ASN检测: 25%
 * - ISP关键词: 20%
 * - 地理位置: 10%
 * - 行为分析: 5%
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import { KV } from '@/handlers/kv';
import { TrafficFilterService, createTrafficFilterService } from '../ipDetection/trafficFilter.service';

export interface DetectionResult {
  ip: string;
  isp: string | null;
  asn: number | null;
  asOrganization: string | null;
  country: string | null;
  
  // IP黑白名单
  ipBlacklisted: boolean;
  ipWhitelisted: boolean;
  
  // UA黑白名单
  uaBlacklisted: boolean;
  uaWhitelisted: boolean;
  
  // 设备指纹黑白名单
  fingerprintBlacklisted: boolean;
  fingerprintWhitelisted: boolean;
  
  // ISP关键词黑白名单
  ispBlacklisted: boolean;
  ispWhitelisted: boolean;
  
  // ASN黑白名单
  asnBlacklisted: boolean;
  asnGreylisted: boolean;
  asnWhitelisted: boolean;
  
  // 国家黑白名单
  countryBlacklisted: boolean;
  countryWhitelisted: boolean;
  countryGreylisted: boolean;
  
  ipReputationScore: number;
  geoRiskLevel: 'low' | 'medium' | 'high';
  behaviorRiskLevel: 'low' | 'medium' | 'high';
  userAgentRiskLevel: 'low' | 'medium' | 'high';
  
  threatScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  
  detectionMethods: string[];
  matchedKeyword?: string;
}

export interface RuleMatchResult {
  matched: boolean;
  ruleId?: number;
  ruleName?: string;
  action: 'ALLOW' | 'CHALLENGE' | 'MARK' | 'BLOCK' | 'REDIRECT';
  actionConfig?: Record<string, any>;
  reason: string;
}

export interface DetectionRule {
  id: number;
  rule_name: string;
  rule_description: string | null;
  detection_type: string;
  detection_operator: string;
  detection_value: string;
  logic_operator: string;
  parent_rule_id: number | null;
  priority: number;
  action: string;
  action_config: string | null;
  enabled: number;
  tags: string | null;
  hit_count: number;
  last_hit_at: string | null;
}

export interface ProxyDetectionConfig {
  enabled: boolean;
  mode: 'monitor' | 'enforce';
  turnstile: {
    enabled: boolean;
    siteKey: string;
    secretKey: string;
    trustDuration: number;
    maxRetryCount: number;
  };
  defaultPolicy: {
    lowRiskAction: 'ALLOW';
    mediumRiskAction: 'CHALLENGE';
    highRiskAction: 'BLOCK';
    riskThresholds: { low: number; high: number };
  };
  whitelist: {
    ips: string[];
    asns: number[];
    isps: string[];
    countries: string[];
  };
}

const DEFAULT_CONFIG: ProxyDetectionConfig = {
  enabled: true,
  mode: 'monitor',
  turnstile: {
    enabled: true,
    siteKey: '',
    secretKey: '',
    trustDuration: 604800,
    maxRetryCount: 3,
  },
  defaultPolicy: {
    lowRiskAction: 'ALLOW',
    mediumRiskAction: 'CHALLENGE',
    highRiskAction: 'BLOCK',
    riskThresholds: { low: 30, high: 70 },
  },
  whitelist: {
    ips: [],
    asns: [],
    isps: [],
    countries: [],
  },
};

export class ProxyDetectionEngine {
  private db: D1Database;
  private kv: KV;
  private trafficFilter: TrafficFilterService;
  private rulesCache: DetectionRule[] = [];
  private lastCacheUpdate: number = 0;
  private cacheTTL: number = 3600;

  constructor(env: Env) {
    this.db = env.DB;
    this.kv = new KV(env.UNIQUENESS_KV);
    this.trafficFilter = createTrafficFilterService(env);
  }

  /**
   * 执行代理检测
   */
  async detect(
    ip: string,
    userAgent: string,
    cfInfo: { asn: number | null; asOrganization: string | null; country: string | null },
    fingerprint?: string
  ): Promise<{ action: string; result: DetectionResult }> {
    // Step 1: 检查信任状态
    const isTrusted = await this.checkTrustState(ip, userAgent, fingerprint);
    if (isTrusted) {
      return {
        action: 'ALLOW',
        result: this.createTrustedResult(ip, cfInfo),
      };
    }

    // Step 2: 检查白名单（配置文件中的白名单）
    const config = await this.getConfig();
    if (this.isInWhitelist(ip, cfInfo, config.whitelist)) {
      return {
        action: 'ALLOW',
        result: this.createWhitelistedResult(ip, cfInfo),
      };
    }

    // Step 3: 执行检测（包含数据库黑白名单检测）
    const detections = await this.runDetections(ip, cfInfo, userAgent, fingerprint);

    // Step 4: 计算威胁分数
    const threatScore = this.calculateThreatScore(detections);

    // Step 5: 匹配规则
    const ruleMatch = await this.matchRules(detections, threatScore);

    // Step 6: 返回处置动作
    const result: DetectionResult = {
      ...detections,
      threatScore,
      riskLevel: this.getRiskLevel(threatScore),
      confidence: this.calculateConfidence(detections),
      detectionMethods: this.getDetectionMethods(detections),
    };

    return {
      action: ruleMatch.action,
      result,
    };
  }

  /**
   * 检查信任状态
   */
  private async checkTrustState(ip: string, userAgent: string, fingerprint?: string): Promise<boolean> {
    const uaHash = await this.hashUserAgent(userAgent);
    const cacheKey = fingerprint 
      ? `trust:${ip}:${uaHash}:${fingerprint.substring(0, 16)}`
      : `trust:${ip}:${uaHash}`;
    const trustState = await this.kv.get(cacheKey);
    return !!trustState;
  }

  /**
   * 设置信任状态
   */
  async setTrustState(ip: string, userAgent: string, fingerprint?: string, duration: number = 604800): Promise<void> {
    const uaHash = await this.hashUserAgent(userAgent);
    const cacheKey = fingerprint 
      ? `trust:${ip}:${uaHash}:${fingerprint.substring(0, 16)}`
      : `trust:${ip}:${uaHash}`;
    await this.kv.set(cacheKey, { trusted: true, timestamp: Date.now() }, duration);
  }

  /**
   * 检查白名单
   */
  private isInWhitelist(
    ip: string,
    cfInfo: { asn: number | null; asOrganization: string | null; country: string | null },
    whitelist: ProxyDetectionConfig['whitelist']
  ): boolean {
    if (whitelist.ips.includes(ip)) return true;
    if (cfInfo.asn && whitelist.asns.includes(cfInfo.asn)) return true;
    if (cfInfo.asOrganization) {
      for (const isp of whitelist.isps) {
        if (cfInfo.asOrganization.toLowerCase().includes(isp.toLowerCase())) {
          return true;
        }
      }
    }
    if (cfInfo.country && whitelist.countries.includes(cfInfo.country)) return true;
    return false;
  }

  /**
   * 执行所有检测
   */
  private async runDetections(
    ip: string,
    cfInfo: { asn: number | null; asOrganization: string | null; country: string | null },
    userAgent: string,
    fingerprint?: string
  ): Promise<Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>> {
    // Step 1: 检查IP黑白名单
    const ipListResult = await this.checkIPLists(ip);

    // Step 2: 检查UA黑白名单
    const uaListResult = await this.checkUALists(userAgent);

    // Step 3: 检查设备指纹黑白名单
    const fingerprintListResult = fingerprint ? await this.checkFingerprintLists(fingerprint) : { blacklisted: false, whitelisted: false };

    // Step 4: 检查ASN黑白名单
    const asnListResult = cfInfo.asn ? await this.checkASNLists(cfInfo.asn) : { blacklisted: false, whitelisted: false, greylisted: false };

    // Step 5: 检查国家黑白名单
    const countryListResult = cfInfo.country ? await this.checkCountryLists(cfInfo.country) : { blacklisted: false, whitelisted: false, greylisted: false };

    // Step 6: 使用 TrafficFilterService 进行 ISP 关键词检测
    const filterResult = await this.trafficFilter.filterTraffic({
      rayId: null,
      connectingIP: ip,
      ipCountry: cfInfo.country,
      isEUCountry: false,
      asn: cfInfo.asn,
      asOrganization: cfInfo.asOrganization,
      colo: null,
      country: cfInfo.country,
      city: null,
      region: null,
      regionCode: null,
      latitude: null,
      longitude: null,
      postalCode: null,
      continent: null,
      timezone: null,
      metroCode: null,
      httpProtocol: null,
      tlsVersion: null,
      tlsCipher: null,
      tlsClientAuth: null,
      tlsClientCiphersSha1: null,
      tlsClientHelloLength: null,
      tlsClientRandom: null,
      tlsClientExtensionsSha1: null,
      botManagement: null,
      headers: {},
      requestPriority: null,
      clientAcceptEncoding: null,
      userAgent: null,
    });

    // Step 7: 行为分析
    const behaviorRiskLevel = await this.analyzeBehavior(ip);

    // Step 8: User-Agent 检测
    const userAgentRiskLevel = this.analyzeUserAgent(userAgent);

    // Step 9: 地理位置风险
    const geoRiskLevel = this.analyzeGeo(cfInfo.country);

    return {
      ip,
      isp: cfInfo.asOrganization,
      asn: cfInfo.asn,
      asOrganization: cfInfo.asOrganization,
      country: cfInfo.country,
      ipBlacklisted: ipListResult.blacklisted,
      ipWhitelisted: ipListResult.whitelisted,
      uaBlacklisted: uaListResult.blacklisted,
      uaWhitelisted: uaListResult.whitelisted,
      fingerprintBlacklisted: fingerprintListResult.blacklisted,
      fingerprintWhitelisted: fingerprintListResult.whitelisted,
      ispBlacklisted: filterResult.details.ispBlacklisted,
      ispWhitelisted: filterResult.details.ispWhitelisted,
      asnBlacklisted: asnListResult.blacklisted,
      asnGreylisted: asnListResult.greylisted,
      asnWhitelisted: asnListResult.whitelisted,
      countryBlacklisted: countryListResult.blacklisted,
      countryWhitelisted: countryListResult.whitelisted,
      countryGreylisted: countryListResult.greylisted,
      ipReputationScore: 0,
      geoRiskLevel,
      behaviorRiskLevel,
      userAgentRiskLevel,
      matchedKeyword: filterResult.details.matchedKeyword,
    };
  }

  /**
   * 检查IP黑白名单
   */
  private async checkIPLists(ip: string): Promise<{ blacklisted: boolean; whitelisted: boolean }> {
    // 检查IP白名单
    const whitelistResult = await this.db
      .prepare('SELECT id FROM ip_whitelist WHERE ip_address = ? AND enabled = 1')
      .bind(ip)
      .first();

    if (whitelistResult) {
      return { blacklisted: false, whitelisted: true };
    }

    // 检查IP黑名单
    const blacklistResult = await this.db
      .prepare('SELECT id FROM ip_blacklist WHERE ip_address = ? AND enabled = 1')
      .bind(ip)
      .first();

    if (blacklistResult) {
      return { blacklisted: true, whitelisted: false };
    }

    // 检查IP段黑名单
    const rangeResult = await this.db
      .prepare('SELECT id FROM ip_blacklist WHERE ip_range IS NOT NULL AND enabled = 1')
      .all();

    if (rangeResult.results) {
      for (const row of rangeResult.results) {
        const ipRange = row.ip_range as string | undefined;
        if (ipRange && this.isIPInRange(ip, ipRange)) {
          return { blacklisted: true, whitelisted: false };
        }
      }
    }

    return { blacklisted: false, whitelisted: false };
  }

  /**
   * 检查IP是否在CIDR范围内
   */
  private isIPInRange(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      if (!range) return false;
      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);
      const mask = bits ? (0xFFFFFFFF << (32 - parseInt(bits))) >>> 0 : 0xFFFFFFFF;
      return (ipNum & mask) === (rangeNum & mask);
    } catch {
      return false;
    }
  }

  /**
   * IP地址转数字
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return 0;
    return ((parts[0] || 0) << 24) + ((parts[1] || 1) << 16) + ((parts[2] || 1) << 8) + (parts[3] || 1);
  }

  /**
   * 检查UA黑白名单
   */
  private async checkUALists(userAgent: string): Promise<{ blacklisted: boolean; whitelisted: boolean }> {
    const ua = userAgent.toLowerCase();

    // 检查UA白名单
    const whitelistResult = await this.db
      .prepare('SELECT pattern, pattern_type FROM ua_whitelist WHERE enabled = 1')
      .all<{ pattern: string; pattern_type: string }>();

    if (whitelistResult.results) {
      for (const row of whitelistResult.results) {
        if (this.matchPattern(ua, row.pattern, row.pattern_type)) {
          return { blacklisted: false, whitelisted: true };
        }
      }
    }

    // 检查UA黑名单
    const blacklistResult = await this.db
      .prepare('SELECT pattern, pattern_type FROM ua_blacklist WHERE enabled = 1')
      .all<{ pattern: string; pattern_type: string }>();

    if (blacklistResult.results) {
      for (const row of blacklistResult.results) {
        if (this.matchPattern(ua, row.pattern, row.pattern_type)) {
          return { blacklisted: true, whitelisted: false };
        }
      }
    }

    return { blacklisted: false, whitelisted: false };
  }

  /**
   * 检查设备指纹黑白名单
   */
  private async checkFingerprintLists(fingerprint: string): Promise<{ blacklisted: boolean; whitelisted: boolean }> {
    // 检查设备指纹白名单
    const whitelistResult = await this.db
      .prepare('SELECT id FROM fingerprint_whitelist WHERE fingerprint = ? AND enabled = 1')
      .bind(fingerprint)
      .first();

    if (whitelistResult) {
      return { blacklisted: false, whitelisted: true };
    }

    // 检查设备指纹黑名单
    const blacklistResult = await this.db
      .prepare('SELECT id FROM fingerprint_blacklist WHERE fingerprint = ? AND enabled = 1')
      .bind(fingerprint)
      .first();

    if (blacklistResult) {
      return { blacklisted: true, whitelisted: false };
    }

    return { blacklisted: false, whitelisted: false };
  }

  /**
   * 模式匹配
   */
  private matchPattern(text: string, pattern: string, patternType: string): boolean {
    switch (patternType) {
      case 'exact':
        return text === pattern.toLowerCase();
      case 'contains':
        return text.includes(pattern.toLowerCase());
      case 'regex':
        try {
          return new RegExp(pattern, 'i').test(text);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * 行为分析
   */
  private async analyzeBehavior(ip: string): Promise<'low' | 'medium' | 'high'> {
    const rateKey = `rate:${ip}`;
    const count = await this.kv.get<number>(rateKey) || 0;
    
    await this.kv.set(rateKey, count + 1, 60);
    
    if (count > 100) return 'high';
    if (count > 50) return 'medium';
    return 'low';
  }

  /**
   * User-Agent 分析
   */
  private analyzeUserAgent(userAgent: string): 'low' | 'medium' | 'high' {
    const ua = userAgent.toLowerCase();
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests'];
    
    for (const pattern of botPatterns) {
      if (ua.includes(pattern)) return 'high';
    }
    
    return 'low';
  }

  /**
   * 地理位置风险分析
   */
  private analyzeGeo(country: string | null): 'low' | 'medium' | 'high' {
    if (!country) return 'medium';
    
    const highRiskCountries = ['CN', 'RU', 'NG', 'BR', 'VN', 'IN'];
    const mediumRiskCountries = ['UA', 'RO', 'BG', 'ID', 'TH'];
    
    if (highRiskCountries.includes(country)) return 'high';
    if (mediumRiskCountries.includes(country)) return 'medium';
    return 'low';
  }

  /**
   * 检查国家黑白名单
   */
  private async checkCountryLists(country: string): Promise<{ blacklisted: boolean; whitelisted: boolean; greylisted: boolean }> {
    if (!country) {
      return { blacklisted: false, whitelisted: false, greylisted: false };
    }

    // 检查国家白名单
    const whitelistResult = await this.db
      .prepare('SELECT id FROM country_whitelist WHERE country_code = ? AND enabled = 1')
      .bind(country)
      .first();

    if (whitelistResult) {
      return { blacklisted: false, whitelisted: true, greylisted: false };
    }

    // 检查国家黑名单
    const blacklistResult = await this.db
      .prepare('SELECT id FROM country_blacklist WHERE country_code = ? AND enabled = 1')
      .bind(country)
      .first();

    if (blacklistResult) {
      return { blacklisted: true, whitelisted: false, greylisted: false };
    }

    // 检查国家灰名单
    const greylistResult = await this.db
      .prepare('SELECT id FROM country_greylist WHERE country_code = ? AND enabled = 1')
      .bind(country)
      .first();

    if (greylistResult) {
      return { blacklisted: false, whitelisted: false, greylisted: true };
    }

    return { blacklisted: false, whitelisted: false, greylisted: false };
  }

  /**
   * 检查ASN黑白名单
   */
  private async checkASNLists(asn: number): Promise<{ blacklisted: boolean; whitelisted: boolean; greylisted: boolean }> {
    // 检查ASN白名单
    const whitelistResult = await this.db
      .prepare('SELECT id FROM asn_whitelist WHERE asn = ? AND enabled = 1')
      .bind(asn)
      .first();

    if (whitelistResult) {
      return { blacklisted: false, whitelisted: true, greylisted: false };
    }

    // 检查ASN黑名单
    const blacklistResult = await this.db
      .prepare('SELECT id FROM asn_blacklist WHERE asn = ? AND enabled = 1')
      .bind(asn)
      .first();

    if (blacklistResult) {
      return { blacklisted: true, whitelisted: false, greylisted: false };
    }

    // 检查ASN灰名单
    const greylistResult = await this.db
      .prepare('SELECT id FROM asn_greylist WHERE asn = ? AND enabled = 1')
      .bind(asn)
      .first();

    if (greylistResult) {
      return { blacklisted: false, whitelisted: false, greylisted: true };
    }

    return { blacklisted: false, whitelisted: false, greylisted: false };
  }

  /**
   * 计算威胁分数（从严处理，不使用权重）
   * 策略：黑名单直接拦截，白名单直接放行，无中间状态
   */
  private calculateThreatScore(detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>): number {
    // ========== 黑名单检测（从严处理，任何命中直接返回100）==========
    
    // IP黑名单
    if (detections.ipBlacklisted) {
      return 100;
    }

    // 设备指纹黑名单
    if (detections.fingerprintBlacklisted) {
      return 100;
    }

    // UA黑名单
    if (detections.uaBlacklisted) {
      return 100;
    }

    // ISP黑名单关键词
    if (detections.ispBlacklisted) {
      return 100;
    }

    // ASN黑名单
    if (detections.asnBlacklisted) {
      return 100;
    }

    // 国家黑名单
    if (detections.countryBlacklisted) {
      return 100;
    }

    // ========== 白名单检测（任何命中直接返回0）==========
    
    if (
      detections.ipWhitelisted ||
      detections.fingerprintWhitelisted ||
      detections.uaWhitelisted ||
      detections.ispWhitelisted ||
      detections.asnWhitelisted ||
      detections.countryWhitelisted
    ) {
      return 0;
    }

    // ========== 灰名单检测（返回50，触发挑战）==========
    
    if (detections.asnGreylisted || detections.countryGreylisted) {
      return 50;
    }

    // ========== 未知状态（返回30，标记观察）==========
    return 30;
  }

  /**
   * 匹配规则
   */
  private async matchRules(
    detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>,
    threatScore: number
  ): Promise<RuleMatchResult> {
    const rules = await this.loadRules();

    for (const rule of rules) {
      if (this.evaluateRule(rule, detections, threatScore)) {
        // 更新命中计数
        await this.updateRuleHitCount(rule.id);
        
        return {
          matched: true,
          ruleId: rule.id,
          ruleName: rule.rule_name,
          action: rule.action as RuleMatchResult['action'],
          actionConfig: rule.action_config ? JSON.parse(rule.action_config) : undefined,
          reason: `Matched rule: ${rule.rule_name}`,
        };
      }
    }

    // 无匹配规则，使用默认策略
    return this.applyDefaultPolicy(threatScore);
  }

  /**
   * 评估单个规则
   */
  private evaluateRule(
    rule: DetectionRule,
    detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>,
    threatScore: number
  ): boolean {
    const value = this.getDetectionValue(rule.detection_type, detections, threatScore);
    
    try {
      const ruleValue = JSON.parse(rule.detection_value);
      
      switch (rule.detection_operator) {
        case 'equals':
          return value === rule.detection_value;
        case 'contains':
          if (Array.isArray(ruleValue)) {
            const strValue = String(value).toLowerCase();
            return ruleValue.some((v: string) => strValue.includes(v.toLowerCase()));
          }
          return String(value).toLowerCase().includes(rule.detection_value.toLowerCase());
        case 'in_list':
          return Array.isArray(ruleValue) && ruleValue.includes(value);
        case 'greater_than':
          return Number(value) > Number(rule.detection_value);
        case 'less_than':
          return Number(value) < Number(rule.detection_value);
        case 'in_whitelist':
          if (Array.isArray(ruleValue)) {
            const strValue = String(value).toLowerCase();
            return ruleValue.some((v: string) => strValue.includes(v.toLowerCase()));
          }
          return false;
        case 'not_in_list':
          return Array.isArray(ruleValue) && !ruleValue.includes(value);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * 获取检测值
   */
  private getDetectionValue(
    detectionType: string,
    detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>,
    threatScore: number
  ): any {
    switch (detectionType) {
      case 'isp_keyword':
        return detections.isp;
      case 'asn':
        return detections.asn;
      case 'ip_reputation':
        return threatScore;
      case 'geo':
      case 'country':
        return detections.country;
      case 'behavior':
        return detections.behaviorRiskLevel;
      case 'ua':
        return detections.userAgentRiskLevel;
      default:
        return null;
    }
  }

  /**
   * 加载规则
   */
  private async loadRules(): Promise<DetectionRule[]> {
    const now = Date.now();
    
    if (this.rulesCache.length > 0 && now - this.lastCacheUpdate < this.cacheTTL * 1000) {
      return this.rulesCache;
    }

    const cached = await this.kv.get<DetectionRule[]>('proxy-detection:rules');
    if (cached) {
      this.rulesCache = cached;
      this.lastCacheUpdate = now;
      return cached;
    }

    try {
      const results = await this.db
        .prepare(`
          SELECT * FROM proxy_detection_rules 
          WHERE enabled = 1 
          ORDER BY priority ASC
        `)
        .all<DetectionRule>();

      this.rulesCache = results.results || [];
      this.lastCacheUpdate = now;

      await this.kv.set('proxy-detection:rules', this.rulesCache, this.cacheTTL);
    } catch (error) {
      console.error('Failed to load rules:', error);
    }

    return this.rulesCache;
  }

  /**
   * 更新规则命中计数
   */
  private async updateRuleHitCount(ruleId: number): Promise<void> {
    try {
      await this.db
        .prepare(`
          UPDATE proxy_detection_rules 
          SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `)
        .bind(ruleId)
        .run();
    } catch (error) {
      console.error('Failed to update rule hit count:', error);
    }
  }

  /**
   * 应用默认策略
   */
  private applyDefaultPolicy(threatScore: number): RuleMatchResult {
    const config = this.defaultPolicy;
    
    if (threatScore < config.riskThresholds.low) {
      return { matched: false, action: config.lowRiskAction, reason: 'Low risk (default policy)' };
    } else if (threatScore < config.riskThresholds.high) {
      return { matched: false, action: config.mediumRiskAction, reason: 'Medium risk (default policy)' };
    } else {
      return { matched: false, action: config.highRiskAction, reason: 'High risk (default policy)' };
    }
  }

  private defaultPolicy = DEFAULT_CONFIG.defaultPolicy;

  /**
   * 获取配置
   */
  async getConfig(): Promise<ProxyDetectionConfig> {
    const config = await this.kv.get<ProxyDetectionConfig>('proxy-detection:config');
    return config || DEFAULT_CONFIG;
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<ProxyDetectionConfig>): Promise<void> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await this.kv.set('proxy-detection:config', updated);
    
    if (config.defaultPolicy) {
      this.defaultPolicy = { ...this.defaultPolicy, ...config.defaultPolicy };
    }
  }

  /**
   * 清除规则缓存
   */
  async clearRulesCache(): Promise<void> {
    this.rulesCache = [];
    this.lastCacheUpdate = 0;
    await this.kv.delete('proxy-detection:rules');
  }

  /**
   * 获取风险等级
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 70) return 'high';
    return 'critical';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>): number {
    let methods = 0;
    if (detections.isp !== null) methods++;
    if (detections.asn !== null) methods++;
    if (detections.country !== null) methods++;
    return Math.min(methods * 25, 100);
  }

  /**
   * 获取检测方法列表
   */
  private getDetectionMethods(detections: Omit<DetectionResult, 'threatScore' | 'riskLevel' | 'confidence' | 'detectionMethods'>): string[] {
    const methods: string[] = [];
    if (detections.ipBlacklisted || detections.ipWhitelisted) methods.push('ip_list');
    if (detections.uaBlacklisted || detections.uaWhitelisted) methods.push('ua_list');
    if (detections.fingerprintBlacklisted || detections.fingerprintWhitelisted) methods.push('fingerprint_list');
    if (detections.ispBlacklisted || detections.ispWhitelisted) methods.push('isp_keyword');
    if (detections.asnBlacklisted || detections.asnGreylisted || detections.asnWhitelisted) methods.push('asn');
    if (detections.country) methods.push('geo');
    methods.push('behavior');
    methods.push('ua');
    return methods;
  }

  /**
   * 创建信任结果
   */
  private createTrustedResult(
    ip: string,
    cfInfo: { asn: number | null; asOrganization: string | null; country: string | null }
  ): DetectionResult {
    return {
      ip,
      isp: cfInfo.asOrganization,
      asn: cfInfo.asn,
      asOrganization: cfInfo.asOrganization,
      country: cfInfo.country,
      ipBlacklisted: false,
      ipWhitelisted: false,
      uaBlacklisted: false,
      uaWhitelisted: false,
      fingerprintBlacklisted: false,
      fingerprintWhitelisted: false,
      ispBlacklisted: false,
      ispWhitelisted: false,
      asnBlacklisted: false,
      asnGreylisted: false,
      asnWhitelisted: false,
      countryBlacklisted: false,
      countryWhitelisted: false,
      countryGreylisted: false,
      ipReputationScore: 0,
      geoRiskLevel: 'low',
      behaviorRiskLevel: 'low',
      userAgentRiskLevel: 'low',
      threatScore: 0,
      riskLevel: 'low',
      confidence: 100,
      detectionMethods: ['trust_cache'],
    };
  }

  /**
   * 创建白名单结果
   */
  private createWhitelistedResult(
    ip: string,
    cfInfo: { asn: number | null; asOrganization: string | null; country: string | null }
  ): DetectionResult {
    return {
      ip,
      isp: cfInfo.asOrganization,
      asn: cfInfo.asn,
      asOrganization: cfInfo.asOrganization,
      country: cfInfo.country,
      ipBlacklisted: false,
      ipWhitelisted: true,
      uaBlacklisted: false,
      uaWhitelisted: false,
      fingerprintBlacklisted: false,
      fingerprintWhitelisted: false,
      ispBlacklisted: false,
      ispWhitelisted: true,
      asnBlacklisted: false,
      asnGreylisted: false,
      asnWhitelisted: true,
      countryBlacklisted: false,
      countryWhitelisted: false,
      countryGreylisted: false,
      ipReputationScore: 0,
      geoRiskLevel: 'low',
      behaviorRiskLevel: 'low',
      userAgentRiskLevel: 'low',
      threatScore: 0,
      riskLevel: 'low',
      confidence: 100,
      detectionMethods: ['whitelist'],
    };
  }

  /**
   * 生成User-Agent哈希
   */
  private async hashUserAgent(userAgent: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userAgent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }
}

export function createProxyDetectionEngine(env: Env): ProxyDetectionEngine {
  return new ProxyDetectionEngine(env);
}
