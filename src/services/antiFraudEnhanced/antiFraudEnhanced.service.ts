/**
 * @fileoverview Enhanced anti-fraud service
 * @description Provides advanced anti-fraud checks and management APIs.
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
  EnhancedFraudDetectionEventInput,
  FraudStats,
  IPCheckResult,
  BotCheckResult,
  AnomalyCheckResult,
  FraudAction,
  BotListResult,
  GeoProfileResult,
  ArchiveImportResult,
  CloudflareSignalContext,
  HumanVerificationPublicConfig,
  HumanVerificationVerifyResult,
  HumanVerificationProvider,
} from '@/types/antiFraudEnhanced';
import { nanoid } from 'nanoid';
import { KV } from '@/handlers/kv';
import { IPDetectionService, createIPDetectionService } from '@/services/ipDetection/ipDetection.service';

interface BotListRow {
  ip: string;
  userAgent: string | null;
  hits: number;
  blockedHits: number;
  suspiciousHits: number;
  averageScore: number;
  maxScore: number;
  lastSeen: string;
}

interface GeoProfileRow {
  country: string;
  total: number;
  risky: number;
  blocked: number;
  avgScore: number;
}

interface FraudLogRow {
  id: string;
  campaignId?: string | null;
  ip: string;
  userAgent?: string | null;
  eventType: 'impression' | 'click' | 'conversion';
  totalScore: number;
  status: 'clean' | 'suspicious' | 'fraudulent' | 'blocked';
  reasons: string | string[] | null;
  details: string | Record<string, unknown> | null;
  botScore?: number | null;
  cfBotManagement?: string | Record<string, unknown> | null;
  action: FraudAction;
  blocked: number | boolean;
  timestamp: string;
  createdAt: string;
}

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class AntiFraudEnhancedService {
  private env: Env;
  private db: D1Database;
  private kv: KV;
  private config: EnhancedAntiFraudConfig;
  private ipDetectionService: IPDetectionService;

  constructor(env: Env) {
    this.env = env;
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
        block: 6,
      },
      rules: {
        ipVelocity: {
          enabled: true,
          maxClicksPerMinute: 10,
          maxClicksPerHour: 100,
        },
        duplicateCheck: {
          enabled: true,
          windowMinutes: 5,
        },
        botDetection: {
          enabled: true,
          userAgentCheck: true,
          behaviorAnalysis: true,
          cfBotManagement: true,
          jsDetection: true,
        },
        geographic: {
          enabled: false,
          blockedCountries: [],
        },
        ipBlacklist: {
          enabled: true,
          action: 'block',
        },
        anomalyDetection: {
          enabled: true,
          sensitivity: 'medium',
        },
      },
      actions: {
        suspicious: 'log',
        fraudulent: 'flag',
        block: 'block',
      },
      humanVerification: {
        enabled: false,
        provider: 'turnstile',
        mode: 'managed',
        tokenField: 'cf-turnstile-response',
        onSuspicious: true,
        onFraudulent: true,
        bypassVerifiedBots: true,
        failOpen: true,
        scoreThreshold: 0.5,
      },
    };
  }

  private mergeConfig(partial?: Partial<EnhancedAntiFraudConfig>): EnhancedAntiFraudConfig {
    const defaults = this.getDefaultConfig();
    const source = partial || {};

    return {
      ...defaults,
      ...source,
      thresholds: {
        ...defaults.thresholds,
        ...(source.thresholds || {}),
      },
      rules: {
        ...defaults.rules,
        ...(source.rules || {}),
        ipVelocity: {
          ...defaults.rules.ipVelocity,
          ...(source.rules?.ipVelocity || {}),
        },
        duplicateCheck: {
          ...defaults.rules.duplicateCheck,
          ...(source.rules?.duplicateCheck || {}),
        },
        botDetection: {
          ...defaults.rules.botDetection,
          ...(source.rules?.botDetection || {}),
        },
        geographic: {
          ...defaults.rules.geographic,
          ...(source.rules?.geographic || {}),
        },
        ipBlacklist: {
          ...defaults.rules.ipBlacklist,
          ...(source.rules?.ipBlacklist || {}),
        },
        anomalyDetection: {
          ...defaults.rules.anomalyDetection,
          ...(source.rules?.anomalyDetection || {}),
        },
      },
      actions: {
        ...defaults.actions,
        ...(source.actions || {}),
      },
      humanVerification: {
        ...defaults.humanVerification,
        ...(source.humanVerification || {}),
      },
    };
  }

  async detectFraud(event: EnhancedFraudDetectionEventInput): Promise<EnhancedFraudDetectionResult> {
    return this.evaluateFraud(event, { persist: true, updateRealtimeCounters: true });
  }

  async simulateFraud(event: EnhancedFraudDetectionEventInput): Promise<EnhancedFraudDetectionResult> {
    return this.evaluateFraud(event, { persist: false, updateRealtimeCounters: false });
  }

  private async evaluateFraud(
    rawEvent: EnhancedFraudDetectionEventInput,
    options: { persist: boolean; updateRealtimeCounters: boolean }
  ): Promise<EnhancedFraudDetectionResult> {
    const event = this.normalizeEventInput(rawEvent);

    if (!this.config.enabled) {
      return {
        score: 0,
        status: 'clean',
        action: 'allow',
        reasons: [],
        details: {},
        blocked: false,
        challengeRequired: false,
      };
    }

    const reasons: string[] = [];
    const details: Record<string, unknown> = {};
    let totalScore = 0;
    let blocked = false;
    let challengeRequired = false;
    const eventCountry = event.country || event.cloudflare?.country || undefined;

    details.eventContext = {
      id: event.id || null,
      campaignId: event.campaignId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      country: eventCountry || null,
      city: event.city || event.cloudflare?.city || null,
      ip: event.ip,
    };

    if (event.cloudflare) {
      details.cloudflareSignals = this.sanitizeCloudflareSignals(event.cloudflare);
    }

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

    if (!blocked) {
      try {
        const proxyVpnCheck = await this.ipDetectionService.checkProxyVPN(event.ip);
        if (proxyVpnCheck.isProxy || proxyVpnCheck.isVpn || proxyVpnCheck.isTor || proxyVpnCheck.isDatacenter) {
          reasons.push('proxy_vpn_detected');
          const weightedProxyRisk = this.normalizeRiskToRuleScore(proxyVpnCheck.score);
          details.proxyVpn = {
            ...proxyVpnCheck,
            weightedRisk: weightedProxyRisk,
          };
          totalScore += weightedProxyRisk;
          if (weightedProxyRisk >= 4) {
            blocked = true;
          } else if (weightedProxyRisk >= 2) {
            challengeRequired = true;
          }
        }
      } catch (err) {
        console.error('Proxy/VPN check failed:', err);
      }
    }

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

    if (this.config.rules.ipVelocity.enabled && !blocked) {
      const velocityCheck = await this.checkIPVelocity(event.ip, event.timestamp, options.updateRealtimeCounters);
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

    if (this.config.rules.anomalyDetection.enabled && !blocked) {
      const anomalyCheck = await this.checkAnomaly(event, options.updateRealtimeCounters);
      if (anomalyCheck.hasAnomaly) {
        reasons.push('traffic_anomaly');
        details.anomaly = anomalyCheck;
        totalScore += anomalyCheck.score;
      }
    }

    if (this.config.rules.geographic.enabled && !blocked) {
      const geoCheck = this.checkGeographic({ country: eventCountry });
      if (geoCheck.blocked) {
        reasons.push('geographic_blocked');
        details.geographic = geoCheck;
        totalScore += 3;
      }
    }

    const status = this.calculateStatus(totalScore);
    let action = this.determineAction(status, blocked);

    if (this.config.humanVerification.enabled && !blocked) {
      const shouldChallenge =
        (status === 'suspicious' && this.config.humanVerification.onSuspicious) ||
        (status === 'fraudulent' && this.config.humanVerification.onFraudulent);
      const bypassForVerifiedBots =
        this.config.humanVerification.bypassVerifiedBots && event.cfBotManagement?.verifiedBot === true;

      if (shouldChallenge && !bypassForVerifiedBots) {
        challengeRequired = true;
        reasons.push('human_verification_required');
        details.humanVerification = {
          provider: this.config.humanVerification.provider,
          mode: this.config.humanVerification.mode,
          tokenField: this.config.humanVerification.tokenField,
        };
        action = 'challenge';
      }
    }

    if (options.persist) {
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
        blocked,
      });
    }

    return {
      score: totalScore,
      status: blocked ? 'blocked' : status,
      action,
      reasons,
      details,
      blocked,
      challengeRequired,
    };
  }

  private normalizeEventInput(event: EnhancedFraudDetectionEventInput): EnhancedFraudDetectionEventInput {
    return {
      ...event,
      id: event.id || nanoid(),
      timestamp: event.timestamp || new Date().toISOString(),
      url: event.url || '',
      userAgent: event.userAgent || 'unknown',
      eventType: event.eventType || 'click',
    };
  }

  private normalizeRiskToRuleScore(rawScore: number): number {
    if (!Number.isFinite(rawScore) || rawScore <= 0) {
      return 0;
    }
    return Math.max(1, Math.min(5, Math.round(rawScore / 20)));
  }

  private sanitizeCloudflareSignals(signal: CloudflareSignalContext): CloudflareSignalContext {
    return {
      rayId: signal.rayId || null,
      asn: signal.asn ?? null,
      asOrganization: signal.asOrganization || null,
      colo: signal.colo || null,
      country: signal.country || null,
      city: signal.city || null,
      region: signal.region || null,
      timezone: signal.timezone || null,
      httpProtocol: signal.httpProtocol || null,
      tlsVersion: signal.tlsVersion || null,
      tlsCipher: signal.tlsCipher || null,
      tlsClientCiphersSha1: signal.tlsClientCiphersSha1 || null,
      tlsClientExtensionsSha1: signal.tlsClientExtensionsSha1 || null,
      isEUCountry: Boolean(signal.isEUCountry),
      requestPriority: signal.requestPriority || null,
    };
  }

  private calculateStatus(score: number): 'clean' | 'suspicious' | 'fraudulent' {
    if (score >= this.config.thresholds.fraudulent) {
      return 'fraudulent';
    }
    if (score >= this.config.thresholds.suspicious) {
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

  async checkIPBlacklist(ip: string): Promise<IPCheckResult> {
    const now = new Date().toISOString();

    const entry = await this.db
      .prepare(
        `
        SELECT * FROM ipBlacklist
        WHERE (ip = ? OR ipRange IS NOT NULL AND ? LIKE ipRange || '%')
        AND (autoExpire = 0 OR expiresAt IS NULL OR expiresAt > ?)
        LIMIT 1
      `
      )
      .bind(ip, ip, now)
      .first<IPBlacklistEntry & { autoExpire?: number | boolean }>();

    if (entry) {
      const normalized = this.normalizeIPBlacklistEntry(entry);
      return {
        isBlacklisted: true,
        blacklistEntry: normalized,
        riskScore:
          normalized.severity === 'critical' ? 5 : normalized.severity === 'high' ? 4 : normalized.severity === 'medium' ? 2 : 1,
        reasons: [normalized.reason],
      };
    }

    return {
      isBlacklisted: false,
      riskScore: 0,
      reasons: [],
    };
  }

  async checkBot(event: EnhancedFraudDetectionEventInput): Promise<BotCheckResult> {
    const matchedRules: BotDetectionRule[] = [];
    let score = 0;
    const details: Record<string, unknown> = {};

    const rawRules = await this.db
      .prepare('SELECT * FROM botDetectionRules WHERE enabled = 1')
      .all<(BotDetectionRule & { enabled: number | boolean })>();
    const rules = (rawRules.results || []).map((item) => this.normalizeBotRule(item));

    for (const rule of rules) {
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

    if (event.cfBotManagement?.verifiedBot) {
      score += 2;
      details.verifiedBotTraffic = true;
    }

    if (event.cloudflare?.asOrganization) {
      const asnOrg = event.cloudflare.asOrganization.toLowerCase();
      if (/vpn|proxy|hosting|datacenter|cloud|vps/.test(asnOrg)) {
        score += 2;
        details.suspiciousAsnOrganization = event.cloudflare.asOrganization;
      }
    }

    if (!event.cloudflare?.tlsClientCiphersSha1 || !event.cloudflare?.tlsClientExtensionsSha1) {
      score += 1;
      details.missingTlsFingerprint = true;
    }

    if (event.cloudflare?.httpProtocol && /HTTP\/1\.0/i.test(event.cloudflare.httpProtocol)) {
      score += 1;
      details.legacyHttpProtocol = event.cloudflare.httpProtocol;
    }

    if (event.screenResolution && (event.screenResolution.includes('0x0') || event.screenResolution.includes('1x1'))) {
      score += 1;
      details.suspiciousScreenResolution = event.screenResolution;
    }

    return {
      isBot: score >= 4,
      isSuspicious: score >= 2 && score < 4,
      score,
      matchedRules,
      cfBotScore: event.cfBotManagement?.score ?? undefined,
      details,
    };
  }

  private async checkIPVelocity(
    ip: string,
    timestamp: string,
    updateRealtimeCounters: boolean
  ): Promise<{ fraudulent: boolean; suspicious: boolean; details: Record<string, unknown> }> {
    const now = new Date(timestamp).getTime();
    const minuteWindow = now - 60 * 1000;
    const hourWindow = now - 60 * 60 * 1000;
    const key = `ip:${ip}:clicks`;
    const existingClicks = (await this.kv.get<Array<{ timestamp: number }>>(key)) || [];
    const recentMinuteClicks = existingClicks.filter((click) => click.timestamp >= minuteWindow);
    const recentHourClicks = existingClicks.filter((click) => click.timestamp >= hourWindow);

    const fraudulent =
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour;
    const suspicious =
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute * 0.5 ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour * 0.5;

    if (updateRealtimeCounters) {
      const updatedClicks = [...existingClicks.filter((click) => click.timestamp >= hourWindow), { timestamp: now }];
      await this.kv.set(key, updatedClicks, 60 * 60);
    }

    return {
      fraudulent,
      suspicious,
      details: {
        minuteClicks: recentMinuteClicks.length,
        hourClicks: recentHourClicks.length,
        maxMinuteClicks: this.config.rules.ipVelocity.maxClicksPerMinute,
        maxHourClicks: this.config.rules.ipVelocity.maxClicksPerHour,
      },
    };
  }

  async checkAnomaly(
    event: {
      ip: string;
      campaignId: string;
      timestamp: string;
      country?: string;
      referrer?: string;
    },
    updateRealtimeCounters: boolean = true
  ): Promise<AnomalyCheckResult> {
    const matchedPatterns: TrafficAnomalyPattern[] = [];
    let score = 0;
    const details: Record<string, unknown> = {};

    const rawPatterns = await this.db
      .prepare('SELECT * FROM trafficAnomalyPatterns WHERE enabled = 1')
      .all<(TrafficAnomalyPattern & { conditions: string | Record<string, unknown>; enabled: number | boolean })>();
    const patterns = (rawPatterns.results || []).map((item) => this.normalizeAnomalyPattern(item));

    for (const pattern of patterns) {
      let matched = false;
      const conditions = pattern.conditions || {};

      switch (pattern.patternType) {
        case 'velocity': {
          const velocityKey = `anomaly:velocity:${event.ip}:${pattern.windowMinutes}`;
          const velocityCount = (await this.kv.get<number>(velocityKey)) || 0;
          const minClicks = Number(conditions.minClicks || 10);
          if (velocityCount >= minClicks) {
            matched = true;
            details.velocityCount = velocityCount;
          }
          if (updateRealtimeCounters) {
            await this.kv.set(velocityKey, velocityCount + 1, pattern.windowMinutes * 60);
          }
          break;
        }
        case 'referrer':
          if (Boolean(conditions.requireReferrer) && !event.referrer) {
            matched = true;
            details.missingReferrer = true;
          }
          break;
        case 'geo': {
          const blockedCountries = Array.isArray(conditions.blockedCountries)
            ? conditions.blockedCountries.map((item) => String(item).toUpperCase())
            : [];
          if (event.country && blockedCountries.includes(String(event.country).toUpperCase())) {
            matched = true;
            details.blockedCountryPatternMatched = event.country;
          }
          break;
        }
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
      details,
    };
  }

  private checkGeographic(event: { country?: string }): { blocked: boolean; details: Record<string, unknown> } {
    if (!event.country || !this.config.rules.geographic.enabled) {
      return { blocked: false, details: {} };
    }

    const isBlocked = this.config.rules.geographic.blockedCountries.includes(event.country);
    return {
      blocked: isBlocked,
      details: {
        country: event.country,
        blockedCountries: this.config.rules.geographic.blockedCountries,
      },
    };
  }

  private async logFraudDetection(log: {
    campaignId?: string;
    ip: string;
    userAgent?: string;
    eventType: string;
    totalScore: number;
    status: string;
    reasons: string[];
    details: Record<string, unknown>;
    botScore?: number;
    cfBotManagement?: unknown;
    action: string;
    blocked: boolean;
  }): Promise<void> {
    await this.db
      .prepare(
        `
        INSERT INTO fraudDetectionLogs (
          id, campaignId, ip, userAgent, eventType, totalScore, status,
          reasons, details, botScore, cfBotManagement, action, blocked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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

  async addIPToBlacklist(input: IPBlacklistCreateInput): Promise<IPBlacklistEntry> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `
        INSERT INTO ipBlacklist (
          id, ip, ipRange, reason, source, severity, autoExpire, expiresAt, notes, createdBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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

    const row = await this.db.prepare('SELECT * FROM ipBlacklist WHERE id = ?').bind(id).first<IPBlacklistEntry & { autoExpire?: number | boolean }>();
    if (!row) {
      throw new Error('Failed to create IP blacklist entry');
    }
    return this.normalizeIPBlacklistEntry(row);
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

    const result = await this.db
      .prepare('SELECT * FROM ipBlacklist ORDER BY createdAt DESC LIMIT ? OFFSET ?')
      .bind(pageSize, offset)
      .all<(IPBlacklistEntry & { autoExpire?: number | boolean })>();

    return {
      list: (result.results || []).map((item) => this.normalizeIPBlacklistEntry(item)),
      total,
    };
  }

  async addBotDetectionRule(input: BotDetectionRuleCreateInput): Promise<BotDetectionRule> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `
        INSERT INTO botDetectionRules (id, name, type, pattern, description, severity, score, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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

    const row = await this.db.prepare('SELECT * FROM botDetectionRules WHERE id = ?').bind(id).first<BotDetectionRule & { enabled: number | boolean }>();
    if (!row) {
      throw new Error('Failed to create bot detection rule');
    }
    return this.normalizeBotRule(row);
  }

  async updateBotDetectionRule(id: string, input: Partial<BotDetectionRuleCreateInput>): Promise<BotDetectionRule> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.pattern !== undefined) {
      updates.push('pattern = ?');
      values.push(input.pattern);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description || null);
    }
    if (input.severity !== undefined) {
      updates.push('severity = ?');
      values.push(input.severity);
    }
    if (input.score !== undefined) {
      updates.push('score = ?');
      values.push(input.score);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);
      await this.db.prepare(`UPDATE botDetectionRules SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    const row = await this.db.prepare('SELECT * FROM botDetectionRules WHERE id = ?').bind(id).first<BotDetectionRule & { enabled: number | boolean }>();
    if (!row) {
      throw new Error('Bot rule not found');
    }
    return this.normalizeBotRule(row);
  }

  async deleteBotDetectionRule(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM botDetectionRules WHERE id = ?').bind(id).run();
  }

  async getBotDetectionRules(): Promise<BotDetectionRule[]> {
    const results = await this.db.prepare('SELECT * FROM botDetectionRules ORDER BY severity DESC, name ASC').all<(BotDetectionRule & { enabled: number | boolean })>();
    return (results.results || []).map((item) => this.normalizeBotRule(item));
  }

  async addAnomalyPattern(input: TrafficAnomalyPatternCreateInput): Promise<TrafficAnomalyPattern> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `
        INSERT INTO trafficAnomalyPatterns (id, name, patternType, conditions, threshold, windowMinutes, severity, score, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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

    const row = await this.db
      .prepare('SELECT * FROM trafficAnomalyPatterns WHERE id = ?')
      .bind(id)
      .first<TrafficAnomalyPattern & { conditions: string | Record<string, unknown>; enabled: number | boolean }>();
    if (!row) {
      throw new Error('Failed to create anomaly pattern');
    }
    return this.normalizeAnomalyPattern(row);
  }

  async getAnomalyPatterns(): Promise<TrafficAnomalyPattern[]> {
    const result = await this.db
      .prepare('SELECT * FROM trafficAnomalyPatterns ORDER BY severity DESC, name ASC')
      .all<(TrafficAnomalyPattern & { conditions: string | Record<string, unknown>; enabled: number | boolean })>();
    return (result.results || []).map((item) => this.normalizeAnomalyPattern(item));
  }

  async getStats(startDate?: string, endDate?: string): Promise<FraudStats> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const statsResult = await this.db
      .prepare(
        `
        SELECT
          COUNT(*) as totalChecks,
          SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as clean,
          SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END) as suspicious,
          SUM(CASE WHEN status = 'fraudulent' THEN 1 ELSE 0 END) as fraudulent,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ?
      `
      )
      .bind(start, end)
      .first<{ totalChecks: number; clean: number; suspicious: number; fraudulent: number; blocked: number }>();

    const reasonRows = await this.db
      .prepare(
        `
        SELECT reasons
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ? AND status != 'clean'
      `
      )
      .bind(start, end)
      .all<{ reasons: string | string[] | null }>();

    const reasonCount = new Map<string, number>();
    for (const row of reasonRows.results || []) {
      const parsedReasons = this.parseJsonField<string[]>(row.reasons, []);
      for (const item of parsedReasons) {
        const key = String(item || '').trim();
        if (!key) continue;
        reasonCount.set(key, (reasonCount.get(key) || 0) + 1);
      }
    }

    const topBlockedIPs = await this.db
      .prepare(
        `
        SELECT ip, COUNT(*) as count
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ? AND blocked = 1
        GROUP BY ip
        ORDER BY count DESC
        LIMIT 10
      `
      )
      .bind(start, end)
      .all<{ ip: string; count: number }>();

    const botRows = await this.db
      .prepare(
        `
        SELECT status, cfBotManagement
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ? AND (reasons LIKE '%bot_detected%' OR botScore IS NOT NULL)
      `
      )
      .bind(start, end)
      .all<{ status: string; cfBotManagement: string | null }>();

    let verifiedBots = 0;
    let suspiciousBots = 0;
    for (const row of botRows.results || []) {
      if (['suspicious', 'fraudulent', 'blocked'].includes(row.status)) {
        suspiciousBots += 1;
      }
      const cfMeta = this.parseJsonField<Record<string, unknown>>(row.cfBotManagement, {});
      if (cfMeta && cfMeta.verifiedBot === true) {
        verifiedBots += 1;
      }
    }

    const topReasons = [...reasonCount.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      totalChecks: statsResult?.totalChecks || 0,
      clean: statsResult?.clean || 0,
      suspicious: statsResult?.suspicious || 0,
      fraudulent: statsResult?.fraudulent || 0,
      blocked: statsResult?.blocked || 0,
      topReasons,
      topBlockedIPs: (topBlockedIPs.results || []).map((item) => ({ ip: item.ip, count: item.count })),
      botDetectionStats: {
        totalBots: (botRows.results || []).length,
        verifiedBots,
        suspiciousBots,
      },
    };
  }

  async getConfig(): Promise<EnhancedAntiFraudConfig> {
    const stored = await this.db.prepare('SELECT config FROM antiFraudSettings WHERE id = ?').bind('default').first<{ config: string }>();
    if (stored?.config) {
      try {
        this.config = this.mergeConfig(JSON.parse(stored.config) as Partial<EnhancedAntiFraudConfig>);
      } catch {
        // Fallback to in-memory defaults.
        this.config = this.mergeConfig();
      }
    } else {
      this.config = this.mergeConfig(this.config);
    }
    return this.config;
  }

  async updateConfig(config: Partial<EnhancedAntiFraudConfig>): Promise<EnhancedAntiFraudConfig> {
    this.config = this.mergeConfig({
      ...this.config,
      ...config,
    });

    await this.db
      .prepare('INSERT OR REPLACE INTO antiFraudSettings (id, config, updatedAt) VALUES (?, ?, ?)')
      .bind('default', JSON.stringify(this.config), new Date().toISOString())
      .run();

    return this.config;
  }

  async getHumanVerificationConfig(): Promise<HumanVerificationPublicConfig> {
    const cfg = (await this.getConfig()).humanVerification;
    return {
      ...cfg,
      siteKey: this.resolveSiteKey(cfg.provider),
    };
  }

  async updateHumanVerificationConfig(
    config: Partial<EnhancedAntiFraudConfig['humanVerification']>
  ): Promise<HumanVerificationPublicConfig> {
    await this.updateConfig({
      humanVerification: {
        ...this.config.humanVerification,
        ...config,
      },
    });

    return this.getHumanVerificationConfig();
  }

  async verifyHumanToken(input: {
    token: string;
    remoteip?: string;
    provider?: HumanVerificationProvider;
  }): Promise<HumanVerificationVerifyResult> {
    const config = (await this.getConfig()).humanVerification;
    const provider = input.provider || config.provider;
    const token = String(input.token || '').trim();

    if (!config.enabled) {
      return {
        success: true,
        provider,
        challengeRequired: false,
        message: 'human_verification_disabled',
      };
    }

    if (!token) {
      return {
        success: false,
        provider,
        challengeRequired: true,
        errorCodes: ['missing_token'],
        message: 'Missing verification token',
      };
    }

    if (provider === 'turnstile') {
      return this.verifyTurnstileToken(token, input.remoteip);
    }

    return this.verifyRecaptchaToken(token, input.remoteip, config.scoreThreshold);
  }

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
    const params: string[] = [];

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

    const result = await this.db
      .prepare(`SELECT * FROM fraudDetectionLogs WHERE ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
      .bind(...params, pageSize, offset)
      .all<FraudLogRow>();

    return {
      list: (result.results || []).map((item) => this.normalizeFraudLog(item)),
      total,
    };
  }

  async getBotList(options: { startDate?: string; endDate?: string; limit?: number } = {}): Promise<BotListResult> {
    const start = options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = options.endDate || new Date().toISOString();
    const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));

    const rows = await this.db
      .prepare(
        `
        SELECT
          ip,
          userAgent,
          COUNT(*) as hits,
          SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blockedHits,
          SUM(CASE WHEN status IN ('suspicious', 'fraudulent', 'blocked') THEN 1 ELSE 0 END) as suspiciousHits,
          AVG(CASE WHEN botScore IS NOT NULL THEN botScore ELSE totalScore END) as averageScore,
          MAX(CASE WHEN botScore IS NOT NULL THEN botScore ELSE totalScore END) as maxScore,
          MAX(timestamp) as lastSeen
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ?
          AND (status IN ('suspicious', 'fraudulent', 'blocked') OR reasons LIKE '%bot_detected%' OR botScore IS NOT NULL)
        GROUP BY ip, userAgent
        ORDER BY blockedHits DESC, averageScore DESC, hits DESC
        LIMIT ?
      `
      )
      .bind(start, end, limit)
      .all<BotListRow>();

    const list = (rows.results || []).map((row) => {
      const userAgent = row.userAgent || 'unknown';
      return {
        ip: row.ip,
        userAgent,
        hits: Number(row.hits || 0),
        blockedHits: Number(row.blockedHits || 0),
        suspiciousHits: Number(row.suspiciousHits || 0),
        averageScore: Number((Number(row.averageScore || 0)).toFixed(2)),
        maxScore: Number(row.maxScore || 0),
        lastSeen: row.lastSeen,
        category: this.classifyBotCandidate(userAgent),
      };
    });

    const totalHits = list.reduce((sum, item) => sum + item.hits, 0);
    const blockedHits = list.reduce((sum, item) => sum + item.blockedHits, 0);
    const suspiciousHits = list.reduce((sum, item) => sum + item.suspiciousHits, 0);
    const categoryCounter = new Map<string, number>();
    for (const item of list) {
      categoryCounter.set(item.category, (categoryCounter.get(item.category) || 0) + item.hits);
    }
    const topCategory =
      [...categoryCounter.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || 'unknown';

    return {
      list,
      total: list.length,
      summary: {
        totalHits,
        blockedHits,
        suspiciousHits,
        topCategory,
      },
    };
  }

  async getGeoProfile(options: { startDate?: string; endDate?: string; top?: number; minEvents?: number } = {}): Promise<GeoProfileResult> {
    const start = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = options.endDate || new Date().toISOString();
    const top = Math.max(1, Math.min(200, Number(options.top || 30)));
    const minEvents = Math.max(1, Number(options.minEvents || 5));

    const rows = await this.db
      .prepare(
        `
        SELECT
          UPPER(
            COALESCE(
              NULLIF(json_extract(details, '$.eventContext.country'), ''),
              NULLIF(json_extract(details, '$.cloudflareSignals.country'), ''),
              'UNKNOWN'
            )
          ) as country,
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('suspicious', 'fraudulent', 'blocked') THEN 1 ELSE 0 END) as risky,
          SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked,
          AVG(totalScore) as avgScore
        FROM fraudDetectionLogs
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY country
        HAVING COUNT(*) >= ?
        ORDER BY risky DESC, total DESC
        LIMIT ?
      `
      )
      .bind(start, end, minEvents, top)
      .all<GeoProfileRow>();

    const list = (rows.results || []).map((row) => {
      const total = Number(row.total || 0);
      const risky = Number(row.risky || 0);
      const blocked = Number(row.blocked || 0);
      const avgScore = Number((Number(row.avgScore || 0)).toFixed(2));
      const riskRate = total > 0 ? risky / total : 0;
      const blockedRate = total > 0 ? blocked / total : 0;

      let recommendation: 'allow' | 'challenge' | 'block' = 'allow';
      if (riskRate >= 0.8 || blockedRate >= 0.4 || avgScore >= 4) {
        recommendation = 'block';
      } else if (riskRate >= 0.45 || avgScore >= 2.5) {
        recommendation = 'challenge';
      }

      return {
        country: row.country || 'UNKNOWN',
        total,
        risky,
        blocked,
        riskRate: Number(riskRate.toFixed(4)),
        blockedRate: Number(blockedRate.toFixed(4)),
        avgScore,
        recommendation,
      };
    });

    return {
      list,
      recommendations: {
        block: list.filter((item) => item.recommendation === 'block' && item.country !== 'UNKNOWN').map((item) => item.country),
        challenge: list
          .filter((item) => item.recommendation === 'challenge' && item.country !== 'UNKNOWN')
          .map((item) => item.country),
      },
    };
  }

  async importArchive(input: {
    type: 'ip-blacklist' | 'bot-rules';
    format?: 'json' | 'csv';
    payload?: string;
    items?: unknown[];
    createdBy?: string;
  }): Promise<ArchiveImportResult> {
    const items = this.resolveImportItems(input);

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; reason: string; value?: string }> = [];

    for (let index = 0; index < items.length; index += 1) {
      const rowNumber = index + 1;
      const item = items[index];

      try {
        if (input.type === 'ip-blacklist') {
          const normalized = this.normalizeImportedBlacklistItem(item, input.createdBy);
          if (!normalized) {
            skipped += 1;
            errors.push({ row: rowNumber, reason: 'Invalid IP blacklist record' });
            continue;
          }

          const existing = await this.db.prepare('SELECT id FROM ipBlacklist WHERE ip = ? LIMIT 1').bind(normalized.ip).first<{ id: string }>();
          if (existing?.id) {
            skipped += 1;
            continue;
          }

          await this.addIPToBlacklist(normalized);
          imported += 1;
          continue;
        }

        const normalizedRule = this.normalizeImportedBotRule(item);
        if (!normalizedRule) {
          skipped += 1;
          errors.push({ row: rowNumber, reason: 'Invalid bot rule record' });
          continue;
        }

        const existingRule = await this.db
          .prepare('SELECT id FROM botDetectionRules WHERE name = ? AND type = ? AND pattern = ? LIMIT 1')
          .bind(normalizedRule.name, normalizedRule.type, normalizedRule.pattern)
          .first<{ id: string }>();

        if (existingRule?.id) {
          skipped += 1;
          continue;
        }

        await this.addBotDetectionRule(normalizedRule);
        imported += 1;
      } catch (err) {
        failed += 1;
        errors.push({
          row: rowNumber,
          reason: err instanceof Error ? err.message : 'Import failed',
          value: typeof item === 'string' ? item : JSON.stringify(item),
        });
      }
    }

    return {
      type: input.type,
      total: items.length,
      imported,
      skipped,
      failed,
      errors,
    };
  }

  private resolveSiteKey(provider: HumanVerificationProvider): string | undefined {
    if (provider === 'turnstile') {
      return this.env.TURNSTILE_SITE_KEY || undefined;
    }
    return this.env.RECAPTCHA_SITE_KEY || undefined;
  }

  private async verifyTurnstileToken(token: string, remoteip?: string): Promise<HumanVerificationVerifyResult> {
    const secret = this.env.TURNSTILE_SECRET_KEY || '';
    if (!secret) {
      return {
        success: false,
        provider: 'turnstile',
        challengeRequired: true,
        errorCodes: ['missing_secret'],
        message: 'TURNSTILE_SECRET_KEY is not configured',
      };
    }

    try {
      const payload = new URLSearchParams({
        secret,
        response: token,
      });
      if (remoteip) {
        payload.set('remoteip', remoteip);
      }

      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });

      const data = (await response.json()) as {
        success: boolean;
        challenge_ts?: string;
        hostname?: string;
        action?: string;
        'error-codes'?: string[];
      };

      return {
        success: Boolean(data.success),
        provider: 'turnstile',
        challengeRequired: !data.success,
        hostname: data.hostname,
        challengeTs: data.challenge_ts,
        action: data.action,
        errorCodes: data['error-codes'] || [],
        message: data.success ? 'ok' : 'turnstile_verification_failed',
      };
    } catch (err) {
      return {
        success: false,
        provider: 'turnstile',
        challengeRequired: true,
        errorCodes: ['verification_failed'],
        message: err instanceof Error ? err.message : 'turnstile_request_failed',
      };
    }
  }

  private async verifyRecaptchaToken(
    token: string,
    remoteip: string | undefined,
    scoreThreshold: number
  ): Promise<HumanVerificationVerifyResult> {
    const secret = this.env.RECAPTCHA_SECRET_KEY || '';
    if (!secret) {
      return {
        success: false,
        provider: 'recaptcha',
        challengeRequired: true,
        errorCodes: ['missing_secret'],
        message: 'RECAPTCHA_SECRET_KEY is not configured',
      };
    }

    try {
      const payload = new URLSearchParams({
        secret,
        response: token,
      });
      if (remoteip) {
        payload.set('remoteip', remoteip);
      }

      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });

      const data = (await response.json()) as {
        success: boolean;
        score?: number;
        action?: string;
        hostname?: string;
        challenge_ts?: string;
        'error-codes'?: string[];
      };

      const score = Number(data.score ?? 0);
      const success = Boolean(data.success) && (Number.isFinite(score) ? score >= scoreThreshold : true);

      return {
        success,
        provider: 'recaptcha',
        challengeRequired: !success,
        score: Number.isFinite(score) ? score : undefined,
        action: data.action,
        hostname: data.hostname,
        challengeTs: data.challenge_ts,
        errorCodes: data['error-codes'] || [],
        message: success ? 'ok' : 'recaptcha_verification_failed',
      };
    } catch (err) {
      return {
        success: false,
        provider: 'recaptcha',
        challengeRequired: true,
        errorCodes: ['verification_failed'],
        message: err instanceof Error ? err.message : 'recaptcha_request_failed',
      };
    }
  }

  private normalizeIPBlacklistEntry(entry: IPBlacklistEntry & { autoExpire?: number | boolean }): IPBlacklistEntry {
    return {
      ...entry,
      autoExpire: Boolean(entry.autoExpire),
    };
  }

  private normalizeBotRule(rule: BotDetectionRule & { enabled?: number | boolean }): BotDetectionRule {
    return {
      ...rule,
      enabled: Boolean(rule.enabled),
      score: Number(rule.score || 0),
    };
  }

  private normalizeAnomalyPattern(
    pattern: TrafficAnomalyPattern & { conditions: string | Record<string, unknown>; enabled?: number | boolean }
  ): TrafficAnomalyPattern {
    return {
      ...pattern,
      conditions: this.parseJsonField<Record<string, unknown>>(pattern.conditions, {}),
      enabled: Boolean(pattern.enabled),
      score: Number(pattern.score || 0),
      threshold: Number(pattern.threshold || 0),
      windowMinutes: Number(pattern.windowMinutes || 0),
    };
  }

  private normalizeFraudLog(row: FraudLogRow): FraudDetectionLog {
    const normalizedCfBotManagement = this.parseJsonField<
      FraudDetectionLog['cfBotManagement'] | undefined
    >(row.cfBotManagement, undefined);

    return {
      id: row.id,
      campaignId: row.campaignId ?? undefined,
      ip: row.ip,
      userAgent: row.userAgent ?? undefined,
      eventType: row.eventType,
      action: row.action,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
      reasons: this.parseJsonField<string[]>(row.reasons, []),
      details: this.parseJsonField<Record<string, unknown>>(row.details, {}),
      cfBotManagement: normalizedCfBotManagement,
      blocked: row.blocked === true || row.blocked === 1,
      totalScore: Number(row.totalScore || 0),
      status: row.status,
      botScore: row.botScore === null || row.botScore === undefined ? undefined : Number(row.botScore),
    };
  }

  private parseJsonField<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === 'object') {
      return value as T;
    }

    if (typeof value !== 'string') {
      return fallback;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private classifyBotCandidate(userAgent: string): 'bot' | 'automation' | 'datacenter' | 'unknown' {
    const ua = userAgent.toLowerCase();
    if (/bot|crawler|spider|slurp|scrapy/.test(ua)) {
      return 'bot';
    }
    if (/curl|wget|python-requests|axios|node-fetch|postman|headless|selenium|playwright|puppeteer/.test(ua)) {
      return 'automation';
    }
    if (/datacenter|hosting|vps|cloud/.test(ua)) {
      return 'datacenter';
    }
    return 'unknown';
  }

  private resolveImportItems(input: {
    format?: 'json' | 'csv';
    payload?: string;
    items?: unknown[];
  }): unknown[] {
    if (Array.isArray(input.items)) {
      return input.items;
    }

    if (!input.payload) {
      return [];
    }

    const format = input.format || (input.payload.trim().startsWith('[') ? 'json' : 'csv');
    if (format === 'json') {
      try {
        const parsed = JSON.parse(input.payload);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    const lines = input.payload
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return [];
    }

    const headerLine = lines[0] || '';
    const headers = this.parseCsvLine(headerLine).map((header) => header.trim());
    return lines.slice(1).map((line) => {
      const cells = this.parseCsvLine(line);
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header] = cells[index] ?? '';
      });
      return item;
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        const isEscapedQuote = inQuotes && line[i + 1] === '"';
        if (isEscapedQuote) {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    result.push(current.trim());
    return result;
  }

  private normalizeImportedBlacklistItem(item: unknown, createdBy?: string): IPBlacklistCreateInput | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const row = item as Record<string, unknown>;
    const ip = String(row.ip || row.IP || '').trim();
    if (!ip || !this.isLikelyIp(ip)) {
      return null;
    }

    const severity = String(row.severity || 'high').toLowerCase();
    const normalizedSeverity = ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'high';
    const reason = String(row.reason || 'manual').toLowerCase();
    const normalizedReason = ['manual', 'auto_detected', 'threat_intel', 'abuse', 'spam'].includes(reason)
      ? reason
      : 'manual';
    const source = String(row.source || 'import').toLowerCase();
    const normalizedSource = ['manual', 'auto', 'api', 'import'].includes(source) ? source : 'import';
    const autoExpire = String(row.autoExpire || row.auto_expire || '').toLowerCase();

    return {
      ip,
      ipRange: String(row.ipRange || row.ip_range || '').trim() || undefined,
      reason: normalizedReason as IPBlacklistEntry['reason'],
      source: normalizedSource as IPBlacklistEntry['source'],
      severity: normalizedSeverity as IPBlacklistEntry['severity'],
      autoExpire: autoExpire === '1' || autoExpire === 'true',
      expiresAt: String(row.expiresAt || row.expires_at || '').trim() || undefined,
      notes: String(row.notes || '').trim() || undefined,
      createdBy: createdBy || String(row.createdBy || row.created_by || '').trim() || 'archive-import',
    };
  }

  private normalizeImportedBotRule(item: unknown): BotDetectionRuleCreateInput | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const row = item as Record<string, unknown>;
    const name = String(row.name || '').trim();
    const type = String(row.type || '').trim();
    const pattern = String(row.pattern || '').trim();
    if (!name || !type || !pattern) {
      return null;
    }

    const allowedTypes = ['user_agent', 'js_detection', 'cf_bot_score', 'behavior', 'custom'];
    if (!allowedTypes.includes(type)) {
      return null;
    }

    const severity = String(row.severity || 'medium').toLowerCase();
    const normalizedSeverity = ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium';
    const scoreValue = Number(row.score || 2);
    const enabledValue = String(row.enabled ?? '1').toLowerCase();

    return {
      name,
      type: type as BotDetectionRule['type'],
      pattern,
      description: String(row.description || '').trim() || undefined,
      severity: normalizedSeverity as BotDetectionRule['severity'],
      score: Number.isFinite(scoreValue) ? scoreValue : 2,
      enabled: enabledValue !== '0' && enabledValue !== 'false',
    };
  }

  private isLikelyIp(ip: string): boolean {
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    const ipv6 = /^[0-9a-f:]+$/i;
    return ipv4.test(ip) || ipv6.test(ip);
  }
}

export function createAntiFraudEnhancedService(env: Env): AntiFraudEnhancedService {
  return new AntiFraudEnhancedService(env);
}
