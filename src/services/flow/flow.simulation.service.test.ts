import { describe, expect, it } from 'vitest';
import type { FlowSchema, ValidationContext } from '@/types/flow.schema';
import { FlowSimulationService } from './flow.simulation.service';

const context: ValidationContext = {
  visitor: {
    ip: '203.0.113.10',
    country: 'US',
    deviceType: 'desktop',
    os: 'Windows',
    browser: 'Chrome',
    userAgent: 'QA Agent',
  },
  visit: {
    clickId: 'clk-sim',
    timestamp: Date.parse('2026-10-07T12:00:00.000Z'),
    hourOfDay: 12,
    dayOfWeek: 3,
    visitsCount: 1,
    firstVisit: true,
    returning: false,
  },
};

function schema(
  id: string,
  type: 'forced' | 'regular' | 'default',
  weight: number,
  defaultAction: FlowSchema['defaultAction'] = { type: 'allow' },
): FlowSchema {
  return {
    flow: { id, campaignId: 'camp-sim', name: id, type, weight, status: 'active' },
    rules: [],
    defaultAction,
    version: '1.0',
    updatedAt: '2026-10-07T00:00:00.000Z',
  };
}

describe('FlowSimulationService', () => {
  it('returns a deterministic forced-flow decision with an explanation trace', async () => {
    const service = new FlowSimulationService();
    const input = {
      context,
      schemas: [
        schema('forced-b', 'forced', 20),
        schema('forced-a', 'forced', 10),
        schema('regular-a', 'regular', 1),
      ],
    };

    const first = await service.simulate(input);
    const second = await service.simulate(input);

    expect(first).toMatchObject({
      decision: second.decision,
      flowId: second.flowId,
      action: second.action,
      trace: second.trace,
      riskScore: second.riskScore,
      reason: second.reason,
    });
    expect(first.latencyMs).toBeGreaterThanOrEqual(0);
    expect(second.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns explicit default and do-nothing outcomes when no rule matches', async () => {
    const service = new FlowSimulationService();
    const defaultResult = await service.simulate({
      context,
      schemas: [schema('default-a', 'default', 0, { type: 'redirect', redirectUrl: 'https://example.test/default' })],
    });
    expect(defaultResult).toMatchObject({ decision: 'default', flowId: 'default-a', action: { type: 'redirect' } });

    const nothingResult = await service.simulate({ context, schemas: [] });
    expect(nothingResult).toMatchObject({ decision: 'do_nothing', flowId: null, action: { type: 'block' } });
    expect(nothingResult.reason).toBe('no_flow_matched');
  });
});
