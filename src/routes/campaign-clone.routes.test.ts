/**
 * @file Integration tests for the campaign clone route against the real D1 schema.
 *
 * Why this exists: the previous version of this file mocked `db.prepare`, so it
 * accepted the legacy snake_case SQL (`traffic_source_id`, `campaign_offers`,
 * ...) that every migration-built database rejects. This test loads the actual
 * migration DDL into node:sqlite and runs the production service and Hono route
 * against it, so a column/table drift fails here.
 *
 * The faster, zero-vitest suite covering the same invariants lives in
 * `test/node/campaign-clone.node.test.mjs`; keep both in sync when the clone
 * contract changes.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { CampaignCloneService } from '../services/campaign/campaign-clone.service';
import { cloneRouter } from './campaign-clone.routes';

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);

function readMigration(name: string): string {
  return readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8');
}

/** Strip line comments and split on ';' (migrations contain no quoted ';'). */
function statementsOf(sql: string): string[] {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function applyMigration(db: DatabaseSync, name: string, shouldApply: (sql: string) => boolean = () => true): void {
  for (const statement of statementsOf(readMigration(name))) {
    if (shouldApply(statement)) {
      db.exec(statement);
    }
  }
}

/**
 * Canonical schema from the migrations production runs. 016/058 also alter
 * tables whose creators are outside this fixture (trafficSources,
 * affiliateNetworks, clicks); only campaign/flow/rule DDL matters here.
 */
function createSchema(db: DatabaseSync): void {
  applyMigration(db, '001_init.sql');
  applyMigration(
    db,
    '016_add_display_ids.sql',
    (statement) => !/trafficSources|traffic_sources|affiliateNetworks|affiliate_networks/i.test(statement)
  );
  applyMigration(db, '002_add_flow_filters.sql');
  applyMigration(db, '023_add_campaign_uniqueness_method.sql');
  applyMigration(db, '024_add_flow_action_fields.sql');
  applyMigration(db, '045_enhance_flow_rules.sql');
  applyMigration(db, '058_unify_autorules_binding_and_metrics.sql', (statement) => !/clicks/i.test(statement));
  applyMigration(db, '061_expand_autorule_bindings_priority.sql');
}

/**
 * D1 adapter over node:sqlite. `batch` mirrors D1 semantics: a failing
 * statement rolls back every earlier statement in the batch.
 */
function createD1(db: DatabaseSync): any {
  return {
    prepare(sql: string) {
      let params: unknown[] = [];
      const statement = {
        bind(...args: unknown[]) {
          params = args;
          return statement;
        },
        async all() {
          return { results: (db.prepare(sql) as any).all(...params), success: true, meta: {} };
        },
        async run() {
          const info = (db.prepare(sql) as any).run(...params);
          return {
            success: true,
            meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
          };
        },
        async first(column?: string) {
          const row = (db.prepare(sql) as any).get(...params) as Record<string, unknown> | undefined;
          if (row === undefined) return null;
          return column ? (row[column] ?? null) : row;
        },
      };
      return statement;
    },
    async batch(statements: any[]) {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async exec(sql: string) {
      db.exec(sql.replace(/;\s*$/, ''));
      return { count: 0, duration: 0 };
    },
  };
}

const T0 = '2000-01-01T00:00:00.000Z';

function seed(db: DatabaseSync): void {
  db.prepare(`
    INSERT INTO campaigns (
      id, name, alias, domain, "group", trafficSource, flowRotation, costModel,
      costValue, status, createdAt, updatedAt
    ) VALUES ('camp-one', 'Camp One', 'camp-one', 'one.example', 'g1', 'google',
      'position', 'cpc', 0.25, 'active', ?, ?)
  `).run(T0, T0);

  db.prepare(`
    INSERT INTO flows (id, campaignId, name, type, weight, status, filters, actionType, actionConfig, createdAt, updatedAt)
    VALUES ('flow-one', 'camp-one', 'Flow One', 'regular', 70, 'active', '[]', 'redirect', '{}', ?, ?)
  `).run(T0, T0);

  db.prepare(`INSERT INTO offers (id, name, url, status, createdAt, updatedAt)
              VALUES ('offer-one', 'Offer One', 'https://offer.example/one', 'active', ?, ?)`).run(T0, T0);
  db.prepare(`INSERT INTO landingPages (id, name, url, status, createdAt, updatedAt)
              VALUES ('landing-one', 'Landing One', 'https://landing.example/one', 'active', ?, ?)`).run(T0, T0);
  db.prepare(`INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES ('flow-one', 'offer-one', 100, ?)`).run(T0);
  db.prepare(`INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES ('flow-one', 'landing-one', 100, ?)`).run(T0);

  db.prepare(`INSERT INTO rules (id, name, type, conditions, actions, status, createdAt, updatedAt)
              VALUES ('rule-one', 'Rule One', 'condition', '{}', '{}', 'active', ?, ?)`).run(T0, T0);
  db.prepare(`INSERT INTO campaign_rule_binding_entries (id, campaignId, ruleId, priority, enabled, createdAt, updatedAt)
              VALUES ('entry-one', 'camp-one', 'rule-one', 0, 1, ?, ?)`).run(T0, T0);
}

function createDatabase(): { db: DatabaseSync; d1: any } {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
  seed(db);
  return { db, d1: createD1(db) };
}

function count(db: DatabaseSync, sql: string, ...params: unknown[]): number {
  return ((db.prepare(sql) as any).get(...params) as { n: number }).n;
}

function row(db: DatabaseSync, sql: string, ...params: unknown[]): any {
  return (db.prepare(sql) as any).get(...params);
}

const savedCaches = (globalThis as any).caches;

afterEach(() => {
  if (savedCaches === undefined) {
    delete (globalThis as any).caches;
  } else {
    (globalThis as any).caches = savedCaches;
  }
});

describe('CampaignCloneService on the real schema', () => {
  it('copies campaign config, flows and relations without touching originals', async () => {
    const { db, d1 } = createDatabase();
    const before = row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one');
    const service = new CampaignCloneService(d1);

    const result = await service.clone('camp-one', 'Cloned Camp');
    const clonedId = result.data.clonedId;

    expect(result.success).toBe(true);
    expect(result.data.clonedCampaign.alias).toBe('cloned-camp');
    expect(result.data.clonedFlowCount).toBe(1);
    expect(result.data.clonedOfferCount).toBe(1);
    expect(result.data.clonedLandingCount).toBe(1);
    expect(result.data.clonedAutoruleCount).toBe(1);

    const cloned = row(db, 'SELECT * FROM campaigns WHERE id = ?', clonedId);
    expect(cloned.name).toBe('Cloned Camp');
    expect(cloned.domain).toBe('one.example');
    expect(cloned.costValue).toBe(0.25);
    expect(cloned.status).toBe('paused');
    expect(cloned.createdAt).not.toBe(T0);
    expect(row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one')).toEqual(before);

    const flows = (db.prepare('SELECT * FROM flows WHERE campaignId = ?').all(clonedId) as any[]) as any[];
    expect(flows).toHaveLength(1);
    expect(flows[0].id).not.toBe('flow-one');
    expect(flows[0].name).toBe('Flow One');
    expect(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', flows[0].id)).toBe(1);
    expect(count(db, 'SELECT COUNT(*) AS n FROM flowLandingPages WHERE flowId = ?', flows[0].id)).toBe(1);
    expect(
      count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_binding_entries WHERE campaignId = ?', clonedId)
    ).toBe(1);

    // Global libraries are referenced, never copied or deleted.
    expect(count(db, 'SELECT COUNT(*) AS n FROM offers')).toBe(1);
    expect(count(db, 'SELECT COUNT(*) AS n FROM landingPages')).toBe(1);
  });

  it('fails cleanly instead of writing the legacy snake_case schema', async () => {
    const { db, d1 } = createDatabase();
    const service = new CampaignCloneService(d1);

    expect(() => (db.prepare('SELECT traffic_source_id FROM campaigns') as any).all()).toThrow(
      /no such column: traffic_source_id/
    );
    expect(() => (db.prepare('SELECT * FROM campaign_offers') as any).all()).toThrow(/no such table: campaign_offers/);

    await service.clone('camp-one', 'Second Clone');
    expect(count(db, 'SELECT COUNT(*) AS n FROM campaigns')).toBe(2);
  });
});

describe('POST /api/campaigns/:id/clone', () => {
  function createApp(): Hono {
    const app = new Hono();
    app.route('/api', cloneRouter);
    return app;
  }

  it('returns the committed clone even when cache maintenance is unavailable', async () => {
    const { db, d1 } = createDatabase();
    // No `caches.default` in this fixture: CacheUpdateService construction
    // throws, and the route must still report the committed clone.
    delete (globalThis as any).caches;

    const response = await createApp().request(
      '/api/campaigns/camp-one/clone',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: 'Route Clone' }),
      },
      { DB: d1, CACHE_UPDATE_TOKEN: 'test-token', UNIQUENESS_KV: { async delete() {} } } as any
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { clonedId: string } };
    expect(body.success).toBe(true);
    expect(row(db, 'SELECT * FROM campaigns WHERE id = ?', body.data.clonedId).status).toBe('paused');
  });

  it('returns 404 for a missing campaign and 400 for a missing name', async () => {
    const { d1 } = createDatabase();
    const app = createApp();
    const env = { DB: d1, CACHE_UPDATE_TOKEN: 'test-token', UNIQUENESS_KV: { async delete() {} } } as any;

    const missing = await app.request('/api/campaigns/nope/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: 'Whatever' }),
    }, env);
    expect(missing.status).toBe(404);

    const invalid = await app.request('/api/campaigns/camp-one/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env);
    expect(invalid.status).toBe(400);
  });
});
