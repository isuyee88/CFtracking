/**
 * @file Offline regression tests for bounded list queries in ClickRepository /
 * ConversionRepository.
 *
 * Why this exists: both list methods used to run `SELECT COUNT(*) FROM clicks /
 * conversions` before reading a page. On D1 a large table exceeds the 7500
 * rows/read budget and the whole list endpoint 500s. These tests capture the
 * real SQL and bound parameters (via node:sqlite) and assert:
 *   - COUNT is a LIMIT-ed subquery, never an unbounded table scan;
 *   - pagination fetches pageSize + 1 rows to report hasMore;
 *   - filters still apply in order and bind in the same order as placeholders;
 *   - the response keeps the legacy fields (total is present, may be null);
 *   - capped totals and out-of-range pages are explicit, not silent.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/list-pagination.node.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';

const { ClickRepository } = await import('../../src/handlers/d1/click.repo.ts');
const { ConversionRepository } = await import('../../src/handlers/d1/conversion.repo.ts');
const { createClickLogRouter } = await import('../../src/services/tracking/clickLog.routes.ts');
const { createConversionLogRouter } = await import('../../src/services/tracking/conversionLog.routes.ts');
const { LIST_COUNT_CAP, LIST_MAX_PAGE_SIZE, LIST_DEFAULT_PAGE_SIZE, D1_ROW_READ_BUDGET } =
  await import('../../src/handlers/d1/list-query.ts');

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);

const CLICK_MIGRATIONS = [
  '010_create_clicks_table.sql',
  '019_add_isBot_field.sql',
  '022_add_security_fields_to_clicks.sql',
  '050_add_subid_fields_to_clicks.sql',
  '051_add_fingerprint_fields.sql',
];

const CONVERSION_MIGRATIONS = ['011_create_conversions_table.sql'];

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

function createSchema(db, migrations) {
  for (const name of migrations) {
    for (const statement of statementsOf(readMigration(name))) {
      db.exec(statement);
    }
  }
}

/**
 * Minimal D1 adapter backed by node:sqlite that records every prepared SQL
 * string and its bound parameters.
 */
function createRecordingD1(db, calls) {
  return {
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
        async all() {
          return { results: db.prepare(sql).all(...params), success: true, meta: {} };
        },
      };
      return statement;
    },
  };
}

/** Fake D1 for cases where only SQL/parameter shape matters (cap, overflow). */
function createFakeD1({ count = 0, rows = [] } = {}) {
  const calls = [];
  return {
    calls,
    db: {
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
          async run() {
            return { success: true, meta: {} };
          },
          async first() {
            return /COUNT\(\*\)/i.test(sql) ? { total: count } : null;
          },
          async all() {
            return { results: rows, success: true, meta: {} };
          },
        };
        return statement;
      },
    },
  };
}

function createClickRepo() {
  const db = new DatabaseSync(':memory:');
  createSchema(db, CLICK_MIGRATIONS);
  const calls = [];
  const d1 = createRecordingD1(db, calls);
  return { db, calls, d1, repo: new ClickRepository(d1) };
}

function createConversionRepo() {
  const db = new DatabaseSync(':memory:');
  createSchema(db, CONVERSION_MIGRATIONS);
  const calls = [];
  const d1 = createRecordingD1(db, calls);
  return { db, calls, d1, repo: new ConversionRepository(d1) };
}

const baseClick = {
  clickId: 'click-base',
  campaignId: 'camp-one',
  flowId: null,
  landingPageId: null,
  offerId: null,
  timestamp: '2026-10-22T00:00:00.000Z',
  ip: '203.0.113.10',
  userAgent: 'offline-test-agent',
  referer: null,
  country: 'US',
  city: 'New York',
  region: null,
  device: 'desktop',
  browser: 'chrome',
  os: 'Windows',
  isp: null,
  connectionType: null,
  visitorId: 'visitor-one',
  subId1: null,
  subId2: null,
  subId3: null,
  subId4: null,
  subId5: null,
  cost: 0.25,
  redirectUrl: 'https://offer.example/one',
};

function clickAt(index) {
  return {
    ...baseClick,
    clickId: `click-${index}`,
    timestamp: `2026-10-22T00:00:0${index}.000Z`,
    ip: `203.0.113.${10 + index}`,
    visitorId: `visitor-${index}`,
    isUnique: index % 2 === 1,
  };
}

function baseConversion(index, overrides = {}) {
  return {
    conversionId: `conv-${index}`,
    clickId: `click-${index}`,
    campaignId: 'camp-one',
    offerId: 'offer-one',
    timestamp: `2026-10-22T00:00:0${index}.000Z`,
    revenue: 10 + index,
    payout: 4 + index,
    currency: 'USD',
    conversionType: 'lead',
    offerName: `Offer ${index}`,
    ...overrides,
  };
}

