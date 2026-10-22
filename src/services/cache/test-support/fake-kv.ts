/**
 * @fileoverview Minimal in-memory KV used by cache unit tests.
 *
 * Kept at the repository boundary: production code only uses get/put/delete,
 * so a Map is enough to assert what a control-plane write published.
 *
 * `failPuts` exists to exercise the publisher's fail-closed path: a KV write
 * failure must delete the alias key instead of leaving a stale snapshot.
 */

export interface FakeKVOptions {
  /** Exact keys whose `put` rejects, simulating a KV outage mid-publish. */
  failPuts?: string[];
}

export class FakeKV {
  readonly store = new Map<string, string>();
  private readonly failPuts: Set<string>;

  constructor(options: FakeKVOptions = {}) {
    this.failPuts = new Set(options.failPuts ?? []);
  }

  async get(key: string, type?: 'text' | 'json'): Promise<unknown> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }

  async put(key: string, value: string, _options?: { expirationTtl?: number }): Promise<void> {
    if (this.failPuts.has(key)) throw new Error(`kv put failed: ${key}`);
    this.store.set(key, String(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Typed read helper for assertions. */
  json<T = Record<string, unknown>>(key: string): T | null {
    const value = this.store.get(key);
    return value === undefined ? null : (JSON.parse(value) as T);
  }
}

export function asKVNamespace(kv: FakeKV): KVNamespace {
  return kv as unknown as KVNamespace;
}
