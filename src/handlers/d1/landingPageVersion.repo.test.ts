import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { LandingPageVersionRepository } from './landingPageVersion.repo';
import type { D1Database } from './index';

function createD1(): D1Database {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE landingPages (id TEXT PRIMARY KEY);
    CREATE TABLE landingPageVersions (
      id TEXT PRIMARY KEY,
      landingPageId TEXT NOT NULL,
      versionNumber INTEGER NOT NULL,
      assetId TEXT,
      manifestSnapshotJson TEXT,
      status TEXT NOT NULL,
      publishedAt TEXT,
      publishedBy TEXT,
      rollbackFromVersion INTEGER,
      contentHash TEXT,
      etag TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE (landingPageId, versionNumber),
      FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_landing_page_versions_landing_status
      ON landingPageVersions(landingPageId, status);
  `);
  sqlite.prepare('INSERT INTO landingPages (id) VALUES (?)').run('lp_1');

  const adapter = {
    prepare(sql: string) {
      let statement: ReturnType<Database.Database['prepare']>;
      return {
        bind(...params: unknown[]) {
          statement = sqlite.prepare(sql);
          return {
            async run() {
              const result = statement.run(...(params as never[]));
              return { success: true, meta: { changes: result.changes } };
            },
            async first<T = Record<string, unknown>>() {
              return (statement.get(...(params as never[])) ?? null) as T | null;
            },
            async all<T = Record<string, unknown>>() {
              return { results: statement.all(...(params as never[])) as T[] };
            },
          };
        },
        async first<T = Record<string, unknown>>() {
          statement = sqlite.prepare(sql);
          return (statement.get() ?? null) as T | null;
        },
        async all<T = Record<string, unknown>>() {
          statement = sqlite.prepare(sql);
          return { results: statement.all() as T[] };
        },
      };
    },
    async batch(statements: unknown[]) {
      for (const statement of statements) {
        await (statement as { run: () => Promise<unknown> }).run();
      }
      return [];
    },
  } as unknown as D1Database;
  return adapter;
}

describe('LandingPageVersionRepository', () => {
  let repo: LandingPageVersionRepository;

  beforeEach(() => {
    repo = new LandingPageVersionRepository(createD1());
  });

  it('allocates monotonically increasing version numbers and stores manifest snapshot', async () => {
    const first = await repo.create({
      landingPageId: 'lp_1',
      assetId: 'asset_1',
      manifestSnapshot: { title: 'First' },
      status: 'draft',
      contentHash: 'sha256:first',
      etag: '"first"',
    });
    const second = await repo.create({
      landingPageId: 'lp_1',
      manifestSnapshot: { title: 'Second' },
      status: 'preview',
    });

    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    expect(second.manifestSnapshot).toEqual({ title: 'Second' });
    expect(await repo.findByLandingPage('lp_1')).toHaveLength(2);
  });

  it('publishes one version and archives the previous published version atomically', async () => {
    const first = await repo.create({ landingPageId: 'lp_1', status: 'published' });
    const second = await repo.create({ landingPageId: 'lp_1', status: 'draft' });

    await repo.publish('lp_1', second.id, 'operator_1');

    expect((await repo.findById(first.id))?.status).toBe('archived');
    const published = await repo.findPublished('lp_1');
    expect(published?.id).toBe(second.id);
    expect(published?.publishedBy).toBe('operator_1');
    expect(published?.publishedAt).toBeTruthy();
  });

  it('records pause and rollback metadata without deleting version history', async () => {
    const first = await repo.create({ landingPageId: 'lp_1', status: 'published' });
    const second = await repo.create({
      landingPageId: 'lp_1',
      status: 'draft',
      rollbackFromVersion: first.versionNumber,
    });

    await repo.updateStatus(second.id, 'paused');
    const found = await repo.findById(second.id);
    expect(found?.status).toBe('paused');
    expect(found?.rollbackFromVersion).toBe(1);
    const versions = await repo.findByLandingPage('lp_1');
    expect(versions.map((version) => version.id)).toEqual([first.id, second.id]);
  });
});
