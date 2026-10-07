import { describe, expect, it, vi } from 'vitest';
import { reconcileHostedAssetOrphans } from './hostedAsset.reconciliation';

function createDb(existingKeys: string[]) {
  return {
    prepare: vi.fn((_sql: string) => ({
      bind: vi.fn((_storageBackend: string, key: string) => ({
        first: vi.fn(async () => (existingKeys.includes(key) ? { present: 1 } : null)),
      })),
    })),
  } as any;
}

describe('hosted asset orphan reconciliation', () => {
  it('inspects a bounded R2 page and reports orphan candidates without deleting in dry-run mode', async () => {
    const bucket = {
      list: vi.fn(async () => ({
        objects: [
          { key: 'landing/ha-live/index.html' },
          { key: 'landing/ha-orphan/index.html' },
        ],
        truncated: true,
        cursor: 'next-cursor',
      })),
      delete: vi.fn(async () => undefined),
    } as any;
    const db = createDb(['landing/ha-live/index.html']);

    const result = await reconcileHostedAssetOrphans({
      bucket,
      db,
      prefix: 'landing/',
      limit: 2,
      dryRun: true,
    });

    expect(bucket.list).toHaveBeenCalledWith({ prefix: 'landing/', limit: 2 });
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      inspected: 2,
      orphaned: 1,
      deleted: 0,
      failed: 0,
      orphanKeys: ['landing/ha-orphan/index.html'],
      nextCursor: 'next-cursor',
      complete: false,
    });
  });

  it('deletes orphan objects in a bounded batch and records individual failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bucket = {
      list: vi.fn(async () => ({
        objects: [
          { key: 'offer/ha-orphan-1/file.zip' },
          { key: 'offer/ha-orphan-2/file.zip' },
        ],
        truncated: false,
      })),
      delete: vi.fn(async (key: string) => {
        if (key.includes('orphan-2')) throw new Error('R2 delete failed');
      }),
    } as any;
    const db = createDb([]);

    const result = await reconcileHostedAssetOrphans({ bucket, db, limit: 2 });

    expect(bucket.delete).toHaveBeenNthCalledWith(1, 'offer/ha-orphan-1/file.zip');
    expect(bucket.delete).toHaveBeenNthCalledWith(2, 'offer/ha-orphan-2/file.zip');
    expect(result).toEqual({
      inspected: 2,
      orphaned: 2,
      deleted: 1,
      failed: 1,
      orphanKeys: [
        'offer/ha-orphan-1/file.zip',
        'offer/ha-orphan-2/file.zip',
      ],
      nextCursor: undefined,
      complete: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      '[HostedAsset] orphan cleanup failed',
      expect.objectContaining({ key: 'offer/ha-orphan-2/file.zip' }),
    );
  });

  it('resumes from a supplied cursor without scanning beyond the batch limit', async () => {
    const bucket = {
      list: vi.fn(async () => ({ objects: [], truncated: false })),
      delete: vi.fn(async () => undefined),
    } as any;
    const db = createDb([]);

    await reconcileHostedAssetOrphans({ bucket, db, cursor: 'resume-cursor', limit: 10 });

    expect(bucket.list).toHaveBeenCalledWith({ limit: 10, cursor: 'resume-cursor' });
  });
});
