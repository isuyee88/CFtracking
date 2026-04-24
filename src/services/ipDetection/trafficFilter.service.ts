/**
 * @fileoverview 智能流量过滤服务
 * @description 结合ISP白名单 + ASN黑名单进行高效、免费的流量过滤
 * @module services/ipDetection/trafficFilter.service
 * 
 * 核心策略（从严处理）:
 * 1. ISP关键词黑名单 - 直接拦截（Host/VPS/VPN/Proxy/Datacenter等）
 * 2. ISP白名单 - 信任主流运营商流量
 * 3. ASN黑名单 - 拦截已知恶意ASN
 * 4. 灰名单ASN - 加强检测
 * 5. 仅对未知ASN调用第三方API（节省成本）
 * 
 * 成本分析:
 * - ISP黑名单+白名单+ASN黑名单: 0成本（使用Cloudflare免费信息）
 * - 第三方API调用: 减少95%以上（仅对未知ASN）
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import { ASNFilterService, createASNFilterService } from './asnFilter.service';
import type { CloudflareRequestInfo } from '@/utils/cloudflare';
export interface TrafficFilterResult {
  allowed: boolean;
  reason: string;
  action: 'allow' | 'block' | 'challenge' | 'flag';
  details: {
    asn: number | null;
    asOrganization: string | null;
    ispWhitelisted: boolean;
    ispBlacklisted: boolean;
    asnBlacklisted: boolean;
    asnGreylisted: boolean;
    riskScore: number;
    source: 'isp_whitelist' | 'isp_blacklist' | 'asn_blacklist' | 'asn_greylist' | 'unknown' | 'api';
    matchedKeyword?: string;
  };
}

export interface ISPWhitelistEntry {
  id: string;
  namePattern: string;
  type: 'isp' | 'mobile' | 'business' | 'education' | 'government';
  country?: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ISP关键词黑名单 - 从严处理
 * 匹配这些关键词的ISP直接判定为代理/机器人流量
 */
export const ISP_BLACKLIST_KEYWORDS = [
  // VPN相关
  'vpn', 'virtual private',
  // 代理相关  
  'proxy', 'proxies',
  // 托管/数据中心
  'hosting', 'host', 'datacenter', 'data center', 'colocation', 'colo',
  // VPS/云服务
  'vps', 'cloud', 'server', 'dedicated',
  // 已知VPN/代理服务商
  'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'pia-', 'private internet access',
  'mullvad', 'protonvpn', 'windscribe', 'tunnelbear', 'hotspot shield',
  'tor', 'exit node',
  // CDN/云服务商（通常不是真实用户）
  'amazon aws', 'google cloud', 'microsoft azure', 'digitalocean', 'linode',
  'vultr', 'ovh', 'hetzner', 'contabo', 'upcloud', 'scaleway',
  // 搬瓦工等廉价VPS
  'bandwagon', 'bwh', 'gigs g', 'krypt', 'quadranet',
  // 住宅代理服务商
  'luminati', 'bright data', 'smartproxy', 'oxylabs', 'geosurf', 'storm proxies',
  'ip royal', 'packetstream', 'hola', 'zenmate',
  // 其他可疑关键词
  'anonymous', 'stealth', 'unblock', 'bypass',
];

/**
 * ISP白名单 - 主流运营商
 */
