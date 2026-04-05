/**
 * @fileoverview Domain entity type definitions.
 */

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
  registrar: string | null;
  cloudflareZoneId: string | null;
  cloudflareProxyEnabled: boolean;
  defaultCampaignId: string | null;
  defaultLandingPageId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDomainDTO {
  hostname: string;
  usage?: DomainUsage;
  status?: DomainStatus;
  sslStatus?: DomainSslStatus;
  dnsProvider?: DomainDnsProvider;
  registrar?: string;
  cloudflareZoneId?: string;
  cloudflareProxyEnabled?: boolean;
  defaultCampaignId?: string;
  defaultLandingPageId?: string;
  notes?: string;
}

export interface UpdateDomainDTO {
  hostname?: string;
  usage?: DomainUsage;
  status?: DomainStatus;
  sslStatus?: DomainSslStatus;
  dnsProvider?: DomainDnsProvider;
  registrar?: string | null;
  cloudflareZoneId?: string | null;
  cloudflareProxyEnabled?: boolean;
  defaultCampaignId?: string | null;
  defaultLandingPageId?: string | null;
  notes?: string | null;
}
