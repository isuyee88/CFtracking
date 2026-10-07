import { describe, expect, it, vi } from 'vitest';

vi.mock('@/handlers/do', () => ({
  DOService: class {},
}));

vi.mock('@/services/proxyDetection/turnstile.service', () => ({
  createTurnstileService: () => ({
    checkTrustState: vi.fn(),
    getSiteKey: vi.fn(),
    createChallenge: vi.fn(),
  }),
}));

import { ClickService, type ClickRequest } from './click.service';

function createService() {
  const service = new ClickService({
    DB: {} as any,
    UNIQUENESS_KV: {} as any,
  } as any);

  (service as any).clickRepo = {
    getRecentVisitMetrics: vi.fn(),
  };

  return service as any;
}

describe('ClickService autorule context enrichment', () => {
  it('hydrates 7d repeat metrics for runtime rule conditions', async () => {
    const service = createService();
    service.clickRepo.getRecentVisitMetrics.mockResolvedValue({
      visitorRepeat: 14,
      ipRepeat: 9,
      campaignCount: 4,
    });

    const request: ClickRequest = {
      campaignId: 'camp-1',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0',
      isp: 'Example ISP',
      networkTags: ['proxy'],
      suspiciousSignals: ['no_js_data'],
      riskAssessment: {
        isBot: false,
        isSuspicious: true,
        riskScore: 6,
        reasons: ['tz_discrepancy'],
      },
      urlParams: new URLSearchParams('utm_source=fb&utm_campaign=spring'),
    };

    const context = await service.buildAutoruleContext(
      request,
      { id: 'camp-1', trafficSource: 'ts-1' },
      'flow-1',
      'visitor-123'
    );

    expect(service.clickRepo.getRecentVisitMetrics).toHaveBeenCalledWith({
      visitorId: 'visitor-123',
      ip: '203.0.113.7',
      lookbackHours: 24 * 7,
    });
    expect(context.campaignCount7d).toBe(4);
    expect(context.visitorRepeat7d).toBe(14);
    expect(context.ipRepeat7d).toBe(9);
    expect(context.networkTags).toEqual(['proxy', 'tz_discrepancy']);
    expect(context.suspiciousSignals).toEqual(['no_js_data', 'tz_discrepancy']);
  });
});
