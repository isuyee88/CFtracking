export type DomainStatus = 'active' | 'paused' | 'pending' | 'error';
export type DomainUsage = 'tracking' | 'landing' | 'admin' | 'mixed';
export type DomainSslStatus = 'auto' | 'custom' | 'pending' | 'disabled';
export type DomainDnsProvider = 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'manual' | 'other';

export interface Domain {
  id: string;
  displayId?: string;
  hostname: string;
  usage: DomainUsage;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  dnsProvider: DomainDnsProvider;
  registrar?: string | null;
  cloudflareZoneId?: string | null;
  cloudflareProxyEnabled: boolean;
  defaultCampaignId?: string | null;
  defaultLandingPageId?: string | null;
  notes?: string | null;
  campaignCount?: number;
  updatedAt: string;
}