const ISP_WHITELIST_PATTERNS: Array<Omit<ISPWhitelistEntry, 'id' | 'createdAt' | 'updatedAt'>> = [
  // 美国主要ISP
  { namePattern: 'Comcast', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'AT&T', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Verizon', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Time Warner', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Charter', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Cox', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Frontier', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'CenturyLink', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'Spectrum', type: 'isp', priority: 100, enabled: true },
  
  // 中国主要运营商
  { namePattern: 'China Telecom', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'China Unicom', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'China Mobile', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'China Netcom', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'CT', type: 'isp', country: 'CN', priority: 80, enabled: true },
  { namePattern: 'CU', type: 'isp', country: 'CN', priority: 80, enabled: true },
  { namePattern: 'CMCC', type: 'mobile', country: 'CN', priority: 80, enabled: true },
  
  // 欧洲主要ISP
  { namePattern: 'Deutsche Telekom', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Telecom Italia', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'British Telecom', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'BT', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'Orange', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Vodafone', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'Telefonica', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Proximus', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'KPN', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'T-Mobile', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'O2', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'EE', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'Three', type: 'mobile', priority: 90, enabled: true },
  
  // 日本主要ISP
  { namePattern: 'NTT', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'KDDI', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'SoftBank', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'au', type: 'mobile', country: 'JP', priority: 90, enabled: true },
  { namePattern: 'Docomo', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'OCN', type: 'isp', country: 'JP', priority: 90, enabled: true },
  { namePattern: 'So-net', type: 'isp', country: 'JP', priority: 90, enabled: true },
  
  // 韩国主要ISP
  { namePattern: 'KT', type: 'isp', country: 'KR', priority: 100, enabled: true },
  { namePattern: 'SK Broadband', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'LG U+', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'Naver', type: 'business', priority: 80, enabled: true },
  
  // 台湾主要ISP
  { namePattern: 'Chunghwa Telecom', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'HiNet', type: 'isp', country: 'TW', priority: 90, enabled: true },
  { namePattern: 'FarEasTone', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'Taiwan Mobile', type: 'mobile', priority: 90, enabled: true },
  
  // 香港主要ISP
  { namePattern: 'PCCW', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'HKBN', type: 'isp', country: 'HK', priority: 90, enabled: true },
  { namePattern: 'HKT', type: 'isp', country: 'HK', priority: 90, enabled: true },
  
  // 新加坡主要ISP
  { namePattern: 'SingTel', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'StarHub', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'M1', type: 'mobile', country: 'SG', priority: 90, enabled: true },
  
  // 澳大利亚主要ISP
  { namePattern: 'Telstra', type: 'isp', priority: 100, enabled: true },
  { namePattern: 'Optus', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'TPG', type: 'isp', country: 'AU', priority: 90, enabled: true },
  
  // 俄罗斯主要ISP
  { namePattern: 'Rostelecom', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'MTS', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'Beeline', type: 'isp', priority: 90, enabled: true },
  { namePattern: 'MegaFon', type: 'mobile', priority: 90, enabled: true },
  
  // 巴西主要ISP
  { namePattern: 'Claro', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'Vivo', type: 'mobile', country: 'BR', priority: 90, enabled: true },
  { namePattern: 'TIM', type: 'mobile', country: 'BR', priority: 90, enabled: true },
  { namePattern: 'Oi', type: 'isp', country: 'BR', priority: 80, enabled: true },
  
  // 印度主要ISP
  { namePattern: 'Airtel', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'Jio', type: 'mobile', priority: 100, enabled: true },
  { namePattern: 'Vodafone Idea', type: 'mobile', priority: 90, enabled: true },
  { namePattern: 'BSNL', type: 'isp', country: 'IN', priority: 80, enabled: true },
  
  // 教育机构
  { namePattern: 'University', type: 'education', priority: 70, enabled: true },
  { namePattern: 'Edu', type: 'education', priority: 60, enabled: true },
  { namePattern: 'Academic', type: 'education', priority: 60, enabled: true },
  
  // 政府机构
  { namePattern: 'Government', type: 'government', priority: 80, enabled: true },
  { namePattern: 'Gov', type: 'government', priority: 70, enabled: true },
];

export class TrafficFilterService {
  private db: D1Database;
  private asnFilterService: ASNFilterService;
  private ispWhitelist: Map<string, ISPWhitelistEntry> = new Map();
  private initialized: boolean = false;

  constructor(env: Env) {
    this.db = env.DB;
    this.asnFilterService = createASNFilterService(env);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadISPWhitelist();
    await this.asnFilterService.initialize();
    this.initialized = true;
  }

  private async loadISPWhitelist(): Promise<void> {
    const now = new Date().toISOString();

    for (const entry of ISP_WHITELIST_PATTERNS) {
      const fullEntry: ISPWhitelistEntry = {
        id: `isp_${entry.namePattern.toLowerCase().replace(/\s+/g, '_')}`,
        ...entry,
        createdAt: now,
        updatedAt: now,
      };
      this.ispWhitelist.set(entry.namePattern.toLowerCase(), fullEntry);
    }

    try {
      const results = await this.db
        .prepare('SELECT * FROM ispWhitelist WHERE enabled = 1 ORDER BY priority DESC')
        .all<ISPWhitelistEntry>();

      for (const row of results.results || []) {
        this.ispWhitelist.set(row.namePattern.toLowerCase(), row);
      }
    } catch (error) {
      console.error('Failed to load custom ISP whitelist:', error);
    }
  }

  async filterTraffic(cfInfo: CloudflareRequestInfo): Promise<TrafficFilterResult> {
    await this.initialize();

    const asn = cfInfo.asn;
    const asOrganization = cfInfo.asOrganization;

    // Step 0: 检查ISP黑名单关键词（从严处理，最高优先级）
    if (asOrganization) {
      const blacklistCheck = this.checkISPBlacklist(asOrganization);
      if (blacklistCheck.matched) {
        return {
          allowed: false,
          reason: `ISP blacklisted keyword: "${blacklistCheck.matchedKeyword}"`,
          action: 'block',
          details: {
            asn,
            asOrganization,
            ispWhitelisted: false,
            ispBlacklisted: true,
            asnBlacklisted: false,
            asnGreylisted: false,
            riskScore: 100,
            source: 'isp_blacklist',
            matchedKeyword: blacklistCheck.matchedKeyword,
          },
        };
      }
    }

    // Step 1: 检查ISP白名单（第二优先级）
    if (asOrganization) {
      const ispCheck = this.checkISPWhitelist(asOrganization);
      if (ispCheck.matched) {
        return {
          allowed: true,
          reason: `ISP whitelisted: ${ispCheck.matchedPattern}`,
          action: 'allow',
          details: {
            asn,
            asOrganization,
            ispWhitelisted: true,
            ispBlacklisted: false,
            asnBlacklisted: false,
            asnGreylisted: false,
            riskScore: 10,
            source: 'isp_whitelist',
          },
        };
      }
    }

    // Step 2: 检查ASN黑名单
    if (asn) {
      const asnCheck = await this.asnFilterService.checkASN(asn);

      if (asnCheck.category === 'blacklist') {
        return {
          allowed: false,
          reason: `ASN blacklisted: ${asnCheck.reason}`,
          action: asnCheck.shouldBlock ? 'block' : 'challenge',
          details: {
            asn,
            asOrganization,
            ispWhitelisted: false,
            ispBlacklisted: false,
            asnBlacklisted: true,
            asnGreylisted: false,
            riskScore: asnCheck.riskScore,
            source: 'asn_blacklist',
          },
        };
      }

      if (asnCheck.category === 'greylist') {
        return {
          allowed: true,
          reason: `ASN greylisted: ${asnCheck.reason}`,
          action: 'challenge',
          details: {
            asn,
            asOrganization,
            ispWhitelisted: false,
            ispBlacklisted: false,
            asnBlacklisted: false,
            asnGreylisted: true,
            riskScore: asnCheck.riskScore,
            source: 'asn_greylist',
          },
        };
      }

      if (asnCheck.category === 'whitelist') {
        return {
          allowed: true,
          reason: `ASN whitelisted: ${asnCheck.reason}`,
          action: 'allow',
          details: {
            asn,
            asOrganization,
            ispWhitelisted: false,
            ispBlacklisted: false,
            asnBlacklisted: false,
            asnGreylisted: false,
            riskScore: asnCheck.riskScore,
            source: 'asn_blacklist',
          },
        };
      }
    }

    // Step 3: 未知ASN - 返回需要进一步检测
    return {
      allowed: true,
      reason: 'Unknown ASN - needs further analysis',
      action: 'flag',
      details: {
        asn,
        asOrganization,
        ispWhitelisted: false,
        ispBlacklisted: false,
        asnBlacklisted: false,
        asnGreylisted: false,
        riskScore: 30,
        source: 'unknown',
      },
    };
  }

  /**
   * 检查ISP是否匹配黑名单关键词（从严处理）
   */
  private checkISPBlacklist(asOrganization: string): { matched: boolean; matchedKeyword?: string } {
    const orgLower = asOrganization.toLowerCase();

    for (const keyword of ISP_BLACKLIST_KEYWORDS) {
      if (orgLower.includes(keyword.toLowerCase())) {
        return { matched: true, matchedKeyword: keyword };
      }
    }

    return { matched: false };
  }

  private checkISPWhitelist(asOrganization: string): { matched: boolean; matchedPattern?: string } {
    const orgLower = asOrganization.toLowerCase();

    for (const [pattern, entry] of this.ispWhitelist) {
      if (orgLower.includes(pattern)) {
        return { matched: true, matchedPattern: entry.namePattern };
      }
    }

    return { matched: false };
  }

  async addISPToWhitelist(entry: Omit<ISPWhitelistEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISPWhitelistEntry> {
    const id = `isp_${entry.namePattern.toLowerCase().replace(/\s+/g, '_')}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO ispWhitelist (id, namePattern, type, country, priority, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          country = excluded.country,
          priority = excluded.priority,
          enabled = excluded.enabled,
          updatedAt = excluded.updatedAt
      `)
      .bind(
        id,
        entry.namePattern,
        entry.type,
        entry.country || null,
        entry.priority,
        entry.enabled ? 1 : 0,
        now,
        now
      )
      .run();

    const fullEntry: ISPWhitelistEntry = { ...entry, id, createdAt: now, updatedAt: now };
    this.ispWhitelist.set(entry.namePattern.toLowerCase(), fullEntry);

    return fullEntry;
  }

  async removeISPFromWhitelist(namePattern: string): Promise<void> {
    const id = `isp_${namePattern.toLowerCase().replace(/\s+/g, '_')}`;
    await this.db.prepare('DELETE FROM ispWhitelist WHERE id = ?').bind(id).run();
    this.ispWhitelist.delete(namePattern.toLowerCase());
  }

  async getStats(): Promise<{
    ispBlacklistKeywordCount: number;
    ispWhitelistCount: number;
    asnBlacklistCount: number;
    asnGreylistCount: number;
    asnWhitelistCount: number;
  }> {
    const asnStats = await this.asnFilterService.getStats();

    let ispCount = ISP_WHITELIST_PATTERNS.length;
    try {
      const result = await this.db
        .prepare('SELECT COUNT(*) as count FROM ispWhitelist WHERE enabled = 1')
        .first<{ count: number }>();
      ispCount += result?.count || 0;
    } catch (error) {
      // Ignore
    }

    return {
      ispBlacklistKeywordCount: ISP_BLACKLIST_KEYWORDS.length,
      ispWhitelistCount: ispCount,
      asnBlacklistCount: asnStats.byCategory.blacklist,
      asnGreylistCount: asnStats.byCategory.greylist,
      asnWhitelistCount: asnStats.byCategory.whitelist,
    };
  }

  getISPWhitelist(): ISPWhitelistEntry[] {
    return Array.from(this.ispWhitelist.values());
  }
}

export function createTrafficFilterService(env: Env): TrafficFilterService {
  return new TrafficFilterService(env);
}
