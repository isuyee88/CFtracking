export interface PageBootstrapEnvelope {
  page: string;
  scope?: Record<string, unknown>;
  data?: Record<string, unknown>;
  generatedAt?: string;
  scopeHash?: string;
  staleAt?: string;
  etag?: string;
  contentVersion?: string;
  version?: {
    id: string;
    tag: string | null;
    timestamp: string;
    namespace: string;
  };
}

export interface BootstrapCurrentEnvelope {
  page: string;
  scopeHash: string;
  scope?: Record<string, unknown>;
  contentVersion: string;
  objectUrl: string;
  objectEtag?: string;
  generatedAt?: string;
  staleAt?: string;
  etag?: string;
  version?: {
    id: string;
    tag: string | null;
    timestamp: string;
    namespace: string;
  };
}

type AdminPageKey =
  | 'campaigns'
  | 'campaign-detail'
  | 'landings'
  | 'offers'
  | 'traffic-sources'
  | 'affiliate-networks'
  | 'domains'
  | 'platforms'
  | 'rules'
  | 'trends'
  | 'audit'
  | 'conversions'
  | 'reports'
  | 'settings'
  | 'help'
  | 'blacklist'
  | 'whitelist'
  | 'target';

interface BootstrapRouteMatch {
  page: 'dashboard' | AdminPageKey;
  pathname: string;
  params: Record<string, string>;
  mode: 'dashboard' | 'admin';
}

interface DashboardBootstrapScope {
  page: 'dashboard';
  range: string;
  from?: string;
  to?: string;
  timezone?: string;
  campaignId?: string;
  metrics: string[];
  entities: string[];
  recentColumns: string[];
}

function isPresetDashboardRange(range: string | undefined) {
  return ['today', 'last7days', 'last30days', 'yesterday', 'thismonth', 'month_to_date', 'mtd'].includes(
    (range || '').toLowerCase()
  );
}

const BOOTSTRAP_VERSION = '20260406a';
const BOOTSTRAP_REFRESH_PARAM = 'bootstrapVersion';
const ADMIN_BOOTSTRAP_PATH_PARAM = '__pathname';
const TRANSIENT_BOOTSTRAP_QUERY_PARAMS = new Set([
  ADMIN_BOOTSTRAP_PATH_PARAM,
  '__mode',
  '__version',
  BOOTSTRAP_REFRESH_PARAM,
]);
const DEFAULT_METRICS = [
  'clicks',
  'unique_clicks_campaign',
  'conversions',
  'cost',
  'revenue_confirmed',
  'profit_confirmed',
  'roi_confirmed',
];
const DEFAULT_ENTITIES = ['campaigns', 'landings', 'offers', 'sources'];
const DEFAULT_RECENT_COLUMNS = ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination'];
const ADMIN_PAGE_MAP: Record<string, AdminPageKey> = {
  '/campaigns': 'campaigns',
  '/landings': 'landings',
  '/offers': 'offers',
  '/traffic-sources': 'traffic-sources',
  '/affiliate-networks': 'affiliate-networks',
  '/domains': 'domains',
  '/platforms': 'platforms',
  '/rules': 'rules',
  '/trends': 'trends',
  '/audit': 'audit',
  '/conversions': 'conversions',
  '/reports': 'reports',
  '/settings': 'settings',
  '/help': 'help',
  '/blacklist': 'blacklist',
  '/whitelist': 'whitelist',
  '/target': 'target',
};

export function normalizeRangeParam(value: string | null | undefined): string {
  switch ((value || '').trim()) {
    case '7days':
    case 'week':
      return 'last7days';
    case '30days':
    case 'month':
      return 'last30days';
    case '':
      return 'today';
    default:
      return value!.trim();
  }
}

let currentBootstrap: PageBootstrapEnvelope | null = null;
let currentBootstrapManifest: BootstrapCurrentEnvelope | null = null;
let rawBootstrap: unknown = null;
let currentBootstrapManifestRequestUrl: string | null = null;
let currentBootstrapObjectRequestUrl: string | null = null;
const bootstrapRequests = new Map<string, Promise<PageBootstrapEnvelope | null>>();

export function setPageBootstrapData(value: unknown) {
  rawBootstrap = value;

  if (value && typeof value === 'object' && 'page' in value) {
    currentBootstrap = value as PageBootstrapEnvelope;
    if (typeof window !== 'undefined') {
      window.__PAGE_BOOTSTRAP__ = value;
    }
    return;
  }

  currentBootstrap = null;
  if (typeof window !== 'undefined') {
    window.__PAGE_BOOTSTRAP__ = null;
  }
}

export function getPageBootstrapData(): PageBootstrapEnvelope | null {
  return currentBootstrap;
}

export function isCurrentBootstrapTarget(page?: string, scopeHash?: string): boolean {
  if (!page || !scopeHash || !currentBootstrap) {
    return false;
  }

  return currentBootstrap.page === page && currentBootstrap.scopeHash === scopeHash;
}

export function getRawBootstrapData<T = unknown>(): T | null {
  return (rawBootstrap as T) ?? null;
}

