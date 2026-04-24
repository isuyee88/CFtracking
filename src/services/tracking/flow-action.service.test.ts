import { describe, expect, it } from 'vitest';
import { FlowActionService } from '@/services/tracking/flow-action.service';
import type { ClickRequest } from '@/services/tracking/click.service';
import type { Flow } from '@/types/flow';
import type { Offer } from '@/types/offer';

function createFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    campaignId: 'campaign-1',
    name: 'Flow 1',
    type: 'regular',
    weight: 100,
    status: 'active',
    filters: [],
    actionType: 'show_offer',
    actionConfig: { type: undefined as unknown as Flow['actionConfig']['type'] },
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  };
}

function createRequest(overrides: Partial<ClickRequest> = {}): ClickRequest {
  return {
    campaignId: 'campaign-1',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  };
}

function createOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'offer-1',
    name: 'Offer 1',
    url: 'https://example.com/offer',
    payout: 1,
    currency: 'USD',
    payoutType: 'fixed',
    redirectType: 'http',
    actionType: 'local',
    countries: [],
    network: '',
    group: '',
    status: 'active',
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('FlowActionService', () => {
  it('uses flow.actionType when actionConfig.type is undefined', async () => {
    const service = new FlowActionService();

    const result = await service.execute({
      flow: createFlow(),
      request: createRequest(),
      offer: createOffer(),
    });

    expect(result.actionType).toBe('show_offer');
    expect(result.redirectUrl).toBe('https://example.com/offer');
    expect(result.statusCode).toBe(302);
  });
});