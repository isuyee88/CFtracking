/**
 * @file Offline regression tests for bulk campaign operations and their routes.
 *
 * Why this exists: the D1 schema uses camelCase columns and plural relation
 * tables that vitest mocks never validated. These tests load the real
 * migration DDL into node:sqlite, so a wrong column/table name fails here
 * instead of returning a production 500.
 *
 * The D1 shim implements the subset the production code uses: prepare -> bind
 * -> all/run/first, transactional batch(), and exec(). Route tests use Hono's
 * app.request() with a fake Cache API + KV so the real CacheUpdateService path
 * runs and the alias captured before delete is observable.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/*.node.test.mjs
 *
 * `--test-isolation=none` is required in this sandbox: the default per-file
 * child process fails with spawn EPERM. The tests are still independent, each
 * building its own in-memory database.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import './ts-resolve-hooks.mjs';
import { BulkOperationsService } from '../../src/services/campaign/bulk-operations.service.ts';

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);

function readMigration(name) {
  return readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8');
}

/** Strip line comments and split on ';' (migrations contain no quoted ';'). */
function statementsOf(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

function applyMigration(db, name, shouldApply = () => true) {
  for (const statement of statementsOf(readMigration(name))) {
    if (shouldApply(statement)) {
      db.exec(statement);
    }
  }
}

/**
 * Build the canonical schema from the same migration files production runs.
 * 058 also alters `clicks` (created by 010), which this minimal fixture does
 * not load; only its autorule binding DDL is relevant here.
 */
function createSchema(db) {
  applyMigration(db, '001_init.sql');
  applyMigration(db, '016_add_display_ids.sql', statement => !/trafficSources|traffic_sources|affiliateNetworks|affiliate_networks/i.test(statement));
  applyMigration(db, '023_add_campaign_uniqueness_method.sql');
  applyMigration(db, '045_enhance_flow_rules.sql');
  applyMigration(db, '058_unify_autorules_binding_and_metrics.sql', statement => !/clicks/i.test(statement));
  applyMigration(db, '061_expand_autorule_bindings_priority.sql');
  applyMigration(db, '064_add_autorule_scope_configs.sql');
  applyMigration(db, '083_flow_rules_compat.sql');
}

/**
 * D1 adapter over node:sqlite. `batch` mirrors D1's transactional semantics:
 * a failing statement rolls back every earlier statement in the batch.
 */
function createD1(db) {
  return {
    prepare(sql) {
      let params = [];
      const statement = {
        bind(...args) {
          params = args;
          return statement;
        },
        async all() {
          return { results: db.prepare(sql).all(...params), success: true, meta: {} };
        },
        async run() {
          const info = db.prepare(sql).run(...params);
          return {
            success: true,
            meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
          };
        },
        async first(column) {
          const row = db.prepare(sql).get(...params);
          if (row === undefined) return null;
          return column ? (row[column] ?? null) : row;
        },
      };
      return statement;
    },
    async batch(statements) {
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
    async exec(sql) {
      db.exec(sql.replace(/;\s*$/, ''));
      return { count: 0, duration: 0 };
    },
  };
}

function seed(db) {
  const insertCampaign = db.prepare(
    `INSERT INTO campaigns (id, name, alias, domain, "group", trafficSource, costModel, costValue, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertCampaign.run('camp-one', 'Camp One', 'camp-one', 'one.example', 'g1', 'google', 'cpc', 0.2, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z');
  insertCampaign.run('camp-two', 'Camp Two', 'camp-two', 'two.example', 'g1', 'google', 'cpc', 0.3, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z');

  db.prepare(
    `INSERT INTO flows (id, campaignId, name, type, weight, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'regular', 100, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('flow-one', 'camp-one', 'Flow One');
  db.prepare(
    `INSERT INTO flows (id, campaignId, name, type, weight, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'regular', 100, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('flow-two', 'camp-two', 'Flow Two');

  const insertOffer = db.prepare(
    `INSERT INTO offers (id, name, url, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertOffer.run('offer-one', 'Offer One', 'https://offer.example/one');
  insertOffer.run('offer-two', 'Offer Two', 'https://offer.example/two');

  const insertLanding = db.prepare(
    `INSERT INTO landingPages (id, name, url, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertLanding.run('landing-one', 'Landing One', 'https://landing.example/one');
  insertLanding.run('landing-two', 'Landing Two', 'https://landing.example/two');

  db.prepare(
    `INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, 100, '2000-01-01T00:00:00.000Z')`
  ).run('flow-one', 'offer-one');
  db.prepare(
    `INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, 100, '2000-01-01T00:00:00.000Z')`
  ).run('flow-two', 'offer-two');
  db.prepare(
    `INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES (?, ?, 100, '2000-01-01T00:00:00.000Z')`
  ).run('flow-one', 'landing-one');
  db.prepare(
    `INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES (?, ?, 100, '2000-01-01T00:00:00.000Z')`
  ).run('flow-two', 'landing-two');

  const insertRule = db.prepare(
    `INSERT INTO rules (id, name, type, conditions, actions, status, createdAt, updatedAt)
     VALUES (?, ?, 'condition', '{}', '{}', 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertRule.run('rule-one', 'Rule One');
  insertRule.run('rule-two', 'Rule Two');

  const insertFlowRule = db.prepare(
    `INSERT INTO flow_rules (id, flowId, name, conditions, logic, priority, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, '{}', 'AND', 0, 1, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertFlowRule.run('flow-rule-one', 'flow-one', 'Flow Rule One');
  insertFlowRule.run('flow-rule-two', 'flow-two', 'Flow Rule Two');

  const insertCompatRule = db.prepare(
    `INSERT INTO flowRules (id, flowId, name, condition, action, status, createdAt, updatedAt)
     VALUES (?, ?, ?, '{}', '{}', 'active', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertCompatRule.run('compat-rule-one', 'flow-one', 'Compat Rule One');
  insertCompatRule.run('compat-rule-two', 'flow-two', 'Compat Rule Two');

  db.prepare(
    `INSERT INTO campaign_rule_bindings (campaignId, ruleId, createdAt, updatedAt)
     VALUES (?, ?, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('camp-one', 'rule-one');
  db.prepare(
    `INSERT INTO campaign_rule_bindings (campaignId, ruleId, createdAt, updatedAt)
     VALUES (?, ?, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('camp-two', 'rule-two');
  db.prepare(
    `INSERT INTO flow_rule_bindings (flowId, ruleId, createdAt, updatedAt)
     VALUES (?, ?, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('flow-one', 'rule-one');
  db.prepare(
    `INSERT INTO flow_rule_bindings (flowId, ruleId, createdAt, updatedAt)
     VALUES (?, ?, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  ).run('flow-two', 'rule-two');

  const insertCampaignEntry = db.prepare(
    `INSERT INTO campaign_rule_binding_entries (id, campaignId, ruleId, priority, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 1, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertCampaignEntry.run('entry-campaign-one', 'camp-one', 'rule-one');
  insertCampaignEntry.run('entry-campaign-two', 'camp-two', 'rule-two');

  const insertFlowEntry = db.prepare(
    `INSERT INTO flow_rule_binding_entries (id, flowId, ruleId, priority, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 1, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertFlowEntry.run('entry-flow-one', 'flow-one', 'rule-one');
  insertFlowEntry.run('entry-flow-two', 'flow-two', 'rule-two');

  // 064 layered autorule scopes. Campaign scope rows belong to one campaign;
  // global / traffic_source rows are shared and must survive a campaign delete.
  const insertScopeConfig = db.prepare(
    `INSERT INTO autorule_scope_configs (id, scopeType, scopeId, mode, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 'rules', 1, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertScopeConfig.run('scope_campaign_camp-one', 'campaign', 'camp-one');
  insertScopeConfig.run('scope_campaign_camp-two', 'campaign', 'camp-two');
  insertScopeConfig.run('scope_global', 'global', 'global');
  insertScopeConfig.run('scope_traffic_google', 'traffic_source', 'google');

  const insertScopeBinding = db.prepare(
    `INSERT INTO autorule_scope_bindings (id, scopeConfigId, ruleId, priority, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 1, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`
  );
  insertScopeBinding.run('scope-binding-camp-one', 'scope_campaign_camp-one', 'rule-one');
  insertScopeBinding.run('scope-binding-camp-two', 'scope_campaign_camp-two', 'rule-two');
  insertScopeBinding.run('scope-binding-global', 'scope_global', 'rule-one');
  insertScopeBinding.run('scope-binding-google', 'scope_traffic_google', 'rule-one');
}

function createDatabase() {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
  seed(db);
  return { db, d1: createD1(db) };
}

function count(db, sql, ...params) {
  return db.prepare(sql).get(...params).n;
}

/**
 * Cache maintenance logs on both success and failure; keep test output focused
 * while still letting a test assert that a failure was reported, not swallowed
 * silently into a 500.
 */
async function captureConsole(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  const errors = [];
  console.log = (...args) => logs.push(args.map(String).join(' '));
  console.error = (...args) => errors.push(args.map(String).join(' '));
  try {
    return { value: await fn(), logs, errors };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('bulkUpdate writes camelCase columns and refreshes updatedAt', async () => {
  const { db, d1 } = createDatabase();
  const service = new BulkOperationsService(d1);

  const result = await service.bulkUpdate(['camp-one', 'camp-two'], {
    costModel: 'cpa',
    costValue: 1.5,
    trafficSource: 'facebook',
    group: 'group-b',
    status: 'paused',
  });

  assert.equal(result.success, true);
  assert.equal(result.processed, 2);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.errors, []);

  const rows = db
    .prepare(
      `SELECT id, costModel, costValue, trafficSource, "group", status, updatedAt
       FROM campaigns ORDER BY id`
    )
    .all();

  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.costModel, 'cpa');
    assert.equal(row.costValue, 1.5);
    assert.equal(row.trafficSource, 'facebook');
    assert.equal(row.group, 'group-b');
    assert.equal(row.status, 'paused');
    // datetime('now') output, not the seeded ISO timestamp and not `updated_at`.
    assert.match(row.updatedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.notEqual(row.updatedAt, '2000-01-01T00:00:00.000Z');
  }
});

test('bulkDelete removes relations, rules, bindings and one campaign only', async () => {
  const { db, d1 } = createDatabase();
  const service = new BulkOperationsService(d1);

  const result = await service.bulkDelete(['camp-one']);

  assert.equal(result.success, true);
  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);

  // Target campaign and its flow-owned rows are gone...
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns WHERE id = ?', 'camp-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flows WHERE campaignId = ?', 'camp-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowLandingPages WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rules WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowRules WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rule_bindings WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rule_binding_entries WHERE flowId = ?', 'flow-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_bindings WHERE campaignId = ?', 'camp-one'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_binding_entries WHERE campaignId = ?', 'camp-one'), 0);
  // 064 campaign scope: config and its bindings are owned by the campaign.
  assert.equal(
    count(db, "SELECT COUNT(*) AS n FROM autorule_scope_configs WHERE scopeType = 'campaign' AND scopeId = ?", 'camp-one'),
    0
  );
  assert.equal(
    count(db, "SELECT COUNT(*) AS n FROM autorule_scope_bindings WHERE scopeConfigId = ?", 'scope_campaign_camp-one'),
    0
  );

  // ...the sibling campaign is untouched...
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns WHERE id = ?', 'camp-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flows WHERE campaignId = ?', 'camp-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowLandingPages WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rules WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowRules WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rule_bindings WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flow_rule_binding_entries WHERE flowId = ?', 'flow-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_bindings WHERE campaignId = ?', 'camp-two'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_binding_entries WHERE campaignId = ?', 'camp-two'), 1);
  assert.equal(
    count(db, "SELECT COUNT(*) AS n FROM autorule_scope_configs WHERE scopeType = 'campaign' AND scopeId = ?", 'camp-two'),
    1
  );
  assert.equal(
    count(db, "SELECT COUNT(*) AS n FROM autorule_scope_bindings WHERE scopeConfigId = ?", 'scope_campaign_camp-two'),
    1
  );

  // ...shared autorule scopes (global / traffic_source) are not campaign rows...
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM autorule_scope_configs WHERE scopeType = 'global'"), 1);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM autorule_scope_configs WHERE scopeType = 'traffic_source'"), 1);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM autorule_scope_bindings WHERE scopeConfigId = 'scope_global'"), 1);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM autorule_scope_bindings WHERE scopeConfigId = 'scope_traffic_google'"), 1);

  // ...and the global offer / landing libraries are never deleted.
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM offers'), 2);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM landingPages'), 2);
});

test('real schema rejects the legacy column and table names', () => {
  const { db } = createDatabase();

  // These are the names the service used to write; the real DDL must reject
  // them so a regression cannot pass silently against a permissive fixture.
  assert.throws(() => db.prepare('SELECT updated_at FROM campaigns').all(), /no such column: updated_at/);
  assert.throws(() => db.prepare('DELETE FROM landings WHERE flow_id = ?').run('flow-one'), /no such table: landings/);
  assert.throws(
    () => db.prepare('DELETE FROM campaign_autorule_bindings WHERE campaign_id = ?').run('camp-one'),
    /no such table: campaign_autorule_bindings/
  );
  assert.throws(
    () => db.prepare('DELETE FROM offers WHERE flow_id = ?').run('flow-one'),
    /no such column: flow_id/
  );
  // 064 columns are camelCase too; a snake_case cleanup would silently delete 0.
  assert.throws(
    () => db.prepare('SELECT scope_type FROM autorule_scope_configs').all(),
    /no such column: scope_type/
  );
});

test('bulkDelete route captures alias before delete and republishes the click config', async () => {
  const { db, d1 } = createDatabase();

  const cacheDeletes = [];
  const kvDeletes = [];
  const kvPuts = [];

  globalThis.caches = {
    default: {
      async match() {
        return undefined;
      },
      async put() {},
      async delete(request) {
        cacheDeletes.push(new URL(request.url).pathname);
        return true;
      },
    },
  };

  const env = {
    DB: d1,
    CACHE_UPDATE_TOKEN: 'offline-test-token',
    UNIQUENESS_KV: {
      async get() {
        return null;
      },
      async put(key) {
        kvPuts.push(String(key));
      },
      async delete(key) {
        kvDeletes.push(String(key));
      },
      async list() {
        return { keys: [], list_complete: true, cursor: undefined };
      },
    },
  };

  // Imported lazily so the resolver hook above is active first.
  const { default: app } = await import('../../src/routes/bulk-operations.routes.ts');
  const { value: response } = await captureConsole(() =>
    app.request(
      '/bulk-delete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignIds: ['camp-one'], confirm: true }),
      },
      env
    )
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.processed, 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns WHERE id = ?', 'camp-one'), 0);

  // The alias row is gone before onDataChanged runs, so the only way the
  // publisher can name `clickcfg:camp-one` is the pre-delete capture.
  assert.ok(
    kvDeletes.includes('clickcfg:camp-one'),
    `expected clickcfg:camp-one delete, got: ${kvDeletes.join(', ')}`
  );
  assert.ok(kvDeletes.includes('cfg:pointer:camp-one'), `expected pointer delete, got: ${kvDeletes.join(', ')}`);
  assert.deepEqual(kvPuts, []);
  assert.ok(cacheDeletes.length > 0, 'expected the campaign list/detail cache keys to be invalidated');
});

test('bulkDelete route still returns the committed result when cache sync throws', async () => {
  const { db, d1 } = createDatabase();
  const savedCaches = globalThis.caches;

  // A missing caches.default makes the CacheUpdateService constructor throw;
  // the committed delete must still be reported as success, and the failure
  // must be logged rather than silently swallowed.
  delete globalThis.caches;

  try {
    const { default: app } = await import('../../src/routes/bulk-operations.routes.ts');
    const { value: response, errors } = await captureConsole(() =>
      app.request(
        '/bulk-delete',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ campaignIds: ['camp-two'], confirm: true }),
        },
        { DB: d1, CACHE_UPDATE_TOKEN: 'offline-test-token', UNIQUENESS_KV: { async delete() {} } }
      )
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns WHERE id = ?', 'camp-two'), 0);
    assert.ok(
      errors.some(line => line.includes('Cache service unavailable')),
      `expected the cache failure to be logged, got: ${errors.join(' | ')}`
    );
  } finally {
    if (savedCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = savedCaches;
    }
  }
});
