import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// better-sqlite3 uses the same SQLite DDL surface as the local D1 emulator.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3') as new (path: string) => {
  exec(sql: string): void;
  prepare(sql: string): { all(...params: unknown[]): unknown[] };
  close(): void;
};

describe('073 hosted asset storage migration', () => {
  it('creates R2 metadata columns and is idempotent', () => {
    const migration = readFileSync(resolve(process.cwd(), 'schema/migrations/073_hosted_assets_storage.sql'), 'utf8');
    const db = new Database(':memory:');

    try {
      db.exec(migration);
      db.exec(migration);

      const columns = db.prepare('PRAGMA table_info(hostedAssets)').all() as Array<{ name: string; dflt_value: string | null }>;
      const columnDefaults = new Map(columns.map((column) => [column.name, column.dflt_value]));
      expect([...columnDefaults.keys()]).toEqual([
        'id',
        'entityType',
        'mode',
        'name',
        'fileName',
        'mimeType',
        'byteSize',
        'contentBase64',
        'storageBackend',
        'r2Key',
        'createdAt',
        'updatedAt',
      ]);
      expect(columnDefaults.get('contentBase64')).toBe("''");
      expect(columnDefaults.get('storageBackend')).toBe("'d1'");

      const indexes = db.prepare('PRAGMA index_list(hostedAssets)').all() as Array<{ name: string }>;
      expect(indexes.map((index) => index.name)).toContain('idx_hosted_assets_entity_mode');
    } finally {
      db.close();
    }
  });
});
