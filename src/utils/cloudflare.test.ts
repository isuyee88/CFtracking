import { describe, expect, it } from 'vitest';
import {
  assessRisk,
  inferConnectionType,
  normalizeConnectionType,
  type CloudflareRequestInfo,
} from './cloudflare';

function createCloudflareInfo(overrides: Partial<CloudflareRequestInfo> = {}): CloudflareRequestInfo {
  return {
    rayId: null,
    connectingIP: '203.0.113.10',
    ipCountry: 'US',
    isEUCountry: false,
    asn: 64512,
    asOrganization: 'Example Broadband',
    colo: 'SJC',
    country: 'US',
    city: 'San Jose',
    region: 'California',
    regionCode: 'CA',
    latitude: null,
    longitude: null,
    postalCode: null,
    continent: 'NA',
    timezone: 'America/Los_Angeles',
    metroCode: null,
    httpProtocol: 'HTTP/2',
    tlsVersion: 'TLSv1.3',
    tlsCipher: 'AEAD-AES128-GCM-SHA256',
    tlsClientRandom: null,
    tlsClientHelloLength: null,
    tlsClientCiphersSha1: 'cipher-sha1',
    tlsClientExtensionsSha1: 'ext-sha1',
    botManagement: null,
    tlsClientAuth: null,
    headers: {},
    requestPriority: null,
    clientAcceptEncoding: null,
    userAgent: 'Mozilla/5.0',
    ...overrides,
  };
}

describe('cloudflare helpers', () => {
  it('normalizes common connection labels', () => {
    expect(normalizeConnectionType('Wi-Fi')).toBe('wifi');
    expect(normalizeConnectionType('mobile')).toBe('cellular');
    expect(normalizeConnectionType('Fiber')).toBe('broadband');
  });

  it('prefers explicit connection type before inferring from ASN organization', () => {
    const info = createCloudflareInfo({ asOrganization: 'Example Hosting LLC' });
    expect(inferConnectionType(info, { explicit: '5G', device: 'desktop' })).toBe('5g');
  });

  it('infers connection type from network organization and device fallback', () => {
    expect(
      inferConnectionType(createCloudflareInfo({ asOrganization: 'China Mobile Communications' }), { device: 'desktop' })
    ).toBe('cellular');
    expect(
      inferConnectionType(createCloudflareInfo({ asOrganization: 'Example Hosting LLC' }), { device: 'desktop' })
    ).toBe('hosting');
    expect(inferConnectionType(createCloudflareInfo({ asOrganization: null }), { device: 'mobile' })).toBe('cellular');
  });

  it('scores bot, TLS, and VPN or hosting signals into riskAssessment', () => {
    const result = assessRisk(
      createCloudflareInfo({
        asOrganization: 'Acme Hosting VPN',
        tlsClientCiphersSha1: null,
        botManagement: {
          score: 20,
          verifiedBot: false,
          staticResource: false,
          ja3Hash: null,
          ja4: null,
          detectionIds: [],
          jsDetectionPassed: false,
        },
      })
    );

    expect(result.isBot).toBe(true);
    expect(result.isSuspicious).toBe(true);
    expect(result.riskScore).toBe(100);
    expect(result.reasons).toContain('Low bot score: 20');
    expect(result.reasons).toContain('JS detection failed');
    expect(result.reasons).toContain('Missing TLS fingerprint');
    expect(result.reasons).toContain('Possible VPN/Proxy');
  });
});
