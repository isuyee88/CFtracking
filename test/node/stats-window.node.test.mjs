/**
 * @file Offline regression tests for the bounded stats aggregation introduced for
 * `/api/clicks/stats` and `/api/conversions/stats`.
 *
 * Why this exists: both stats methods used to aggregate over whatever date range
 * the caller supplied, with no default, no hard cap and no row-read bound. A large
 * range makes D1 read past the 7500-rows/query budget while the list page also
 * fetches a page in parallel. These tests lock in:
 *   - default 7-day window and invalid-input fallback (explicit rangeDefaulted);
 *   - 90-day hard cap with rangeCapped + effective rangeStart/rangeEnd;
 *   - aggregate SQL filtered by timestamp and bounded by LIMIT, never `SELECT *`;
 *   - legacy stats fields unchanged, new range/row-budget fields additive;
 *   - optional topN grouping has an in-SQL LIMIT and returns at most topN rows.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/stats-window.node.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';

const { ClickRepository } = await import('../../src/handlers/d1/click.repo.ts');
const { ConversionRepository } = await import('../../src/handlers/d1/conversion.repo.ts');
const { createClickLogRouter } = await import('../../src/services/tracking/clickLog.routes.ts');
const { createConversionLogRouter } = await import(
  '../../src/services/tracking/conversionLog.routes.ts'
);
const {
  STATS_DEFAULT_WINDOW_DAYS,
  STATS_MAX_WINDOW_DAYS,
  STATS_ROW_LIMIT,
  STATS_TOP_N_MAX,
  normalizeTopN,
  resolveStatsWindow,
} = await import('../../src/handlers/d1/stats-query.ts');
const { D1_ROW_READ_BUDGET } = await import('../../src/handlers/d1/list-query.ts');

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);

const CLICK_MIGRATIONS = [
  '010_create_clicks_table.sql',
  '019_add_isBot_field.sql',
  '022_add_security_fields_to_clicks.sql',
  '050_add_subid_fields_to_clicks.sql',
  '051_add_fingerprint_fields.sql',
];

// Only the base table is needed: rows are inserted directly, so this test does
// not depend on later conversion-column migrations (e.g. idempotencyKey).
const CONVERSION_MIGRATIONS = ['011_create_conversions_table.sql'];

const DAY_MS = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date('2026-10-22T12:00:00.000Z');

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

/** Fake D1 for aggregate-only calls where the SQL shape/binding is what matters. */
function createFakeD1({ firstRow = null, rows = [] } = {}) {
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
            return firstRow;
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

function insertClick(db, index, overrides = {}) {
  const row = {
    id: `id-${index}`,
    clickId: `click-${index}`,
    campaignId: 'camp-one',
    timestamp: `2026-10-22T00:00:0${index}.000Z`,
    ip: `203.0.113.${10 + index}`,
    userAgent: 'offline-test-agent',
    country: 'US',
    device: 'desktop',
    isUnique: index % 2 === 0 ? 1 : 0,
    visitorId: `visitor-${index}`,
    ...overrides,
  };

  db.prepare(`
    INSERT INTO clicks (id, clickId, campaignId, timestamp, ip, userAgent, country, device,
      isUnique, visitorId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id,
    row.clickId,
    row.campaignId,
    row.timestamp,
    row.ip,
    row.userAgent,
    row.country,
    row.device,
    row.isUnique,
    row.visitorId,
    row.timestamp
  );
}

function insertConversion(db, index, overrides = {}) {
  const row = {
    id: `conv-id-${index}`,
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
    status: 'approved',
    country: 'US',
    device: 'desktop',
    ...overrides,
  };

  db.prepare(`
    INSERT INTO conversions (id, conversionId, clickId, campaignId, offerId, timestamp,
      revenue, payout, currency, conversionType, offerName, status, country, device, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id,
    row.conversionId,
    row.clickId,
    row.campaignId,
    row.offerId,
    row.timestamp,
    row.revenue,
    row.payout,
    row.currency,
    row.conversionType,
    row.offerName,
    row.status,
    row.country,
    row.device,
    row.timestamp
  );
}

const aggregateCalls = calls => calls.filter(call => /COUNT\(\*\) AS (totalClicks|totalConversions)/i.test(call.sql));
const groupCalls = calls => calls.filter(call => /GROUP BY (country|device)/i.test(call.sql));

test('stats constants stay under the D1 row-read budget', () => {
  assert.equal(STATS_DEFAULT_WINDOW_DAYS, 7);
  assert.equal(STATS_MAX_WINDOW_DAYS, 90);
  assert.equal(STATS_ROW_LIMIT, 7000);
  assert.ok(STATS_ROW_LIMIT < D1_ROW_READ_BUDGET);
  assert.equal(STATS_TOP_N_MAX, 50);
  assert.equal(normalizeTopN(undefined), 0);
  assert.equal(normalizeTopN(0), 0);
  assert.equal(normalizeTopN(-5), 0);
  assert.equal(normalizeTopN('not-a-number'), 0);
  assert.equal(normalizeTopN('10'), 10);
  assert.equal(normalizeTopN(9999), STATS_TOP_N_MAX);
});

test('missing range falls back to the last 7 days and says so', () => {
  const window = resolveStatsWindow(undefined, undefined, FIXED_NOW);

  assert.equal(window.rangeDefaulted, true);
  assert.equal(window.rangeCapped, false);
  assert.equal(window.endDate, FIXED_NOW.toISOString());
  assert.equal(window.startDate, new Date(FIXED_NOW.getTime() - 7 * DAY_MS).toISOString());
});

test('invalid or inverted ranges fall back to the default window', () => {
  const cases = [
    ['not-a-date', '2026-10-22'],
    ['2026-10-22', 'not-a-date'],
    ['2026-10-22', '2026-10-01'],
    ['2026-13-45', '2026-10-22'],
    ['', ''],
  ];

  for (const [start, end] of cases) {
    const window = resolveStatsWindow(start, end, FIXED_NOW);
    assert.equal(window.rangeDefaulted, true, `expected fallback for ${start}..${end}`);
    assert.equal(window.rangeCapped, false);
    assert.equal(window.startDate, new Date(FIXED_NOW.getTime() - 7 * DAY_MS).toISOString());
    assert.equal(window.endDate, FIXED_NOW.toISOString());
  }
});

test('date-only bounds are normalized to the full UTC day', () => {
  const window = resolveStatsWindow('2026-10-16', '2026-10-22', FIXED_NOW);

  assert.equal(window.rangeDefaulted, false);
  assert.equal(window.rangeCapped, false);
  assert.equal(window.startDate, '2026-10-16T00:00:00.000Z');
  assert.equal(window.endDate, '2026-10-22T23:59:59.999Z');
});

test('ranges over 90 days keep endDate and cap startDate explicitly', () => {
  const end = '2026-10-22T00:00:00.000Z';
  const window = resolveStatsWindow('2025-01-01', end, FIXED_NOW);

  assert.equal(window.rangeCapped, true);
  assert.equal(window.rangeDefaulted, false);
  assert.equal(window.endDate, end);
  assert.equal(window.startDate, new Date(Date.parse(end) - 90 * DAY_MS).toISOString());
  assert.equal(Date.parse(window.endDate) - Date.parse(window.startDate), 90 * DAY_MS);

  // Exactly 90 days is allowed and not marked as capped.
  const exactStart = new Date(Date.parse(end) - 90 * DAY_MS).toISOString();
  const exact = resolveStatsWindow(exactStart, end, FIXED_NOW);
  assert.equal(exact.rangeCapped, false);
  assert.equal(exact.startDate, exactStart);
});

test('clicks: aggregate SQL filters on timestamp and is bounded by LIMIT, with no SELECT *', async () => {
  const { db, calls, repo } = createClickRepo();
  insertClick(db, 0, { country: 'US', device: 'desktop', isUnique: 1 });
  insertClick(db, 1, { country: 'DE', device: 'mobile', isUnique: 0 });
  calls.length = 0;

  const stats = await repo.getClickStats('2026-10-01', '2026-10-31');

  // Legacy fields stay numeric and unchanged.
  assert.equal(stats.totalClicks, 2);
  assert.equal(stats.uniqueClicks, 1);
  assert.equal(stats.countries, 2);
  assert.equal(stats.deviceTypes, 2);

  // Additive observability fields.
  assert.equal(stats.rangeStart, '2026-10-01T00:00:00.000Z');
  assert.equal(stats.rangeEnd, '2026-10-31T23:59:59.999Z');
  assert.equal(stats.rangeCapped, false);
  assert.equal(stats.rangeDefaulted, false);
  assert.equal(stats.rowLimit, STATS_ROW_LIMIT);
  assert.equal(stats.rowCapped, false);
  assert.equal(stats.rowsScanned, 2);
  assert.equal(stats.byCountry, undefined, 'no group query unless topN is requested');
  assert.equal(stats.byDevice, undefined);

  assert.equal(calls.length, 1, 'default stats must issue exactly one aggregate query');
  const [call] = calls;
  assert.match(
    call.sql,
    /FROM\s*\(\s*SELECT isUnique, country, device\s+FROM clicks\s+WHERE timestamp >= \? AND timestamp <= \?/i,
    'aggregate must run over a timestamp-filtered subquery'
  );
  assert.match(call.sql, /ORDER BY timestamp DESC\s+LIMIT \?/i);
  assert.match(call.sql, /LIMIT \?/);
  assert.equal(/SELECT\s+\*/i.test(call.sql), false, 'stats SQL must not SELECT *');
  assert.deepEqual(call.params, [
    '2026-10-01T00:00:00.000Z',
    '2026-10-31T23:59:59.999Z',
    STATS_ROW_LIMIT,
  ]);
});

test('clicks: campaign filter binds before the row limit', async () => {
  const fake = createFakeD1({ firstRow: { totalClicks: 0, uniqueClicks: 0, countries: 0, deviceTypes: 0 } });
  const repo = new ClickRepository(fake.db);

  const stats = await repo.getClickStats('2026-10-01', '2026-10-31', 'camp-one');

  assert.equal(stats.totalClicks, 0);
  assert.equal(stats.rangeCapped, false);
  const [call] = aggregateCalls(fake.calls);
  assert.match(call.sql, /AND campaignId = \?/i);
  assert.deepEqual(call.params, [
    '2026-10-01T00:00:00.000Z',
    '2026-10-31T23:59:59.999Z',
    'camp-one',
    STATS_ROW_LIMIT,
  ]);
});

test('clicks: reaching the row limit is reported as a capped lower bound', async () => {
  const fake = createFakeD1({
    firstRow: {
      totalClicks: STATS_ROW_LIMIT,
      uniqueClicks: 1234,
      countries: 12,
      deviceTypes: 3,
    },
  });
  const repo = new ClickRepository(fake.db);

  const stats = await repo.getClickStats('2026-10-01', '2026-10-31');

  assert.equal(stats.totalClicks, STATS_ROW_LIMIT);
  assert.equal(stats.uniqueClicks, 1234);
  assert.equal(stats.rowCapped, true);
  assert.equal(stats.rowsScanned, STATS_ROW_LIMIT);
  assert.equal(stats.rowLimit, STATS_ROW_LIMIT);
});

test('clicks: invalid input falls back to default window before querying D1', async () => {
  const fake = createFakeD1({ firstRow: { totalClicks: 0, uniqueClicks: 0, countries: 0, deviceTypes: 0 } });
  const repo = new ClickRepository(fake.db);

  const stats = await repo.getClickStats('garbage', '2026-10-22', undefined, { now: FIXED_NOW });

  assert.equal(stats.rangeDefaulted, true);
  const [call] = aggregateCalls(fake.calls);
  assert.deepEqual(call.params, [
    new Date(FIXED_NOW.getTime() - 7 * DAY_MS).toISOString(),
    FIXED_NOW.toISOString(),
    STATS_ROW_LIMIT,
  ]);
});

test('clicks: real SQLite stops the bounded aggregate at the row limit', async () => {
  const { db, repo } = createClickRepo();
  const insert = db.prepare(`
    INSERT INTO clicks (id, clickId, campaignId, timestamp, ip, userAgent, country, device,
      isUnique, visitorId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const base = Date.parse('2026-10-01T00:00:00.000Z');

  db.exec('BEGIN');
  for (let i = 0; i < STATS_ROW_LIMIT + 50; i++) {
    const timestamp = new Date(base + i * 1000).toISOString();
    insert.run(
      `id-${i}`,
      `click-${i}`,
      'camp-one',
      timestamp,
      '203.0.113.10',
      'offline-test-agent',
      i % 2 === 0 ? 'US' : 'DE',
      i % 2 === 0 ? 'desktop' : 'mobile',
      i % 2,
      `visitor-${i}`,
      timestamp
    );
  }
  db.exec('COMMIT');

  const stats = await repo.getClickStats('2026-10-01', '2026-10-31');

  assert.equal(stats.totalClicks, STATS_ROW_LIMIT, 'aggregate must stop at the row limit');
  assert.equal(stats.rowsScanned, STATS_ROW_LIMIT);
  assert.equal(stats.rowCapped, true);
  assert.equal(stats.countries, 2, 'distinct counts only see the bounded row window');
  assert.equal(stats.deviceTypes, 2);
});

test('clicks: hard-capped range is passed to SQL and surfaced on the response', async () => {
  const fake = createFakeD1({ firstRow: { totalClicks: 0, uniqueClicks: 0, countries: 0, deviceTypes: 0 } });
  const repo = new ClickRepository(fake.db);
  const end = '2026-10-22T00:00:00.000Z';

  const stats = await repo.getClickStats('2025-01-01', end);

  assert.equal(stats.rangeCapped, true);
  assert.equal(stats.rangeEnd, end);
  assert.equal(stats.rangeStart, new Date(Date.parse(end) - 90 * DAY_MS).toISOString());
  const [call] = aggregateCalls(fake.calls);
  assert.equal(call.params[0], stats.rangeStart);
  assert.equal(call.params[1], stats.rangeEnd);
  assert.equal(call.params.at(-1), STATS_ROW_LIMIT);
});

test('conversions: aggregate SQL is timestamp-filtered and bounded, legacy fields intact', async () => {
  const { db, calls, repo } = createConversionRepo();
  insertConversion(db, 0, { status: 'approved', revenue: 10, payout: 4, country: 'US', device: 'desktop' });
  insertConversion(db, 1, { status: 'pending', revenue: 20, payout: 8, country: 'DE', device: 'mobile' });
  insertConversion(db, 2, { status: 'rejected', revenue: 30, payout: 12, country: 'US', device: 'desktop' });
  calls.length = 0;

  const stats = await repo.getConversionStats('2026-10-01', '2026-10-31');

  assert.equal(stats.totalConversions, 3);
  assert.equal(stats.approvedConversions, 1);
  assert.equal(stats.pendingConversions, 1);
  assert.equal(stats.rejectedConversions, 1);
  assert.equal(stats.totalRevenue, 10);
  assert.equal(stats.totalPayout, 4);

  assert.equal(stats.rangeStart, '2026-10-01T00:00:00.000Z');
  assert.equal(stats.rangeEnd, '2026-10-31T23:59:59.999Z');
  assert.equal(stats.rangeCapped, false);
  assert.equal(stats.rangeDefaulted, false);
  assert.equal(stats.rowLimit, STATS_ROW_LIMIT);
  assert.equal(stats.rowCapped, false);
  assert.equal(stats.rowsScanned, 3);

  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.match(
    call.sql,
    /FROM\s*\(\s*SELECT status, revenue, payout\s+FROM conversions\s+WHERE timestamp >= \? AND timestamp <= \?/i
  );
  assert.match(call.sql, /ORDER BY timestamp DESC\s+LIMIT \?/i);
  assert.equal(/SELECT\s+\*/i.test(call.sql), false, 'stats SQL must not SELECT *');
  assert.deepEqual(call.params, [
    '2026-10-01T00:00:00.000Z',
    '2026-10-31T23:59:59.999Z',
    STATS_ROW_LIMIT,
  ]);
});

test('conversions: row limit hit is flagged instead of silently rounding down', async () => {
  const fake = createFakeD1({
    firstRow: {
      totalConversions: STATS_ROW_LIMIT,
      approvedConversions: 100,
      pendingConversions: 2,
      rejectedConversions: 3,
      totalRevenue: 500.5,
      totalPayout: 120.25,
    },
  });
  const repo = new ConversionRepository(fake.db);

  const stats = await repo.getConversionStats('2026-10-01', '2026-10-31');

  assert.equal(stats.totalConversions, STATS_ROW_LIMIT);
  assert.equal(stats.totalRevenue, 500.5);
  assert.equal(stats.rowCapped, true);
  assert.equal(stats.rowsScanned, STATS_ROW_LIMIT);
});

test('clicks: topN grouping applies an in-SQL LIMIT and returns at most topN groups', async () => {
  const { db, calls, repo } = createClickRepo();
  // US=2, DE=1, GB=1 -> top 2 must be US then DE (tie broken by column ASC).
  insertClick(db, 0, { country: 'US', device: 'desktop' });
  insertClick(db, 1, { country: 'US', device: 'desktop' });
  insertClick(db, 2, { country: 'DE', device: 'mobile' });
  insertClick(db, 3, { country: 'GB', device: 'mobile' });
  calls.length = 0;

  const stats = await repo.getClickStats('2026-10-01', '2026-10-31', undefined, { topN: 2 });
  const countryRows = stats.byCountry.map(item => ({ value: item.value, clicks: item.clicks }));
  const deviceRows = stats.byDevice.map(item => ({ value: item.value, clicks: item.clicks }));

  assert.deepEqual(countryRows, [
    { value: 'US', clicks: 2 },
    { value: 'DE', clicks: 1 },
  ]);
  assert.equal(stats.byCountry.length, 2);
  assert.equal(stats.byDevice.length, 2);
  assert.deepEqual(deviceRows, [
    { value: 'desktop', clicks: 2 },
    { value: 'mobile', clicks: 2 },
  ]);

  assert.equal(calls.length, 3, 'one aggregate + one country group + one device group');
  const country = groupCalls(calls).find(call => /GROUP BY country/i.test(call.sql));
  const device = groupCalls(calls).find(call => /GROUP BY device/i.test(call.sql));
  assert.ok(country, 'country group query must be issued');
  assert.ok(device, 'device group query must be issued');
  assert.match(country.sql, /GROUP BY country/i);
  assert.match(country.sql, /ORDER BY clicks DESC, country ASC\s+LIMIT \?/i);
  assert.equal(country.params.at(-1), 2, 'group SQL must bind topN as LIMIT');
  assert.equal(country.params.at(-2), STATS_ROW_LIMIT, 'group SQL must cap rows before grouping');
  assert.equal(device.params.at(-1), 2);
  assert.equal(/SELECT\s+\*/i.test(country.sql), false);
});

test('conversions: topN grouping is bounded by row limit and topN', async () => {
  const { db, calls, repo } = createConversionRepo();
  insertConversion(db, 0, { country: 'US', device: 'desktop' });
  insertConversion(db, 1, { country: 'US', device: 'desktop' });
  insertConversion(db, 2, { country: 'DE', device: 'mobile' });
  calls.length = 0;

  const stats = await repo.getConversionStats('2026-10-01', '2026-10-31', undefined, { topN: 1 });

  assert.deepEqual(
    stats.byCountry.map(item => ({ value: item.value, clicks: item.clicks })),
    [{ value: 'US', clicks: 2 }]
  );
  assert.equal(stats.byCountry.length, 1);
  const country = groupCalls(calls).find(call => /GROUP BY country/i.test(call.sql));
  assert.ok(country);
  assert.match(country.sql, /GROUP BY country/i);
  assert.equal(country.params.at(-1), 1);
  assert.equal(country.params.at(-2), STATS_ROW_LIMIT);
});

test('GET /api/clicks/stats keeps legacy fields, adds range metadata and optional groups', async () => {
  const { db, d1 } = createClickRepo();
  insertClick(db, 0, { country: 'US', device: 'desktop' });
  insertClick(db, 1, { country: 'US', device: 'desktop' });
  insertClick(db, 2, { country: 'DE', device: 'mobile' });
  const app = createClickLogRouter();

  const response = await app.request(
    '/stats?startDate=2026-10-01&endDate=2026-10-31&topN=2',
    {},
    { DB: d1 }
  );
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.data.totalClicks, 3);
  assert.equal(typeof body.data.uniqueClicks, 'number');
  assert.equal(typeof body.data.countries, 'number');
  assert.equal(typeof body.data.deviceTypes, 'number');
  assert.equal(body.data.dataSource, 'd1_database');
  assert.equal(body.data.rangeStart, '2026-10-01T00:00:00.000Z');
  assert.equal(body.data.rangeEnd, '2026-10-31T23:59:59.999Z');
  assert.equal(body.data.rangeCapped, false);
  assert.equal(body.data.rangeDefaulted, false);
  assert.equal(body.data.rowLimit, STATS_ROW_LIMIT);
  assert.equal(body.data.rowCapped, false);
  assert.equal(body.data.rowsScanned, 3);
  assert.equal(body.data.byCountry.length, 2);
  assert.equal(body.data.byCountry[0].value, 'US');
});

test('GET /api/clicks/stats no longer 400s when the range is omitted', async () => {
  const fake = createFakeD1({
    firstRow: { totalClicks: 0, uniqueClicks: 0, countries: 0, deviceTypes: 0 },
  });
  const app = createClickLogRouter();

  const response = await app.request('/stats', {}, { DB: fake.db });
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.data.totalClicks, 0);
  assert.equal(body.data.rangeDefaulted, true);
  assert.ok(Number.isFinite(Date.parse(body.data.rangeStart)));
  assert.ok(Number.isFinite(Date.parse(body.data.rangeEnd)));
  assert.equal(body.data.rangeCapped, false);
  assert.equal(body.data.byCountry, undefined, 'topN is opt-in');
});

test('GET /api/conversions/stats keeps legacy fields and falls back to the default window', async () => {
  const fake = createFakeD1({
    firstRow: {
      totalConversions: 2,
      approvedConversions: 1,
      pendingConversions: 1,
      rejectedConversions: 0,
      totalRevenue: 15,
      totalPayout: 5,
    },
  });
  const app = createConversionLogRouter();

  const response = await app.request('/stats', {}, { DB: fake.db });
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.data.totalConversions, 2);
  assert.equal(body.data.approvedConversions, 1);
  assert.equal(body.data.pendingConversions, 1);
  assert.equal(body.data.rejectedConversions, 0);
  assert.equal(body.data.totalRevenue, 15);
  assert.equal(body.data.totalPayout, 5);
  assert.equal(body.data.rangeDefaulted, true);
  assert.equal(body.data.rangeCapped, false);
  assert.equal(body.data.rowLimit, STATS_ROW_LIMIT);
  assert.equal(body.data.rowCapped, false);
});
