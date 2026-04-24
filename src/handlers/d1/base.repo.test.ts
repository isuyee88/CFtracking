import { describe, expect, it } from 'vitest';
import { BaseRepository } from './base.repo';

class PlainRepository extends BaseRepository<{ id: string }> {}

class DisplayIdRepository extends BaseRepository<{ id: string }> {
  protected hasDisplayIdColumn(): boolean {
    return true;
  }
}

function createDb(row: Record<string, unknown> | null) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => {
        calls.push({ sql, values });
        return {
          first: async () => row,
          all: async () => ({ results: row ? [row] : [] }),
        };
      },
    }),
  } as unknown as D1Database;

  return { db, calls };
}

describe('BaseRepository', () => {
  it('looks up plain tables by id only', async () => {
    const { db, calls } = createDb({ id: 'blacklist-entry' });
    const repo = new PlainRepository(db, 'blacklist');

    await repo.findById('blacklist-entry');

    expect(calls[0]).toEqual({
      sql: 'SELECT * FROM blacklist WHERE id = ?',
      values: ['blacklist-entry'],
    });
  });

  it('keeps displayId lookups for repositories that opt in', async () => {
    const { db, calls } = createDb({ id: 'campaign-1' });
    const repo = new DisplayIdRepository(db, 'campaigns');

    await repo.findById('cmp1');

    expect(calls[0]).toEqual({
      sql: 'SELECT * FROM campaigns WHERE id = ? OR displayId = ?',
      values: ['cmp1', 'cmp1'],
    });
  });
});
