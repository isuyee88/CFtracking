import { describe, expect, it, vi } from 'vitest';
import { RealtimeRuleEngineService } from './realtime-rule-engine.service';

function createService() {
  const service = new RealtimeRuleEngineService({
    DB: {} as any,
  } as any);

  (service as any).listResolver = {
    inWhitelist: vi.fn().mockResolvedValue(false),
    inBlacklist: vi.fn().mockResolvedValue(false),
  };
  (service as any).scopeRepo = {
    resolveEffectiveScopeConfig: vi.fn(),
  };
  (service as any).bindingRepo = {
    getFlowBindings: vi.fn(),
  };
  (service as any).ruleRepo = {
    findManyByIds: vi.fn(),
  };

  return service as any;
}

describe('RealtimeRuleEngineService', () => {
  it('returns whitelist_gate challenge when whitelist misses and trust handling is deferred', async () => {
    const service = createService();
    service.scopeRepo.resolveEffectiveScopeConfig.mockResolvedValue({
      effectiveConfig: {
        scopeType: 'campaign',
        scopeId: 'camp-1',
        mode: 'whitelist_gate',
        enabled: true,
        bindings: [],
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
      hasExplicitConfig: true,
      scannedScopeTypes: ['campaign', 'traffic_source', 'global'],
    });

    const decision = await service.evaluate({
      campaignId: 'camp-1',
      context: { campaignId: 'camp-1' },
    });

    expect(decision.action).toBe('challenge');
    expect(decision.matched).toBe(false);
    expect(decision.matchedLayer).toBe('campaign');
    expect(decision.reason).toBe('whitelist_gate_unmatched');
  });

  it('falls back to legacy flow bindings only when no explicit layered config exists', async () => {
    const service = createService();
    service.scopeRepo.resolveEffectiveScopeConfig.mockResolvedValue({
      effectiveConfig: null,
      hasExplicitConfig: false,
      scannedScopeTypes: ['campaign', 'traffic_source', 'global'],
    });
    service.bindingRepo.getFlowBindings.mockResolvedValue([
      { ruleId: 'rule-1', priority: 1, scope: 'flow' },
    ]);
    service.ruleRepo.findManyByIds.mockResolvedValue([
      {
        id: 'rule-1',
        name: 'Legacy block',
        enabled: true,
        status: 'active',
        conditions: { eq: ['country', 'US'] },
        actions: [{ type: 'block', platform: 'all', parameters: {}, delay: 0, retry: 0 }],
      },
    ]);

    const decision = await service.evaluate({
      campaignId: 'camp-1',
      flowId: 'flow-1',
      context: { campaignId: 'camp-1', country: 'US' },
    });

    expect(decision.action).toBe('block');
    expect(decision.matched).toBe(true);
    expect(decision.matchedLayer).toBe('flow');
  });

  it('does not read legacy flow bindings when any explicit layered config exists', async () => {
    const service = createService();
    service.scopeRepo.resolveEffectiveScopeConfig.mockResolvedValue({
      effectiveConfig: null,
      hasExplicitConfig: true,
      scannedScopeTypes: ['campaign', 'traffic_source', 'global'],
    });

    const decision = await service.evaluate({
      campaignId: 'camp-1',
      flowId: 'flow-1',
      context: { campaignId: 'camp-1' },
    });

    expect(service.bindingRepo.getFlowBindings).not.toHaveBeenCalled();
    expect(decision.action).toBe('allow');
    expect(decision.reason).toBe('scope_inherit_without_effective_config');
  });

  it('supports ne/not_contains/gt/gte/lt/lte operators in expression nodes', async () => {
    const service = createService();
    const context = {
      campaignId: 'camp-1',
      country: 'CA',
      city: 'Toronto',
      asn: 13335,
      utmCampaign: 'spring-sale',
    };

    await expect(service.evaluateExpressionNode({ ne: ['country', 'US'] }, context)).resolves.toBe(true);
    await expect(service.evaluateExpressionNode({ not_contains: ['utmCampaign', 'winter'] }, context)).resolves.toBe(true);
    await expect(service.evaluateExpressionNode({ gt: ['asn', 10000] }, context)).resolves.toBe(true);
    await expect(service.evaluateExpressionNode({ gte: ['asn', 13335] }, context)).resolves.toBe(true);
    await expect(service.evaluateExpressionNode({ lt: ['asn', 20000] }, context)).resolves.toBe(true);
    await expect(service.evaluateExpressionNode({ lte: ['asn', 13335] }, context)).resolves.toBe(true);
  });
});
