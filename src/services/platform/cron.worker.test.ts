import { describe, expect, it, vi } from 'vitest';
import { runHostedAssetOrphanReconciliation, shouldRunHostedAssetOrphanReconciliation } from './cron.worker';

const { reconcileHostedAssetOrphans } = vi.hoisted(() => ({
  reconcileHostedAssetOrphans: vi.fn(),
}));

vi.mock('@/services/hostedAsset/hostedAsset.reconciliation', () => ({
  reconcileHostedAssetOrphans,
}));

function createBucket() {
  return { list: vi.fn(), delete: vi.fn() };
}

function createDb() {
  return { prepare: vi.fn() };
}

describe('hosted asset orphan reconciliation cron gate', () => {
  it('only enables reconciliation for explicit true-like configuration', () => {
    expect(shouldRunHostedAssetOrphanReconciliation(undefined)).toBe(false);
    expect(shouldRunHostedAssetOrphanReconciliation('false')).toBe(false);
    expect(shouldRunHostedAssetOrphanReconciliation('true')).toBe(true);
    expect(shouldRunHostedAssetOrphanReconciliation(true)).toBe(true);
  });

  it('runs one bounded reconciliation page through the existing cron owner', async () => {
    const bucket = createBucket();
    const db = createDb();
    const expected = { inspected: 1, orphaned: 0, deleted: 0, failed: 0, orphanKeys: [], complete: true };
    reconcileHostedAssetOrphans.mockResolvedValue(expected);

    const result = await runHostedAssetOrphanReconciliation({
      HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED: 'true',
      HOSTED_ASSETS_BUCKET: bucket,
      DB: db,
    } as any);

    expect(result).toBe(expected);
    expect(reconcileHostedAssetOrphans).toHaveBeenCalledWith({ bucket, db, limit: 100 });
  });

  it('does not touch R2 when the feature gate is disabled', async () => {
    reconcileHostedAssetOrphans.mockClear();
    const result = await runHostedAssetOrphanReconciliation({
      HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED: 'false',
      HOSTED_ASSETS_BUCKET: createBucket(),
      DB: createDb(),
    } as any);

    expect(result).toBeNull();
    expect(reconcileHostedAssetOrphans).not.toHaveBeenCalled();
  });

  it('returns skipped when opted in but the R2 binding is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reconcileHostedAssetOrphans.mockClear();

    await expect(runHostedAssetOrphanReconciliation({
      HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED: true,
      DB: createDb(),
    } as any)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalled();
    expect(reconcileHostedAssetOrphans).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
