/**
 * @file Offline regression tests for campaign clone against the real D1 schema.
 *
 * Why this exists: the previous mock-based test accepted any SQL string, so the
 * service could write `traffic_source_id` / read `campaign_offers` and still
 * pass while production returned 500 on every clone. These tests load the real
 * migration DDL into node:sqlite and assert the rows the service writes.
 *
 * Covered invariants:
 * - campaign clone copies configuration (domain/cost/...) and gets a unique
 *   alias + regenerated apiToken; the default clone is paused.
 * - flows, flowOffers, flowLandingPages and campaign_rule_binding_entries are
 *   copied onto new IDs in a single batch; original rows and the global
 *   offers/landingPages libraries are not touched.
 * - a later clone picks a non-colliding alias.
 * - a mid-batch failure rolls back the campaign row (D1 batch atomicity).
 * - the route refreshes cache after commit and still returns 200 when cache
 *   maintenance fails.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/campaign-clone.node.test.mjs
 *
 * `--test-isolation=none` is required in this sandbox: the default per-file
 * child process fails with spawn EPERM.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';

// Loaded dynamically so the resolver hook above is already active: the service
// uses the `@/` alias, which Node's default resolver cannot resolve during the
// static import graph's instantiation phase.
const { CampaignCloneService } = await import('../../src/services/campaign/campaign-clone.service.ts');

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
 * Build the canonical schema from the same migrations production runs.
 * 016/058 alter tables (trafficSources, affiliateNetworks, clicks) whose
 * creators are not part of this minimal fixture; only the campaign/flow/rule
 * DDL is relevant to campaign clone.
 */
