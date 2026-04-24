import type { WorkerVersionInfo } from '@/services/cache/version-utils';
import type { CacheType } from '@/services/cache/etag-cache-manager';
import { ETagGenerator } from '@/services/cache/etag-cache-manager';
import { CacheKeyBuilder } from '@/services/cache/unified-cache-manager';

export interface BootstrapCurrentEnvelope {
  page: string;
  scopeHash: string;
  scope?: Record<string, unknown>;
  contentVersion: string;
  objectUrl: string;
  objectEtag: string;
  generatedAt: string;
  staleAt: string;
  version: WorkerVersionInfo;
}

export interface BootstrapVersioningPolicy {
  currentEdgeTTL: number;
  currentWorkersTTL: number;
  currentSWR: number;
  objectEdgeTTL: number;
  objectWorkersTTL: number;
  objectSWR: number;
}

export function getBootstrapVersioningPolicy(cacheType: CacheType): BootstrapVersioningPolicy {
  const isRealtime = cacheType === 'realtime';
  const currentEdgeTTL = isRealtime ? 60 : 300;
  const objectEdgeTTL = isRealtime ? 21_600 : 86_400;

  return {
    currentEdgeTTL,
    currentWorkersTTL: Math.max(30, Math.floor(currentEdgeTTL / 6)),
    currentSWR: currentEdgeTTL,
    objectEdgeTTL,
    objectWorkersTTL: Math.max(60, Math.floor(objectEdgeTTL / 12)),
    objectSWR: objectEdgeTTL,
  };
}

export function buildBootstrapCurrentCacheKey(page: string, scopeHash: string, namespace: string): string {
  return CacheKeyBuilder.custom(['bootstrap', page, scopeHash, 'current', namespace]);
}

export function buildBootstrapObjectCacheKey(
  page: string,
  scopeHash: string,
  contentVersion: string,
  namespace: string
): string {
  return CacheKeyBuilder.custom(['bootstrap', page, scopeHash, 'object', contentVersion, namespace]);
}

export function buildBootstrapContentVersion(
  data: unknown,
  page: string,
  workerVersion: WorkerVersionInfo,
  scopeHash: string
): string {
  const etag = ETagGenerator.generate(data, `${page}-${workerVersion.namespace}-${scopeHash}`);
  return etag.replace(/^W\/"/, '').replace(/"$/, '');
}
