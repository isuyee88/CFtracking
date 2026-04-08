/**
 * @fileoverview 增强防欺诈服务
 * @description 实现增强的流量质量检测和防作弊功能
 * @module services/antiFraudEnhanced/antiFraudEnhanced.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  IPBlacklistEntry,
  IPBlacklistCreateInput,
  BotDetectionRule,
  BotDetectionRuleCreateInput,
  TrafficAnomalyPattern,
  TrafficAnomalyPatternCreateInput,
  FraudDetectionLog,
  EnhancedAntiFraudConfig,
  EnhancedFraudDetectionResult,
  FraudStats,
  IPCheckResult,
  BotCheckResult,
  AnomalyCheckResult,
  FraudAction,
} from '@/types/antiFraudEnhanced';
import { nanoid } from 'nanoid';
import { KV } from '@/handlers/kv';
import { IPDetectionService, createIPDetectionService } from '@/services/ipDetection/ipDetection.service';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class AntiFraudEnhancedService {
  private db: D1Database;
  private kv: KV;
  private config: EnhancedAntiFraudConfig;
  private ipDetectionService: IPDetectionService;

  constructor(env: Env) {
    this.db = getD1Connection(env);
    this.kv = new KV(env.UNIQUENESS_KV);
    this.config = this.getDefaultConfig();
    this.ipDetectionService = createIPDetectionService(env);
  }

  private getDefaultConfig(): EnhancedAntiFraudConfig {
    return {
      enabled: true,
      thresholds: {
        suspicious: 2,
        fraudulent: 4,
        block: 6
      },
      rules: {
        ipVelocity: {
          enabled: true,
          maxClicksPerMinute: 10,
          maxClicksPerHour: 100
        },
        duplicateCheck: {
          enabled: true,
          windowMinutes: 5
        },
        botDetection: {
          enabled: true,
          userAgentCheck: true,
          behaviorAnalysis: true,
          cfBotManagement: true,
          jsDetection: true
        },
        geographic: {
          enabled: false,
          blockedCountries: []
        },
        ipBlacklist: {
          enabled: true,
          action: 'block'
        },
        anomalyDetection: {
          enabled: true,
          sensitivity: 'medium'
        }
      },
      actions: {
        suspicious: 'log',
        fraudulent: 'flag',
        block: 'block'
      }
    };
  }

  async detectFraud(event: {
    id: string;
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
  }): Promise<EnhancedFraudDetectionResult> {
    if (!this.config.enabled) {
      return {
        score: 0,
        status: 'clean',
        action: 'allow',
        reasons: [],
        details: {},
        blocked: false,
        challengeRequired: false
      };
    }

    const reasons: string[] = [];
    const details: Record<string, any> = {};
    let totalScore = 0;
    let blocked = false;
    let challengeRequired = false;

    // 1. 检查 IP 黑名单
    if (this.config.rules.ipBlacklist.enabled) {
      const ipCheck = await this.checkIPBlacklist(event.ip);
      if (ipCheck.isBlacklisted) {
        reasons.push('ip_blacklisted');
        details.ipBlacklist = ipCheck;
        totalScore += 5;
        if (this.config.rules.ipBlacklist.action === 'block') {
          blocked = true;
        }
      }
    }

    // 2. 检查代理/VPN (新增)
    if (!blocked) {
      try {
        const proxyVpnCheck = await this.ipDetectionService.checkProxyVPN(event.ip);
        if (proxyVpnCheck.isProxy || proxyVpnCheck.isVpn || proxyVpnCheck.isTor || proxyVpnCheck.isDatacenter) {
          reasons.push('proxy_vpn_detected');
          details.proxyVpn = proxyVpnCheck;
          totalScore += proxyVpnCheck.score;
          if (proxyVpnCheck.score >= 5) {
            blocked = true;
          } else if (proxyVpnCheck.score >= 3) {
            challengeRequired = true;
          }
        }
      } catch (error) {
        console.error('Proxy/VPN check failed:', error);
      }
    }

    // 3. 检查 Bot
    if (this.config.rules.botDetection.enabled && !blocked) {
      const botCheck = await this.checkBot(event);
      if (botCheck.isBot || botCheck.isSuspicious) {
        reasons.push('bot_detected');
        details.botDetection = botCheck;
        totalScore += botCheck.score;
        if (botCheck.isBot && botCheck.score >= 4) {
          blocked = true;
        } else if (botCheck.isSuspicious) {
          challengeRequired = true;
        }
      }
    }

    // 4. 检查 IP 速度
    if (this.config.rules.ipVelocity.enabled && !blocked) {
      const velocityCheck = await this.checkIPVelocity(event.ip, event.timestamp);
      if (velocityCheck.fraudulent) {
        reasons.push('ip_velocity_abuse');
        details.ipVelocity = velocityCheck;
        totalScore += 3;
      } else if (velocityCheck.suspicious) {
        reasons.push('ip_velocity_suspicious');
        details.ipVelocity = velocityCheck;
        totalScore += 1;
      }
    }

    // 5. 检查异常模式
    if (this.config.rules.anomalyDetection.enabled && !blocked) {
      const anomalyCheck = await this.checkAnomaly(event);
      if (anomalyCheck.hasAnomaly) {
        reasons.push('traffic_anomaly');
        details.anomaly = anomalyCheck;
        totalScore += anomalyCheck.score;
      }
    }

    // 6. 检查地理位置
    if (this.config.rules.geographic.enabled && !blocked) {
      const geoCheck = this.checkGeographic(event);
      if (geoCheck.blocked) {
        reasons.push('geographic_blocked');
        details.geographic = geoCheck;
        totalScore += 3;
      }
    }

    // 计算最终状态和动作
    const status = this.calculateStatus(totalScore);
    const action = this.determineAction(status, blocked);

    // 记录日志
    await this.logFraudDetection({
      campaignId: event.campaignId,
      ip: event.ip,
      userAgent: event.userAgent,
      eventType: event.eventType,
      totalScore,
      status: blocked ? 'blocked' : status,
      reasons,
      details,
      botScore: event.cfBotManagement?.score ?? undefined,
      cfBotManagement: event.cfBotManagement,
      action,
      blocked
    });

    return {
      score: totalScore,
      status: blocked ? 'blocked' : status,
      action,
      reasons,
      details,
      blocked,
      challengeRequired
    };
  }

  private calculateStatus(score: number): 'clean' | 'suspicious' | 'fraudulent' {
    if (score >= this.config.thresholds.fraudulent) {
      return 'fraudulent';
    } else if (score >= this.config.thresholds.suspicious) {
      return 'suspicious';
    }
    return 'clean';
  }

  private determineAction(status: string, blocked: boolean): FraudAction {
    if (blocked) return 'block';
    if (status === 'fraudulent') return this.config.actions.fraudulent;
    if (status === 'suspicious') return this.config.actions.suspicious;
    return 'allow';
  }

  // IP 黑名单检查
  async checkIPBlacklist(ip: string): Promise<IPCheckResult> {
    const now = new Date().toISOString();
    
    const entry = await this.db
      .prepare(`
        SELECT * FROM ipBlacklist 
        WHERE (ip = ? OR ipRange IS NOT NULL AND ? LIKE ipRange || '%')
        AND (autoExpire = 0 OR expiresAt IS NULL OR expiresAt > ?)
        LIMIT 1
      `)
      .bind(ip, ip, now)
      .first<IPBlacklistEntry>();

    if (entry) {
      return {
        isBlacklisted: true,
        blacklistEntry: entry,
        riskScore: entry.severity === 'critical' ? 5 : entry.severity === 'high' ? 4 : entry.severity === 'medium' ? 2 : 1,
        reasons: [entry.reason]
      };
    }

    return {
      isBlacklisted: false,
      riskScore: 0,
      reasons: []
    };
  }

  // Bot 检测
  async checkBot(event: {
    ip: string;
    userAgent: string;
    screenResolution?: string;
    cfBotManagement?: {
      score: number | null;
      verifiedBot: boolean;
      staticResource: boolean;
      jsDetectionPassed: boolean | null;
    };
  }): Promise<BotCheckResult> {
    const matchedRules: BotDetectionRule[] = [];
    let score = 0;
    const details: Record<string, any> = {};

    // 获取启用的规则
    const rules = await this.db
      .prepare('SELECT * FROM botDetectionRules WHERE enabled = 1')
      .all<BotDetectionRule>();

    for (const rule of rules.results || []) {
      let matched = false;

      switch (rule.type) {
        case 'user_agent':
          if (rule.pattern && event.userAgent.toLowerCase().match(new RegExp(rule.pattern, 'i'))) {
            matched = true;
            details.matchedUserAgentPattern = rule.pattern;
          }
          break;

        case 'js_detection':
          if (event.cfBotManagement?.jsDetectionPassed === false) {
            matched = true;
            details.jsDetectionFailed = true;
          }
          break;

        case 'cf_bot_score':
          if (event.cfBotManagement?.score !== null && event.cfBotManagement?.score !== undefined) {
            if (rule.pattern === '<30' && event.cfBotManagement.score < 30) {
              matched = true;
              details.cfBotScore = event.cfBotManagement.score;
            } else if (rule.pattern === '30-50' && event.cfBotManagement.score >= 30 && event.cfBotManagement.score < 50) {
              matched = true;
              details.cfBotScore = event.cfBotManagement.score;
            }
          }
          break;
      }

      if (matched) {
        matchedRules.push(rule);
        score += rule.score;
      }
    }

    // 检查屏幕分辨率异常
    if (event.screenResolution) {
      if (event.screenResolution.includes('0x0') || event.screenResolution.includes('1x1')) {
        details.suspiciousScreenResolution = event.screenResolution;
        score += 1;
      }
    }

    return {
      isBot: score >= 4,
      isSuspicious: score >= 2 && score < 4,
      score,
      matchedRules,
      cfBotScore: event.cfBotManagement?.score ?? undefined,
      details
    };
  }

  // IP 速度检查
  private async checkIPVelocity(ip: string, timestamp: string): Promise<{ fraudulent: boolean; suspicious: boolean; details: any }> {
    const now = new Date(timestamp).getTime();
    const minuteWindow = now - 60 * 1000;
    const hourWindow = now - 60 * 60 * 1000;

    const key = `ip:${ip}:clicks`;
    const existingClicks = await this.kv.get<Array<{ timestamp: number }>>(key) || [];

    const recentMinuteClicks = existingClicks.filter((c: { timestamp: number }) => c.timestamp >= minuteWindow);
    const recentHourClicks = existingClicks.filter((c: { timestamp: number }) => c.timestamp >= hourWindow);

    const fraudulent = 
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour;

    const suspicious = 
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute * 0.5 ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour * 0.5;

    const updatedClicks = [...existingClicks.filter((c: { timestamp: number }) => c.timestamp >= hourWindow), { timestamp: now }];
    await this.kv.set(key, updatedClicks, 60 * 60);

    return {
      fraudulent,
      suspicious,
      details: {
        minuteClicks: recentMinuteClicks.length,
        hourClicks: recentHourClicks.length,
        maxMinuteClicks: this.config.rules.ipVelocity.maxClicksPerMinute,
        maxHourClicks: this.config.rules.ipVelocity.maxClicksPerHour
      }
    };
  }

  // 异常检测
  async checkAnomaly(event: {
    ip: string;
    campaignId: string;
    timestamp: string;
    country?: string;
    referrer?: string;
  }): Promise<AnomalyCheckResult> {
    const matchedPatterns: TrafficAnomalyPattern[] = [];
    let score = 0;
    const details: Record<string, any> = {};

    const patterns = await this.db
      .prepare('SELECT * FROM trafficAnomalyPatterns WHERE enabled = 1')
      .all<TrafficAnomalyPattern>();

    for (const pattern of patterns.results || []) {
      let matched = false;

      switch (pattern.patternType) {
        case 'velocity':
          const velocityKey = `anomaly:velocity:${event.ip}:${pattern.windowMinutes}`;
          const velocityCount = (await this.kv.get<number>(velocityKey)) || 0;
          if (velocityCount >= (pattern.conditions.minClicks || 10)) {
            matched = true;
            details.velocityCount = velocityCount;
          }
          await this.kv.set(velocityKey, velocityCount + 1, pattern.windowMinutes * 60);
          break;

        case 'referrer':
          if (pattern.conditions.requireReferrer && !event.referrer) {
            matched = true;
            details.missingReferrer = true;
          }
          break;
      }

      if (matched) {
        matchedPatterns.push(pattern);
        score += pattern.score;
      }
    }

    return {
      hasAnomaly: score > 0,
      score,
      matchedPatterns,
      details
    };
  }

  // 地理位置检查
  private checkGeographic(event: { country?: string }): { blocked: boolean; details: any } {
    if (!event.country || !this.config.rules.geographic.enabled) {
      return { blocked: false, details: {} };
    }

    const isBlocked = this.config.rules.geographic.blockedCountries.includes(event.country);
    return {
      blocked: isBlocked,
      details: {
        country: event.country,
        blockedCountries: this.config.rules.geographic.blockedCountries
      }
    };
  }

  // 记录欺诈检测日志
  private async logFraudDetection(log: {
    campaignId?: string;
    ip: string;
    userAgent?: string;
    eventType: string;
    totalScore: number;
    status: string;
    reasons: string[];
    details: Record<string, any>;
    botScore?: number;
    cfBotManagement?: any;
    action: string;
    blocked: boolean;
  }): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO fraudDetectionLogs (
          id, campaignId, ip, userAgent, eventType, totalScore, status,
          reasons, details, botScore, cfBotManagement, action, blocked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        nanoid(),
        log.campaignId || null,
        log.ip,
        log.userAgent || null,
        log.eventType,
        log.totalScore,
        log.status,
        JSON.stringify(log.reasons),
        JSON.stringify(log.details),
        log.botScore || null,
        log.cfBotManagement ? JSON.stringify(log.cfBotManagement) : null,
        log.action,
        log.blocked ? 1 : 0
      )
      .run();
  }

  // IP 黑名单管理
  async addIPToBlacklist(input: IPBlacklistCreateInput): Promise<IPBlacklistEntry> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO ipBlacklist (
          id, ip, ipRange, reason, source, severity, autoExpire, expiresAt, notes, createdBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        input.ip,
        input.ipRange || null,
        input.reason || 'manual',
        input.source || 'manual',
        input.severity || 'high',
        input.autoExpire ? 1 : 0,
        input.expiresAt || null,
        input.notes || null,
        input.createdBy || null,
        now,
        now
      )
      .run();

    return (await this.db.prepare('SELECT * FROM ipBlacklist WHERE id = ?').bind(id).first())!;
  }

  async removeIPFromBlacklist(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM ipBlacklist WHERE id = ?').bind(id).run();
  }

  async getIPBlacklist(options: { page?: number; pageSize?: number } = {}): Promise<{ list: IPBlacklistEntry[]; total: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult = await this.db.prepare('SELECT COUNT(*) as total FROM ipBlacklist').first<{ total: number }>();
    const total = countResult?.total || 0;

    const results = await this.db
      .prepare('SELECT * FROM ipBlacklist ORDER BY createdAt DESC LIMIT ? OFFSET ?')
      .bind(pageSize, offset)
      .all<IPBlacklistEntry>();

    return { list: results.results || [], total };
  }

  // Bot 检测规则管理
  async addBotDetectionRule(input: BotDetectionRuleCreateInput): Promise<BotDetectionRule> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO botDetectionRules (id, name, type, pattern, description, severity, score, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        input.name,
        input.type,
        input.pattern,
        input.description || null,
        input.severity || 'medium',
        input.score || 2,
        input.enabled !== false ? 1 : 0,
        now,
        now
      )
      .run();

    return (await this.db.prepare('SELECT * FROM botDetectionRules WHERE id = ?').bind(id).first())!;
  }

  async updateBotDetectionRule(id: string, input: Partial<BotDetectionRuleCreateInput>): Promise<BotDetectionRule> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) { updates.push('name = ?'); values.push(input.name); }
    if (input.type !== undefined) { updates.push('type = ?'); values.push(input.type); }
    if (input.pattern !== undefined) { updates.push('pattern = ?'); values.push(input.pattern); }
    if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description); }
    if (input.severity !== undefined) { updates.push('severity = ?'); values.push(input.severity); }
    if (input.score !== undefined) { updates.push('score = ?'); values.push(input.score); }
    if (input.enabled !== undefined) { updates.push('enabled = ?'); values.push(input.enabled ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db.prepare(`UPDATE botDetectionRules SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    return (await this.db.prepare('SELECT * FROM botDetectionRules WHERE id = ?').bind(id).first())!;
  }

  async deleteBotDetectionRule(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM botDetectionRules WHERE id = ?').bind(id).run();
  }

  async getBotDetectionRules(): Promise<BotDetectionRule[]> {
    const results = await this.db.prepare('SELECT * FROM botDetectionRules ORDER BY severity DESC, name ASC').all<BotDetectionRule>();
    return results.results || [];
  }

  // 异常模式管理
  async addAnomalyPattern(input: TrafficAnomalyPatternCreateInput): Promise<TrafficAnomalyPattern> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO trafficAnomalyPatterns (id, name, patternType, conditions, threshold, windowMinutes, severity, score, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        input.name,
        input.patternType,
        JSON.stringify(input.conditions),
        input.threshold || 0.8,
        input.windowMinutes || 60,
        input.severity || 'medium',
        input.score || 2,
        input.enabled !== false ? 1 : 0,
        now,
        now
      )
      .run();

    return (await this.db.prepare('SELECT * FROM trafficAnomalyPatterns WHERE id = ?').bind(id).first())!;
  }

  async getAnomalyPatterns(): Promise<TrafficAnomalyPattern[]> {
    const results = await this.db.prepare('SELECT * FROM trafficAnomalyPatterns ORDER BY severity DESC, name ASC').all<TrafficAnomalyPattern>();
    return results.results || [];
  }

  // 统计信息
  async getStats(startDate?: string, endDate?: string): Promise<FraudStats> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const statsResult = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as totalChecks,
          SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as clean,
          SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END) as suspicious,
          SUM(CASE WHEN status = 'fraudulent' THEN 1 ELSE 0 END) as fraudulent,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ?
      `)
      .bind(start, end)
      .first<{ totalChecks: number; clean: number; suspicious: number; fraudulent: number; blocked: number }>();

    const topReasons = await this.db
      .prepare(`
        SELECT reasons, COUNT(*) as count
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ? AND status != 'clean'
        GROUP BY reasons
        ORDER BY count DESC
        LIMIT 10
      `)
      .bind(start, end)
      .all<{ reasons: string; count: number }>();

    const topBlockedIPs = await this.db
      .prepare(`
        SELECT ip, COUNT(*) as count
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ? AND blocked = 1
        GROUP BY ip
        ORDER BY count DESC
        LIMIT 10
      `)
      .bind(start, end)
      .all<{ ip: string; count: number }>();

    return {
      totalChecks: statsResult?.totalChecks || 0,
      clean: statsResult?.clean || 0,
      suspicious: statsResult?.suspicious || 0,
      fraudulent: statsResult?.fraudulent || 0,
      blocked: statsResult?.blocked || 0,
      topReasons: (topReasons.results || []).map((r: { reasons: string; count: number }) => ({ reason: r.reasons, count: r.count })),
      topBlockedIPs: (topBlockedIPs.results || []).map((r: { ip: string; count: number }) => ({ ip: r.ip, count: r.count })),
      botDetectionStats: {
        totalBots: 0,
        verifiedBots: 0,
        suspiciousBots: 0
      }
    };
  }

  // 配置管理
  async getConfig(): Promise<EnhancedAntiFraudConfig> {
    const stored = await this.db.prepare('SELECT config FROM antiFraudSettings WHERE id = ?').bind('default').first<{ config: string }>();
    if (stored?.config) {
      try {
        this.config = JSON.parse(stored.config);
      } catch (e) {
        // 使用默认配置
      }
    }
    return this.config;
  }

  async updateConfig(config: Partial<EnhancedAntiFraudConfig>): Promise<EnhancedAntiFraudConfig> {
    this.config = {
      ...this.config,
      ...config,
      thresholds: { ...this.config.thresholds, ...(config.thresholds || {}) },
      rules: { ...this.config.rules, ...(config.rules || {}) },
      actions: { ...this.config.actions, ...(config.actions || {}) }
    };

    await this.db
      .prepare('INSERT OR REPLACE INTO antiFraudSettings (id, config, updatedAt) VALUES (?, ?, ?)')
      .bind('default', JSON.stringify(this.config), new Date().toISOString())
      .run();

    return this.config;
  }

  // 获取欺诈检测日志
  async getFraudLogs(options: {
    campaignId?: string;
    status?: string;
    ip?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ list: FraudDetectionLog[]; total: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: any[] = [];

    if (options.campaignId) {
      whereClause += ' AND campaignId = ?';
      params.push(options.campaignId);
    }
    if (options.status) {
      whereClause += ' AND status = ?';
      params.push(options.status);
    }
    if (options.ip) {
      whereClause += ' AND ip = ?';
      params.push(options.ip);
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM fraudDetectionLogs WHERE ${whereClause}`)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    const results = await this.db
      .prepare(`SELECT * FROM fraudDetectionLogs WHERE ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
      .bind(...params, pageSize, offset)
      .all<FraudDetectionLog>();

    return { list: results.results || [], total };
  }
}

export function createAntiFraudEnhancedService(env: Env): AntiFraudEnhancedService {
  return new AntiFraudEnhancedService(env);
}