function createSchema(db) {
  applyMigration(db, '001_init.sql');
  applyMigration(
    db,
    '016_add_display_ids.sql',
    statement => !/trafficSources|traffic_sources|affiliateNetworks|affiliate_networks/i.test(statement)
  );
  applyMigration(db, '002_add_flow_filters.sql');
  applyMigration(db, '023_add_campaign_uniqueness_method.sql');
  applyMigration(db, '024_add_flow_action_fields.sql');
  applyMigration(db, '045_enhance_flow_rules.sql');
  applyMigration(db, '058_unify_autorules_binding_and_metrics.sql', statement => !/clicks/i.test(statement));
  applyMigration(db, '061_expand_autorule_bindings_priority.sql');
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

const T0 = '2000-01-01T00:00:00.000Z';

function seed(db) {
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (
      id, displayId, name, alias, domain, "group", trafficSource, flowRotation,
      costModel, costValue, currency, trafficLoss, uniquenessMethod,
      uniquenessParameter, uniquenessTTL, visitorBinding, apiToken, parameters,
      status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCampaign.run(
    'camp-one', null, 'Camp One', 'camp-one', 'one.example', 'g1', 'google',
    'position', 'cpc', 0.25, 'USD', 0.1, 'ip', null, 3600, 'none',
    'orig-token', '{"utm_source":"x"}', 'active', T0, T0
  );
  insertCampaign.run(
    'camp-two', null, 'Camp Two', 'camp-two', 'two.example', 'g2', 'facebook',
    'position', 'cpa', 1.5, 'USD', 0, 'none', null, 86400, 'none',
    'orig-token-two', '{}', 'active', T0, T0
  );

  const insertFlow = db.prepare(`
    INSERT INTO flows (
      id, campaignId, name, type, weight, status, filters, filterLogic,
      priority, actionType, actionConfig, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertFlow.run(
    'flow-one', 'camp-one', 'Flow One', 'regular', 70, 'active',
    '[{"field":"country","operator":"eq","value":"US"}]', 'AND', 5,
    'redirect', '{"url":"https://offer.example/one"}', T0, T0
  );
  insertFlow.run(
    'flow-two', 'camp-two', 'Flow Two', 'regular', 100, 'active', '[]', 'AND', 0,
    'redirect', '{}', T0, T0
  );

  const insertOffer = db.prepare(
    `INSERT INTO offers (id, name, url, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'active', ?, ?)`
  );
  insertOffer.run('offer-one', 'Offer One', 'https://offer.example/one', T0, T0);
  insertOffer.run('offer-two', 'Offer Two', 'https://offer.example/two', T0, T0);

  const insertLanding = db.prepare(
    `INSERT INTO landingPages (id, name, url, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'active', ?, ?)`
  );
  insertLanding.run('landing-one', 'Landing One', 'https://landing.example/one', T0, T0);
  insertLanding.run('landing-two', 'Landing Two', 'https://landing.example/two', T0, T0);

  db.prepare(`INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, ?, ?)`)
    .run('flow-one', 'offer-one', 60, T0);
  db.prepare(`INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, ?, ?)`)
    .run('flow-one', 'offer-two', 40, T0);
  db.prepare(`INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, ?, ?)`)
    .run('flow-two', 'offer-two', 100, T0);
  db.prepare(`INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES (?, ?, ?, ?)`)
    .run('flow-one', 'landing-one', 100, T0);
  db.prepare(`INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES (?, ?, ?, ?)`)
    .run('flow-two', 'landing-two', 100, T0);

  const insertRule = db.prepare(
    `INSERT INTO rules (id, name, type, conditions, actions, status, createdAt, updatedAt)
     VALUES (?, ?, 'condition', '{}', '{}', 'active', ?, ?)`
  );
  insertRule.run('rule-one', 'Rule One', T0, T0);
  insertRule.run('rule-two', 'Rule Two', T0, T0);

  const insertEntry = db.prepare(
    `INSERT INTO campaign_rule_binding_entries (id, campaignId, ruleId, priority, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insertEntry.run('entry-one', 'camp-one', 'rule-one', 0, 1, T0, T0);
  insertEntry.run('entry-two', 'camp-one', 'rule-two', 5, 0, T0, T0);
  insertEntry.run('entry-three', 'camp-two', 'rule-two', 0, 1, T0, T0);
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

function row(db, sql, ...params) {
  return db.prepare(sql).get(...params);
}

/** Silence + capture the cache/cron logging so assertions stay readable. */
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

test('real schema rejects the legacy snake_case clone SQL', () => {
  const { db } = createDatabase();

  assert.throws(
    () => db.prepare('SELECT traffic_source_id FROM campaigns').all(),
    /no such column: traffic_source_id/
  );
  assert.throws(
    () => db.prepare('SELECT * FROM campaign_offers').all(),
    /no such table: campaign_offers/
  );
  assert.throws(
    () => db.prepare('SELECT * FROM campaign_landings').all(),
    /no such table: campaign_landings/
  );
});

test('clone copies campaign configuration, pauses it, and leaves the original untouched', async () => {
  const { db, d1 } = createDatabase();
  const before = row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one');
  const service = new CampaignCloneService(d1);

  const result = await service.clone('camp-one', 'Cloned Camp');

  assert.equal(result.success, true);
  assert.equal(result.data.originalId, 'camp-one');
  assert.notEqual(result.data.clonedId, 'camp-one');
  assert.equal(result.data.clonedCampaign.alias, 'cloned-camp');

  const cloned = row(db, 'SELECT * FROM campaigns WHERE id = ?', result.data.clonedId);
  assert.ok(cloned, 'cloned campaign row must be committed');
  assert.equal(cloned.name, 'Cloned Camp');
  assert.equal(cloned.alias, 'cloned-camp');
  assert.equal(cloned.domain, 'one.example');
  assert.equal(cloned.group, 'g1');
  assert.equal(cloned.trafficSource, 'google');
  assert.equal(cloned.flowRotation, 'position');
  assert.equal(cloned.costModel, 'cpc');
  assert.equal(cloned.costValue, 0.25);
  assert.equal(cloned.currency, 'USD');
  assert.equal(cloned.trafficLoss, 0.1);
  assert.equal(cloned.uniquenessMethod, 'ip');
  assert.equal(cloned.uniquenessTTL, 3600);
  assert.equal(cloned.parameters, '{"utm_source":"x"}');
  assert.equal(cloned.status, 'paused');
  assert.notEqual(cloned.apiToken, 'orig-token');
  assert.ok(cloned.createdAt && cloned.updatedAt);
  assert.equal(cloned.createdAt, result.data.clonedCampaign.createdAt);

  // The original row is byte-for-byte unchanged.
  assert.deepEqual(row(db, 'SELECT * FROM campaigns WHERE id = ?', 'camp-one'), before);
});

test('clone copies flows, offer/landing relations and campaign binding entries onto new ids', async () => {
  const { db, d1 } = createDatabase();
  const service = new CampaignCloneService(d1);

  const result = await service.clone('camp-one', 'Relations Clone');
  const clonedId = result.data.clonedId;

  assert.equal(result.data.clonedFlowCount, 1);
  assert.equal(result.data.clonedOfferCount, 2);
  assert.equal(result.data.clonedLandingCount, 1);
  assert.equal(result.data.clonedAutoruleCount, 2);

  const flows = db.prepare('SELECT * FROM flows WHERE campaignId = ?').all(clonedId);
  assert.equal(flows.length, 1);
  const flow = flows[0];
  assert.notEqual(flow.id, 'flow-one');
  assert.equal(flow.name, 'Flow One');
  assert.equal(flow.type, 'regular');
  assert.equal(flow.weight, 70);
  assert.equal(flow.status, 'active');
  assert.equal(flow.filters, '[{"field":"country","operator":"eq","value":"US"}]');
  assert.equal(flow.filterLogic, 'AND');
  assert.equal(flow.priority, 5);
  assert.equal(flow.actionType, 'redirect');
  assert.equal(flow.actionConfig, '{"url":"https://offer.example/one"}');

  const offers = db
    .prepare('SELECT offerId, weight FROM flowOffers WHERE flowId = ? ORDER BY weight DESC')
    .all(flow.id);
  assert.deepEqual(offers.map(o => [o.offerId, o.weight]), [['offer-one', 60], ['offer-two', 40]]);

  const landings = db
    .prepare('SELECT landingPageId, weight FROM flowLandingPages WHERE flowId = ?')
    .all(flow.id);
  assert.deepEqual(landings.map(l => [l.landingPageId, l.weight]), [['landing-one', 100]]);

  const entries = db
    .prepare('SELECT ruleId, priority, enabled FROM campaign_rule_binding_entries WHERE campaignId = ? ORDER BY priority ASC')
    .all(clonedId);
  assert.deepEqual(entries.map(e => [e.ruleId, e.priority, e.enabled]), [['rule-one', 0, 1], ['rule-two', 5, 0]]);
  const entryIds = db
    .prepare('SELECT id FROM campaign_rule_binding_entries WHERE campaignId = ?')
    .all(clonedId)
    .map(e => e.id);
  assert.ok(entryIds.every(id => !['entry-one', 'entry-two'].includes(id)));

  // Original campaign flow and relations are still present.
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flows WHERE campaignId = ?', 'camp-one'), 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', 'flow-one'), 2);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowLandingPages WHERE flowId = ?', 'flow-one'), 1);

  // Global libraries are referenced, never copied or removed.
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM offers'), 2);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM landingPages'), 2);
  assert.deepEqual(
    db.prepare('SELECT id, url FROM offers ORDER BY id').all().map(o => [o.id, o.url]),
    [
      ['offer-one', 'https://offer.example/one'],
      ['offer-two', 'https://offer.example/two'],
    ]
  );
});

