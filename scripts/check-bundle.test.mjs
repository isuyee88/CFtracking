// Contract tests for the Builds bundle gate. They run against the checked-in deploy/prod
// artifact (no network) plus in-memory fixtures, so a regression in either the artifact or the
// gate itself fails before Cloudflare Builds deploys anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { checkBundle, exportedNames } from './check-bundle.mjs';

const REAL_WORKER = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const REAL_WRANGLER = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const REAL_ASSETS_INDEX_EXISTS = existsSync(new URL('../assets/index.html', import.meta.url));

const MINIMAL_WORKER = 'const AutomationSchedulerDO = class {};\nexport { AutomationSchedulerDO };\n';

/**
 * @param {{ binding?: string | null, tag?: string | null, sqliteClasses?: string[] }} [options]
 * @returns {string}
 */
function wranglerToml({ binding = 'AutomationSchedulerDO', tag = 'v11', sqliteClasses = ['AutomationSchedulerDO'] } = {}) {
  const blocks = ['name = "cf-tracking"\nmain = "./worker.js"'];

  if (binding !== null) {
    blocks.push(`[[durable_objects.bindings]]\nname = "AUTOMATION_DO"\nclass_name = "${binding}"`);
  }
  if (tag !== null) {
    const classes = sqliteClasses.map((name) => `"${name}"`).join(', ');
    blocks.push(`[[migrations]]\ntag = "${tag}"\nnew_sqlite_classes = [${classes}]`);
  }

  return `${blocks.join('\n\n')}\n`;
}

/**
 * @param {{ worker?: string, wranglerToml?: string, assetsIndexExists?: boolean }} [overrides]
 */
function artifact(overrides = {}) {
  return {
    worker: MINIMAL_WORKER,
    wranglerToml: wranglerToml(),
    assetsIndexExists: true,
    ...overrides,
  };
}

test('current deploy/prod artifact satisfies the bundle contract', () => {
  const errors = checkBundle({
    worker: REAL_WORKER,
    wranglerToml: REAL_WRANGLER,
    assetsIndexExists: REAL_ASSETS_INDEX_EXISTS,
  });

  assert.deepEqual(errors, []);
  assert.ok(REAL_ASSETS_INDEX_EXISTS, 'deploy/prod must ship assets/index.html');
  assert.ok(
    exportedNames(REAL_WORKER).has('AutomationSchedulerDO'),
    'deploy/prod worker.js must export AutomationSchedulerDO',
  );
});

test('fails when worker.js defines but does not export AutomationSchedulerDO', () => {
  const worker = 'var AutomationSchedulerDO = class {};\nvar other = 1;\nexport { other };\n';

  const errors = checkBundle(artifact({ worker }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not export AutomationSchedulerDO/);
});

test('fails when the AUTOMATION_DO binding is absent', () => {
  const errors = checkBundle(artifact({ wranglerToml: wranglerToml({ binding: null }) }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /no \[\[durable_objects\.bindings\]\] with name = "AUTOMATION_DO"/);
});

test('fails when AUTOMATION_DO binds a different class', () => {
  const errors = checkBundle(artifact({ wranglerToml: wranglerToml({ binding: 'AutomationSchedulerDOv2' }) }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /expected "AutomationSchedulerDO"/);
});

test('fails when the v11 migration is absent', () => {
  const errors = checkBundle(artifact({ wranglerToml: wranglerToml({ tag: 'v10' }) }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /no \[\[migrations\]\] tag = "v11"/);
});

test('fails when v11 does not create the AutomationSchedulerDO sqlite class', () => {
  const errors = checkBundle(artifact({ wranglerToml: wranglerToml({ sqliteClasses: ['SomeOtherDO'] }) }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /new_sqlite_classes/);
});

test('fails when AutomationSchedulerDO only appears in comments or strings', () => {
  const worker = [
    'const AutomationSchedulerDO = class {};',
    "const label = 'export { AutomationSchedulerDO }';",
    '// export { AutomationSchedulerDO };',
    '/* export { AutomationSchedulerDO }; */',
    'export { label };',
    '',
  ].join('\n');

  const errors = checkBundle(artifact({ worker }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not export AutomationSchedulerDO/);
});

test('does not mistake a regex literal for a comment while reading exports', () => {
  const worker = [
    'const URL_PATTERN = /https?:\\/\\/example\\.com/;',
    'const AutomationSchedulerDO = class {};',
    'export { AutomationSchedulerDO };',
    '',
  ].join('\n');

  const errors = checkBundle(artifact({ worker }));

  assert.deepEqual(errors, []);
});

test('accepts an aliased export of the scheduler class', () => {
  const worker = [
    'var automationScheduler = class {};',
    'export { automationScheduler as AutomationSchedulerDO };',
    '',
  ].join('\n');

  assert.deepEqual(checkBundle(artifact({ worker })), []);
});

test('fails when assets/index.html is missing', () => {
  const errors = checkBundle(artifact({ assetsIndexExists: false }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /assets\/index\.html/);
});

test('fails when worker.js imports cftracking-plugins externally', () => {
  const worker = `import { plugin } from '../../cftracking-plugins/dist/index.js';\n${MINIMAL_WORKER}`;

  const errors = checkBundle(artifact({ worker }));

  assert.equal(errors.length, 1);
  assert.match(errors[0], /cftracking-plugins/);
});

test('accepts a minimal artifact that satisfies every invariant', () => {
  assert.deepEqual(checkBundle(artifact()), []);
});
