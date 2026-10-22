/**
 * @file Offline regression for conversion idempotency (migration 084, repo, service, route).
 *
 * Why this exists: production already holds three `conversions` rows for one
 * click (`clk_1792455121235359`) because the old path was "look up, then insert"
 * and the lookup failure was swallowed. The fix must keep those rows (they are
 * the historical record) while making every future insert at most one per click.
 * These tests load the real DDL into node:sqlite and assert:
 *   - migration 084 applies to a populated, already-duplicated table and keeps it;
 *   - a second insert for the same click inserts nothing (duplicate, not success);
 *   - a failed idempotency lookup inserts nothing and surfaces a retryable 503;
 *   - DO side effects run exactly once per inserted conversion;
 *   - concurrent retries leave one row and one set of side effects.
 *
 * Run with:
 *   npm run test:node
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

import './ts-resolve-hooks.mjs';

// The service/route graph imports `@cloudflare/workers-types` and
// `cloudflare:workers`; both are types-only at build time but real specifiers
// to Node. Map them to the fixture stub so the production sources load offline.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@cloudflare/workers-types' || specifier === 'cloudflare:workers') {
      return { url: new URL('./workers-types.stub.mjs', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { ConversionRepository } = await import('../../src/handlers/d1/conversion.repo.ts');
const {
  ConversionService,
  ConversionIdempotencyUnavailableError,
  CONVERSION_IDEMPOTENCY_UNAVAILABLE,
} = await import('../../src/services/tracking/conversion.service.ts');
const { createTrackingRouter } = await import('../../src/services/tracking/tracking.routes.ts');

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);
const migration = name => readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8');

const CONVERSIONS_TABLE = '011_create_conversions_table.sql';
const IDEMPOTENCY_MIGRATION = '084_conversion_idempotency_key.sql';

function createSchema(db, names) {
  for (const name of names) db.exec(migration(name));
}

/**
 * Minimal D1 adapter over node:sqlite.
 *
 * `failLookup` throws only for the idempotency read (`FROM conversions WHERE
 * clickId = ?`), which is exactly the failure production swallowed: the write
 * path theoretically still works, but the caller cannot know it is safe.
 */
