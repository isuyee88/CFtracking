import type { D1Database } from '@/handlers/d1';

const DEFAULT_BATCH_LIMIT = 100;
const MAX_BATCH_LIMIT = 1000;

export interface HostedAssetOrphanReconciliationOptions {
  bucket: Pick<R2Bucket, 'list' | 'delete'>;
  db: D1Database;
  prefix?: string;
  cursor?: string;
  limit?: number;
  dryRun?: boolean;
}

export interface HostedAssetOrphanReconciliationResult {
  inspected: number;
  orphaned: number;
  deleted: number;
  failed: number;
  orphanKeys: string[];
  nextCursor?: string;
  complete: boolean;
}

function normalizeBatchLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_BATCH_LIMIT;
  return Math.min(MAX_BATCH_LIMIT, Math.max(1, Math.floor(limit as number)));
}

/**
 * Reconciles one bounded page of R2 objects against D1 hosted-asset metadata.
 *
 * The caller owns scheduling and cursor persistence. This keeps the operation
 * safe for dry-runs, retries, and reuse by an existing bounded task runner
 * without adding another Queue or Cron binding.
 */
export async function reconcileHostedAssetOrphans({
  bucket,
  db,
  prefix,
  cursor,
  limit,
  dryRun = false,
}: HostedAssetOrphanReconciliationOptions): Promise<HostedAssetOrphanReconciliationResult> {
  const batchLimit = normalizeBatchLimit(limit);
  const listOptions: { prefix?: string; cursor?: string; limit: number } = { limit: batchLimit };
  if (prefix) listOptions.prefix = prefix;
  if (cursor) listOptions.cursor = cursor;

  const page = await bucket.list(listOptions);
  const result: HostedAssetOrphanReconciliationResult = {
    inspected: 0,
    orphaned: 0,
    deleted: 0,
    failed: 0,
    orphanKeys: [],
    nextCursor: page.truncated ? page.cursor : undefined,
    complete: !page.truncated,
  };

  for (const object of page.objects) {
    result.inspected += 1;
    const metadata = await db
      .prepare(
        'SELECT 1 AS present FROM hostedAssets WHERE storageBackend = ? AND r2Key = ? LIMIT 1',
      )
      .bind('r2', object.key)
      .first<{ present: number }>();

    if (metadata) continue;

    result.orphaned += 1;
    result.orphanKeys.push(object.key);
    if (dryRun) continue;

    try {
      await bucket.delete(object.key);
      result.deleted += 1;
    } catch (error) {
      result.failed += 1;
      console.error('[HostedAsset] orphan cleanup failed', {
        key: object.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
