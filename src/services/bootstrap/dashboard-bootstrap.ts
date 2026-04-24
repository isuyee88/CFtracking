import type { Env } from '@/config/env';
import {
  ETagCacheManager,
  ETagGenerator,
  type CacheType,
} from '@/services/cache/etag-cache-manager';
import { CacheStrategy, UnifiedCacheManager } from '@/services/cache/unified-cache-manager';
import {
  buildDashboardPageBundle,
  createDashboardPageScope,
  type DashboardPageBundle,
  type DashboardPageScope,
} from '@/services/analytics/dashboard-page-bundle';
import { getWorkerVersionInfo } from '@/services/cache/version-utils';
import {
  appendServerTiming,
  durationMs,
  nowMs,
  type ServerTimingMetric,
} from '@/utils/server-timing';
import {
  buildBootstrapContentVersion,
  buildBootstrapCurrentCacheKey,
  buildBootstrapObjectCacheKey,
  type BootstrapCurrentEnvelope,
  getBootstrapVersioningPolicy,
} from './bootstrap-versioning';

export interface DashboardBootstrapEnvelope extends DashboardPageBundle {
  page: 'dashboard';
  generatedAt: string;
  scopeHash: string;
  staleAt: string;
  contentVersion: string;
}

function normalizeDashboardScope(scope: DashboardPageScope) {
  return {
    range: scope.range || 'today',
    from: scope.from || 'auto',
    to: scope.to || 'auto',
    timezone: scope.timezone || 'UTC',
    campaignId: scope.campaignId || 'all',
    metrics: [...scope.metrics],
    entities: [...scope.entities],
    recentColumns: [...scope.recentColumns],
  };
}

function createDashboardBootstrapQuery(scope: DashboardPageScope): URLSearchParams {
  const params = new URLSearchParams();

  params.set('range', scope.range || 'today');

  if (scope.from) {
    params.set('from', scope.from);
  }

  if (scope.to) {
    params.set('to', scope.to);
  }

  if (scope.timezone) {
    params.set('tz', scope.timezone);
  }

  if (scope.campaignId) {
    params.set('campaignId', scope.campaignId);
  }

  if (scope.metrics.length > 0) {
    params.set('metrics', scope.metrics.join(','));
  }

  if (scope.entities.length > 0) {
    params.set('entities', scope.entities.join(','));
  }

  if (scope.recentColumns.length > 0) {
    params.set('recent', scope.recentColumns.join(','));
  }

  return params;
}

function hashObject(value: Record<string, unknown>): string {
  const serialized = JSON.stringify(value);
  let hash = 0;

  for (let index = 0; index < serialized.length; index++) {
    hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function resolveCacheType(scope: DashboardPageScope): CacheType {
  return ETagCacheManager.inferCacheType('/dashboard', scope.range);
}

export function buildDashboardBootstrapScopeHash(scope: DashboardPageScope): string {
  return hashObject(normalizeDashboardScope(scope) as Record<string, unknown>);
}

export function buildDashboardBootstrapPath(scope: DashboardPageScope): string {
  return `/__bootstrap/dashboard/${buildDashboardBootstrapScopeHash(scope)}.json`;
}

export function buildDashboardBootstrapObjectPath(
  scope: DashboardPageScope,
  contentVersion: string
): string {
  return `/__bootstrap-object/dashboard/${buildDashboardBootstrapScopeHash(scope)}/${contentVersion}.json`;
}

function createDashboardBootstrapObjectQuery(scope: DashboardPageScope, contentVersion: string) {
  const params = createDashboardBootstrapQuery(scope);
  params.set('__mode', 'object');
  params.set('__version', contentVersion);
  return params;
}

export function buildDashboardBootstrapCacheKey(scope: DashboardPageScope, namespace: string): string {
  return buildBootstrapCurrentCacheKey('dashboard', buildDashboardBootstrapScopeHash(scope), namespace);
}

export function buildDashboardBootstrapObjectCacheKey(
  scope: DashboardPageScope,
  contentVersion: string,
  namespace: string
): string {
  return buildBootstrapObjectCacheKey('dashboard', buildDashboardBootstrapScopeHash(scope), contentVersion, namespace);
}

function createCurrentResponseHeaders(
  current: BootstrapCurrentEnvelope,
  currentEtag: string,
  edgeTTL: number,
  swr: number
) {
  return new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'CDN-Cache-Control': `public, s-maxage=${edgeTTL}, stale-while-revalidate=${swr}`,
    'Cloudflare-CDN-Cache-Control': `public, s-maxage=${edgeTTL}, stale-while-revalidate=${swr}`,
    ETag: currentEtag,
    'Timing-Allow-Origin': '*',
    Vary: 'Accept-Encoding',
    'X-Bootstrap-Version': current.contentVersion,
    'X-Bootstrap-Object': current.objectUrl,
  });
}

