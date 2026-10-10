import { describe, expect, it } from 'vitest';
import { createFlowRouter } from './flow.routes';
import type { FlowSchema, ValidationContext } from '@/types/flow.schema';

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
    clickId: 'clk-api-sim',
    timestamp: Date.parse('2026-10-07T12:00:00.000Z'),
    hourOfDay: 12,
    dayOfWeek: 3,
    visitsCount: 1,
    firstVisit: true,
    returning: false,
  },
};

const forcedSchema: FlowSchema = {
  flow: { id: 'forced-api', campaignId: 'camp-api', name: 'Forced API', type: 'forced', weight: 1, status: 'active' },
  rules: [],
  defaultAction: { type: 'allow' },
  version: '1.0',
  updatedAt: '2026-10-07T00:00:00.000Z',
};

const app = createFlowRouter();

describe('Flow simulation API', () => {
  it('returns a side-effect-free simulation result for a valid request', async () => {
    const response = await app.request('/simulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context, schemas: [forcedSchema], rotation: 'position' }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      data: {
        simulated: true,
        decision: 'flow',
        flowId: 'forced-api',
        action: { type: 'allow' },
        trace: [{ flowId: 'forced-api', matched: true }],
      },
    });
  });

  it('rejects a request missing required simulation inputs', async () => {
    const response = await app.request('/simulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schemas: [] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
