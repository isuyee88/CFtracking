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
});