test('clone options gate flows/offers/landings/autorules and cost/status copying', async () => {
  const { db, d1 } = createDatabase();
  const service = new CampaignCloneService(d1);

  const noFlows = await service.clone('camp-one', 'No Flows', { cloneFlows: false });
  assert.equal(noFlows.data.clonedFlowCount, 0);
  assert.equal(noFlows.data.clonedOfferCount, 0);
  assert.equal(noFlows.data.clonedLandingCount, 0);
  assert.equal(noFlows.data.clonedAutoruleCount, 2);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flows WHERE campaignId = ?', noFlows.data.clonedId), 0);
  assert.equal(
    count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_binding_entries WHERE campaignId = ?', noFlows.data.clonedId),
    2
  );

  const trimmed = await service.clone('camp-one', 'Trimmed Clone', {
    cloneOffers: false,
    cloneLandings: false,
    cloneAutorules: false,
    cloneStatus: true,
    cloneCostSettings: false,
  });
  assert.equal(trimmed.data.clonedFlowCount, 1);
  assert.equal(trimmed.data.clonedOfferCount, 0);
  assert.equal(trimmed.data.clonedLandingCount, 0);
  assert.equal(trimmed.data.clonedAutoruleCount, 0);

  const cloned = row(db, 'SELECT * FROM campaigns WHERE id = ?', trimmed.data.clonedId);
  assert.equal(cloned.status, 'active');
  assert.equal(cloned.costModel, 'cpc');
  assert.equal(cloned.costValue, 0);
  assert.equal(
    count(db, 'SELECT COUNT(*) AS n FROM campaign_rule_binding_entries WHERE campaignId = ?', trimmed.data.clonedId),
    0
  );
  const flows = db.prepare('SELECT id FROM flows WHERE campaignId = ?').all(trimmed.data.clonedId);
  assert.equal(flows.length, 1);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowOffers WHERE flowId = ?', flows[0].id), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowLandingPages WHERE flowId = ?', flows[0].id), 0);
});

