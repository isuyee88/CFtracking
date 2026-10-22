/**
 * @file Manual smoke probe for the offline TS loader.
 *
 * The node:test file imports `ts-resolve-hooks.mjs` itself; this script exists
 * only to isolate loader problems when `node --test` cannot spawn a child
 * process (sandbox EPERM). It is not part of the test glob.
 *
 * Run with:
 *   node --experimental-transform-types test/node/probe.mjs
 */
import './ts-resolve-hooks.mjs';

const { default: app } = await import('../../src/routes/bulk-operations.routes.ts');
console.log(typeof app.fetch === 'function' ? 'route graph loads' : 'route graph failed to load');
