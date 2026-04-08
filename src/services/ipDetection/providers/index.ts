/**
 * @fileoverview IP检测服务商适配器
 * @description 实现多个第三方IP检测服务商的适配器
 * @module services/ipDetection/providers
 */

import type {
  IPDetectionResult,
  IIPDetectionProvider,
  IPDetectionProviderConfig,
} from '@/types/ipDetection';

interface IPApiResponse {
  status: string;
  message?: string;
  country?: string;
  city?: string;
  isp?: string;
  proxy?: boolean;
  hosting?: boolean;
  query?: string;
  as?: string;
  org?: string;
  timezone?: string;
  lat?: number;
  lon?: number;
}

interface ProxyCheckIPResult {
  proxy?: string;
  type?: string;
  risk?: string;
  isp?: string;
  country?: string;
  asn?: string;
  city?: string;
  region?: string;
  timezone?: string;
  operator?: string;
}

interface ProxyCheckResponse {
  status: string;
  message?: string;
  [ip: string]: string | ProxyCheckIPResult | undefined;
}

interface IPHubResponse {
  ip?: string;
  countryCode?: string;
  country?: string;
  asn?: string;
  isp?: string;
  hostname?: string;
  block?: number;
}

interface IPQualityScoreResponse {
  success?: boolean;
  message?: string;
  fraud_score?: number;
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  is_crawler?: boolean;
  datacenter?: boolean;
  country_code?: string;
  city?: string;
  ASN?: string;
  ISP?: string;
  region?: string;
  organization?: string;
  timezone?: string;
  mobile?: boolean;
  abuse_velocity?: number;
}

/**
 * IP-API.com 服务商适配器 (免费层最大)
 * 免费额度: 64,800次/天 (45次/分钟)
 */
export class IPApiProvider implements IIPDetectionProvider {
  private dailyLimit = 64800;
  private dailyUsed = 0;
  private config: IPDetectionProviderConfig;

  constructor(config?: IPDetectionProviderConfig) {
    this.config = config || { timeout: 5000 };
  }