function createD1(db, { failLookup = false } = {}) {
  const state = { failLookup };
  const calls = [];
  return {
    state,
    calls,
    prepare(sql) {
      const call = { sql, params: [] };
      calls.push(call);
      let params = [];
      const statement = {
        bind(...args) {
          params = args;
          call.params = args;
          return statement;
        },
        async all() {
          if (state.failLookup && /FROM conversions\s+WHERE clickId = \?/i.test(sql)) {
            throw new Error('D1_ERROR: database is locked');
          }
          return { results: db.prepare(sql).all(...params), success: true, meta: {} };
        },
        async run() {
          const info = db.prepare(sql).run(...params);
          return { success: true, meta: { changes: Number(info.changes) } };
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
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}

/**
 * Env with fake DO namespaces. `events` records every DO side effect so a test
 * can prove a duplicate never reaches trackConversion / incrementCounter.
 */
function createEnv(db, options = {}) {
  const events = [];
  const namespace = kind => ({
    idFromName: name => name,
    get: id => ({
      async fetch(request) {
        const body = await request.json();
        events.push({ kind, id, url: new URL(request.url).pathname, body });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    }),
  });

  return {
    events,
    env: {
      DB: createD1(db, options),
      COUNTER_DO: namespace('counter'),
      TRACKING_STATS_DO: namespace('stats'),
    },
  };
}

const statsEvents = events => events.filter(event => event.kind === 'stats');
const counterEvents = events => events.filter(event => event.kind === 'counter');

let nextRow = 0;

/**
 * Raw insert used to build the historical shape migration 084 must survive.
 * The idempotencyKey column does not exist before the migration, so the helper
 * adapts: pre-migration rows are written without it (and read back as NULL).
 */
function insertHistorical(db, { clickId, conversionId, timestamp, idempotencyKey = null }) {
  nextRow += 1;
  const hasKeyColumn = db
    .prepare("PRAGMA table_info('conversions')")
    .all()
    .some(column => column.name === 'idempotencyKey');
  const columns = [
    'id',
    'conversionId',
    'clickId',
    ...(hasKeyColumn ? ['idempotencyKey'] : []),
    'campaignId',
    'offerId',
    'timestamp',
    'revenue',
    'payout',
    'currency',
    'conversionType',
    'offerName',
    'status',
    'createdAt',
  ];
  const values = [
    `row-${nextRow}`,
    conversionId,
    clickId,
    ...(hasKeyColumn ? [idempotencyKey] : []),
    'camp-one',
    'offer-one',
    timestamp,
    10,
    5,
    'USD',
    'sale',
    'Offer One',
    'approved',
    timestamp,
  ];
  db.prepare(`
    INSERT INTO conversions (${columns.join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
  `).run(...values);
}

function conversionRequest(clickId, overrides = {}) {
  return {
    clickId,
    campaignId: 'camp-one',
    offerId: 'offer-one',
    revenue: 12.5,
    payout: 12.5,
    ...overrides,
  };
}

function countRows(db) {
  return db.prepare('SELECT COUNT(*) AS c FROM conversions').get().c;
}

function createService(db, options = {}) {
  const { env, events } = createEnv(db, options);
  return { service: new ConversionService(env), env, events };
}

test('migration 084 applies to a table with duplicate historical rows and keeps every row', () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE]);

  // Production shape: 10 rows, three of them for one click.
  for (let i = 0; i < 7; i += 1) {
    insertHistorical(db, {
      clickId: `clk_unique_${i}`,
      conversionId: `cnv_unique_${i}`,
      timestamp: `2026-10-0${i + 1}T00:00:00.000Z`,
    });
  }
  for (let i = 0; i < 3; i += 1) {
    insertHistorical(db, {
      clickId: 'clk_1792455121235359',
      conversionId: `cnv_dup_${i}`,
      timestamp: `2026-10-1${i}T00:00:00.000Z`,
    });
  }
  assert.equal(countRows(db), 10);

  createSchema(db, [IDEMPOTENCY_MIGRATION]);

  assert.equal(countRows(db), 10, 'migration must not delete or rewrite historical rows');
  const duplicateGroup = db
    .prepare('SELECT conversionId FROM conversions WHERE clickId = ? ORDER BY timestamp')
    .all('clk_1792455121235359');
  assert.equal(duplicateGroup.length, 3, 'the three historical duplicates stay');
  assert.equal(
    db.prepare('SELECT COUNT(*) AS c FROM conversions WHERE idempotencyKey IS NULL').get().c,
    10,
    'historical rows are not backfilled; NULL is what lets them coexist'
  );

  const index = db
    .prepare("PRAGMA index_list('conversions')")
    .all()
    .find(entry => entry.name === 'idx_conversions_idempotencyKey');
  assert.ok(index, 'unique index must exist after the migration');
  assert.equal(index.unique, 1, 'the index is unique');
});

test('migration 084 unique index allows many NULL keys but rejects duplicate click keys', () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);

  insertHistorical(db, { clickId: 'clk_a', conversionId: 'cnv_a', timestamp: '2026-10-01T00:00:00.000Z' });
  insertHistorical(db, { clickId: 'clk_a', conversionId: 'cnv_b', timestamp: '2026-10-02T00:00:00.000Z' });
  assert.equal(countRows(db), 2, 'NULL keys do not collide (SQLite treats NULLs as distinct)');

  insertHistorical(db, {
    clickId: 'clk_c',
    conversionId: 'cnv_c',
    timestamp: '2026-10-03T00:00:00.000Z',
    idempotencyKey: 'clk_c',
  });

  assert.throws(
    () =>
      insertHistorical(db, {
        clickId: 'clk_c',
        conversionId: 'cnv_c_again',
        timestamp: '2026-10-04T00:00:00.000Z',
        idempotencyKey: 'clk_c',
      }),
    /UNIQUE constraint failed: conversions\.idempotencyKey/
  );
  assert.equal(countRows(db), 3);
});

test('repo.saveConversion writes clickId as idempotencyKey and reports the insert winner', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const d1 = createD1(db);
  const repo = new ConversionRepository(d1);

  const base = {
    conversionId: 'cnv_first',
    clickId: 'clk_repo',
    campaignId: 'camp-one',
    offerId: 'offer-one',
    timestamp: '2026-10-22T00:00:00.000Z',
    revenue: 10,
    payout: 4,
    currency: 'USD',
    conversionType: 'sale',
    offerName: 'Offer One',
  };

  assert.deepEqual(await repo.saveConversion(base), { inserted: true });
  const stored = db.prepare('SELECT conversionId, idempotencyKey FROM conversions').get();
  assert.equal(stored.conversionId, 'cnv_first');
  assert.equal(stored.idempotencyKey, 'clk_repo', 'new inserts carry clickId as the idempotency key');

  // A retry with a fresh generated id must lose the unique-index race.
  assert.deepEqual(await repo.saveConversion({ ...base, conversionId: 'cnv_second' }), { inserted: false });
  assert.equal(countRows(db), 1);
  assert.equal(db.prepare('SELECT conversionId FROM conversions').get().conversionId, 'cnv_first');

  const insertSql = d1.calls.find(call => /INSERT INTO conversions/i.test(call.sql)).sql;
  assert.match(insertSql, /ON CONFLICT\(idempotencyKey\) DO NOTHING/);
  assert.doesNotMatch(insertSql, /INSERT\s+OR\s+IGNORE/i, 'INSERT OR IGNORE would swallow unrelated constraints');
});

