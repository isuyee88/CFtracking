import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import postbackInboundRoutes from './postback-inbound.routes';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class DurableObject {},
}));

type SQLiteDatabase = InstanceType<typeof Database>;

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>(column?: string) => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
};

function createD1Adapter(database: SQLiteDatabase): D1Database {
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
    batch: async (statements: unknown[]) => {
      for (const statement of statements) {
        await (statement as unknown as D1Statement).run();
      }
      return [];
    },
  } as unknown as D1Database;
}

function createMigratedDatabase(): { database: SQLiteDatabase; db: D1Database } {
  const database = new Database(':memory:');
  database.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const migrationDir = resolve(process.cwd(), 'schema/migrations');
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(readFileSync(resolve(migrationDir, file), 'utf8'));
  }
  database.exec(`
    CREATE TABLE rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      window_start TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX idx_rate_limits_expiry ON rate_limits(expires_at);
    CREATE TABLE cache_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return { database, db: createD1Adapter(database) };
}

function seedClick(database: SQLiteDatabase): void {
  database.prepare(`
    INSERT INTO campaigns (id, name, alias, domain, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('camp-lifecycle', 'Lifecycle campaign', 'lifecycle', 'example.test', '2026-10-07T00:00:00.000Z', '2026-10-07T00:00:00.000Z');
  database.prepare(`
    INSERT INTO offers (id, name, url, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `).run('offer-lifecycle', 'Lifecycle offer', 'https://offer.example.test', '2026-10-07T00:00:00.000Z', '2026-10-07T00:00:00.000Z');
  database.prepare(`
    INSERT INTO clicks (
      id, clickId, campaignId, flowId, landingPageId, offerId, timestamp,
      ip, userAgent, referer, country, city, device, browser, os, isp,
      connectionType, visitorId, cost, isUnique, redirectUrl, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'click-row-lifecycle', 'clk-lifecycle', 'camp-lifecycle', null, null, 'offer-lifecycle',
    '2026-10-07T00:00:00.000Z', '203.0.113.10', 'qa-agent', null, 'US', 'New York',
    'desktop', 'Chrome', 'Windows', 'QA ISP', 'wifi', 'visitor-lifecycle', 0, 1,
    'https://landing.example.test', '2026-10-07T00:00:00.000Z',
  );
}

type EnvBindingStub = {
  idFromName: (name: string) => DurableObjectId;
  get: (id: DurableObjectId) => DurableObjectStub;
};

function createDoBinding(): EnvBindingStub {
  return {
    idFromName: () => ({}) as DurableObjectId,
    get: () => ({
      fetch: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    }) as unknown as DurableObjectStub,
  };
}

describe('inbound postback attribution identity', () => {
  it('rejects a webhook without a transaction id instead of fabricating one from click id', async () => {
    const response = await postbackInboundRoutes.request(
      '/generic?clickid=clk-1&payout=1&status=approved',
      { method: 'POST' },
      { ENVIRONMENT: 'test' } as any,
    );

    expect(response.status).toBe(400);
    const body = await response.json() as { error?: { code?: string } };
    expect(body.error?.code).toBe('MISSING_TRANSACTION_ID');
  });

  it('accepts the explicit transaction_id contract before downstream processing', async () => {
    const response = await postbackInboundRoutes.request(
      '/generic?clickid=clk-1&transaction_id=txn-1&payout=1&status=approved',
      { method: 'POST' },
      { ENVIRONMENT: 'test' } as any,
    );

    // The request may stop at security, rate limit, or click matching in this
    // isolated route test, but it must not be rejected as a missing identity.
    expect(response.status).not.toBe(400);
    const body = await response.json() as { code?: string };
    expect(body.code).not.toBe('MISSING_TRANSACTION_ID');
  });

  it('keeps pending-to-approved-to-reversed idempotent in a migrated D1 lifecycle', async () => {
    const { database, db } = createMigratedDatabase();
    seedClick(database);
    const doBinding = createDoBinding();
    const env = {
      ENVIRONMENT: 'test',
      DB: db,
      TRACKING_STATS_DO: doBinding,
      COUNTER_DO: doBinding,
    } as any;

    try {
      const pending = await postbackInboundRoutes.request(
        '/generic?clickid=clk-lifecycle&transaction_id=txn-lifecycle&payout=2&status=pending',
        { method: 'POST' },
        env,
      );
      expect(pending.status).toBe(200);

      const approved = await postbackInboundRoutes.request(
        '/generic?clickid=clk-lifecycle&transaction_id=txn-lifecycle&payout=2&status=approved',
        { method: 'POST' },
        env,
      );
      expect(approved.status).toBe(200);
      const approvedBody = await approved.json() as { data?: { conversionId?: string } };
      expect(approvedBody.data?.conversionId).toEqual(expect.any(String));

      const duplicateApproved = await postbackInboundRoutes.request(
        '/generic?clickid=clk-lifecycle&transaction_id=txn-lifecycle&payout=2&status=approved',
        { method: 'POST' },
        env,
      );
      expect(duplicateApproved.status).toBe(200);

      const reversed = await postbackInboundRoutes.request(
        '/generic?clickid=clk-lifecycle&transaction_id=txn-lifecycle&payout=2&status=reversed',
        { method: 'POST' },
        env,
      );
      expect(reversed.status).toBe(200);
      const reversedBody = await reversed.json() as { data?: { conversionId?: string } };
      expect(reversedBody.data?.conversionId).toBe(approvedBody.data?.conversionId);

      const eventRows = database.prepare(`
        SELECT transactionId, eventStatus, conversionId
        FROM attribution_events
        WHERE sourcePlatform = ? AND transactionId = ?
        ORDER BY receivedAt, createdAt
      `).all('generic', 'txn-lifecycle') as Array<{ transactionId: string; eventStatus: string; conversionId: string | null }>;
      expect(eventRows.map((row) => row.eventStatus)).toEqual(['pending', 'approved', 'reversed']);
      expect(eventRows.filter((row) => row.eventStatus === 'approved')).toHaveLength(1);
      expect(eventRows[1]?.conversionId).toBe(approvedBody.data?.conversionId);
      expect(eventRows[2]?.conversionId).toBe(approvedBody.data?.conversionId);

      const conversionRows = database.prepare(
        'SELECT conversionId, status FROM conversions WHERE clickId = ?',
      ).all('clk-lifecycle') as Array<{ conversionId: string; status: string }>;
      expect(conversionRows).toHaveLength(1);
      expect(conversionRows[0]).toEqual({
        conversionId: approvedBody.data?.conversionId,
        status: 'reversed',
      });
    } finally {
      database.close();
    }
  });
});
