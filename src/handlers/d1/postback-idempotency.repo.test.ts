import { describe, expect, it } from 'vitest';
import { PostbackIdempotencyRepository } from './postback-idempotency.repo';

describe('PostbackIdempotencyRepository delivery state', () => {
  it('does not consider pending or retry records sent', async () => {
    const statements: string[] = [];
    const db = {
      prepare(sql: string) {
        statements.push(sql);
        return {
          bind(..._args: unknown[]) {
            return {
              async first() {
                return null;
              },
              async run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
      batch: async () => undefined,
    } as any;

    const repo = new PostbackIdempotencyRepository(db);
    await repo.markAsPending('cnv-1', 'generic');
    await repo.markAsRetry('cnv-1', 'generic', 'timeout', 1);
    expect(await repo.isSent('cnv-1', 'generic')).toBe(false);
    expect(statements.some((sql) => sql.includes("'retry'"))).toBe(true);
  });

  it('marks sent only explicitly and exposes due retry records', async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        return {
          bind(..._args: unknown[]) {
            return {
              async first() { return null; },
              async all() { return { results: [], success: true }; },
              async run() { return { meta: { changes: 1 } }; },
            };
          },
        };
      },
      batch: async () => undefined,
    } as any;
    const repo = new PostbackIdempotencyRepository(db);
    await repo.markAsSent('cnv-2', 'generic');
    expect(prepared.some((sql) => sql.includes("'sent'"))).toBe(true);
    expect(await repo.listDueRetries(10)).toEqual([]);
    expect(prepared.some((sql) => sql.includes("julianday(next_attempt_at) <= julianday('now')"))).toBe(true);
  });
});
