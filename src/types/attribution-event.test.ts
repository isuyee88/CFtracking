import { describe, expect, it } from 'vitest';
import {
  buildAttributionEventKey,
  canTransitionConversionStatus,
  createAttributionEvent,
} from './attribution-event';

describe('attribution event contract', () => {
  it('builds a collision-safe identity from source platform and transaction id', () => {
    const event = createAttributionEvent({
      sourcePlatform: 'impact',
      transactionId: 'txn_123',
      status: 'pending',
      occurredAt: '2026-10-07T10:00:00.000Z',
      clickId: 'clk_123',
    });

    expect(event.identity).toEqual({ sourcePlatform: 'impact', transactionId: 'txn_123' });
    expect(buildAttributionEventKey(event)).toBe('impact:6:txn_123');
  });

  it('does not collide when a platform or transaction contains the delimiter', () => {
    const left = createAttributionEvent({
      sourcePlatform: 'a:b',
      transactionId: 'c',
      status: 'approved',
      occurredAt: '2026-10-07T10:00:00.000Z',
    });
    const right = createAttributionEvent({
      sourcePlatform: 'a',
      transactionId: 'b:c',
      status: 'approved',
      occurredAt: '2026-10-07T10:00:00.000Z',
    });

    expect(buildAttributionEventKey(left)).not.toBe(buildAttributionEventKey(right));
  });

  it('allows monotonic pending to approved to reversed transitions', () => {
    expect(canTransitionConversionStatus(null, 'pending')).toBe(true);
    expect(canTransitionConversionStatus('pending', 'approved')).toBe(true);
    expect(canTransitionConversionStatus('approved', 'reversed')).toBe(true);
    expect(canTransitionConversionStatus('reversed', 'approved')).toBe(false);
    expect(canTransitionConversionStatus('rejected', 'approved')).toBe(false);
  });

  it('rejects missing identity fields and unsupported timestamps', () => {
    expect(() => createAttributionEvent({
      sourcePlatform: '',
      transactionId: 'txn_123',
      status: 'approved',
      occurredAt: '2026-10-07T10:00:00.000Z',
    })).toThrow('sourcePlatform');

    expect(() => createAttributionEvent({
      sourcePlatform: 'impact',
      transactionId: 'txn_123',
      status: 'approved',
      occurredAt: 'not-a-date',
    })).toThrow('occurredAt');
  });
});