test('keyless conversions get NULL idempotencyKey so they never collapse into one row', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const repo = new ConversionRepository(createD1(db));

  const keyless = {
    clickId: '',
    campaignId: 'camp-one',
    offerId: 'offer-one',
    timestamp: '2026-10-22T00:00:00.000Z',
    revenue: 10,
    payout: 4,
    currency: 'USD',
    conversionType: 'lead',
    offerName: 'Offer One',
  };

  assert.deepEqual(await repo.saveConversion({ ...keyless, conversionId: 'cnv_keyless_a' }), { inserted: true });
  assert.deepEqual(await repo.saveConversion({ ...keyless, conversionId: 'cnv_keyless_b' }), { inserted: true });

  assert.equal(countRows(db), 2, 'empty clickId must not act as a shared unique key');
  const keys = db.prepare('SELECT idempotencyKey FROM conversions ORDER BY conversionId').all();
  assert.deepEqual(keys.map(row => row.idempotencyKey), [null, null]);
});

test('same clickId twice: one row, second result is duplicate, DO side effects happen once', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const { service, events } = createService(db);

  const first = await service.handleConversion(conversionRequest('clk_twice'));
  const second = await service.handleConversion(conversionRequest('clk_twice', { revenue: 99 }));

  assert.equal(first.success, true);
  assert.equal(first.duplicate, undefined);
  assert.equal(second.success, true);
  assert.equal(second.duplicate, true);
  assert.equal(second.conversionId, first.conversionId, 'duplicate reports the stored conversionId');
  assert.equal(countRows(db), 1);
  assert.equal(statsEvents(events).length, 1, 'trackConversion runs only for the insert winner');
  assert.equal(counterEvents(events).length, 1, 'incrementCounter runs only for the insert winner');
});

test('lookup failure fails closed: no insert, no side effects, retryable 503 error', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const { service, events } = createService(db, { failLookup: true });

  await assert.rejects(
    () => service.handleConversion(conversionRequest('clk_lookup_fail')),
    error => {
      assert.ok(error instanceof ConversionIdempotencyUnavailableError);
      assert.equal(error.code, CONVERSION_IDEMPOTENCY_UNAVAILABLE);
      assert.equal(error.statusCode, 503);
      return true;
    }
  );

  assert.equal(countRows(db), 0, 'a failed lookup must never insert');
  assert.equal(events.length, 0, 'no DO side effects on a failed lookup');
});

test('postback route maps the fail-closed error to 503 with the identifiable code', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const { env } = createEnv(db, { failLookup: true });

  const app = createTrackingRouter();
  const response = await app.request(
    '/conversion/postback?clickid=clk_route&campaign_id=camp-one&offer_id=offer-one&revenue=10',
    { method: 'POST' },
    env
  );

  assert.equal(response.status, 503, 'a platform retry needs a 5xx, not a silent 200');
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, CONVERSION_IDEMPOTENCY_UNAVAILABLE);
  assert.equal(countRows(db), 0);
});

test('different clickIds insert independently', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const { service, events } = createService(db);

  const first = await service.handleConversion(conversionRequest('clk_one'));
  const second = await service.handleConversion(conversionRequest('clk_two'));

  assert.equal(first.duplicate, undefined);
  assert.equal(second.duplicate, undefined);
  assert.notEqual(first.conversionId, second.conversionId);
  assert.equal(countRows(db), 2);
  assert.equal(statsEvents(events).length, 2);
  assert.equal(counterEvents(events).length, 2);
});

test('concurrent identical postbacks leave one row and one set of side effects', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  const { service, events } = createService(db);

  // Both lookups run before either insert (the classic production race), so the
  // second insert hits ON CONFLICT instead of the pre-check.
  const results = await Promise.all([
    service.handleConversion(conversionRequest('clk_race')),
    service.handleConversion(conversionRequest('clk_race')),
  ]);

  assert.equal(countRows(db), 1, 'the unique index, not the pre-check, decides the winner');
  assert.equal(results.filter(result => result.duplicate !== true).length, 1);
  assert.equal(results.filter(result => result.duplicate === true).length, 1);
  assert.equal(new Set(results.map(result => result.conversionId)).size, 1);
  assert.equal(statsEvents(events).length, 1);
  assert.equal(counterEvents(events).length, 1);
});

test('historical duplicates for one click: service reports the newest row and inserts nothing', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db, [CONVERSIONS_TABLE, IDEMPOTENCY_MIGRATION]);
  insertHistorical(db, {
    clickId: 'clk_1792455121235359',
    conversionId: 'cnv_old',
    timestamp: '2026-10-10T00:00:00.000Z',
  });
  insertHistorical(db, {
    clickId: 'clk_1792455121235359',
    conversionId: 'cnv_mid',
    timestamp: '2026-10-11T00:00:00.000Z',
  });
  insertHistorical(db, {
    clickId: 'clk_1792455121235359',
    conversionId: 'cnv_new',
    timestamp: '2026-10-12T00:00:00.000Z',
  });
  const { service, events } = createService(db);

  const result = await service.handleConversion(conversionRequest('clk_1792455121235359'));

  assert.equal(result.duplicate, true);
  assert.equal(result.conversionId, 'cnv_new', 'findByClickId orders by timestamp DESC; newest row wins');
  assert.equal(countRows(db), 3, 'history is untouched');
  assert.equal(events.length, 0);
});