const countCalls = calls => calls.filter(call => /COUNT\(\*\)/i.test(call.sql));
const listCalls = calls => calls.filter(call => /ORDER BY timestamp DESC/i.test(call.sql));

function assertBoundedCountSql(calls, table) {
  const counts = countCalls(calls);
  assert.ok(counts.length > 0, 'a COUNT query must be issued for the list total');
  for (const call of counts) {
    assert.match(
      call.sql,
      new RegExp(`^SELECT COUNT\\(\\*\\) AS total FROM \\(SELECT 1 FROM ${table}\\b`, 'i'),
      `COUNT must be bounded by a LIMIT-ed subquery, got: ${call.sql}`
    );
    assert.equal(call.params.at(-1), LIST_COUNT_CAP + 1, 'COUNT subquery LIMIT must be cap + 1');
  }

  // The regression: a bare `SELECT COUNT(*) FROM <table>` scans the whole table.
  const unbounded = new RegExp(
    `^\\s*SELECT\\s+COUNT\\(\\*\\)\\s+as\\s+total\\s+FROM\\s+${table}\\s*(?:WHERE\\b|$)`,
    'i'
  );
  assert.equal(calls.filter(call => unbounded.test(call.sql)).length, 0);
}

test('row-budget constants leave headroom under the D1 7500-row limit', () => {
  assert.equal(D1_ROW_READ_BUDGET, 7500);
  assert.equal(LIST_COUNT_CAP + 1, 7001);
  assert.ok(LIST_COUNT_CAP + 1 < D1_ROW_READ_BUDGET);
  assert.equal(LIST_DEFAULT_PAGE_SIZE, 20);
  assert.equal(LIST_MAX_PAGE_SIZE, 100);
});

test('clicks: list uses a bounded COUNT and limit+1 hasMore on every page', async () => {
  const { repo, calls } = createClickRepo();
  for (let i = 0; i < 5; i++) await repo.saveClick(clickAt(i));
  calls.length = 0;

  const first = await repo.findClicks({ page: 1, pageSize: 2 });
  assertBoundedCountSql(calls, 'clicks');
  assert.deepEqual(countCalls(calls)[0].params, [LIST_COUNT_CAP + 1]);
  assert.equal(first.total, 5);
  assert.equal(first.totalCapped, false);
  assert.equal(first.totalIsApproximate, false);
  assert.equal(first.pageOutOfRange, false);
  assert.equal(first.page, 1);
  assert.equal(first.pageSize, 2);
  assert.equal(first.list.length, 2);
  assert.equal(first.list[0].clickId, 'click-4');
  assert.equal(first.hasMore, true);
  assert.deepEqual(listCalls(calls)[0].params, [3, 0], 'list must fetch pageSize + 1 then offset');

  const last = await repo.findClicks({ page: 3, pageSize: 2 });
  assert.equal(last.list.length, 1);
  assert.equal(last.hasMore, false, 'last partial page must not report more rows');
  assert.deepEqual(listCalls(calls).at(-1).params, [3, 4]);
});

test('clicks: hasMore is false when the page ends exactly on the last row', async () => {
  const { repo, calls } = createClickRepo();
  for (let i = 0; i < 4; i++) await repo.saveClick(clickAt(i));
  calls.length = 0;

  const result = await repo.findClicks({ page: 2, pageSize: 2 });
  assert.equal(result.total, 4);
  assert.equal(result.list.length, 2);
  assert.equal(result.hasMore, false, 'limit+1 probe returned exactly pageSize rows');
  assert.deepEqual(listCalls(calls)[0].params, [3, 2]);
});

test('clicks: filters still apply and bind in placeholder order', async () => {
  const { repo, calls } = createClickRepo();
  await repo.saveClick({ ...clickAt(0), clickId: 'c1', campaignId: 'camp-one', ip: '203.0.113.50', isUnique: false, visitorId: 'v1' });
  await repo.saveClick({ ...clickAt(1), clickId: 'c2', campaignId: 'camp-one', ip: '203.0.113.51', isUnique: true, visitorId: 'v2' });
  await repo.saveClick({ ...clickAt(2), clickId: 'c3', campaignId: 'camp-two', ip: '198.51.100.7', isUnique: true, visitorId: 'v3' });
  calls.length = 0;

  const result = await repo.findClicks({
    page: 1,
    pageSize: 2,
    campaignId: 'camp-one',
    isUnique: true,
    search: '203.0.113',
  });

  const pattern = '%203.0.113%';
  const filterParams = ['camp-one', 1, pattern, pattern, pattern, pattern];
  const count = countCalls(calls)[0];
  assert.ok(count.sql.includes('WHERE campaignId = ? AND isUnique = ? AND (clickId LIKE ? OR ip LIKE ? OR visitorId LIKE ? OR userAgent LIKE ?)'));
  assert.deepEqual(count.params, [...filterParams, LIST_COUNT_CAP + 1]);

  const list = listCalls(calls)[0];
  assert.ok(list.sql.includes('WHERE campaignId = ? AND isUnique = ? AND (clickId LIKE ? OR ip LIKE ? OR visitorId LIKE ? OR userAgent LIKE ?)'));
  assert.deepEqual(list.params, [...filterParams, 3, 0], 'list binds filters first, then limit, then offset');

  assert.equal(result.total, 1, 'filters must actually narrow the COUNT');
  assert.equal(result.list.length, 1);
  assert.equal(result.list[0].clickId, 'c2');
});

