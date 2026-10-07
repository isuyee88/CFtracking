import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import { ReportService } from './report.service';

type SQLiteDatabase = InstanceType<typeof Database>;

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
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

  return { prepare } as unknown as D1Database;
}

function createMigratedDatabase(): { database: SQLiteDatabase; db: D1Database } {
  const database = new Database(':memory:');
  database.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const migrationDir = resolve(process.cwd(), 'schema/migrations');
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(readFileSync(resolve(migrationDir, file), 'utf8'));
  }
  return { database, db: createD1Adapter(database) };
}

describe('ReportService outbound delivery integration', () => {
  it('reports confirmed conversions separately from outbound delivery state', async () => {
    const { database, db } = createMigratedDatabase();
    try {
      database.prepare(`
        INSERT INTO clicks (
          id, clickId, campaignId, flowId, landingPageId, offerId, timestamp,
          ip, userAgent, referer, country, city, device, browser, os, isp,
          connectionType, visitorId, cost, isUnique, redirectUrl, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'click-report', 'clk-report', 'camp-report', null, null, 'offer-report',
        '2026-10-01T00:00:00.000Z', '203.0.113.20', 'qa-agent', null, 'US', 'New York',
        'desktop', 'Chrome', 'Windows', 'QA ISP', 'wifi', 'visitor-report', 3, 1,
        'https://landing.example.test', '2026-10-01T00:00:00.000Z',
      );
      database.prepare(`
        INSERT INTO conversions (
          id, conversionId, clickId, campaignId, offerId, timestamp,
          revenue, payout, currency, conversionType, status, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'conversion-report', 'cnv-report', 'clk-report', 'camp-report', 'offer-report',
        '2026-10-01T00:05:00.000Z', 12, 4, 'USD', 'lead', 'approved',
        '2026-10-01T00:05:00.000Z',
      );
      database.prepare(`
        INSERT INTO postback_idempotency (
          id, conversion_id, platform, status, attempt_count, last_status_code
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run('delivery-report', 'cnv-report', 'generic', 'sent', 1, 200);

      const report = await new ReportService({ DB: db } as any).generateReport({
        type: 'conversion',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        groupBy: ['campaign_id'],
      });

      expect(report).toMatchObject({
        metrics: {
          totalConversions: 1,
          totalConfirmedConversions: 1,
          totalOutboundPostbacksSent: 1,
          totalOutboundPostbacksPending: 0,
          totalOutboundPostbacksFailed: 0,
          totalRevenue: 12,
        },
        rows: [{
          metrics: {
            conversions: 1,
            confirmedConversions: 1,
            outboundPostbacksSent: 1,
            outboundPostbacksPending: 0,
            outboundPostbacksFailed: 0,
          },
        }],
      });
    } finally {
      database.close();
    }
  });
});
