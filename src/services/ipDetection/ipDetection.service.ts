/**
 * @fileoverview IP检测服务
 * @description 实现IP检测、代理/VPN检测、缓存管理等功能
 * @module services/ipDetection/ipDetection.service
 */

import type { Env } from '@/config/env';
import {
  IPDetectionResult,
  IIPDetectionProvider,
  ProxyVPNType,
  ProxyVPNCheckResult,
} from '@/types/ipDetection';
import { IPDetectionRepo, createIPDetectionRepo } from '@/handlers/d1/ipDetection.repo';
import { ProxyVPNBlacklistRepo, createProxyVPNBlacklistRepo } from '@/handlers/d1/proxyVpnBlacklist.repo';
import { createProvider } from './providers/index';

interface IPDetectionServiceConfigInternal {
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
  apiKey?: string;
}

export class IPDetectionService {
  private repo: IPDetectionRepo;
  private blacklistRepo: ProxyVPNBlacklistRepo;
  private provider: IIPDetectionProvider | null = null;
  private config: IPDetectionServiceConfigInternal;

  constructor(env: Env, config?: Partial<IPDetectionServiceConfigInternal>) {
    this.repo = createIPDetectionRepo(env.DB);
    this.blacklistRepo = createProxyVPNBlacklistRepo(env.DB);
    this.config = {
      enabled: true,
      action: 'log',
      riskThreshold: 70,
      cacheTTL: 86400,
      providers: {
        primary: 'ip-api',
        fallback: [],
      },
      autoBlacklist: {
        enabled: true,
        threshold: 80,
        types: ['proxy', 'vpn', 'tor'],
      },
      ...config,
    };

    if (this.config.providers.primary && this.config.apiKey) {
      this.provider = createProvider(this.config.providers.primary, this.config.apiKey);
    }
  }

  async checkIP(ip: string): Promise<IPDetectionResult> {
    const cached = await this.repo.findByIP(ip);
    if (cached) {
      return {
        ip: cached.ip,
        isProxy: cached.isProxy === 1,
        isVpn: cached.isVpn === 1,
        isTor: cached.isTor === 1,
        isDatacenter: cached.isDatacenter === 1,
        riskScore: cached.riskScore,
        provider: cached.provider,
        isp: cached.isp,
        country: cached.country,
        city: cached.city,
        asn: cached.asn,
        details: cached.details ? JSON.parse(cached.details) : undefined,
        cached: true,
        cachedAt: cached.createdAt,
      };
    }

    if (!this.provider) {
      return this.createDefaultResult(ip);
    }

    try {
      const result = await this.provider.checkIP(ip);
      await this.repo.upsert({
        ip: result.ip,
        isProxy: result.isProxy ? 1 : 0,
        isVpn: result.isVpn ? 1 : 0,
        isTor: result.isTor ? 1 : 0,
        isDatacenter: result.isDatacenter ? 1 : 0,
        riskScore: result.riskScore,
        provider: result.provider,
        isp: result.isp,
        country: result.country,
        city: result.city,
        asn: result.asn,
        details: result.details ? JSON.stringify(result.details) : undefined,
        expiresAt: new Date(Date.now() + this.config.cacheTTL * 1000).toISOString(),
      });
      return result;
    } catch (error) {
      console.error('IP detection failed:', error);
      return this.createDefaultResult(ip);
    }
  }

  async checkIPBatch(ips: string[]): Promise<IPDetectionResult[]> {
    const results: IPDetectionResult[] = [];
    for (const ip of ips) {
      const result = await this.checkIP(ip);
      results.push(result);
    }
    return results;
  }

  async checkProxyVPN(ip: string): Promise<ProxyVPNCheckResult & { source: string }> {
    const cached = await this.blacklistRepo.findByIP(ip);
    if (cached) {
      return {
        isProxy: cached.type === 'proxy' || cached.type === 'mixed',
        isVpn: cached.type === 'vpn' || cached.type === 'mixed',
        isTor: cached.type === 'tor' || cached.type === 'mixed',
        isDatacenter: cached.type === 'datacenter' || cached.type === 'mixed',
        riskScore: cached.severity === 'critical' ? 100 : cached.severity === 'high' ? 80 : cached.severity === 'medium' ? 60 : 40,
        score: cached.severity === 'critical' ? 100 : cached.severity === 'high' ? 80 : cached.severity === 'medium' ? 60 : 40,
        provider: 'cache',
        source: 'cache',
      };
    }

    const ipResult = await this.checkIP(ip);
    
    const types: ProxyVPNType[] = [];
    if (ipResult.isProxy) types.push('proxy');
    if (ipResult.isVpn) types.push('vpn');
    if (ipResult.isTor) types.push('tor');
    if (ipResult.isDatacenter) types.push('datacenter');
    
    const type: ProxyVPNType = types.length > 1 ? 'mixed' : types[0] || 'proxy';

    await this.blacklistRepo.create({
      ip,
      type,
      reason: 'Auto detected from IP check',
      source: 'auto_detected',
      severity: ipResult.riskScore >= 80 ? 'critical' : ipResult.riskScore >= 60 ? 'high' : ipResult.riskScore >= 40 ? 'medium' : 'low',
    });

    return {
      isProxy: ipResult.isProxy,
      isVpn: ipResult.isVpn,
      isTor: ipResult.isTor,
      isDatacenter: ipResult.isDatacenter,
      riskScore: ipResult.riskScore,
      score: ipResult.riskScore,
      provider: ipResult.provider,
      source: 'api',
    };
  }

  async getStats(): Promise<{
    totalChecks: number;
    cacheHits: number;
    cacheMisses: number;
    proxyDetected: number;
    vpnDetected: number;
    torDetected: number;
    datacenterDetected: number;
  }> {
    const dbStats = await this.repo.getStats();
    const blacklistStats = await this.blacklistRepo.getStats();
    
    return {
      totalChecks: dbStats.totalChecks,
      cacheHits: dbStats.cacheHits,
      cacheMisses: dbStats.cacheMisses,
      proxyDetected: blacklistStats.byType.proxy || 0,
      vpnDetected: blacklistStats.byType.vpn || 0,
      torDetected: blacklistStats.byType.tor || 0,
      datacenterDetected: blacklistStats.byType.datacenter || 0,
    };
  }

  async cleanup(): Promise<{ expiredCache: number; expiredBlacklist: number }> {
    const expiredCache = await this.repo.deleteExpired();
    const expiredBlacklist = await this.blacklistRepo.deleteExpired();
    return { expiredCache, expiredBlacklist };
  }

  async clearCache(ip: string): Promise<void> {
    await this.repo.deleteByIP(ip);
  }

  updateConfig(config: Partial<IPDetectionServiceConfigInternal>): void {
    this.config = { ...this.config, ...config };
    if (this.config.providers.primary && this.config.apiKey) {
      this.provider = createProvider(this.config.providers.primary, this.config.apiKey);
    }
  }

  getConfig(): IPDetectionServiceConfigInternal {
    return { ...this.config };
  }

  private createDefaultResult(ip: string): IPDetectionResult {
    return {
      ip,
      isProxy: false,
      isVpn: false,
      isTor: false,
      isDatacenter: false,
      riskScore: 0,
      provider: 'default',
      cached: false,
    };
  }
}

export function createIPDetectionService(env: Env, config?: Partial<IPDetectionServiceConfigInternal>): IPDetectionService {
  return new IPDetectionService(env, config);
}