  async checkIP(ip: string): Promise<IPDetectionResult> {
    const endpoint = 'http://ip-api.com/json';
    const fields = this.config.fields || 'status,message,country,city,isp,proxy,hosting,query';
    const timeout = this.config.timeout || 5000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${endpoint}/${ip}?fields=${fields}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: IPApiResponse = await response.json();

      if (data.status === 'fail') {
        throw new Error(data.message || 'IP-API request failed');
      }

      const isProxy = data.proxy === true;
      const isDatacenter = data.hosting === true;
      const riskScore = this.calculateRiskScore(isProxy, isDatacenter);

      return {
        ip: data.query || ip,
        isProxy,
        isVpn: false,
        isTor: false,
        isDatacenter,
        riskScore,
        provider: 'ip-api',
        isp: data.isp,
        country: data.country,
        city: data.city,
        details: {
          as: data.as,
          org: data.org,
          timezone: data.timezone,
          lat: data.lat,
          lon: data.lon,
        },
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private calculateRiskScore(isProxy: boolean, isDatacenter: boolean): number {
    if (isProxy && isDatacenter) return 85;
    if (isProxy) return 70;
    if (isDatacenter) return 60;
    return 20;
  }

  getName(): string {
    return 'ip-api';
  }

  isEnabled(): boolean {
    return true;
  }

  getRemainingQuota(): number {
    return this.dailyLimit - this.dailyUsed;
  }

  checkQuota(): boolean {
    return this.dailyUsed < this.dailyLimit;
  }

  incrementUsage(): void {
    this.dailyUsed++;
  }

  resetDaily(): void {
    this.dailyUsed = 0;
  }
}

/**
 * ProxyCheck.io 服务商适配器
 * 免费额度: 1,000次/天
 */
export class ProxyCheckProvider implements IIPDetectionProvider {
  private endpoint = 'https://proxycheck.io/v2';
  private dailyLimit = 1000;
  private dailyUsed = 0;

  constructor(
    private apiKey: string,
    private config?: IPDetectionProviderConfig
  ) {}

  async checkIP(ip: string): Promise<IPDetectionResult> {
    const timeout = this.config?.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        vpn: (this.config?.vpn ?? 1).toString(),
        asn: (this.config?.asn ?? 1).toString(),
        risk: '1',
        day: '1',
      });

      const response = await fetch(`${this.endpoint}/${ip}?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: ProxyCheckResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error(data.message || 'ProxyCheck request failed');
      }

      const result = data[ip] as ProxyCheckIPResult | undefined;
      const isProxy = result?.proxy === 'yes';
      const isVpn = result?.type === 'VPN';
      const isTor = result?.type === 'TOR';
      const riskScore = result?.risk ? parseInt(result.risk, 10) : (isProxy ? 70 : 10);

      return {
        ip,
        isProxy,
        isVpn,
        isTor,
        isDatacenter: result?.type === 'Hosting',
        riskScore,
        provider: 'proxycheck',
        isp: result?.isp,
        country: result?.country,
        asn: result?.asn,
        details: {
          city: result?.city,
          region: result?.region,
          timezone: result?.timezone,
          operator: result?.operator,
        },
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getName(): string {
    return 'proxycheck';
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  getRemainingQuota(): number {
    return this.dailyLimit - this.dailyUsed;
  }

  checkQuota(): boolean {
    return this.dailyUsed < this.dailyLimit;
  }

  incrementUsage(): void {
    this.dailyUsed++;
  }

  resetDaily(): void {
    this.dailyUsed = 0;
  }
}

/**
 * IPHub.info 服务商适配器
 * 免费额度: 1,000次/天
 */
export class IPHubProvider implements IIPDetectionProvider {
  private endpoint = 'https://v2.api.iphub.info/ip';
  private dailyLimit = 1000;
  private dailyUsed = 0;

  constructor(
    private apiKey: string,
    private config?: IPDetectionProviderConfig
  ) {}

  async checkIP(ip: string): Promise<IPDetectionResult> {
    const timeout = this.config?.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.endpoint}/${ip}`, {
        headers: {
          'X-Key': this.apiKey,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: IPHubResponse = await response.json();

      const blockType = data.block;
      const isProxy = blockType === 1;
      const isVpn = blockType === 1;
      const isTor = blockType === 1;

      const riskScore = blockType === 1 ? 80 : blockType === 2 ? 50 : 10;

      return {
        ip: data.ip || ip,
        isProxy,
        isVpn,
        isTor,
        isDatacenter: blockType === 1,
        riskScore,
        provider: 'iphub',
        country: data.countryCode,
        asn: data.asn,
        isp: data.isp,
        details: {
          hostname: data.hostname,
          blockType,
        },
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getName(): string {
    return 'iphub';
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  getRemainingQuota(): number {
    return this.dailyLimit - this.dailyUsed;
  }

  checkQuota(): boolean {
    return this.dailyUsed < this.dailyLimit;
  }

  incrementUsage(): void {
    this.dailyUsed++;
  }

  resetDaily(): void {
    this.dailyUsed = 0;
  }
}

/**
 * IPQualityScore 服务商适配器
 * 免费额度: 5,000次/月
 */
export class IPQualityScoreProvider implements IIPDetectionProvider {
  private endpoint = 'https://ipqualityscore.com/api/json/ip';
  private monthlyLimit = 5000;
  private monthlyUsed = 0;

  constructor(
    private apiKey: string,
    private config?: IPDetectionProviderConfig
  ) {}

  async checkIP(ip: string): Promise<IPDetectionResult> {
    const timeout = this.config?.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.endpoint}/${this.apiKey}/${ip}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: IPQualityScoreResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'IPQualityScore request failed');
      }

      const riskScore = data.fraud_score || 0;
      const isProxy = data.proxy === true;
      const isVpn = data.vpn === true;
      const isTor = data.tor === true;
      const isDatacenter = data.is_crawler === true || data.datacenter === true;

      return {
        ip,
        isProxy,
        isVpn,
        isTor,
        isDatacenter,
        riskScore,
        provider: 'ipqualityscore',
        country: data.country_code,
        city: data.city,
        asn: data.ASN,
        isp: data.ISP,
        details: {
          region: data.region,
          organization: data.organization,
          timezone: data.timezone,
          mobile: data.mobile,
          isCrawler: data.is_crawler,
          abuseVelocity: data.abuse_velocity,
        },
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getName(): string {
    return 'ipqualityscore';
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  getRemainingQuota(): number {
    return this.monthlyLimit - this.monthlyUsed;
  }

  checkQuota(): boolean {
    return this.monthlyUsed < this.monthlyLimit;
  }

  incrementUsage(): void {
    this.monthlyUsed++;
  }

  resetMonthly(): void {
    this.monthlyUsed = 0;
  }
}

/**
 * 创建服务商适配器工厂函数
 */
export function createProvider(
  name: string,
  apiKey?: string,
  config?: IPDetectionProviderConfig
): IIPDetectionProvider | null {
  switch (name) {
    case 'ip-api':
      return new IPApiProvider(config);
    case 'proxycheck':
      return apiKey ? new ProxyCheckProvider(apiKey, config) : null;
    case 'iphub':
      return apiKey ? new IPHubProvider(apiKey, config) : null;
    case 'ipqualityscore':
      return apiKey ? new IPQualityScoreProvider(apiKey, config) : null;
    default:
      return null;
  }
}
