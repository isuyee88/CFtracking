/**
 * @file Runtime stub for the types-only `@cloudflare/workers-types` package.
 *
 * Why: `src/handlers/do/user-preference.do.ts` imports `DurableObjectState` /
 * `DurableObjectStorage` from `@cloudflare/workers-types`. The package ships
 * only `.d.ts` files, so a plain Node ESM import of the tracking router fails
 * with ERR_MODULE_NOT_FOUND even though the bundler elides the type-only import.
 * Offline tests map that specifier here so the route graph can load.
 *
 * This file is a test fixture only; it is never bundled or deployed.
 */

export class DurableObject {}
export class DurableObjectState {}
export class DurableObjectStorage {}
export class DurableObjectNamespace {}
export class DurableObjectId {}
export class DurableObjectStub {}
export class D1Database {}
export class KVNamespace {}