test('second clone gets a non-colliding alias even when slugs collide', async () => {
  const { db, d1 } = createDatabase();
  const service = new CampaignCloneService(d1);

  const first = await service.clone('camp-one', 'Foo Bar');
  const second = await service.clone('camp-one', 'Foo-Bar');

  assert.equal(first.data.clonedCampaign.alias, 'foo-bar');
  assert.equal(second.data.clonedCampaign.alias, 'foo-bar-2');
  assert.notEqual(first.data.clonedId, second.data.clonedId);

  const aliases = db.prepare('SELECT alias FROM campaigns').all().map(r => r.alias);
  assert.equal(new Set(aliases).size, aliases.length);

  // Cloning the clone keeps the new campaign id as the flow owner.
  const nested = await service.clone(first.data.clonedId, 'Nested Clone');
  const nestedFlows = db.prepare('SELECT id FROM flows WHERE campaignId = ?').all(nested.data.clonedId);
  assert.equal(nestedFlows.length, 1);
  assert.notEqual(nestedFlows[0].id, db.prepare('SELECT id FROM flows WHERE campaignId = ?').get(first.data.clonedId).id);
});

test('a failure inside the batch rolls the whole clone back', async () => {
  const { db, d1 } = createDatabase();
  const service = new CampaignCloneService(d1);
  const campaignsBefore = count(db, 'SELECT COUNT(*) AS n FROM campaigns');
  const flowsBefore = count(db, 'SELECT COUNT(*) AS n FROM flows');
  const relationsBefore = count(db, 'SELECT COUNT(*) AS n FROM flowOffers');

  // Fail on the flow insert, i.e. after the campaign insert already ran.
  db.exec(`CREATE TRIGGER fail_flow_insert BEFORE INSERT ON flows
           BEGIN SELECT RAISE(ABORT, 'forced-flow-failure'); END`);

  await assert.rejects(
    () => service.clone('camp-one', 'Atomic Clone'),
    /Failed to clone campaign:.*forced-flow-failure/
  );

  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns'), campaignsBefore);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM campaigns WHERE name = ?', 'Atomic Clone'), 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flows'), flowsBefore);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM flowOffers'), relationsBefore);
});

test('clone route commits, then refreshes cache for the new campaign alias', async () => {
  const { db, d1 } = createDatabase();

  const cacheDeletes = [];
  const kvPuts = [];
  const kvDeletes = [];
  const savedCaches = globalThis.caches;

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

  try {
    const env = {
      DB: d1,
      CACHE_UPDATE_TOKEN: 'offline-test-token',
      UNIQUENESS_KV: {
        async get() {
          return null;
        },
        async put(key, value) {
          kvPuts.push([String(key), String(value)]);
        },
        async delete(key) {
          kvDeletes.push(String(key));
        },
        async list() {
          return { keys: [], list_complete: true, cursor: undefined };
        },
      },
    };

    const { cloneRouter } = await import('../../src/routes/campaign-clone.routes.ts');
    const { Hono } = await import('hono');
    const app = new Hono();
    app.route('/api', cloneRouter);

    const { value: response } = await captureConsole(() =>
      app.request(
        '/api/campaigns/camp-one/clone',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ newName: 'Route Clone' }),
        },
        env
      )
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.clonedCampaign.alias, 'route-clone');

    const cloned = row(db, 'SELECT * FROM campaigns WHERE id = ?', body.data.clonedId);
    assert.ok(cloned, 'route must only return after the clone is committed');
    assert.equal(cloned.status, 'paused');

    // The clone is paused, so the publisher invalidates its alias keys instead
    // of writing a click config. Either way it must run for the *new* alias.
    assert.ok(
      kvDeletes.includes('clickcfg:route-clone'),
      `expected clickcfg:route-clone invalidation, got: ${kvDeletes.join(', ')}`
    );
    assert.ok(cacheDeletes.length > 0, 'expected the campaign list/detail cache keys to be invalidated');
    assert.deepEqual(kvPuts, []);
  } finally {
    if (savedCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = savedCaches;
    }
  }
});

test('a cache failure after commit does not turn the clone into a 500', async () => {
  const { db, d1 } = createDatabase();
  const savedCaches = globalThis.caches;

  // Missing caches.default makes the CacheUpdateService constructor throw.
  delete globalThis.caches;

  try {
    const { cloneRouter } = await import('../../src/routes/campaign-clone.routes.ts');
    const { Hono } = await import('hono');
    const app = new Hono();
    app.route('/api', cloneRouter);

    const { value: response, errors } = await captureConsole(() =>
      app.request(
        '/api/campaigns/camp-one/clone',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ newName: 'Cache Down Clone' }),
        },
        { DB: d1, CACHE_UPDATE_TOKEN: 'offline-test-token', UNIQUENESS_KV: { async delete() {} } }
      )
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(row(db, 'SELECT * FROM campaigns WHERE id = ?', body.data.clonedId));
    assert.ok(
      errors.some(line => line.includes('cache refresh failed')),
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