function createObjectResponseHeaders(
  objectEtag: string,
  edgeTTL: number,
  swr: number,
  contentVersion: string
) {
  return new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'CDN-Cache-Control': `public, s-maxage=${edgeTTL}, stale-while-revalidate=${swr}`,
    'Cloudflare-CDN-Cache-Control': `public, s-maxage=${edgeTTL}, stale-while-revalidate=${swr}`,
    ETag: objectEtag,
    'Timing-Allow-Origin': '*',
    Vary: 'Accept-Encoding',
    'X-Bootstrap-Version': contentVersion,
  });
}

async function buildDashboardBootstrapArtifacts(env: Env, scope: DashboardPageScope, canonicalHash: string) {
  const cacheType = resolveCacheType(scope);
  const versioningPolicy = getBootstrapVersioningPolicy(cacheType);
  const workerVersion = getWorkerVersionInfo(env);
  const bundle = await buildDashboardPageBundle(env, scope, 'full');
  const generatedAt = bundle.queryTime || new Date().toISOString();
  const staleAt = new Date(Date.parse(generatedAt) + versioningPolicy.currentEdgeTTL * 1000).toISOString();
  const baseEnvelope = {
    page: 'dashboard' as const,
    ...bundle,
    generatedAt,
    scopeHash: canonicalHash,
    staleAt,
  };
  const contentVersion = buildBootstrapContentVersion(baseEnvelope, 'dashboard-bootstrap', workerVersion, canonicalHash);
  const envelope: DashboardBootstrapEnvelope = {
    ...baseEnvelope,
    contentVersion,
  };
  const objectEtag = ETagGenerator.generate(
    envelope,
    `dashboard-bootstrap-object-${workerVersion.namespace}-${canonicalHash}-${contentVersion}`
  );
  const objectUrl = `${buildDashboardBootstrapPath(scope)}?${createDashboardBootstrapObjectQuery(scope, contentVersion).toString()}`;
  const current: BootstrapCurrentEnvelope = {
    page: 'dashboard',
    scopeHash: canonicalHash,
    scope: envelope.scope as unknown as Record<string, unknown>,
    contentVersion,
    objectUrl,
    objectEtag,
    generatedAt,
    staleAt,
    version: workerVersion,
  };

  return {
    cacheType,
    versioningPolicy,
    workerVersion,
    envelope,
    current,
    objectEtag,
    currentKey: buildDashboardBootstrapCacheKey(scope, workerVersion.namespace),
    objectKey: buildDashboardBootstrapObjectCacheKey(scope, contentVersion, workerVersion.namespace),
  };
}

