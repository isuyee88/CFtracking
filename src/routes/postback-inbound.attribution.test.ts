import { describe, expect, it } from 'vitest';
import { normalizeInboundAttributionStatus } from './postback-inbound.routes';

describe('inbound attribution status normalization', () => {
  it.each([
    ['approved', 'approved'],
    ['conversion', 'approved'],
    ['complete', 'approved'],
    ['pending', 'pending'],
    ['hold', 'pending'],
    ['rejected', 'rejected'],
    ['declined', 'rejected'],
    ['reversed', 'reversed'],
    ['refunded', 'reversed'],
    ['chargeback', 'reversed'],
  ] as const)('maps %s to %s', (raw, expected) => {
    expect(normalizeInboundAttributionStatus(raw)).toBe(expected);
  });

  it('uses pending as the conservative state for unknown provider values', () => {
    expect(normalizeInboundAttributionStatus('provider_specific_state')).toBe('pending');
  });
});
