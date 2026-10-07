import { describe, expect, it } from 'vitest';
import {
  formatAiDecisionSourceLabel,
  formatAiEngineRoute,
  formatAiFallbackLabel,
} from '../../frontend/src/constants/ai-optimization-ui';

describe('AI optimization UI helpers', () => {
  it('formats the AI engine route for gateway, direct, and fallback modes', () => {
    expect(
      formatAiEngineRoute({
        provider: 'workers-ai-gateway',
        gatewayId: 'gw-prod-01',
      }),
    ).toBe('Workers AI via Gateway (gw-prod-01)');
    expect(
      formatAiEngineRoute({
        provider: 'workers-ai-direct',
      }),
    ).toBe('Workers AI direct');
    expect(
      formatAiEngineRoute({
        provider: 'heuristic-fallback',
      }),
    ).toBe('Heuristic fallback only');
  });

  it('formats decision source and fallback status for operators', () => {
    expect(
      formatAiDecisionSourceLabel({
        provider: 'workers-ai-gateway',
        gatewayId: 'gw-prod-01',
      }),
    ).toBe('Gateway:gw-prod-01');
    expect(
      formatAiDecisionSourceLabel({
        provider: 'heuristic-fallback',
      }),
    ).toBe('Heuristic');
    expect(
      formatAiFallbackLabel({
        fallbackUsed: true,
        fallbackReason: 'gateway timeout',
      }),
    ).toBe('Fallback: gateway timeout');
    expect(
      formatAiFallbackLabel({
        fallbackUsed: false,
      }),
    ).toBe('Primary AI path');
  });
});
