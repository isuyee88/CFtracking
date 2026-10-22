/**
 * @file Offline regression tests for ClickRepository.saveClick.
 *
 * Why this exists: the D1 insert used to hard-code isUnique=1 and omit the
 * bot/risk/fingerprint/UTM columns. Unit tests with mocked D1 never validated
 * column names or bound types, so a dropped column stayed green. These tests
 * load the real clicks DDL (migrations 010+019+022+050+051) into node:sqlite
 * and read the row back, so a missing column or a boolean stored as a string
 * fails here instead of in production.
 *
 * Run with:
 *   node --experimental-transform-types --test --test-isolation=none test/node/click-repo.node.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';

// Imported after the resolver hook is active, because click.repo.ts imports
// `./base.repo` without an extension (bundler-style).
const { ClickRepository } = await import('../../src/handlers/d1/click.repo.ts');

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);

const CLICK_MIGRATIONS = [
  '010_create_clicks_table.sql',
  '019_add_isBot_field.sql',
  '022_add_security_fields_to_clicks.sql',
  '050_add_subid_fields_to_clicks.sql',
  '051_add_fingerprint_fields.sql',
];

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

function createSchema(db) {
  for (const name of CLICK_MIGRATIONS) {
    for (const statement of statementsOf(readMigration(name))) {
      db.exec(statement);
    }
  }
}

/** Minimal D1 adapter: prepare -> bind -> run, backed by node:sqlite. */
function createD1(db) {
  return {
    prepare(sql) {
      let params = [];
      const statement = {
        bind(...args) {
          params = args;
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

function createRepository() {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
  return { db, repo: new ClickRepository(createD1(db)) };
}

function getClick(db, clickId) {
  return db.prepare('SELECT * FROM clicks WHERE clickId = ?').get(clickId);
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

test('saveClick persists isUnique=0 and every tracking/UTM column with real types', async () => {
  const { db, repo } = createRepository();
  const riskReasons = ['Low bot score: 17', 'JS detection failed'];

  await repo.saveClick({
    ...baseClick,
    clickId: 'click-full',
    isUnique: false,
    cfRayId: '8f1c2a3b4d5e6f70',
    cfBotScore: 17,
    fingerprint: 'fp_offline_abc123',
    riskScore: 55.5,
    isBot: true,
    isSuspicious: true,
    riskReasons,
    ja3Hash: 'ja3_offline_hash',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'fall-sale',
    utmTerm: 'tracking',
    utmContent: 'ad-variant-a',
  });

  const row = getClick(db, 'click-full');
  assert.ok(row, 'click row must exist');

  // The bug: this used to be a hard-coded 1.
  assert.equal(row.isUnique, 0);
  assert.equal(typeof row.isUnique, 'number');

  assert.equal(row.cfRayId, '8f1c2a3b4d5e6f70');
  assert.equal(row.cfBotScore, 17);
  assert.equal(typeof row.cfBotScore, 'number');
  assert.equal(row.fingerprint, 'fp_offline_abc123');
  assert.equal(row.riskScore, 55.5);
  assert.equal(typeof row.riskScore, 'number');
  assert.equal(row.isBot, 1);
  assert.equal(typeof row.isBot, 'number');
  assert.equal(row.isSuspicious, 1);
  assert.equal(typeof row.isSuspicious, 'number');
  assert.equal(row.riskReasons, JSON.stringify(riskReasons));
  assert.deepEqual(JSON.parse(row.riskReasons), riskReasons);
  assert.equal(row.ja3Hash, 'ja3_offline_hash');

  assert.equal(row.utmSource, 'google');
  assert.equal(row.utmMedium, 'cpc');
  assert.equal(row.utmCampaign, 'fall-sale');
  assert.equal(row.utmTerm, 'tracking');
  assert.equal(row.utmContent, 'ad-variant-a');
});

test('saveClick defaults omitted optional fields to null/0 without throwing', async () => {
  const { db, repo } = createRepository();

  await repo.saveClick({ ...baseClick, clickId: 'click-defaults' });

  const row = getClick(db, 'click-defaults');
  assert.ok(row, 'click row must exist');

  // Missing isUnique keeps the legacy "unique" behaviour.
  assert.equal(row.isUnique, 1);
  assert.equal(row.cfRayId, null);
  assert.equal(row.cfBotScore, null);
  assert.equal(row.fingerprint, null);
  assert.equal(row.riskScore, 0);
  assert.equal(row.isBot, 0);
  assert.equal(row.isSuspicious, 0);
  assert.equal(row.riskReasons, null);
  assert.equal(row.ja3Hash, null);
  for (const column of ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent']) {
    assert.equal(row[column], null);
  }

  // Columns exist in the schema but have no source on ClickData; they stay NULL.
  assert.equal(row.serverFingerprint, null);
  assert.equal(row.clientFingerprint, null);
});

test('saveClick stores explicit false as 0 and an empty riskReasons array as NULL', async () => {
  const { db, repo } = createRepository();

  await repo.saveClick({
    ...baseClick,
    clickId: 'click-false',
    isUnique: true,
    isBot: false,
    isSuspicious: false,
    riskReasons: [],
  });

  const row = getClick(db, 'click-false');
  assert.equal(row.isUnique, 1);
  assert.equal(row.isBot, 0);
  assert.equal(row.isSuspicious, 0);
  assert.equal(row.riskReasons, null);
});
