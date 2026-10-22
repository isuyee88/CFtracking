/**
 * @file Offline regression for flow-rule CRUD against the real DDL.
 *
 * Production bundles create `flowRules` lazily; migration 083 now carries the same
 * shape so a database built from `schema/migrations` cannot 500 on rule endpoints.
 * The test also locks the "rule id is independent from flow id" invariant: the old
 * code used `flowId` as the primary key, so a flow could only ever hold one rule.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import './ts-resolve-hooks.mjs';
// Loaded dynamically so the extensionless/@ alias resolver hook is active first.
const { FlowRepository } = await import('../../src/handlers/d1/flow.repo.ts');

const MIGRATIONS = new URL('../../schema/migrations/', import.meta.url);
const migration = (name) => readFileSync(new URL(name, MIGRATIONS), 'utf8');

function createSchema(db) {
  db.exec(migration('001_init.sql'));
  db.exec(migration('045_enhance_flow_rules.sql'));
  db.exec(migration('083_flow_rules_compat.sql'));
}

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

function seed(db) {
  const now = '2000-01-01T00:00:00.000Z';
  db.prepare(`INSERT INTO campaigns (id, name, alias, domain, status, createdAt, updatedAt)
              VALUES ('camp-one', 'Camp One', 'camp-one', 'one.example', 'active', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO flows (id, campaignId, name, status, createdAt, updatedAt)
              VALUES ('flow-one', 'camp-one', 'Flow One', 'active', ?, ?)`).run(now, now);
}

test('createFlowRule generates a unique id per rule (multiple rules per flow)', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
  seed(db);
  const repo = new FlowRepository(createD1(db));

  const first = await repo.createFlowRule({
    flowId: 'flow-one',
    name: 'Rule A',
    condition: { conditions: [] },
    action: { type: 'redirect' },
  });
  const second = await repo.createFlowRule({
    flowId: 'flow-one',
    name: 'Rule B',
    condition: { conditions: [] },
    action: { type: 'redirect' },
  });

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.id, 'flow-one');
  assert.equal(first.flowId, 'flow-one');
  assert.equal(second.flowId, 'flow-one');

  const rules = await repo.getFlowRules('flow-one');
  assert.equal(rules.length, 2);
  assert.deepEqual(new Set(rules.map((rule) => rule.id)), new Set([first.id, second.id]));
});

test('update and soft-delete address the rule by its own id', async () => {
  const db = new DatabaseSync(':memory:');
  createSchema(db);
  seed(db);
  const repo = new FlowRepository(createD1(db));

  const rule = await repo.createFlowRule({
    flowId: 'flow-one',
    name: 'Rule A',
    condition: { conditions: [] },
    action: { type: 'redirect' },
  });

  const updated = await repo.updateFlowRule(rule.id, {
    name: 'Rule A2',
    condition: { conditions: [{ field: 'country', operator: 'eq', value: 'US' }] },
  });
  assert.equal(updated?.id, rule.id);
  assert.equal(updated?.name, 'Rule A2');

  assert.equal(await repo.deleteFlowRule(rule.id), true);
  const after = await repo.getFlowRuleById(rule.id);
  assert.equal(after?.status, 'deleted');
});
