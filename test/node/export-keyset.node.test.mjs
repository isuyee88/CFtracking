/**
 * @file Offline tests for keyset-based click/conversion export.
 *
 * Why this exists: the export path used `pageSize=10000`, which exceeds D1's
 * 7500 rows/read budget. Replacing it with a single 7000-row page would have
 * silently dropped rows. These tests pin the replacement contract:
 *   - export batches page with (timestamp, id) keyset cursors, never OFFSET;
 *   - every batch reads at most batchSize + 1 rows;
 *   - rows are neither duplicated nor lost, including timestamp ties;
 *   - hitting the 10k export cap reports truncated=true, and the route turns
 *     that into an explicit 400 instead of a partial "successful" download.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/export-keyset.node.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';

const { ClickRepository } = await import('../../src/handlers/d1/click.repo.ts');
const { ConversionRepository } = await import('../../src/handlers/d1/conversion.repo.ts');
const { ExportService } = await import('../../src/services/export/export.service.ts');
const { createExportResponse } = await import('../../src/services/export/export.routes.ts');
const { LIST_COUNT_CAP } = await import('../../src/handlers/d1/list-query.ts');

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

function createClickRepo() {
  const db = new DatabaseSync(':memory:');
  createSchema(db, CLICK_MIGRATIONS);
  const calls = [];
  return { db, calls, repo: new ClickRepository(createRecordingD1(db, calls)) };
}

function createConversionRepo() {
  const db = new DatabaseSync(':memory:');
  createSchema(db, CONVERSION_MIGRATIONS);
  const calls = [];
  return { db, calls, repo: new ConversionRepository(createRecordingD1(db, calls)) };
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

function clickAt(index, overrides = {}) {
  return {
    ...baseClick,
    clickId: `click-${index}`,
    timestamp: `2026-10-22T00:00:0${index}.000Z`,
    ...overrides,
  };
}

function conversionAt(index, overrides = {}) {
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

test('click export: keyset batches cover all rows once, with no OFFSET', async () => {
  const { repo, calls } = createClickRepo();
  // click-2 and click-3 share a timestamp to exercise the clickId tiebreak.
  await repo.saveClick(clickAt(0));
  await repo.saveClick(clickAt(1));
  await repo.saveClick(clickAt(2, { timestamp: '2026-10-22T00:00:02.000Z' }));
  await repo.saveClick(clickAt(3, { timestamp: '2026-10-22T00:00:02.000Z' }));
  await repo.saveClick(clickAt(4));
  calls.length = 0;

  const collected = [];
  let cursor = null;
  let hasMore = true;
  while (hasMore) {
    const batch = await repo.findClicksForExport({}, cursor, 2);
    collected.push(...batch.list);
    hasMore = batch.hasMore;
    cursor = batch.nextCursor;
  }

  assert.deepEqual(
    collected.map(row => row.clickId).sort(),
    ['click-0', 'click-1', 'click-2', 'click-3', 'click-4'],
    'every row exported exactly once'
  );
  assert.equal(new Set(collected.map(row => row.clickId)).size, 5);

  assert.equal(calls.length, 3, '5 rows at 2 per batch needs 3 batches');
  for (const call of calls) {
    assert.ok(!/OFFSET/i.test(call.sql), 'export must not use OFFSET pagination');
    assert.match(call.sql, /ORDER BY timestamp DESC, clickId DESC/);
    assert.equal(call.params.at(-1), 3, 'each batch probes batchSize + 1 rows');
  }
  // First batch: filter params only + LIMIT. Later batches add the 3 cursor params.
  assert.deepEqual(calls[0].params, [3]);
  assert.deepEqual(calls[1].params.slice(0, 3), [
    collected[1].timestamp,
    collected[1].timestamp,
    collected[1].clickId,
  ]);
  assert.ok(calls[1].sql.includes('(timestamp < ? OR (timestamp = ? AND clickId < ?))'));
});

test('click export: filters bind before the cursor and still narrow the batch', async () => {
  const { repo, calls } = createClickRepo();
  await repo.saveClick(clickAt(0, { campaignId: 'camp-one' }));
  await repo.saveClick(clickAt(1, { campaignId: 'camp-two' }));
  await repo.saveClick(clickAt(2, { campaignId: 'camp-one' }));
  calls.length = 0;

  const batch = await repo.findClicksForExport({ campaignId: 'camp-one' }, null, 10);

  assert.equal(batch.list.length, 2);
  assert.ok(batch.list.every(row => row.campaignId === 'camp-one'));
  assert.ok(calls[0].sql.includes('WHERE campaignId = ?'));
  assert.deepEqual(calls[0].params, ['camp-one', 11]);
});

test('conversion export: keyset batches cover all rows once, including timestamp ties', async () => {
  const { repo, calls } = createConversionRepo();
  await repo.saveConversion(conversionAt(0));
  await repo.saveConversion(conversionAt(1, { timestamp: '2026-10-22T00:00:02.000Z' }));
  await repo.saveConversion(conversionAt(2, { timestamp: '2026-10-22T00:00:02.000Z' }));
  await repo.saveConversion(conversionAt(3));
  calls.length = 0;

  const collected = [];
  let cursor = null;
  let hasMore = true;
  while (hasMore) {
    const batch = await repo.findConversionsForExport({}, cursor, 2);
    collected.push(...batch.list);
    hasMore = batch.hasMore;
    cursor = batch.nextCursor;
  }

  assert.deepEqual(
    collected.map(row => row.conversionId).sort(),
    ['conv-0', 'conv-1', 'conv-2', 'conv-3']
  );
  assert.equal(new Set(collected.map(row => row.conversionId)).size, 4);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.ok(!/OFFSET/i.test(call.sql));
    assert.match(call.sql, /ORDER BY timestamp DESC, conversionId DESC/);
    assert.equal(call.params.at(-1), 3);
  }
  assert.ok(calls[1].sql.includes('(timestamp < ? OR (timestamp = ? AND conversionId < ?))'));
});

function fakeBatchRepo(batches) {
  const requests = [];
  return {
    requests,
    async findClicksForExport(_params, _cursor, limit) {
      requests.push(limit);
      return batches[requests.length - 1];
    },
    async findConversionsForExport(_params, _cursor, limit) {
      requests.push(limit);
      return batches[requests.length - 1];
    },
  };
}

function rows(count) {
  return Array.from({ length: count }, (_, index) => ({ clickId: `row-${index}`, timestamp: `t-${index}` }));
}

test('export collector caps at 10k rows and flags truncation instead of dropping silently', async () => {
  const service = new ExportService();
  const batches = [
    { list: rows(LIST_COUNT_CAP), hasMore: true, nextCursor: { timestamp: 't', clickId: 'c' } },
    { list: rows(3000), hasMore: true, nextCursor: { timestamp: 't2', clickId: 'c2' } },
  ];
  const repo = fakeBatchRepo(batches);

  const result = await service.collectClickRows(repo, { entityType: 'clicks', format: 'csv' });

  assert.equal(result.rows.length, 10_000);
  assert.equal(result.truncated, true);
  assert.deepEqual(repo.requests, [LIST_COUNT_CAP, 3000]);
});

test('export collector does not flag truncation when rows end exactly at the cap', async () => {
  const service = new ExportService();
  const batches = [
    { list: rows(LIST_COUNT_CAP), hasMore: true, nextCursor: { timestamp: 't', clickId: 'c' } },
    { list: rows(3000), hasMore: false, nextCursor: null },
  ];
  const repo = fakeBatchRepo(batches);

  const result = await service.collectClickRows(repo, { entityType: 'clicks', format: 'csv' });

  assert.equal(result.rows.length, 10_000);
  assert.equal(result.truncated, false);
});

test('export route rejects truncated results with an explicit 400', async () => {
  const fakeContext = {
    json(body, status) {
      return Response.json(body, { status });
    },
  };
  const response = createExportResponse(fakeContext, {
    data: 'partial',
    contentType: 'text/csv',
    filename: 'clicks.csv',
    format: 'csv',
    rowCount: 10_000,
    limit: 10_000,
    truncated: true,
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.details.truncated, true);
  assert.equal(body.error.details.rowCount, 10_000);
  assert.equal(body.error.details.limit, 10_000);
});

test('export route returns a complete file with row-count headers', async () => {
  const fakeContext = {
    json() {
      throw new Error('truncated path must not be used');
    },
  };
  const response = createExportResponse(fakeContext, {
    data: 'a,b\n1,2\n',
    contentType: 'text/csv',
    filename: 'clicks.csv',
    format: 'csv',
    rowCount: 1,
    limit: 10_000,
    truncated: false,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Export-Row-Count'), '1');
  assert.equal(response.headers.get('X-Export-Limit'), '10000');
  assert.equal(await response.text(), 'a,b\n1,2\n');
});