test('clicks: total is capped with explicit flags instead of scanning the whole table', async () => {
  const fake = createFakeD1({ count: LIST_COUNT_CAP + 1, rows: [] });
  const repo = new ClickRepository(fake.db);

  const result = await repo.findClicks({ page: 1, pageSize: 20 });
  assert.equal(result.total, LIST_COUNT_CAP);
  assert.equal(result.totalCapped, true);
  assert.equal(result.totalIsApproximate, true);
  assert.equal(result.totalIsApproximate, result.totalCapped);
  assert.equal(result.hasMore, false);
  assert.equal(result.list.length, 0);
});

test('clicks: exact cap-sized total is not marked as capped', async () => {
  const fake = createFakeD1({ count: LIST_COUNT_CAP, rows: [{ clickId: 'only-row' }] });
  const repo = new ClickRepository(fake.db);

  const result = await repo.findClicks({ page: 1, pageSize: 100 });
  assert.equal(result.total, LIST_COUNT_CAP);
  assert.equal(result.totalCapped, false);
  assert.equal(result.totalIsApproximate, false);
});

test('clicks: pageSize is capped, invalid paging is normalized, and deep pages skip D1', async () => {
  const fake = createFakeD1({ count: 500, rows: [] });
  const repo = new ClickRepository(fake.db);

  const wide = await repo.findClicks({ page: 2, pageSize: 5000 });
  assert.equal(wide.pageSize, LIST_MAX_PAGE_SIZE);
  assert.equal(wide.page, 2);
  assert.deepEqual(listCalls(fake.calls)[0].params, [LIST_MAX_PAGE_SIZE + 1, LIST_MAX_PAGE_SIZE]);

  fake.calls.length = 0;
  const invalid = await repo.findClicks({ page: Number.NaN, pageSize: 0 });
  assert.equal(invalid.page, 1);
  assert.equal(invalid.pageSize, LIST_DEFAULT_PAGE_SIZE);
  assert.deepEqual(listCalls(fake.calls)[0].params, [LIST_DEFAULT_PAGE_SIZE + 1, 0]);

  fake.calls.length = 0;
  const outOfRange = await repo.findClicks({ page: 100_000, pageSize: 100 });
  assert.equal(fake.calls.length, 0, 'out-of-range pages must not issue any D1 query');
  assert.equal(outOfRange.total, null);
  assert.ok('total' in outOfRange, 'total must stay present even when null');
  assert.equal(outOfRange.list.length, 0);
  assert.equal(outOfRange.hasMore, false);
  assert.equal(outOfRange.totalCapped, false);
  assert.equal(outOfRange.pageOutOfRange, true);
});

