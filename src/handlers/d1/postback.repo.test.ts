import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { PostbackLogRepository } from './postback.repo';
import type { D1Database } from './index';

type SQLiteDatabase = InstanceType<typeof Database>;

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
};

function createD1(database: SQLiteDatabase): D1Database {
  const prepare = (sql: string): D1Statement => {
    const statement = database.prepare(sql);
    let values: unknown[] = [];
    const execute = (): D1Statement => ({
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        return execute();
      },
      first: async <T>() => statement.get(...values) as T | null,
      all: async <T>() => ({ results: statement.all(...values) as T[] }),
      run: async () => {
        const result = statement.run(...values);
        return { success: true, meta: { changes: result.changes } };
      },
    });
    return execute();
  };

  return {
    prepare,
    exec: async (sql: string) => {
      database.exec(sql);
    },
  } as unknown as D1Database;
}

describe('PostbackLogRepository retryable delivery query', () => {
  it('bootstraps a fresh postback log table and only returns delivery-state retries', async () => {
    const database = new Database(':memory:');
    database.exec(readFileSync(resolve(process.cwd(), 'schema/migrations/075_postback_delivery_state.sql'), 'utf8'));
    const repository = new PostbackLogRepository(createD1(database));

    try {
      await expect(repository.findRetryableLogs()).resolves.toEqual([]);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='postback_logs'").get()).toBeTruthy();

      database.prepare(`
        INSERT INTO postback_logs (
          id, taskId, conversionId, clickId, campaignId, platform, url, method,
          statusCode, latencyMs, success, retryCount, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('log-retry-old', 'task-retry-old', 'cnv-retry', 'clk-retry', 'camp-retry', 'generic', 'https://example.test', 'GET', 502, 8, 0, 1, '2026-10-06T23:00:00.000Z');
      database.prepare(`
        INSERT INTO postback_logs (
          id, taskId, conversionId, clickId, campaignId, platform, url, method,
          statusCode, latencyMs, success, retryCount, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('log-retry', 'task-retry', 'cnv-retry', 'clk-retry', 'camp-retry', 'generic', 'https://example.test', 'GET', 503, 10, 0, 2, '2026-10-07T00:00:00.000Z');
      database.prepare(`
        INSERT INTO postback_idempotency (id, conversion_id, platform, status, attempt_count)
        VALUES (?, ?, ?, 'retry', ?)
      `).run('delivery-retry', 'cnv-retry', 'generic', 1);

      const logs = await repository.findRetryableLogs(10, 'cnv-retry', 'generic');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ id: 'log-retry', conversionId: 'cnv-retry', platform: 'generic', success: false });
    } finally {
      database.close();
    }
  });
});