export function readBootstrapPage<T = Record<string, unknown>>(page: string): (PageBootstrapEnvelope & { data: T }) | null {
  if (!currentBootstrap || currentBootstrap.page !== page) {
    return null;
  }

  return currentBootstrap as PageBootstrapEnvelope & { data: T };
}

function splitCsvParam(value: string | null, fallback: string[]): string[] {
  if (!value) {
    return [...fallback];
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [...fallback];
}

function normalizeCampaignId(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized && normalized !== 'all' ? normalized : undefined;
}

function normalizeAdminPagePath(pathname: string): string {
  return pathname === '/l' ? '/landings' : pathname;
}

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

function normalizeAdminSearchParams(url: URL, match: BootstrapRouteMatch): URLSearchParams {
  const params = new URLSearchParams(url.searchParams);
  const defaults = getRecentDateRange(7);

  for (const transientKey of TRANSIENT_BOOTSTRAP_QUERY_PARAMS) {
    params.delete(transientKey);
  }

  if (params.has('range')) {
    params.set('range', normalizeRangeParam(params.get('range')));
  }

  for (const [key, value] of Array.from(params.entries())) {
    if (value === '') {
      params.delete(key);
    }
  }

  switch (match.page) {
    case 'campaigns':
      if ((params.get('range') || 'today') === 'today') {
        params.delete('range');
      }
      break;
    case 'rules':
      if (params.get('type') === 'all') {
        params.delete('type');
      }
      if (params.get('status') === 'all') {
        params.delete('status');
      }
      break;
    case 'audit':
    case 'conversions':
      if (params.get('page') === '1') {
        params.delete('page');
      }
      if (params.get('pageSize') === '20') {
        params.delete('pageSize');
      }
      if (params.get('status') === 'all') {
        params.delete('status');
      }
      if (params.get('startDate') === defaults.startDate && params.get('endDate') === defaults.endDate) {
        params.delete('startDate');
        params.delete('endDate');
      }
      break;
    case 'trends':
      if (params.get('interval') === 'day') {
        params.delete('interval');
      }
      if (params.get('campaignId') === 'all') {
        params.delete('campaignId');
      }
      break;
    default:
      break;
  }

  return new URLSearchParams(
    Array.from(params.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
  );
}

function hashObject(value: Record<string, unknown>): string {
  const serialized = JSON.stringify(value);
  let hash = 0;

  for (let index = 0; index < serialized.length; index++) {
    hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function matchBootstrapRoute(url: URL): BootstrapRouteMatch | null {
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    return {
      page: 'dashboard',
      pathname: url.pathname,
      params: {},
      mode: 'dashboard',
    };
  }

  const pathname = normalizeAdminPagePath(url.pathname);

  if (pathname in ADMIN_PAGE_MAP) {
    return {
      page: ADMIN_PAGE_MAP[pathname]!,
      pathname,
      params: {},
      mode: 'admin',
    };
  }

  const campaignDetailMatch = pathname.match(/^\/campaigns\/([^/]+)$/);
  if (campaignDetailMatch) {
    return {
      page: 'campaign-detail',
      pathname,
      params: {
        id: campaignDetailMatch[1]!,
      },
      mode: 'admin',
    };
  }

  return null;
}

function createDashboardBootstrapScope(url: URL): DashboardBootstrapScope {
  const range = normalizeRangeParam(url.searchParams.get('range'));
  const useAbsoluteDates = !isPresetDashboardRange(range);

  return {
    page: 'dashboard',
    range,
    from: useAbsoluteDates ? url.searchParams.get('from') || undefined : undefined,
    to: useAbsoluteDates ? url.searchParams.get('to') || undefined : undefined,
    timezone: url.searchParams.get('tz') || undefined,
    campaignId: normalizeCampaignId(url.searchParams.get('campaignId') || url.searchParams.get('campaign')),
    metrics: splitCsvParam(url.searchParams.get('metrics'), DEFAULT_METRICS),
    entities: splitCsvParam(url.searchParams.get('entities'), DEFAULT_ENTITIES),
    recentColumns: splitCsvParam(url.searchParams.get('recent'), DEFAULT_RECENT_COLUMNS),
  };
}

function buildDashboardBootstrapScopeHash(scope: DashboardBootstrapScope): string {
  return hashObject({
    range: scope.range || 'today',
    from: scope.from || 'auto',
    to: scope.to || 'auto',
    timezone: scope.timezone || 'UTC',
    campaignId: scope.campaignId || 'all',
    metrics: [...scope.metrics],
    entities: [...scope.entities],
    recentColumns: [...scope.recentColumns],
  });
}

function createAdminBootstrapScope(url: URL, match: BootstrapRouteMatch) {
  const sortedSearch = Array.from(normalizeAdminSearchParams(url, match).entries()).reduce<Record<string, string>>(
    (result, [key, value]) => {
      result[key] = value;
      return result;
    },
    {}
  );

  return {
    page: match.page,
    pathname: match.pathname,
    params: match.params,
    search: sortedSearch,
  };
}

function buildAdminBootstrapScopeHash(url: URL, match: BootstrapRouteMatch): string {
  return hashObject(createAdminBootstrapScope(url, match));
}

export function buildBootstrapRequestUrl(input: URL | string = window.location.href): string | null {
  const url = typeof input === 'string' ? new URL(input, window.location.origin) : new URL(input.toString());
  if (url.searchParams.has('range')) {
    const normalizedRange = normalizeRangeParam(url.searchParams.get('range'));
    url.searchParams.set('range', normalizedRange);
  }
  const match = matchBootstrapRoute(url);

  if (!match) {
    return null;
  }

  const query = url.searchParams.toString();

  if (match.mode === 'dashboard') {
    const scopeHash = buildDashboardBootstrapScopeHash(createDashboardBootstrapScope(url));
    return `/__bootstrap/dashboard/${scopeHash}.json${query ? `?${query}` : ''}`;
  }

  const scopeHash = buildAdminBootstrapScopeHash(url, match);
  const bootstrapParams = normalizeAdminSearchParams(url, match);
  bootstrapParams.set(ADMIN_BOOTSTRAP_PATH_PARAM, match.pathname);
  const bootstrapQuery = bootstrapParams.toString();
  return `/__bootstrap/${match.page}/${scopeHash}.json${bootstrapQuery ? `?${bootstrapQuery}` : ''}`;
}

export function invalidateBootstrap(predicate?: (bootstrap: PageBootstrapEnvelope | null) => boolean) {
  if (predicate && !predicate(currentBootstrap)) {
    return;
  }

  currentBootstrapManifest = null;
  currentBootstrapManifestRequestUrl = null;
  currentBootstrapObjectRequestUrl = null;
  setPageBootstrapData(null);
}

export async function loadBootstrapForLocation(options: {
  url?: URL | string;
  force?: boolean;
} = {}): Promise<PageBootstrapEnvelope | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const targetUrl =
    options.url instanceof URL
      ? options.url
      : new URL(options.url || window.location.href, window.location.origin);
  const requestUrl = buildBootstrapRequestUrl(targetUrl);

  if (!requestUrl) {
    return currentBootstrap;
  }

  if (!options.force && currentBootstrap && currentBootstrapManifestRequestUrl === requestUrl) {
    return currentBootstrap;
  }

  const inflight = bootstrapRequests.get(requestUrl);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async () => {
    const manifestHeaders = new Headers();

    if (currentBootstrapManifestRequestUrl === requestUrl && currentBootstrapManifest?.etag) {
      manifestHeaders.set('If-None-Match', currentBootstrapManifest.etag);
    }

    const manifestResponse = await fetch(requestUrl, {
      method: 'GET',
      cache: 'default',
      credentials: 'include',
      headers: manifestHeaders,
    });

    if (
      manifestResponse.status === 304 &&
      currentBootstrap &&
      currentBootstrapManifestRequestUrl === requestUrl
    ) {
      return currentBootstrap;
    }

    if (!manifestResponse.ok) {
      throw new Error(`Failed to load bootstrap manifest with status ${manifestResponse.status}`);
    }

    const manifest = (await manifestResponse.json()) as BootstrapCurrentEnvelope;
    const objectRequestUrl = manifest.objectUrl;

    currentBootstrapManifest = manifest;
    currentBootstrapManifestRequestUrl = requestUrl;

    if (
      currentBootstrap &&
      currentBootstrapObjectRequestUrl === objectRequestUrl &&
      currentBootstrap.contentVersion === manifest.contentVersion
    ) {
      return currentBootstrap;
    }

    const objectHeaders = new Headers();

    if (currentBootstrapObjectRequestUrl === objectRequestUrl && currentBootstrap?.etag) {
      objectHeaders.set('If-None-Match', currentBootstrap.etag);
    }

    const objectResponse = await fetch(objectRequestUrl, {
      method: 'GET',
      cache: 'default',
      credentials: 'include',
      headers: objectHeaders,
    });

    if (
      objectResponse.status === 304 &&
      currentBootstrap &&
      currentBootstrapObjectRequestUrl === objectRequestUrl
    ) {
      return currentBootstrap;
    }

    if (!objectResponse.ok) {
      throw new Error(`Failed to load bootstrap object with status ${objectResponse.status}`);
    }

    const payload = (await objectResponse.json()) as PageBootstrapEnvelope;
    currentBootstrapObjectRequestUrl = objectRequestUrl;
    setPageBootstrapData(payload);
    return payload;
  })();

  bootstrapRequests.set(requestUrl, loadPromise);

  try {
    return await loadPromise;
  } finally {
    bootstrapRequests.delete(requestUrl);
  }
}

export async function refreshBootstrapIfVersionChanged(version?: string): Promise<PageBootstrapEnvelope | null> {
  if (!currentBootstrap) {
    return loadBootstrapForLocation({ force: true });
  }

  if (!version || currentBootstrap.contentVersion !== version) {
    return loadBootstrapForLocation({ force: true });
  }

  return currentBootstrap;
}

export function requestFreshBootstrap(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  invalidateBootstrap();
  void loadBootstrapForLocation({ force: true });
  return true;
}