test('clicks: real SQLite stops the bounded COUNT at the cap', async () => {
  const { db, repo } = createClickRepo();
  const insert = db.prepare(`
    INSERT INTO clicks (id, clickId, campaignId, timestamp, ip, userAgent, visitorId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  for (let i = 0; i < LIST_COUNT_CAP + 50; i++) {
    insert.run(
      `id-${i}`,
      `click-cap-${i}`,
      'camp-one',
      '2026-10-22T00:00:00.000Z',
      '203.0.113.10',
      'offline-test-agent',
      `visitor-${i}`,
      '2026-10-22T00:00:00.000Z'
    );
  }
  db.exec('COMMIT');

  const result = await repo.findClicks({ page: 1, pageSize: 20 });
  assert.equal(result.total, LIST_COUNT_CAP, 'COUNT must stop at the cap, not scan 7050 rows');
  assert.equal(result.totalCapped, true);
  assert.equal(result.totalIsApproximate, true);
  assert.equal(result.list.length, 20);
  assert.equal(result.hasMore, true);
});

test('conversions: list uses a bounded COUNT and limit+1 hasMore', async () => {
  const { repo, calls } = createConversionRepo();
  for (let i = 0; i < 3; i++) await repo.saveConversion(baseConversion(i));
  calls.length = 0;

  const first = await repo.findConversions({ page: 1, pageSize: 2 });
  assertBoundedCountSql(calls, 'conversions');
  assert.equal(first.total, 3);
  assert.equal(first.list.length, 2);
  assert.equal(first.hasMore, true);
  assert.deepEqual(listCalls(calls)[0].params, [3, 0]);

  const second = await repo.findConversions({ page: 2, pageSize: 2 });
  assert.equal(second.list.length, 1);
  assert.equal(second.hasMore, false);
  assert.deepEqual(listCalls(calls).at(-1).params, [3, 2]);
});

test('conversions: filters still apply and bind in placeholder order', async () => {
  const { repo, calls } = createConversionRepo();
  await repo.saveConversion(baseConversion(0, { conversionId: 'conv-a', offerName: 'Alpha One', campaignId: 'camp-one' }));
  await repo.saveConversion(baseConversion(1, { conversionId: 'conv-b', offerName: 'Beta Two', campaignId: 'camp-one' }));
  await repo.saveConversion(baseConversion(2, { conversionId: 'conv-c', offerName: 'Alpha Three', campaignId: 'camp-two' }));
  calls.length = 0;

  const result = await repo.findConversions({
    page: 1,
    pageSize: 2,
    campaignId: 'camp-one',
    status: 'approved',
    search: 'Alpha',
  });

  const pattern = '%Alpha%';
  const filterParams = ['camp-one', 'approved', pattern, pattern, pattern];
  const count = countCalls(calls)[0];
  assert.ok(count.sql.includes('WHERE campaignId = ? AND status = ? AND (conversionId LIKE ? OR clickId LIKE ? OR offerName LIKE ?)'));
  assert.deepEqual(count.params, [...filterParams, LIST_COUNT_CAP + 1]);

  const list = listCalls(calls)[0];
  assert.deepEqual(list.params, [...filterParams, 3, 0]);
  assert.equal(result.total, 1);
  assert.equal(result.list[0].conversionId, 'conv-a');
});

test('conversions: capped total is flagged, and out-of-range pages stay non-scanning', async () => {
  const fake = createFakeD1({ count: LIST_COUNT_CAP + 10, rows: [] });
  const repo = new ConversionRepository(fake.db);

  const capped = await repo.findConversions({ page: 1, pageSize: 100 });
  assert.equal(capped.total, LIST_COUNT_CAP);
  assert.equal(capped.totalCapped, true);
  assert.equal(capped.totalIsApproximate, true);

  fake.calls.length = 0;
  const outOfRange = await repo.findConversions({ page: 5000, pageSize: 100 });
  assert.equal(fake.calls.length, 0);
  assert.equal(outOfRange.total, null);
  assert.ok('total' in outOfRange);
  assert.equal(outOfRange.pageOutOfRange, true);
});

test('GET /api/clicks exposes hasMore/total flags and normalizes totalPages', async () => {
  const { repo, d1 } = createClickRepo();
  for (let i = 0; i < 3; i++) await repo.saveClick(clickAt(i));

  const app = createClickLogRouter();
  const response = await app.request(
    '/?page=1&pageSize=2&startDate=2026-10-22T00:00:00.000Z&endDate=2026-10-22T23:59:59.999Z',
    {},
    { DB: d1 }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.length, 2);
  assert.equal(body.meta.total, 3);
  assert.equal(body.meta.totalPages, 2);
  assert.equal(body.meta.hasMore, true);
  assert.equal(body.meta.totalCapped, false);
  assert.equal(body.meta.totalIsApproximate, false);
  assert.equal(body.meta.pageOutOfRange, false);
  assert.equal(body.meta.dataSource, 'd1_database');
});

test('GET /api/clicks returns total:null + pageOutOfRange for absurd deep pages', async () => {
  const fake = createFakeD1({ count: 0, rows: [] });
  const app = createClickLogRouter();
  const response = await app.request('/?page=100000&pageSize=100', {}, { DB: fake.db });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.data, []);
  assert.equal(body.meta.total, null);
  assert.equal(body.meta.totalPages, null, 'null total must not derive NaN totalPages');
  assert.equal(body.meta.hasMore, false);
  assert.equal(body.meta.totalCapped, false);
  assert.equal(body.meta.pageOutOfRange, true);
  assert.equal(body.meta.page, 100000);
  assert.equal(body.meta.pageSize, 100);
  assert.equal(fake.calls.length, 0, 'deep page must not scan D1');
});

test('GET /api/conversions surfaces pageOutOfRange in meta', async () => {
  const fake = createFakeD1({ count: 0, rows: [] });
  const app = createConversionLogRouter();
  const response = await app.request('/?page=5000&pageSize=100', {}, { DB: fake.db });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.meta.total, null);
  assert.equal(body.meta.totalPages, null);
  assert.equal(body.meta.pageOutOfRange, true);
  assert.equal(fake.calls.length, 0);
});
