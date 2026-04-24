import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';
import { RealtimeRuleEngineService } from '@/services/autorule/realtime-rule-engine.service';

function createEnv(): Env {
  const db = {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
      })),
    })),
  } as unknown as D1Database;

  return {
    DB: db,
  } as unknown as Env;
}

describe('RealtimeRuleEngineService multi-binding evaluation', () => {
  it('evaluates bindings in priority order until one produces a decisive result', async () => {
    const service = new RealtimeRuleEngineService(createEnv());
    const serviceAny = service as any;
    const bindingRepo = {
      getEffectiveBindings: vi.fn().mockResolvedValue([
        { scope: 'campaign', scopeId: 'c1', ruleId: 'r1', priority: 10, updatedAt: '' },
        { scope: 'campaign', scopeId: 'c1', ruleId: 'r2', priority: 20, updatedAt: '' },
      ]),
    };
    const listResolver = {
      inWhitelist: vi.fn().mockResolvedValue(false),
      inBlacklist: vi.fn().mockResolvedValue(false),
    };
    const ruleRepo = {
      findById: vi
        .fn()
        .mockResolvedValueOnce({ id: 'r1', enabled: true, status: 'active' })
        .mockResolvedValueOnce({ id: 'r2', enabled: true, status: 'active' }),
    };

    Object.defineProperty(serviceAny, 'bindingRepo', { value: bindingRepo, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'listResolver', { value: listResolver, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'ruleRepo', { value: ruleRepo, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'evaluateRule', {
      value: vi
        .fn()
        .mockResolvedValueOnce({ action: 'allow', matched: false, bound: true, reason: 'not-matched' })
        .mockResolvedValueOnce({
          action: 'block',
          matched: true,
          bound: true,
          matchedRuleId: 'r2',
          reason: 'matched',
        }),
      configurable: true,
      writable: true,
    });

    const decision = await service.evaluate({
      campaignId: 'c1',
      context: { campaignId: 'c1' },
    });

    expect(bindingRepo.getEffectiveBindings).toHaveBeenCalledWith('c1', undefined);
    expect(ruleRepo.findById).toHaveBeenNthCalledWith(1, 'r1');
    expect(ruleRepo.findById).toHaveBeenNthCalledWith(2, 'r2');
    expect(decision.action).toBe('block');
    expect(decision.matched).toBe(true);
    expect(decision.matchedLayer).toBe('campaign');
    expect(decision.matchedRuleId).toBe('r2');
  });

  it('skips unavailable bindings and returns allow when nothing decisive matches', async () => {
    const service = new RealtimeRuleEngineService(createEnv());
    const serviceAny = service as any;
    const bindingRepo = {
      getEffectiveBindings: vi.fn().mockResolvedValue([
        { scope: 'flow', scopeId: 'f1', ruleId: 'missing-rule', priority: 10, updatedAt: '' },
      ]),
    };
    const listResolver = {
      inWhitelist: vi.fn().mockResolvedValue(false),
      inBlacklist: vi.fn().mockResolvedValue(false),
    };
    const ruleRepo = {
      findById: vi.fn().mockResolvedValue(null),
    };

    Object.defineProperty(serviceAny, 'bindingRepo', { value: bindingRepo, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'listResolver', { value: listResolver, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'ruleRepo', { value: ruleRepo, configurable: true, writable: true });

    const decision = await service.evaluate({
      campaignId: 'c1',
      flowId: 'f1',
      context: { campaignId: 'c1', flowId: 'f1' },
    });

    expect(decision.action).toBe('allow');
    expect(decision.matched).toBe(false);
    expect(decision.bound).toBe(true);
    expect(decision.matchedLayer).toBe('flow');
    expect(decision.reason).toBe('bound_rule_unavailable');
  });

  it('applies whitelist matches before blacklist and autorules', async () => {
    const service = new RealtimeRuleEngineService(createEnv());
    const serviceAny = service as any;
    const bindingRepo = {
      getEffectiveBindings: vi.fn(),
    };
    const listResolver = {
      inWhitelist: vi.fn().mockResolvedValueOnce(true),
      inBlacklist: vi.fn().mockResolvedValue(false),
    };
    const ruleRepo = {
      findById: vi.fn(),
    };

    Object.defineProperty(serviceAny, 'bindingRepo', { value: bindingRepo, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'listResolver', { value: listResolver, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'ruleRepo', { value: ruleRepo, configurable: true, writable: true });

    const decision = await service.evaluate({
      campaignId: 'c1',
      context: { campaignId: 'c1', ip: '1.1.1.1' },
    });

    expect(decision.action).toBe('allow');
    expect(decision.matched).toBe(true);
    expect(decision.matchedLayer).toBe('whitelist');
    expect(bindingRepo.getEffectiveBindings).not.toHaveBeenCalled();
    expect(ruleRepo.findById).not.toHaveBeenCalled();
  });

  it('includes redirectUrl when a matched rule resolves to redirect', async () => {
    const service = new RealtimeRuleEngineService(createEnv());
    const serviceAny = service as any;
    const bindingRepo = {
      getEffectiveBindings: vi.fn().mockResolvedValue([
        { scope: 'campaign', scopeId: 'c1', ruleId: 'r-redirect', priority: 10, updatedAt: '' },
      ]),
    };
    const listResolver = {
      inWhitelist: vi.fn().mockResolvedValue(false),
      inBlacklist: vi.fn().mockResolvedValue(false),
    };
    const ruleRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'r-redirect',
        enabled: true,
        status: 'active',
        conditions: { eq: ['country', 'DE'] },
        actions: [
          {
            type: 'redirect',
            platform: 'internal',
            parameters: { redirectUrl: 'https://example.com/review' },
            delay: 0,
            retry: 0,
          },
        ],
      }),
    };

    Object.defineProperty(serviceAny, 'bindingRepo', { value: bindingRepo, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'listResolver', { value: listResolver, configurable: true, writable: true });
    Object.defineProperty(serviceAny, 'ruleRepo', { value: ruleRepo, configurable: true, writable: true });

    const decision = await service.evaluate({
      campaignId: 'c1',
      context: { campaignId: 'c1', country: 'DE' },
    });

    expect(decision.action).toBe('redirect');
    expect(decision.matched).toBe(true);
    expect(decision.redirectUrl).toBe('https://example.com/review');
  });
});
