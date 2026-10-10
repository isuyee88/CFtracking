/**
 * @fileoverview ASN智能过滤服务
 * @description 基于Cloudflare ASN + 第三方ASN数据库进行智能流量过滤
 * @module services/ipDetection/asnFilter.service
 * 
 * 优势:
 * 1. 成本极低 - 预建ASN库，无需频繁API调用
 * 2. 效率极高 - 一次查询覆盖整个ASN（数万个IP）
 * 3. 准确性高 - ASN信息稳定，不像IP频繁变化
 * 4. 维护简单 - 定期更新ASN库即可
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import { KV } from '@/handlers/kv';
import { nanoid } from 'nanoid';

export type ASNCategory = 'blacklist' | 'greylist' | 'whitelist' | 'unknown';
export type ASNType = 'bot' | 'datacenter' | 'vpn' | 'proxy' | 'hosting' | 'isp' | 'mobile' | 'business' | 'education' | 'government';

interface IPInfoResponse {
  asn?: string;
  org?: string;
  country?: string;
  hostname?: string;
  city?: string;
  region?: string;
  postal?: string;
  loc?: string;
}

export interface ASNInfo {
  asn: number;
  asName?: string;
  asCountry?: string;
  category: ASNCategory;
  type: ASNType;
  riskScore: number;
  hostname?: string;
  description?: string;
  source: 'builtin' | 'api' | 'manual';
  lastUpdated: string;
}

export interface ASNFilterResult {
  asn: number;
  category: ASNCategory;
  type: ASNType;
  riskScore: number;
  shouldBlock: boolean;
  shouldChallenge: boolean;
  reason: string;
  details?: ASNInfo;
}

export interface ASNBlacklistEntry {
  id: string;
  asn: number;
  asName?: string;
  category: ASNCategory;
  type: ASNType;
  riskScore: number;
  hostname?: string;
  reason: string;
  source: 'builtin' | 'api' | 'manual';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const BUILTIN_BLACKLIST_ASNS: Array<Omit<ASNBlacklistEntry, 'id' | 'createdAt' | 'updatedAt'>> = [
  // 已知Bot网络
  { asn: 16276, asName: 'OVH SAS', category: 'blacklist', type: 'bot', riskScore: 95, reason: 'Known bot network', source: 'builtin', enabled: true },
  { asn: 24940, asName: 'Hetzner Online GmbH', category: 'greylist', type: 'hosting', riskScore: 70, reason: 'Hosting provider, high bot activity', source: 'builtin', enabled: true },
  
  // 数据中心 (高概率为Bot/爬虫)
  { asn: 8075, asName: 'Microsoft Corporation', category: 'greylist', type: 'datacenter', riskScore: 60, reason: 'Datacenter - likely bots/crawlers', source: 'builtin', enabled: true },
  { asn: 15169, asName: 'Google LLC', category: 'greylist', type: 'datacenter', riskScore: 55, reason: 'Google Cloud - verify if legitimate', source: 'builtin', enabled: true },
  { asn: 16509, asName: 'Amazon.com Inc.', category: 'greylist', type: 'datacenter', riskScore: 60, reason: 'AWS - high proxy/VPN usage', source: 'builtin', enabled: true },
  { asn: 14618, asName: 'Amazon.com Inc.', category: 'greylist', type: 'datacenter', riskScore: 60, reason: 'AWS - high proxy/VPN usage', source: 'builtin', enabled: true },
  
  // VPN服务商
  { asn: 212238, asName: 'Datacamp Limited', category: 'blacklist', type: 'vpn', riskScore: 90, reason: 'VPN provider', source: 'builtin', enabled: true },
  { asn: 62041, asName: 'Private Layer', category: 'blacklist', type: 'vpn', riskScore: 90, reason: 'VPN provider', source: 'builtin', enabled: true },
  { asn: 44477, asName: 'Stark Industries', category: 'blacklist', type: 'vpn', riskScore: 90, reason: 'VPN provider', source: 'builtin', enabled: true },
  { asn: 62240, asName: 'Quadranet', category: 'blacklist', type: 'vpn', riskScore: 85, reason: 'VPN/Proxy provider', source: 'builtin', enabled: true },
  { asn: 20473, asName: 'Vultr Holdings', category: 'greylist', type: 'hosting', riskScore: 75, reason: 'VPS provider - high abuse rate', source: 'builtin', enabled: true },
  { asn: 63949, asName: 'Linode LLC', category: 'greylist', type: 'hosting', riskScore: 70, reason: 'VPS provider', source: 'builtin', enabled: true },
  { asn: 14061, asName: 'DigitalOcean', category: 'greylist', type: 'hosting', riskScore: 70, reason: 'VPS provider', source: 'builtin', enabled: true },
  
  // 代理服务商
  { asn: 9009, asName: 'M247 Ltd', category: 'blacklist', type: 'proxy', riskScore: 85, reason: 'Proxy provider', source: 'builtin', enabled: true },
  { asn: 34610, asName: 'NForce Entertainment', category: 'blacklist', type: 'proxy', riskScore: 85, reason: 'Proxy provider', source: 'builtin', enabled: true },
  { asn: 51167, asName: 'Contabo GmbH', category: 'greylist', type: 'hosting', riskScore: 70, reason: 'Budget hosting - high abuse', source: 'builtin', enabled: true },
  
  // 已知恶意ASN
  { asn: 50837, asName: 'CSL', category: 'blacklist', type: 'bot', riskScore: 95, reason: 'Known malicious ASN', source: 'builtin', enabled: true },
  { asn: 61317, asName: 'Digital Energy Technologies', category: 'blacklist', type: 'proxy', riskScore: 90, reason: 'High abuse rate', source: 'builtin', enabled: true },
];

const BUILTIN_WHITELIST_ASNS: Array<Omit<ASNBlacklistEntry, 'id' | 'createdAt' | 'updatedAt'>> = [
  // 主要ISP (家庭宽带)
  { asn: 7922, asName: 'Comcast Cable', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major US ISP', source: 'builtin', enabled: true },
  { asn: 7018, asName: 'AT&T', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major US ISP', source: 'builtin', enabled: true },
  { asn: 10796, asName: 'Time Warner Cable', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major US ISP', source: 'builtin', enabled: true },
  { asn: 20001, asName: 'Charter Communications', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major US ISP', source: 'builtin', enabled: true },
  { asn: 5650, asName: 'Frontier Communications', category: 'whitelist', type: 'isp', riskScore: 15, reason: 'US ISP', source: 'builtin', enabled: true },
  
  // 中国主要运营商
  { asn: 4134, asName: 'China Telecom', category: 'whitelist', type: 'isp', riskScore: 15, reason: 'Major China ISP', source: 'builtin', enabled: true },
  { asn: 4837, asName: 'China Unicom', category: 'whitelist', type: 'isp', riskScore: 15, reason: 'Major China ISP', source: 'builtin', enabled: true },
  { asn: 9808, asName: 'China Mobile', category: 'whitelist', type: 'mobile', riskScore: 15, reason: 'Major China Mobile', source: 'builtin', enabled: true },
  
  // 欧洲主要ISP
  { asn: 3320, asName: 'Deutsche Telekom', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major EU ISP', source: 'builtin', enabled: true },
  { asn: 3269, asName: 'Telecom Italia', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major EU ISP', source: 'builtin', enabled: true },
  { asn: 5400, asName: 'British Telecom', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major EU ISP', source: 'builtin', enabled: true },
  { asn: 3215, asName: 'Orange S.A.', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major EU ISP', source: 'builtin', enabled: true },
  
  // 日本主要ISP
  { asn: 4713, asName: 'NTT Communications', category: 'whitelist', type: 'isp', riskScore: 10, reason: 'Major Japan ISP', source: 'builtin', enabled: true },
  { asn: 17676, asName: 'SoftBank Corp', category: 'whitelist', type: 'mobile', riskScore: 10, reason: 'Major Japan Mobile', source: 'builtin', enabled: true },
  
  // CDN (需要特殊处理)
  { asn: 13335, asName: 'Cloudflare Inc', category: 'greylist', type: 'hosting', riskScore: 40, reason: 'CDN - verify actual visitor', source: 'builtin', enabled: true },
  { asn: 54113, asName: 'Fastly', category: 'greylist', type: 'hosting', riskScore: 40, reason: 'CDN - verify actual visitor', source: 'builtin', enabled: true },
];

export class ASNFilterService {
  private db: D1Database;
  private kv: KV;
  private asnCache: Map<number, ASNBlacklistEntry> = new Map();
  private initialized: boolean = false;

  constructor(env: Env) {
    this.db = env.DB;
    this.kv = new KV(env.UNIQUENESS_KV);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadBuiltinASNs();
    await this.loadCustomASNs();
    this.initialized = true;
  }

  private async loadBuiltinASNs(): Promise<void> {
    const now = new Date().toISOString();

    for (const asn of [...BUILTIN_BLACKLIST_ASNS, ...BUILTIN_WHITELIST_ASNS]) {
      const entry: ASNBlacklistEntry = {
        id: `builtin_${asn.asn}`,
        asn: asn.asn,
        asName: asn.asName,
        category: asn.category,
        type: asn.type,
        riskScore: asn.riskScore,
        hostname: asn.hostname,
        reason: asn.reason,
        source: 'builtin',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };
      this.asnCache.set(asn.asn, entry);
    }
  }

  private async loadCustomASNs(): Promise<void> {
    try {
      const results = await this.db
        .prepare('SELECT * FROM asnBlacklist WHERE enabled = 1')
        .all<ASNBlacklistEntry>();

      for (const row of results.results || []) {
        this.asnCache.set(row.asn, row);
      }
    } catch (error) {
      console.error('Failed to load custom ASNs:', error);
    }
  }

  async checkASN(asn: number): Promise<ASNFilterResult> {
    await this.initialize();

    const kvCacheKey = `asn:info:${asn}`;
    const kvCached = await this.kv.get<ASNBlacklistEntry>(kvCacheKey);
    if (kvCached) {
      return this.buildResultFromEntry(kvCached);
    }

    const cached = this.asnCache.get(asn);
    if (cached) {
      await this.kv.set(kvCacheKey, cached, 3600);
      return this.buildResultFromEntry(cached);
    }

    const unknownResult: ASNFilterResult = {
      asn,
      category: 'unknown',
      type: 'isp',
      riskScore: 30,
      shouldBlock: false,
      shouldChallenge: false,
      reason: 'Unknown ASN - needs further analysis',
    };

    return unknownResult;
  }

  private buildResultFromEntry(entry: ASNBlacklistEntry): ASNFilterResult {
    const shouldBlock = entry.category === 'blacklist' && entry.riskScore >= 80;
    const shouldChallenge = entry.category === 'greylist' || (entry.category === 'blacklist' && entry.riskScore < 80);

    const info: ASNInfo = {
      asn: entry.asn,
      asName: entry.asName,
      category: entry.category,
      type: entry.type,
      riskScore: entry.riskScore,
      hostname: entry.hostname,
      description: entry.reason,
      source: entry.source,
      lastUpdated: entry.updatedAt,
    };

    return {
      asn: entry.asn,
      category: entry.category,
      type: entry.type,
      riskScore: entry.riskScore,
      shouldBlock,
      shouldChallenge,
      reason: entry.reason || `${entry.category} ASN: ${entry.type}`,
      details: info,
    };
  }

  async addASNToBlacklist(entry: Omit<ASNBlacklistEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ASNBlacklistEntry> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO asnBlacklist (id, asn, asName, category, type, riskScore, hostname, reason, source, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(asn) DO UPDATE SET
          asName = excluded.asName,
          category = excluded.category,
          type = excluded.type,
          riskScore = excluded.riskScore,
          hostname = excluded.hostname,
          reason = excluded.reason,
          source = excluded.source,
          enabled = excluded.enabled,
          updatedAt = excluded.updatedAt
      `)
      .bind(
        id,
        entry.asn,
        entry.asName || null,
        entry.category,
        entry.type,
        entry.riskScore,
        entry.hostname || null,
        entry.reason,
        entry.source,
        entry.enabled ? 1 : 0,
        now,
        now
      )
      .run();

    const newEntry: ASNBlacklistEntry = {
      id,
      asn: entry.asn,
      asName: entry.asName,
      category: entry.category,
      type: entry.type,
      riskScore: entry.riskScore,
      hostname: entry.hostname,
      reason: entry.reason,
      source: entry.source,
      enabled: entry.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    this.asnCache.set(entry.asn, newEntry);
    await this.kv.delete(`asn:info:${entry.asn}`);

    return newEntry;
  }

  async removeASNFromBlacklist(asn: number): Promise<void> {
    await this.db.prepare('DELETE FROM asnBlacklist WHERE asn = ?').bind(asn).run();
    this.asnCache.delete(asn);
    await this.kv.delete(`asn:info:${asn}`);
  }

  async getASNInfo(asn: number): Promise<ASNBlacklistEntry | null> {
    const cached = this.asnCache.get(asn);
    if (cached) return cached;

    const result = await this.db
      .prepare('SELECT * FROM asnBlacklist WHERE asn = ?')
      .bind(asn)
      .first<ASNBlacklistEntry>();

    if (result) {
      this.asnCache.set(asn, result);
    }
    return result;
  }

  async updateASN(asn: number, updates: Partial<Omit<ASNBlacklistEntry, 'id' | 'asn' | 'createdAt' | 'updatedAt'>>): Promise<ASNBlacklistEntry | null> {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.category !== undefined) {
      setClauses.push('category = ?');
      values.push(updates.category);
    }
    if (updates.type !== undefined) {
      setClauses.push('type = ?');
      values.push(updates.type);
    }
    if (updates.riskScore !== undefined) {
      setClauses.push('riskScore = ?');
      values.push(updates.riskScore);
    }
    if (updates.reason !== undefined) {
      setClauses.push('reason = ?');
      values.push(updates.reason);
    }
    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.asName !== undefined) {
      setClauses.push('asName = ?');
      values.push(updates.asName);
    }

    if (setClauses.length === 0) {
      return this.getASNInfo(asn);
    }

    setClauses.push('updatedAt = ?');
    values.push(now);
    values.push(asn);

    await this.db
      .prepare(`UPDATE asnBlacklist SET ${setClauses.join(', ')} WHERE asn = ?`)
      .bind(...values)
      .run();

    this.asnCache.delete(asn);
    return this.getASNInfo(asn);
  }

  async getASNList(options: { category?: ASNCategory; type?: ASNType } = {}): Promise<ASNBlacklistEntry[]> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (options.category) {
      whereClause += ' AND category = ?';
      params.push(options.category);
    }
    if (options.type) {
      whereClause += ' AND type = ?';
      params.push(options.type);
    }

    const results = await this.db
      .prepare(`SELECT * FROM asnBlacklist WHERE ${whereClause} ORDER BY riskScore DESC`)
      .bind(...params)
      .all<ASNBlacklistEntry>();

    return results.results || [];
  }

  async getStats(): Promise<{
    total: number;
    byCategory: Record<ASNCategory, number>;
    byType: Record<ASNType, number>;
  }> {
    const countResult = await this.db
      .prepare('SELECT COUNT(*) as total FROM asnBlacklist WHERE enabled = 1')
      .first<{ total: number }>();

    const byCategoryResult = await this.db
      .prepare('SELECT category, COUNT(*) as count FROM asnBlacklist WHERE enabled = 1 GROUP BY category')
      .all<{ category: ASNCategory; count: number }>();

    const byTypeResult = await this.db
      .prepare('SELECT type, COUNT(*) as count FROM asnBlacklist WHERE enabled = 1 GROUP BY type')
      .all<{ type: ASNType; count: number }>();

    const byCategory: Record<ASNCategory, number> = {
      blacklist: 0,
      greylist: 0,
      whitelist: 0,
      unknown: 0,
    };

    const byType: Record<ASNType, number> = {
      bot: 0,
      datacenter: 0,
      vpn: 0,
      proxy: 0,
      hosting: 0,
      isp: 0,
      mobile: 0,
      business: 0,
      education: 0,
      government: 0,
    };

    for (const r of byCategoryResult.results || []) {
      byCategory[r.category] = r.count;
    }

    for (const r of byTypeResult.results || []) {
      byType[r.type] = r.count;
    }

    return {
      total: (countResult?.total || 0) + BUILTIN_BLACKLIST_ASNS.length + BUILTIN_WHITELIST_ASNS.length,
      byCategory,
      byType,
    };
  }

  async enrichASNInfo(asn: number, ip?: string): Promise<ASNInfo | null> {
    try {
      const response = await fetch(`https://ipinfo.io/${ip || asn}/json`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data: IPInfoResponse = await response.json();
      const now = new Date().toISOString();

      const category = this.inferCategory(data.org || '', data.asn || '');
      const type = this.inferType(data.org || '', data.asn || '');
      const riskScore = this.calculateRiskScore(category, type);

      const info: ASNInfo = {
        asn: parseInt(data.asn?.replace('AS', '') || String(asn), 10),
        asName: data.org || undefined,
        asCountry: data.country,
        category,
        type,
        riskScore,
        hostname: data.hostname,
        description: `Auto-detected: ${data.org}`,
        source: 'api',
        lastUpdated: now,
      };

      await this.kv.set(`asn:info:${info.asn}`, info, 86400);
      return info;
    } catch (error) {
      console.error('Failed to enrich ASN info:', error);
      return null;
    }
  }

  private inferCategory(org: string, asn: string): ASNCategory {
    const orgLower = (org || '').toLowerCase();
    const asnNum = parseInt((asn || '').replace('AS', ''), 10);

    if (BUILTIN_BLACKLIST_ASNS.some((b) => b.asn === asnNum)) return 'blacklist';
    if (BUILTIN_WHITELIST_ASNS.some((w) => w.asn === asnNum)) return 'whitelist';

    const vpnKeywords = ['vpn', 'proxy', 'private', 'tunnel', 'secure'];
    const dcKeywords = ['cloud', 'hosting', 'datacenter', 'server', 'vps', 'dedicated'];
    const ispKeywords = ['telecom', 'cable', 'broadband', 'dsl', 'fiber', 'internet'];

    if (vpnKeywords.some((k) => orgLower.includes(k))) return 'blacklist';
    if (dcKeywords.some((k) => orgLower.includes(k))) return 'greylist';
    if (ispKeywords.some((k) => orgLower.includes(k))) return 'whitelist';

    return 'unknown';
  }

  private inferType(org: string, _asn: string): ASNType {
    const orgLower = (org || '').toLowerCase();

    if (orgLower.includes('mobile') || orgLower.includes('wireless')) return 'mobile';
    if (orgLower.includes('vpn') || orgLower.includes('proxy')) return 'vpn';
    if (orgLower.includes('cloud') || orgLower.includes('hosting')) return 'hosting';
    if (orgLower.includes('datacenter')) return 'datacenter';
    if (orgLower.includes('university') || orgLower.includes('education')) return 'education';
    if (orgLower.includes('government') || orgLower.includes('gov')) return 'government';

    return 'isp';
  }

  private calculateRiskScore(category: ASNCategory, type: ASNType): number {
    const categoryScores: Record<ASNCategory, number> = {
      blacklist: 85,
      greylist: 50,
      whitelist: 10,
      unknown: 30,
    };

    const typeModifiers: Record<ASNType, number> = {
      bot: 20,
      vpn: 15,
      proxy: 15,
      datacenter: 10,
      hosting: 5,
      isp: 0,
      mobile: -5,
      business: 0,
      education: -5,
      government: -10,
    };

    return Math.min(100, Math.max(0, categoryScores[category] + typeModifiers[type]));
  }
}

export function createASNFilterService(env: Env): ASNFilterService {
  return new ASNFilterService(env);
}
