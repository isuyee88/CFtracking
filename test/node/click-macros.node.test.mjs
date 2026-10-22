/**
 * @file Offline regression tests for click macro expansion and the KV clickcfg
 * fast path.
 *
 * Why this exists: the production bundle's fast path built the redirect with
 * `new URL(cfg.offerUrl)` and only appended `clickid`/`visitor`, so an offer
 * URL carrying `uid={clickid}` (PartnerBoost attribution) left the literal
 * macro in `Location` (it can surface as `%7Bclickid%7D` after URL
 * serialization). These tests load the real `clicks` DDL into node:sqlite and
 * a fake KV, and assert that the KV path and the flow path expand the same
 * macros with the production semantics.
 *
 * Run with (one line: a Unix `\` continuation becomes a test path on Windows):
 *   node --experimental-transform-types --test --test-isolation=none "test/node/*.node.test.mjs"
 * or, warning-free on PowerShell 5.1 (see package.json):
 *   npm run test:node
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

import './ts-resolve-hooks.mjs';

// The route graph imports `@cloudflare/workers-types`, which is types-only at
// build time but a real specifier to Node. Map it to the test stub so
// `createTrackingRouter()` can be imported offline.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@cloudflare/workers-types' || specifier === 'cloudflare:workers') {
      return { url: new URL('./workers-types.stub.mjs', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// Loaded after the resolver hook is active (extensionless `@/` imports).
const { expandClickMacros, appendTrackingParams, buildTrackingParams } = await import(
  '../../src/services/tracking/click-macros.ts'
);
const { FlowActionService } = await import('../../src/services/tracking/flow-action.service.ts');
const { tryKvClick, persistFastPathClick } = await import(
  '../../src/services/tracking/click-fast-path.service.ts'
);
const { ConfigSnapshotReader, normalizeClickConfigSnapshot } = await import(
  '../../src/services/cache/config-snapshot.service.ts'
);

const MIGRATIONS_DIR = new URL('../../schema/migrations/', import.meta.url);
const CLICK_MIGRATIONS = [
  '010_create_clicks_table.sql',
  '019_add_isBot_field.sql',
  '022_add_security_fields_to_clicks.sql',
  '050_add_subid_fields_to_clicks.sql',
  '051_add_fingerprint_fields.sql',
];

function statementsOf(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

function createClicksSchema(db) {
  for (const name of CLICK_MIGRATIONS) {
    for (const statement of statementsOf(readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8'))) {
      db.exec(statement);
    }
  }
}

/** Minimal D1 adapter: prepare -> bind -> run/first/all. */
function createD1(db, calls = { prepare: 0 }) {
  return {
    prepare(sql) {
      calls.prepare += 1;
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

/** D1 that fails the test if the fast path touches it. */
function createForbiddenD1() {
  return {
    prepare() {
      throw new Error('fast path must not touch D1');
    },
  };
}

function createKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  const kv = {
    store,
    deletes: [],
    writes: [],
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      kv.writes.push(key);
      store.set(key, String(value));
    },
    async delete(key) {
      kv.deletes.push(key);
      store.delete(key);
    },
    async list() {
      return { keys: [], list_complete: true, cursor: undefined };
    },
  };
  return kv;
}

const CLICK_CFG = {
  campaignId: 'camp-one',
  flowId: 'flow-one',
  offerId: 'offer-one',
  offerUrl: 'https://pb.example/trk?uid={clickid}&sub={subid1}&keep={unknown_macro}',
  landingPageId: null,
  status: 'active',
  updatedAt: '2026-10-22T00:00:00.000Z',
};

function fastPathEnv(offerUrl = CLICK_CFG.offerUrl, db = null) {
  const kv = createKv({
    'clickcfg:pb-camp': JSON.stringify({ ...CLICK_CFG, offerUrl }),
  });
  const calls = { prepare: 0 };
  const env = { UNIQUENESS_KV: kv };
  if (db) env.DB = createD1(db, calls);
  return { env, kv, calls };
}

function fastPathContext(overrides = {}) {
  return {
    clickId: 'clk_test',
    visitorId: 'vst_test',
    subIds: ['sub-one'],
    urlParams: new URLSearchParams('sub1=sub-one'),
    ...overrides,
  };
}

test('expandClickMacros replaces known macros, keeps unknown ones, and is identity without macros', () => {
  const context = {
    clickId: 'clk_1',
    visitorId: 'vst_1',
    campaignId: 'camp-one',
    subIds: ['s1', 's2'],
    country: 'US',
    urlParams: new URLSearchParams('gclid=abc'),
  };

  assert.equal(
    expandClickMacros('https://pb.example/trk?uid={clickid}&sub={subid2}&c={campaign}&g={gclid}', context),
    'https://pb.example/trk?uid=clk_1&sub=s2&c=camp-one&g=abc'
  );
  // Case-insensitive like the production `gi` replacement.
  assert.equal(expandClickMacros('https://x.test/?u={ClickID}', context), 'https://x.test/?u=clk_1');
  // Percent-encoded token: URLSearchParams serialization encodes { } as %7B %7D.
  assert.equal(expandClickMacros('https://x.test/?u=%7Bclickid%7D', context), 'https://x.test/?u=clk_1');
  // Unknown macros stay verbatim, mixed with known ones.
  assert.equal(
    expandClickMacros('https://x.test/?a={clickid}&b={nope}&c=plain', context),
    'https://x.test/?a=clk_1&b={nope}&c=plain'
  );
  // No macro at all -> byte-identical (no re-encoding of the URL).
  const plain = 'https://x.test/path?a=1&b=two%20words';
  assert.equal(expandClickMacros(plain, context), plain);
  assert.equal(expandClickMacros('', context), '');
  // Query params win over request-derived values, matching production order.
  assert.equal(
    expandClickMacros('https://x.test/?sub={subid1}', { ...context, subIds: ['from-request'], urlParams: new URLSearchParams('subid1=from-query') }),
    'https://x.test/?sub=from-query'
  );
});

test('buildTrackingParams/appendTrackingParams overwrite instead of duplicating', () => {
  const params = buildTrackingParams({ clickId: 'clk_1', visitorId: 'vst_1', subIds: ['s1', 's2'] });
  assert.deepEqual([...params.entries()], [
    ['clickid', 'clk_1'],
    ['visitor', 'vst_1'],
    ['subid1', 's1'],
    ['subid2', 's2'],
  ]);
  assert.equal(
    appendTrackingParams('https://pb.example/trk?clickid=old&uid=u', params),
    'https://pb.example/trk?clickid=clk_1&uid=u&visitor=vst_1&subid1=s1&subid2=s2'
  );
});

test('KV fast path expands {clickid} for PartnerBoost uid and appends the click id', async () => {
  const { env } = fastPathEnv(CLICK_CFG.offerUrl, null);
  // A D1 that throws on prepare proves the hit performed no D1 read.
  env.DB = createForbiddenD1();
  const result = await tryKvClick(env, 'pb-camp', fastPathContext());

  assert.ok(result, 'fast path must hit');
  const url = new URL(result.redirectUrl);
  assert.equal(url.searchParams.get('uid'), 'clk_test');
  assert.equal(url.searchParams.get('clickid'), 'clk_test');
  assert.equal(url.searchParams.get('visitor'), 'vst_test');
  assert.equal(url.searchParams.get('sub'), 'sub-one');
  assert.equal(url.searchParams.get('subid1'), 'sub-one');
  // Unknown macro survives; URL serialization may encode it, decoding restores it.
  assert.equal(url.searchParams.get('keep'), '{unknown_macro}');
});

test('KV fast path expands an already percent-encoded {clickid} snapshot URL', async () => {
  // Snapshots persisted from a URLSearchParams round-trip store uid=%7Bclickid%7D
  // (URL serialization leaves braces alone, URLSearchParams encoding does not).
  const encoded = 'https://pb.example/trk?uid=%7Bclickid%7D';
  const { env } = fastPathEnv(encoded);
  const result = await tryKvClick(env, 'pb-camp', fastPathContext());

  assert.ok(result);
  const url = new URL(result.redirectUrl);
  assert.equal(url.searchParams.get('uid'), 'clk_test');
  assert.equal(result.redirectUrl.includes('%7Bclickid%7D'), false);
});

test('KV fast path leaves a macro-free URL untouched apart from tracking params', async () => {
  const { env } = fastPathEnv('https://oo.example/landing?x=1');
  const result = await tryKvClick(env, 'pb-camp', fastPathContext({ subIds: [], urlParams: new URLSearchParams() }));

  assert.ok(result);
  assert.equal(
    result.redirectUrl,
    'https://oo.example/landing?x=1&clickid=clk_test&visitor=vst_test'
  );
});

test('flow path expands the same macros for show_offer, redirect and landing', async () => {
  const service = new FlowActionService();
  const request = {
    campaignId: 'camp-one',
    ip: '203.0.113.10',
    userAgent: 'offline-agent',
    urlParams: new URLSearchParams('sub2=s2'),
    subId2: 's2',
  };

  const offer = {
    id: 'offer-one',
    url: 'https://pb.example/trk?uid={clickid}&sub={subid2}&keep={unknown_macro}',
    redirectType: 'http',
  };
  const offerResult = await service.execute({
    flow: { id: 'flow-one', campaignId: 'camp-one', actionType: 'show_offer', actionConfig: { type: 'show_offer', offerId: 'offer-one' } },
    request,
    offer,
    clickId: 'clk_flow',
    visitorId: 'vst_flow',
  });

  assert.equal(offerResult.statusCode, 302);
  const offerUrl = new URL(offerResult.redirectUrl);
  assert.equal(offerUrl.searchParams.get('uid'), 'clk_flow');
  assert.equal(offerUrl.searchParams.get('clickid'), 'clk_flow');
  assert.equal(offerUrl.searchParams.get('sub'), 's2');
  assert.equal(offerUrl.searchParams.get('keep'), '{unknown_macro}');

  const redirectResult = await service.execute({
    flow: {
      id: 'flow-two',
      campaignId: 'camp-one',
      actionType: 'redirect',
      actionConfig: { type: 'redirect', redirectUrl: 'https://dest.example/?uid={clickid}&c={campaign}' },
    },
    request,
    clickId: 'clk_redirect',
    visitorId: 'vst_redirect',
  });
  assert.equal(redirectResult.statusCode, 302);
  const redirectUrl = new URL(redirectResult.redirectUrl);
  assert.equal(redirectUrl.searchParams.get('uid'), 'clk_redirect');
  assert.equal(redirectUrl.searchParams.get('c'), 'camp-one');

  const landingResult = await service.execute({
    flow: {
      id: 'flow-three',
      campaignId: 'camp-one',
      actionType: 'show_landing',
      actionConfig: { type: 'show_landing', landingPageId: 'lp-one' },
    },
    request,
    landingPage: { id: 'lp-one', url: 'https://lp.example/page?clickid={clickid}' },
    clickId: 'clk_landing',
    visitorId: 'vst_landing',
  });
  assert.equal(landingResult.statusCode, 302);
  const landingUrl = new URL(landingResult.redirectUrl);
  assert.equal(landingUrl.searchParams.get('clickid'), 'clk_landing');

  // No macro in the offer URL: only tracking params are appended (no rewrite).
  const plainResult = await service.execute({
    flow: { id: 'flow-four', campaignId: 'camp-one', actionType: 'show_offer', actionConfig: { type: 'show_offer', offerId: 'offer-plain' } },
    request,
    offer: { id: 'offer-plain', url: 'https://plain.example/offer', redirectType: 'http' },
    clickId: 'clk_plain',
    visitorId: 'vst_plain',
  });
  assert.equal(
    plainResult.redirectUrl,
    'https://plain.example/offer?clickid=clk_plain&visitor=vst_plain&subid2=s2'
  );
});

test('clickcfg read-back validates shape/status and fails open to D1', async () => {
  const valid = {
    campaignId: 'camp-one',
    flowId: null,
    offerId: null,
    offerUrl: 'https://pb.example/trk',
    landingPageId: null,
    status: 'active',
    updatedAt: '2026-10-22T00:00:00.000Z',
  };
  assert.deepEqual(normalizeClickConfigSnapshot(valid), valid);

  const cases = {
    missingOfferUrl: { ...valid, offerUrl: '' },
    missingCampaign: { ...valid, campaignId: '' },
    paused: { ...valid, status: 'paused' },
    archived: { ...valid, status: 'archived' },
    notAnObject: null,
    stringValue: 'nope',
  };
  for (const [name, value] of Object.entries(cases)) {
    assert.equal(normalizeClickConfigSnapshot(value), null, `expected ${name} to be rejected`);
  }

  // Reader: no binding, KV miss, malformed JSON, and a throwing KV all return
  // null so the route falls back to D1 instead of 500ing.
  assert.equal(await new ConfigSnapshotReader({}).readClickConfig('pb-camp'), null);
  assert.equal(await new ConfigSnapshotReader({ UNIQUENESS_KV: createKv() }).readClickConfig('pb-camp'), null);
  assert.equal(await new ConfigSnapshotReader({ UNIQUENESS_KV: createKv() }).readClickConfig('  '), null);

  const throwingKv = {
    async get() {
      throw new Error('kv offline');
    },
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(
      await new ConfigSnapshotReader({ UNIQUENESS_KV: throwingKv }).readClickConfig('pb-camp'),
      null
    );
  } finally {
    console.warn = originalWarn;
  }

  const { env } = fastPathEnv();
  assert.deepEqual(await new ConfigSnapshotReader(env).readClickConfig('pb-camp'), CLICK_CFG);
  // A KV miss/parse failure is a fast-path miss, never an exception.
  assert.equal(await tryKvClick(env, 'other-alias', fastPathContext()), null);
});

test('fast-path persistence writes a real clicks row with the resolved redirect', async () => {
  const db = new DatabaseSync(':memory:');
  createClicksSchema(db);
  const calls = { prepare: 0 };
  const env = { DB: createD1(db, calls), UNIQUENESS_KV: fastPathEnv().kv };

  const context = fastPathContext();
  const result = await tryKvClick(env, 'pb-camp', context);
  assert.ok(result);
  await persistFastPathClick(env, result.snapshot, context, result.redirectUrl);

  const row = db.prepare('SELECT * FROM clicks WHERE clickId = ?').get('clk_test');
  assert.ok(row, 'fast-path click must be persisted');
  assert.equal(row.campaignId, 'camp-one');
  assert.equal(row.flowId, 'flow-one');
  assert.equal(row.offerId, 'offer-one');
  assert.equal(row.subId1, 'sub-one');
  assert.equal(row.isUnique, 1);
  assert.match(row.redirectUrl, /uid=clk_test/);
});

test('route serves the KV snapshot before D1 and falls back when the snapshot is missing', async () => {
  const { createTrackingRouter } = await import('../../src/services/tracking/tracking.routes.ts');
  const app = createTrackingRouter();

  // Hit: a D1 that throws on prepare proves the fast path read no D1 row.
  const { env } = fastPathEnv();
  env.DB = createForbiddenD1();
  const originalError = console.error;
  console.error = () => {};
  let hit;
  try {
    hit = await app.request('/click/pb-camp?sub1=s1', {}, env);
  } finally {
    console.error = originalError;
  }
  assert.equal(hit.status, 302);
  const location = hit.headers.get('location') || '';
  assert.match(location, /uid=clk_\d+/);
  assert.match(location, /sub=s1/);
  assert.equal(location.includes('%7Bclickid%7D'), false);

  // Miss: no clickcfg -> ClickService -> campaign lookup -> 404, not a 500.
  const emptyD1 = {
    prepare() {
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [], success: true, meta: {} };
        },
        async run() {
          return { success: true, meta: { changes: 0 } };
        },
      };
      return statement;
    },
  };
  const originalMissError = console.error;
  console.error = () => {};
  try {
    const missed = await app.request(
      '/click/unknown-alias',
      {},
      { UNIQUENESS_KV: createKv(), DB: emptyD1 }
    );
    assert.equal(missed.status, 404);
  } finally {
    console.error = originalMissError;
  }
});
