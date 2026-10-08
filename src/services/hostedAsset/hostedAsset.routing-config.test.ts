import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Cloudflare asset routing contract', () => {
  for (const configName of ['wrangler.toml', 'wrangler.dev.toml', 'wrangler.local-qa.toml']) {
    it(`${configName} sends hosted assets to the Worker before SPA fallback`, () => {
      const config = readFileSync(resolve(process.cwd(), configName), 'utf8');

      expect(config).not.toMatch(/run_worker_first\s*=\s*true/);
      expect(config).toContain('/hosted-assets/*');
    });
  }

  it('keeps the local-QA Worker out of production environment semantics', () => {
    const config = readFileSync(resolve(process.cwd(), 'wrangler.local-qa.toml'), 'utf8');

    expect(config).toContain('ENVIRONMENT = "staging"');
    expect(config).not.toContain('ENVIRONMENT = "production"');
    expect(config).toContain('name = "cf-tracking-local-qa"');
    expect(config).toContain('database_name = "cf-tracking-db-local-qa"');
    expect(config).not.toContain('database_id =');
    expect(config).not.toMatch(/\[\[kv_namespaces\]\]\r?\nbinding = "UNIQUENESS_KV"\r?\nid\s*=/);
  });
});
