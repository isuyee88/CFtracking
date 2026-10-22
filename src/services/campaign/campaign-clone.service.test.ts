/**
 * @file Unit tests for CampaignCloneService against the real D1 schema.
 *
 * The previous mock accepted the legacy snake_case schema and never exercised
 * the batch, so it passed while production failed. This test builds the
 * migration DDL in node:sqlite and asserts the committed rows.
 *
 * Route/cache behaviour is covered by `src/routes/campaign-clone.routes.test.ts`
 * and the zero-vitest suite in `test/node/campaign-clone.node.test.mjs`.
 */

import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { CampaignCloneService } from './campaign-clone.service';

const MIGRATIONS_DIR = new URL('../../../schema/migrations/', import.meta.url);

function applyMigration(db: DatabaseSync, name: string, shouldApply: (sql: string) => boolean = () => true): void {
  const sql = readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8');
  for (const statement of sql.replace(/^\s*--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean)) {
    if (shouldApply(statement)) {
      db.exec(statement);
    }
  }
}

/** Canonical schema from the migrations production runs (see 001/002/016/023/024/045/058/061). */
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

/** D1 adapter over node:sqlite; `batch` is transactional like D1's. */
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
          return { success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
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
        for (const statement of statements) results.push(await statement.run());
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

const T0 = '2000-01-01T00:00:00.000Z';

function createDatabase(): { db: DatabaseSync; d1: any } {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
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
  db.prepare(`INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES ('flow-one', 'offer-one', 100, ?)`).run(T0);
  return { db, d1: createD1(db) };
}

function row(db: DatabaseSync, sql: string, ...params: unknown[]): any {
  return (db.prepare(sql) as any).get(...params);
}

function count(db: DatabaseSync, sql: string, ...params: unknown[]): number {
  return (row(db, sql, ...params) as { n: number }).n;
}

describe('CampaignCloneService', () => {
  it('writes camelCase campaign/flow columns and pauses the clone by default', async () => {
    const { db, d1 } = createDatabase();
    const before = row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one');
    const service = new CampaignCloneService(d1);

    const result = await service.clone('camp-one', 'Cloned Campaign');
    const clonedId = result.data.clonedId;

    expect(result.success).toBe(true);
    expect(result.data.clonedCampaign.name).toBe('Cloned Campaign');
    expect(result.data.clonedCampaign.alias).toBe('cloned-campaign');
    expect(result.data.clonedCampaign.status).toBe('paused');
    expect(result.data.clonedCampaign.id).not.toBe('camp-one');
    expect(result.data.clonedFlowCount).toBe(1);
    expect(result.data.clonedOfferCount).toBe(1);
    expect(result.data.clonedLandingCount).toBe(0);
    expect(result.data.clonedAutoruleCount).toBe(0);

    const cloned = row(db, 'SELECT * FROM campaigns WHERE id = ?', clonedId);
    expect(cloned.domain).toBe('one.example');
    expect(cloned.costValue).toBe(0.25);
    expect(cloned.apiToken).not.toBe(undefined);
    expect(row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one')).toEqual(before);

    const flow = row(db, 'SELECT * FROM flows WHERE campaignId = ?', clonedId);
    expect(flow.id).not.toBe('flow-one');
    expect(flow.name).toBe('Flow One');
    expect(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', flow.id)).toBe(1);
    // Global offer library is referenced, not copied.
    expect(count(db, 'SELECT COUNT(*) AS n FROM offers')).toBe(1);
  });

  it('copies the original status only when cloneStatus is true', async () => {
    const { db, d1 } = createDatabase();
    const service = new CampaignCloneService(d1);

    const result = await service.clone('camp-one', 'Active Clone', { cloneStatus: true });

    expect(row(db, 'SELECT status FROM campaigns WHERE id = ?', result.data.clonedId)).toEqual({ status: 'active' });
  });

  it('throws for a missing campaign without writing anything', async () => {
    const { db, d1 } = createDatabase();
    const service = new CampaignCloneService(d1);
    const campaignsBefore = count(db, 'SELECT COUNT(*) AS n FROM campaigns');

    await expect(service.clone('non-existent', 'Clone')).rejects.toThrow(
      "Campaign with ID 'non-existent' not found"
    );
    expect(count(db, 'SELECT COUNT(*) AS n FROM campaigns')).toBe(campaignsBefore);
  });
});