export async function serveDashboardBootstrap(
  request: Request,
  env: Env,
  requestedHash: string
): Promise<Response> {
  const requestStartedAt = nowMs();
  const url = new URL(request.url);
  const scope = createDashboardPageScope(url);
  const canonicalHash = buildDashboardBootstrapScopeHash(scope);

  if (requestedHash !== canonicalHash) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = buildDashboardBootstrapPath(scope);
    redirectUrl.search = createDashboardBootstrapQuery(scope).toString();
    return Response.redirect(redirectUrl.toString(), 307);
  }

  const cacheType = resolveCacheType(scope);
  const versioningPolicy = getBootstrapVersioningPolicy(cacheType);
  const cacheManager = new UnifiedCacheManager(env);
  const workerVersion = getWorkerVersionInfo(env);
  const currentKey = buildDashboardBootstrapCacheKey(scope, workerVersion.namespace);

  const { data: current, meta } = await cacheManager.fetch<BootstrapCurrentEnvelope>(
    request,
    async () => {
      const artifacts = await buildDashboardBootstrapArtifacts(env, scope, canonicalHash);
      await cacheManager.write(artifacts.objectKey, artifacts.envelope, {
        edgeTTL: artifacts.versioningPolicy.objectEdgeTTL,
        workersTTL: artifacts.versioningPolicy.objectWorkersTTL,
        etag: artifacts.objectEtag,
      });
      return artifacts.current;
    },
    {
      strategy: CacheStrategy.CACHE_FIRST,
      cacheKey: currentKey,
      edgeTTL: versioningPolicy.currentEdgeTTL,
      workersTTL: versioningPolicy.currentWorkersTTL,
    }
  );

  const currentEtag = ETagGenerator.generate(
    current,
    `dashboard-bootstrap-current-${workerVersion.namespace}-${canonicalHash}`
  );
  const headers = createCurrentResponseHeaders(
    current,
    currentEtag,
    versioningPolicy.currentEdgeTTL,
    versioningPolicy.currentSWR
  );

  const metrics: ServerTimingMetric[] = [
    { name: 'cache', dur: meta.totalMs, desc: meta.source },
    { name: 'lookup', dur: meta.lookupMs, desc: meta.strategy },
    { name: 'build', dur: meta.originMs, desc: meta.source === 'origin' ? 'bundle+pointer' : 'cached' },
    { name: 'cachewrite', dur: meta.writeMs, desc: meta.source === 'origin' ? 'refresh' : 'skip' },
    { name: 'etag', desc: currentEtag },
    { name: 'ttl', desc: `edge=${versioningPolicy.currentEdgeTTL};swr=${versioningPolicy.currentSWR}` },
  ];

  if (ETagGenerator.matches(request.headers.get('If-None-Match'), currentEtag)) {
    appendServerTiming(headers, [
      ...metrics,
      { name: 'reval', desc: '304' },
      { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-current' },
    ]);
    return new Response(null, { status: 304, headers });
  }

  appendServerTiming(headers, [
    ...metrics,
    { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-current' },
  ]);

  return new Response(
    JSON.stringify({
      ...current,
      etag: currentEtag,
    }),
    {
      status: 200,
      headers,
    }
  );
}

export async function serveDashboardBootstrapObject(
  request: Request,
  env: Env,
  requestedHash: string,
  requestedVersion: string
): Promise<Response> {
  const requestStartedAt = nowMs();
  const url = new URL(request.url);
  const scope = createDashboardPageScope(url);
  const canonicalHash = buildDashboardBootstrapScopeHash(scope);

  if (requestedHash !== canonicalHash) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = buildDashboardBootstrapPath(scope);
    redirectUrl.search = createDashboardBootstrapObjectQuery(scope, requestedVersion).toString();
    return Response.redirect(redirectUrl.toString(), 307);
  }

  const cacheType = resolveCacheType(scope);
  const versioningPolicy = getBootstrapVersioningPolicy(cacheType);
  const cacheManager = new UnifiedCacheManager(env);
  const workerVersion = getWorkerVersionInfo(env);
  const objectKey = buildDashboardBootstrapObjectCacheKey(scope, requestedVersion, workerVersion.namespace);

  try {
    const { data, etag, meta } = await cacheManager.get<DashboardBootstrapEnvelope>(objectKey, {
      edgeTTL: versioningPolicy.objectEdgeTTL,
      workersTTL: versioningPolicy.objectWorkersTTL,
    });

    const objectEtag =
      etag ||
      ETagGenerator.generate(
        data,
        `dashboard-bootstrap-object-${workerVersion.namespace}-${canonicalHash}-${requestedVersion}`
      );
    const headers = createObjectResponseHeaders(
      objectEtag,
      versioningPolicy.objectEdgeTTL,
      versioningPolicy.objectSWR,
      requestedVersion
    );

    const metrics: ServerTimingMetric[] = [
      { name: 'cache', dur: meta.totalMs, desc: meta.source },
      { name: 'lookup', dur: meta.lookupMs, desc: meta.strategy },
      { name: 'build', dur: 0, desc: 'cached' },
      { name: 'cachewrite', dur: 0, desc: 'skip' },
      { name: 'etag', desc: objectEtag },
      { name: 'ttl', desc: `edge=${versioningPolicy.objectEdgeTTL};swr=${versioningPolicy.objectSWR}` },
    ];

    if (ETagGenerator.matches(request.headers.get('If-None-Match'), objectEtag)) {
      appendServerTiming(headers, [
        ...metrics,
        { name: 'reval', desc: '304' },
        { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-object' },
      ]);
      return new Response(null, { status: 304, headers });
    }

    appendServerTiming(headers, [
      ...metrics,
      { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-object' },
    ]);

    return new Response(
      JSON.stringify({
        ...data,
        etag: objectEtag,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch {
    const originStartedAt = nowMs();
    const artifacts = await buildDashboardBootstrapArtifacts(env, scope, canonicalHash);
    const originMs = durationMs(originStartedAt);

    if (artifacts.envelope.contentVersion !== requestedVersion) {
      const redirectUrl = new URL(request.url);
      redirectUrl.pathname = buildDashboardBootstrapPath(scope);
      redirectUrl.search = createDashboardBootstrapObjectQuery(scope, artifacts.envelope.contentVersion).toString();
      return Response.redirect(redirectUrl.toString(), 307);
    }

    const writeStartedAt = nowMs();
    await cacheManager.write(artifacts.objectKey, artifacts.envelope, {
      edgeTTL: artifacts.versioningPolicy.objectEdgeTTL,
      workersTTL: artifacts.versioningPolicy.objectWorkersTTL,
      etag: artifacts.objectEtag,
    });
    const writeMs = durationMs(writeStartedAt);

    const headers = createObjectResponseHeaders(
      artifacts.objectEtag,
      artifacts.versioningPolicy.objectEdgeTTL,
      artifacts.versioningPolicy.objectSWR,
      artifacts.envelope.contentVersion
    );

    const metrics: ServerTimingMetric[] = [
      { name: 'cache', dur: originMs + writeMs, desc: 'origin' },
      { name: 'lookup', dur: 0, desc: 'cache-only' },
      { name: 'build', dur: originMs, desc: 'bundle+object' },
      { name: 'cachewrite', dur: writeMs, desc: 'refresh' },
      { name: 'etag', desc: artifacts.objectEtag },
      {
        name: 'ttl',
        desc: `edge=${artifacts.versioningPolicy.objectEdgeTTL};swr=${artifacts.versioningPolicy.objectSWR}`,
      },
    ];

    if (ETagGenerator.matches(request.headers.get('If-None-Match'), artifacts.objectEtag)) {
      appendServerTiming(headers, [
        ...metrics,
        { name: 'reval', desc: '304' },
        { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-object' },
      ]);
      return new Response(null, { status: 304, headers });
    }

    appendServerTiming(headers, [
      ...metrics,
      { name: 'total', dur: durationMs(requestStartedAt), desc: 'dashboard-bootstrap-object' },
    ]);

    return new Response(
      JSON.stringify({
        ...artifacts.envelope,
        etag: artifacts.objectEtag,
      }),
      {
        status: 200,
        headers,
      }
    );
  }
}
