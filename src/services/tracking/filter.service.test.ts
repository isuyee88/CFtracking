import { describe, expect, it, vi } from 'vitest';
import { FilterService } from '@/services/tracking/filter.service';
import type { ClickRequest } from '@/services/tracking/click.service';
import type { Flow } from '@/types/flow';

function createFlow(id: string, weight: number): Flow {
  return {
    id,
    campaignId: 'campaign-1',
    name: id,
    type: 'regular',
    weight,
    status: 'active',
    filters: [],
    actionType: 'show_offer',
    actionConfig: { type: 'show_offer' },
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  };
}

const request: ClickRequest = {
  campaignId: 'campaign-1',
  ip: '127.0.0.1',
  userAgent: 'test-agent',
};

describe('FilterService', () => {
  it('returns the first regular flow in position mode', () => {
    const service = new FilterService();

    const selected = service.selectMatchingFlow(
      [createFlow('flow-a', 10), createFlow('flow-b', 90)],
      request,
      'position'
    );

    expect(selected?.id).toBe('flow-a');
  });

  it('uses weighted selection in weight mode', () => {
    const service = new FilterService();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.95);

    const selected = service.selectMatchingFlow(
      [createFlow('flow-a', 10), createFlow('flow-b', 90)],
      request,
      'weight'
    );

    expect(selected?.id).toBe('flow-b');
    randomSpy.mockRestore();
  });
});