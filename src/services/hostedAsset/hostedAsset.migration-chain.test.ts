import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// better-sqlite3 uses the same SQLite DDL surface as the local D1 emulator.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3') as new (path: string) => {
  exec(sql: string): void;
  prepare(sql: string): { get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] };
  close(): void;
};

describe('D1 migration chain', () => {
  it('applies every migration through Landing Page versions', () => {
    const migrationDir = resolve(process.cwd(), 'schema/migrations');
    const files = readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
    const db = new Database(':memory:');

    try {
      // Wrangler creates this bookkeeping table before applying project migrations.
      db.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
      for (const file of files) {
        const sql = readFileSync(resolve(migrationDir, file), 'utf8');
        try {
          db.exec(sql);
        } catch (error) {
          throw new Error(`migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const hostedAssets = db.prepare('PRAGMA table_info(hostedAssets)').all() as Array<{ name: string }>;
      expect(hostedAssets.map((column) => column.name)).toContain('r2Key');
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'hostedAssets'").get()).toBeTruthy();
      const landingPageVersions = db.prepare('PRAGMA table_info(landingPageVersions)').all() as Array<{ name: string }>;
      expect(landingPageVersions.map((column) => column.name)).toEqual(expect.arrayContaining([
        'landingPageId',
        'versionNumber',
        'manifestSnapshotJson',
        'status',
        'rollbackFromVersion',
        'contentHash',
        'etag',
      ]));
      const attributionEvents = db.prepare('PRAGMA table_info(attribution_events)').all() as Array<{ name: string }>;
      expect(attributionEvents.map((column) => column.name)).toContain('transactionId');
      const postbackIdempotency = db.prepare('PRAGMA table_info(postback_idempotency)').all() as Array<{ name: string }>;
      expect(postbackIdempotency.map((column) => column.name)).toEqual(expect.arrayContaining([
        'attempt_count',
        'next_attempt_at',
        'last_status_code',
        'request_id',
      ]));
    } finally {
      db.close();
    }
  });
});
