import type { Env } from '@/config/env';
import { createDashboardQueryService } from './dashboard-query.service';
import { CacheKeyBuilder } from '@/services/cache/unified-cache-manager';
import { getWorkerVersionInfo, type WorkerVersionInfo } from '@/services/cache/version-utils';

export type DashboardBundleLayer = 'critical' | 'secondary' | 'full';

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
const DEFAULT_RECENT_LIMIT = 10;
const CRITICAL_ENTITY_COUNT = 2;

export interface DashboardPageScope {
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

function isPresetRange(range: string | undefined) {
  return ['today', 'last7days', 'last30days', 'yesterday', 'thismonth', 'month_to_date', 'mtd'].includes(
    (range || '').toLowerCase()
  );
}

export interface DashboardPageBundle {
  layer: DashboardBundleLayer;
  metrics: unknown[];
  chartData: unknown[];
  recentClicks: unknown[];
  entityData: Record<string, unknown[]>;
  dataSource: 'DO' | 'D1' | 'MIXED' | 'CACHE' | 'DEFAULT';
  queryTime: string;
  scope: DashboardPageScope;
  criticalEntities: string[];
  deferredEntities: string[];
  version: WorkerVersionInfo;
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

export function createDashboardPageScope(url: URL): DashboardPageScope {
  const range = url.searchParams.get('range') || 'today';
  const useAbsoluteDates = !isPresetRange(range);

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

export function buildDashboardPageCacheKey(
  scope: DashboardPageScope,
  layer: DashboardBundleLayer = 'full',
  workerVersion = 'unversioned'
): string {
  return CacheKeyBuilder.pageBundle('dashboard', layer, {
    workerVersion,
    range: scope.range,
    from: scope.from || 'auto',
    to: scope.to || 'auto',
    timezone: scope.timezone || 'UTC',
    campaignId: scope.campaignId || 'all',
    metrics: scope.metrics,
    entities: scope.entities,
    recentColumns: scope.recentColumns,
  });
}

export async function buildDashboardPageBundle(
  env: Env,
  scope: DashboardPageScope,
  layer: DashboardBundleLayer = 'full'
): Promise<DashboardPageBundle> {
  const version = getWorkerVersionInfo(env);
  const dashboardQuery = createDashboardQueryService(env);
  const dashboardStats =
    layer === 'secondary'
      ? null
      : await dashboardQuery.getDashboardStats(scope.range, env, scope.campaignId);

  const criticalEntities = scope.entities.slice(0, CRITICAL_ENTITY_COUNT);
  const deferredEntities = scope.entities.slice(CRITICAL_ENTITY_COUNT);
  const entitiesToLoad =
    layer === 'critical'
      ? criticalEntities
      : layer === 'secondary'
        ? deferredEntities
        : scope.entities;

  const entityResults = await Promise.all(
    entitiesToLoad.map(async (entityType) => [
      entityType,
      await dashboardQuery.getEntityStats(entityType, scope.range, scope.campaignId).catch(() => []),
    ] as const)
  );

  const recentClicks =
    layer === 'critical'
      ? []
      : (
          await dashboardQuery.getRecentClicks({
            limit: DEFAULT_RECENT_LIMIT,
            range: scope.range,
            campaignId: scope.campaignId,
          })
        ).list;

  return {
    layer,
    metrics: dashboardStats?.metrics || [],
    chartData: dashboardStats?.chartData || [],
    recentClicks,
    entityData: Object.fromEntries(entityResults),
    dataSource: dashboardStats?.dataSource || 'CACHE',
    queryTime: dashboardStats?.queryTime || new Date().toISOString(),
    scope,
    criticalEntities,
    deferredEntities,
    version,
  };
}
