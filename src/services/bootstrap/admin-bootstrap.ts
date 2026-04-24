import type { Env } from '@/config/env';
import { ETagCacheManager, ETagGenerator } from '@/services/cache/etag-cache-manager';
import { CacheStrategy, UnifiedCacheManager } from '@/services/cache/unified-cache-manager';
import {
  buildAdminPageBundle,
  matchAdminPage,
  normalizeAdminPagePath,
  type AdminPageBundle,
  type AdminPageMatch,
} from '@/services/page/admin-page-bundle';
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

export interface AdminBootstrapEnvelope extends AdminPageBundle {
  scopeHash: string;
  staleAt: string;
  contentVersion: string;
}

const ADMIN_BOOTSTRAP_PATH_PARAM = '__pathname';
const TRANSIENT_BOOTSTRAP_QUERY_PARAMS = new Set([
  ADMIN_BOOTSTRAP_PATH_PARAM,
  '__mode',
  '__version',
  'bootstrapVersion',
]);

function toDateOnly(value: Date) {
  return value.toISOString().split('T')[0]!;
}

function getRecentDateRange(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
  };
}

function isDateOnly(value: string | undefined | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function dateWindowIncludesToday(startDate: string, endDate: string) {
  const today = toDateOnly(new Date());
  return startDate <= today && today <= endDate;
}

function resolveImplicitAdminDateWindow(url: URL, match: AdminPageMatch) {
  const defaults = getRecentDateRange(7);

  switch (match.page) {
    case 'campaign-detail':
    case 'trends':
    case 'audit':
    case 'conversions':
      return {
        startDate: url.searchParams.get('startDate') || defaults.startDate,
        endDate: url.searchParams.get('endDate') || defaults.endDate,
      };
    default:
      return null;
  }
}

function normalizeAdminSearch(url: URL, match: AdminPageMatch): Record<string, string> {
  const defaults = getRecentDateRange(7);

  const normalized = Array.from(url.searchParams.entries())
    .filter(([key]) => !TRANSIENT_BOOTSTRAP_QUERY_PARAMS.has(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
    .reduce<Record<string, string>>((result, [key, value]) => {
      const normalizedValue = key === 'range' ? value || 'today' : value;
      if (normalizedValue !== '') {
        result[key] = normalizedValue;
      }
      return result;
    }, {});

  switch (match.page) {
    case 'campaigns':
      if ((normalized.range || 'today') === 'today') {
        delete normalized.range;
      }
      break;
    case 'rules':
      if (normalized.type === 'all') {
        delete normalized.type;
      }
      if (normalized.status === 'all') {
        delete normalized.status;
      }
      break;
    case 'audit':
    case 'conversions':
      if (normalized.page === '1') {
        delete normalized.page;
      }
      if (normalized.pageSize === '20') {
        delete normalized.pageSize;
      }
      if (normalized.status === 'all') {
        delete normalized.status;
      }
      if (normalized.startDate === defaults.startDate && normalized.endDate === defaults.endDate) {
        delete normalized.startDate;
        delete normalized.endDate;
      }
      break;
    case 'trends':
      if (normalized.interval === 'day') {
        delete normalized.interval;
      }
      if (normalized.campaignId === 'all') {
        delete normalized.campaignId;
      }
      break;
    default:
      break;
  }

  return normalized;
}

function hashObject(value: Record<string, unknown>): string {
  const serialized = JSON.stringify(value);
  let hash = 0;

  for (let index = 0; index < serialized.length; index++) {
    hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function createAdminBootstrapScope(url: URL, match: AdminPageMatch) {
  return {
    page: match.page,
    pathname: normalizeAdminPagePath(url.pathname),
    params: match.params,
    search: normalizeAdminSearch(url, match),
  };
}

export function buildAdminBootstrapScopeHash(url: URL, match: AdminPageMatch): string {
  return hashObject(createAdminBootstrapScope(url, match));
}

export function buildAdminBootstrapPath(url: URL, match: AdminPageMatch): string {
  return `/__bootstrap/${match.page}/${buildAdminBootstrapScopeHash(url, match)}.json`;
}

export function buildAdminBootstrapObjectPath(
  url: URL,
  match: AdminPageMatch,
  contentVersion: string
): string {
  return `/__bootstrap-object/${match.page}/${buildAdminBootstrapScopeHash(url, match)}/${contentVersion}.json`;
}

function createAdminBootstrapObjectQuery(url: URL, match: AdminPageMatch, contentVersion: string) {
  const params = createAdminBootstrapQuery(url, match);
  params.set('__mode', 'object');
  params.set('__version', contentVersion);
  return params;
}

function createAdminBootstrapQuery(url: URL, match: AdminPageMatch): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(normalizeAdminSearch(url, match))) {
    params.set(key, value);
  }

  params.set(ADMIN_BOOTSTRAP_PATH_PARAM, normalizeAdminPagePath(url.pathname));
  return params;
}

export function buildAdminBootstrapCacheKey(url: URL, match: AdminPageMatch, namespace: string): string {
  return buildBootstrapCurrentCacheKey(match.page, buildAdminBootstrapScopeHash(url, match), namespace);
}

export function buildAdminBootstrapObjectCacheKey(
  url: URL,
  match: AdminPageMatch,
  contentVersion: string,
  namespace: string
): string {
  return buildBootstrapObjectCacheKey(match.page, buildAdminBootstrapScopeHash(url, match), contentVersion, namespace);
}

function resolveAdminBootstrapRange(url: URL, match: AdminPageMatch) {
  const rawRange = url.searchParams.get('range');

  if (rawRange) {
    return rawRange;
  }

  if (match.page === 'campaigns') {
    return 'today';
  }

  const dateWindow = resolveImplicitAdminDateWindow(url, match);
  if (dateWindow && isDateOnly(dateWindow.startDate) && isDateOnly(dateWindow.endDate)) {
    return dateWindowIncludesToday(dateWindow.startDate, dateWindow.endDate) ? 'today' : 'custom';
  }

  return undefined;
}

function resolveAdminBootstrapPolicy(url: URL, match: AdminPageMatch) {
  const cacheType = ETagCacheManager.inferCacheType(
    normalizeAdminPagePath(url.pathname),
    resolveAdminBootstrapRange(url, match)
  );
  return getBootstrapVersioningPolicy(cacheType);
}

function resolveSourceUrl(requestUrl: URL, page: string): URL | null {
  const sourceUrl = new URL(requestUrl.toString());
  const requestedPath = sourceUrl.searchParams.get(ADMIN_BOOTSTRAP_PATH_PARAM);

  if (requestedPath) {
    sourceUrl.pathname = normalizeAdminPagePath(requestedPath);
  } else {
    sourceUrl.pathname = page === 'campaign-detail' ? '/campaigns/unknown' : `/${page}`;
  }

  sourceUrl.searchParams.delete(ADMIN_BOOTSTRAP_PATH_PARAM);
  return sourceUrl;
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

async function buildAdminBootstrapArtifacts(env: Env, url: URL, match: AdminPageMatch, canonicalHash: string) {
  const versioningPolicy = resolveAdminBootstrapPolicy(url, match);
  const workerVersion = getWorkerVersionInfo(env);
  const bundle = await buildAdminPageBundle(env, url, match);
  const generatedAt = bundle.generatedAt || new Date().toISOString();
  const staleAt = new Date(Date.parse(generatedAt) + versioningPolicy.currentEdgeTTL * 1000).toISOString();
  const baseEnvelope = {
    ...bundle,
    scopeHash: canonicalHash,
    staleAt,
  };
  const contentVersion = buildBootstrapContentVersion(baseEnvelope, `${match.page}-bootstrap`, workerVersion, canonicalHash);
  const envelope: AdminBootstrapEnvelope = {
    ...baseEnvelope,
    contentVersion,
  };
  const objectEtag = ETagGenerator.generate(
    envelope,
    `page-bootstrap-object-${match.page}-${workerVersion.namespace}-${canonicalHash}-${contentVersion}`
  );
  const objectUrl = `${buildAdminBootstrapPath(url, match)}?${createAdminBootstrapObjectQuery(url, match, contentVersion).toString()}`;
  const current: BootstrapCurrentEnvelope = {
    page: match.page,
    scopeHash: canonicalHash,
    scope: envelope.scope,
    contentVersion,
    objectUrl,
    objectEtag,
    generatedAt,
    staleAt,
    version: workerVersion,
  };

  return {
    versioningPolicy,
    workerVersion,
    envelope,
    current,
    objectEtag,
    currentKey: buildAdminBootstrapCacheKey(url, match, workerVersion.namespace),
    objectKey: buildAdminBootstrapObjectCacheKey(url, match, contentVersion, workerVersion.namespace),
  };
}

export async function serveAdminPageBootstrap(
  request: Request,
  env: Env,
  page: string,
  requestedHash: string
): Promise<Response> {
  const requestStartedAt = nowMs();
  const requestUrl = new URL(request.url);
  const url = resolveSourceUrl(requestUrl, page);
  const match = url ? matchAdminPage(url) : null;

  if (!url || !match || match.page !== page) {
    return new Response('Not Found', { status: 404 });
  }

  const canonicalHash = buildAdminBootstrapScopeHash(url, match);
  if (requestedHash !== canonicalHash) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = buildAdminBootstrapPath(url, match);
    redirectUrl.search = createAdminBootstrapQuery(url, match).toString();
    return Response.redirect(redirectUrl.toString(), 307);
  }

  const versioningPolicy = resolveAdminBootstrapPolicy(url, match);
  const cacheManager = new UnifiedCacheManager(env);
  const workerVersion = getWorkerVersionInfo(env);
  const currentKey = buildAdminBootstrapCacheKey(url, match, workerVersion.namespace);

  const { data: current, meta } = await cacheManager.fetch<BootstrapCurrentEnvelope>(
    request,
    async () => {
      const artifacts = await buildAdminBootstrapArtifacts(env, url, match, canonicalHash);
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
    `page-bootstrap-current-${match.page}-${workerVersion.namespace}-${canonicalHash}`
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
    { name: 'build', dur: meta.originMs, desc: meta.source === 'origin' ? `${match.page}+pointer` : 'cached' },
    { name: 'cachewrite', dur: meta.writeMs, desc: meta.source === 'origin' ? 'refresh' : 'skip' },
    { name: 'etag', desc: currentEtag },
    { name: 'ttl', desc: `edge=${versioningPolicy.currentEdgeTTL};swr=${versioningPolicy.currentSWR}` },
  ];

  if (ETagGenerator.matches(request.headers.get('If-None-Match'), currentEtag)) {
    appendServerTiming(headers, [
      ...metrics,
      { name: 'reval', desc: '304' },
      { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-current` },
    ]);
    return new Response(null, { status: 304, headers });
  }

  appendServerTiming(headers, [
    ...metrics,
    { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-current` },
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

export async function serveAdminPageBootstrapObject(
  request: Request,
  env: Env,
  page: string,
  requestedHash: string,
  requestedVersion: string
): Promise<Response> {
  const requestStartedAt = nowMs();
  const requestUrl = new URL(request.url);
  const url = resolveSourceUrl(requestUrl, page);
  const match = url ? matchAdminPage(url) : null;

  if (!url || !match || match.page !== page) {
    return new Response('Not Found', { status: 404 });
  }

  const canonicalHash = buildAdminBootstrapScopeHash(url, match);
  if (requestedHash !== canonicalHash) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = buildAdminBootstrapPath(url, match);
    redirectUrl.search = createAdminBootstrapObjectQuery(url, match, requestedVersion).toString();
    return Response.redirect(redirectUrl.toString(), 307);
  }

  const versioningPolicy = resolveAdminBootstrapPolicy(url, match);
  const cacheManager = new UnifiedCacheManager(env);
  const workerVersion = getWorkerVersionInfo(env);
  const objectKey = buildAdminBootstrapObjectCacheKey(url, match, requestedVersion, workerVersion.namespace);

  try {
    const { data, etag, meta } = await cacheManager.get<AdminBootstrapEnvelope>(objectKey, {
      edgeTTL: versioningPolicy.objectEdgeTTL,
      workersTTL: versioningPolicy.objectWorkersTTL,
    });

    const objectEtag =
      etag ||
      ETagGenerator.generate(
        data,
        `page-bootstrap-object-${match.page}-${workerVersion.namespace}-${canonicalHash}-${requestedVersion}`
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
        { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-object` },
      ]);
      return new Response(null, { status: 304, headers });
    }

    appendServerTiming(headers, [
      ...metrics,
      { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-object` },
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
    const artifacts = await buildAdminBootstrapArtifacts(env, url, match, canonicalHash);
    const originMs = durationMs(originStartedAt);

    if (artifacts.envelope.contentVersion !== requestedVersion) {
      const redirectUrl = new URL(request.url);
      redirectUrl.pathname = buildAdminBootstrapPath(url, match);
      redirectUrl.search = createAdminBootstrapObjectQuery(url, match, artifacts.envelope.contentVersion).toString();
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
      { name: 'build', dur: originMs, desc: `${match.page}+object` },
      { name: 'cachewrite', dur: writeMs, desc: 'refresh' },
      { name: 'etag', desc: artifacts.objectEtag },
      { name: 'ttl', desc: `edge=${artifacts.versioningPolicy.objectEdgeTTL};swr=${artifacts.versioningPolicy.objectSWR}` },
    ];

    if (ETagGenerator.matches(request.headers.get('If-None-Match'), artifacts.objectEtag)) {
      appendServerTiming(headers, [
        ...metrics,
        { name: 'reval', desc: '304' },
        { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-object` },
      ]);
      return new Response(null, { status: 304, headers });
    }

    appendServerTiming(headers, [
      ...metrics,
      { name: 'total', dur: durationMs(requestStartedAt), desc: `${match.page}-bootstrap-object` },
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
