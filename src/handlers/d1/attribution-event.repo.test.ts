import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAttributionEvent } from '@/types/attribution-event';
import {
  AttributionEventRepository,
  InvalidAttributionStatusTransitionError,
} from './attribution-event.repo';

function createD1(db: Database.Database): any {
  return {
    prepare(sql: string) {
      return {
        bind(...bindings: unknown[]) {
          return {
            async first<T = Record<string, unknown>>() {
              return (db.prepare(sql).get(...bindings) as T | undefined) ?? null;
            },
            async all<T = Record<string, unknown>>() {
              const results = db.prepare(sql).all(...bindings) as T[];
              return { results, success: true, meta: { changes: 0 } };
            },
            async run() {
              const result = db.prepare(sql).run(...bindings);
              return {
                success: true,
                meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) },
              };
            },
          };
        },
      };
    },
  };
}

describe('AttributionEventRepository', () => {
  let db: Database.Database;
  let repository: AttributionEventRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(readFileSync(resolve(process.cwd(), 'schema/migrations/074_attribution_events.sql'), 'utf8'));
    repository = new AttributionEventRepository(createD1(db));
  });

  it('stores each transaction status once and returns duplicates without inserting again', async () => {
    const event = createAttributionEvent({
      sourcePlatform: 'impact',
      transactionId: 'txn-1',
      clickId: 'clk-1',
      status: 'pending',
      occurredAt: '2026-10-07T10:00:00.000Z',
    });

    const first = await repository.append(event, {
      rawHash: 'hash-1',
      requestId: 'req-1',
      receivedAt: '2026-10-07T10:00:01.000Z',
    });
    const duplicate = await repository.append(event, {
      rawHash: 'hash-1',
      requestId: 'req-2',
      receivedAt: '2026-10-07T10:00:02.000Z',
    });

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(db.prepare('SELECT COUNT(*) AS count FROM attribution_events').get()).toEqual({ count: 1 });
  });

  it('accepts pending to approved to reversed and exposes the latest status', async () => {
    const base = {
      sourcePlatform: 'mylead',
      transactionId: 'txn-2',
      occurredAt: '2026-10-07T10:00:00.000Z',
    };

    await repository.append(createAttributionEvent({ ...base, status: 'pending' }), {
      rawHash: 'hash-pending', requestId: 'req-pending', receivedAt: '2026-10-07T10:00:01.000Z',
    });
    await repository.append(createAttributionEvent({ ...base, status: 'approved', payout: 12.5 }), {
      rawHash: 'hash-approved', requestId: 'req-approved', receivedAt: '2026-10-07T10:00:02.000Z',
    });
    await repository.append(createAttributionEvent({ ...base, status: 'reversed' }), {
      rawHash: 'hash-reversed', requestId: 'req-reversed', receivedAt: '2026-10-07T10:00:03.000Z',
    });

    const latest = await repository.latest('mylead', 'txn-2');
    expect(latest?.eventStatus).toBe('reversed');
    expect(latest?.payout).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS count FROM attribution_events').get()).toEqual({ count: 3 });
  });

  it('rejects a terminal status reopening and never stores the raw payload', async () => {
    const base = { sourcePlatform: 'partnerboost', transactionId: 'txn-3', occurredAt: '2026-10-07T10:00:00.000Z' };
    await repository.append(createAttributionEvent({ ...base, status: 'rejected' }), {
      rawHash: 'hash-rejected', requestId: 'req-rejected', receivedAt: '2026-10-07T10:00:01.000Z',
    });

    await expect(repository.append(createAttributionEvent({ ...base, status: 'approved' }), {
      rawHash: 'hash-approved', requestId: 'req-approved', receivedAt: '2026-10-07T10:00:02.000Z',
    })).rejects.toBeInstanceOf(InvalidAttributionStatusTransitionError);

    const columns = db.prepare('PRAGMA table_info(attribution_events)').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).not.toContain('rawPayload');
  });

  it('attaches the conversion id to the matching ledger event without creating another event', async () => {
    const event = createAttributionEvent({
      sourcePlatform: 'impact',
      transactionId: 'txn-4',
      status: 'approved',
      occurredAt: '2026-10-07T10:00:00.000Z',
    });
    await repository.append(event, {
      rawHash: 'hash-4',
      requestId: 'req-4',
      receivedAt: '2026-10-07T10:00:01.000Z',
    });

    await repository.attachConversionId('impact', 'txn-4', 'approved', 'cnv-4');

    const latest = await repository.latest('impact', 'txn-4');
    expect(latest?.conversionId).toBe('cnv-4');
    expect(db.prepare('SELECT COUNT(*) AS count FROM attribution_events').get()).toEqual({ count: 1 });
  });
});
