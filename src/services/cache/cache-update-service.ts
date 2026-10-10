import type { Env } from '@/config/env';
import { CacheKeyBuilder, UnifiedCacheManager } from './unified-cache-manager';
import { createSSECacheNotification, type SSECacheNotificationService } from './sse-cache-notification';
import { CACHE_CONFIGS, ETagCacheManager } from './etag-cache-manager';
import { createDashboardQueryService } from '@/services/analytics/dashboard-query.service';
import { success } from '@/utils/response';
import { getWorkerVersionInfo } from './version-utils';
import {
  buildDashboardBootstrapCacheKey,
  buildDashboardBootstrapPath,
  serveDashboardBootstrap,
} from '@/services/bootstrap/dashboard-bootstrap';
import { createDashboardPageScope } from '@/services/analytics/dashboard-page-bundle';
import {
  buildAdminBootstrapCacheKey,
  buildAdminBootstrapPath,
  serveAdminPageBootstrap,
} from '@/services/bootstrap/admin-bootstrap';
import { matchAdminPage, type AdminPageKey } from '@/services/page/admin-page-bundle';
import type { BootstrapCurrentEnvelope } from '@/services/bootstrap/bootstrap-versioning';
import type { BootstrapSSEPayload } from './sse-cache-notification';

export enum CacheUpdateTrigger {
  MANUAL = 'manual',
  PROGRAMMATIC = 'programmatic',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event',
}

export interface CacheUpdateResult {
  success: boolean;
  trigger: CacheUpdateTrigger;
  keys: string[];
  duration: number;
  timestamp: string;
  errors?: string[];
  notifiedUsers?: number;
}

export interface ScheduledRefreshEvent {
  cron: string;
}

const DASHBOARD_ENTITY_TYPES = ['campaigns', 'offers', 'flows', 'landings', 'sources', 'countries', 'device_types', 'browsers'];
const DASHBOARD_REFRESH_RANGES = ['today', 'last7days', 'last30days'] as const;

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

interface AdminBootstrapWarmSpec {
  page: AdminPageKey;
  url: URL;
}

export class CacheUpdateService {
  private readonly cacheManager: UnifiedCacheManager;
  private readonly sseNotification: SSECacheNotificationService;

  constructor(private readonly env: Env) {
    this.cacheManager = new UnifiedCacheManager(env);
    this.sseNotification = createSSECacheNotification(env);
  }

  private get versionId(): string {
    return getWorkerVersionInfo(this.env).id;
  }

  async handleManualUpdate(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const key = url.searchParams.get('key');

    if (!this.validateAuth(request.headers.get('Authorization'))) {
      return new Response('Unauthorized', { status: 401 });
    }

    const start = Date.now();

    try {
      let result: CacheUpdateResult;

      switch (action) {
        case 'purge-all':
          result = await this.purgeAll();
          break;
        case 'purge-key':
          if (!key) {
            return new Response('Missing key parameter', { status: 400 });
          }
          result = await this.purgeKey(key);
          break;
        case 'warm-cache':
          result = await this.warmCache();
          break;
        case 'refresh-dashboard':
          result = await this.refreshDashboard();
          break;
        case 'refresh-entity': {
          const entity = url.searchParams.get('entity');
          if (!entity) {
            return new Response('Missing entity parameter', { status: 400 });
          }
          result = await this.refreshEntity(entity);
          break;
        }
        default:
          return new Response('Invalid action', { status: 400 });
      }

      return Response.json(result);
    } catch (error) {
      console.error('[CacheUpdate] Manual update failed:', error);

      return Response.json(
        {
          success: false,
          trigger: CacheUpdateTrigger.MANUAL,
          keys: [],
          duration: Date.now() - start,
          timestamp: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
        { status: 500 }
      );
    }
  }

  async onDataChanged(
    entity: string,
    id: string,
    action: 'create' | 'update' | 'delete',
    userId?: string
  ): Promise<void> {
    const start = Date.now();

    try {
      const keysToInvalidate = this.getRelatedCacheKeys(entity, id);
      await this.cacheManager.invalidateBatch(keysToInvalidate);
      await this.sseNotification.notifyCacheInvalidatedMany(keysToInvalidate, userId);

      if (entity && id) {
        await this.sseNotification.notifyDataChanged(entity, id, action, userId);
      }

      if (action !== 'delete') {
        const bootstrapUpdates = await this.warmupEntityCache(entity, id);
        await this.sseNotification.notifyCacheUpdatedMany(keysToInvalidate, this.versionId, userId);
        await this.sseNotification.notifyBootstrapUpdatedMany(bootstrapUpdates, userId);
      }

      console.log(
        `[CacheUpdate] Programmatic update for ${entity}:${id} finished in ${Date.now() - start}ms`
      );
    } catch (error) {
      console.error('[CacheUpdate] Programmatic update failed:', error);
    }
  }

  async handleScheduledRefresh(event: ScheduledRefreshEvent): Promise<void> {
    const start = Date.now();

    try {
      switch (event.cron) {
        case '*/5 * * * *':
          await this.refreshRealtimeData();
          break;
        case '0 * * * *':
          await this.refreshHourlyData();
          break;
        case '0 0 * * *':
          await this.refreshDailyData();
          break;
        default:
          console.log('[CacheUpdate] Unknown cron:', event.cron);
      }

      console.log(`[CacheUpdate] Scheduled refresh finished in ${Date.now() - start}ms`);
    } catch (error) {
      console.error('[CacheUpdate] Scheduled refresh failed:', error);
    }
  }

  async getSSEStats(): Promise<{ totalUsers: number; totalConnections: number }> {
    return this.sseNotification.getStats();
  }

  private async purgeAll(): Promise<CacheUpdateResult> {
    const start = Date.now();
    await this.cacheManager.clearAll();
    await this.sseNotification.forceRefresh(['*']);
    const stats = await this.sseNotification.getStats();

    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys: ['*'],
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }

  private async purgeKey(key: string): Promise<CacheUpdateResult> {
    const start = Date.now();
    await this.cacheManager.invalidate(key);
    await this.sseNotification.notifyCacheInvalidated(key);
    await this.sseNotification.notifyCacheUpdated(key, this.versionId);
    const stats = await this.sseNotification.getStats();

    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys: [key],
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }

  private async warmCache(): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];
    const errors: string[] = [];

    for (const range of ['today', 'last7days', 'last30days']) {
      try {
        await this.warmupDashboardData(range);
        await this.warmupDashboardBootstrap(range);
        keys.push(CacheKeyBuilder.dashboard(range));
        keys.push(...this.getDashboardBootstrapKeys([range]));
      } catch (error) {
        errors.push(`Dashboard ${range}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await this.sseNotification.notifyCacheUpdatedMany(keys, this.versionId);

    for (const entity of ['campaigns', 'offers', 'flows']) {
      try {
        await this.warmupEntityList(entity);
        for (const range of DASHBOARD_REFRESH_RANGES) {
          keys.push(CacheKeyBuilder.custom(['entity-stats', entity, range]));
        }
      } catch (error) {
        errors.push(`Entity ${entity}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    try {
      await this.warmupAdminBootstrapPages();
      keys.push(...this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs()));
    } catch (error) {
      errors.push(`Admin bootstraps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      trigger: CacheUpdateTrigger.MANUAL,
      keys,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async refreshDashboard(): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];

    for (const range of ['today', 'last7days', 'last30days']) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      await this.invalidateDashboardBootstrap(range);
      await this.warmupDashboardBootstrap(range);
      keys.push(key);
      keys.push(...this.getDashboardBootstrapKeys([range]));
    }

    await this.sseNotification.notifyCacheInvalidatedMany(keys);
    await this.sseNotification.notifyCacheUpdatedMany(keys, this.versionId);
    const stats = await this.sseNotification.getStats();

    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }

  private async refreshEntity(entity: string): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];

    for (const range of DASHBOARD_REFRESH_RANGES) {
      const key = CacheKeyBuilder.custom(['entity-stats', entity, range]);
      await this.cacheManager.invalidate(key);
      keys.push(key);
    }

    await this.warmupEntityList(entity);
    await this.sseNotification.notifyCacheInvalidatedMany(keys);
    await this.sseNotification.notifyCacheUpdatedMany(keys, this.versionId);
    const stats = await this.sseNotification.getStats();

    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }

  private async refreshRealtimeData(): Promise<void> {
    const realtimeAdminSpecs = this.getRealtimeAdminBootstrapWarmSpecs();
    const invalidatedKeys = [...this.getAdminBootstrapKeysForPages(realtimeAdminSpecs)];

    for (const range of ['today']) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      await this.invalidateDashboardBootstrap(range);
      await this.warmupDashboardBootstrap(range);
      invalidatedKeys.push(key, ...this.getDashboardBootstrapKeys([range]));
    }

    await this.invalidateAdminBootstrapSpecs(realtimeAdminSpecs);
    await this.warmupAdminBootstrapSpecs(realtimeAdminSpecs);

    await this.sseNotification.notifyCacheInvalidatedMany(invalidatedKeys);
    await this.sseNotification.notifyCacheUpdatedMany(invalidatedKeys, this.versionId);
  }

  private async refreshHourlyData(): Promise<void> {
    for (const range of ['last7days', 'last30days']) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      await this.invalidateDashboardBootstrap(range);
      await this.warmupDashboardBootstrap(range);
      await this.sseNotification.notifyCacheInvalidated(key);
      await this.sseNotification.notifyCacheUpdated(key, this.versionId);
    }

    await this.invalidateAdminBootstrapPages(['campaigns', 'trends', 'audit', 'conversions']);
    await this.warmupAdminBootstrapPages(['campaigns', 'trends', 'audit', 'conversions']);
  }

  private async refreshDailyData(): Promise<void> {
    for (const entity of ['campaigns', 'offers', 'flows', 'landings']) {
      await this.warmupEntityList(entity);
      await this.sseNotification.notifyCacheUpdatedMany(
        DASHBOARD_REFRESH_RANGES.map((range) => CacheKeyBuilder.custom(['entity-stats', entity, range])),
        this.versionId
      );
    }
  }

  private getRelatedCacheKeys(entity: string, id: string): string[] {
    const keys: string[] = [];

    for (let page = 1; page <= 5; page++) {
      keys.push(CacheKeyBuilder.entityList(entity, page));
    }

    keys.push(CacheKeyBuilder.entityDetail(entity, id));

    if (['campaign', 'campaigns', 'offer', 'offers', 'click', 'clicks', 'conversion', 'conversions'].includes(entity)) {
      keys.push(CacheKeyBuilder.dashboard('today'));
      keys.push(CacheKeyBuilder.dashboard('last7days'));
      keys.push(CacheKeyBuilder.dashboard('last30days'));
      keys.push(CacheKeyBuilder.custom(['recent-clicks', 'today', 'limit-10', 'all']));
      keys.push(CacheKeyBuilder.custom(['recent-clicks', 'last7days', 'limit-10', 'all']));
      keys.push(CacheKeyBuilder.custom(['recent-clicks', 'last30days', 'limit-10', 'all']));

      for (const range of DASHBOARD_REFRESH_RANGES) {
        for (const entityType of DASHBOARD_ENTITY_TYPES) {
          keys.push(CacheKeyBuilder.custom(['entity-stats', entityType, range]));
        }
      }

      keys.push(...this.getDashboardBootstrapKeys([...DASHBOARD_REFRESH_RANGES]));
      keys.push(...this.getAdminBootstrapKeysForEntity(entity));
    }

    if (entity === 'rule') {
      keys.push(...this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(['rules'])));
    }

    if (entity === 'user-preferences') {
      keys.push(...this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(['settings'])));
    }

    if (entity === 'blacklist') {
      keys.push(...this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(['blacklist'])));
    }

    if (entity === 'whitelist') {
      keys.push(...this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(['whitelist'])));
    }

    return keys;
  }

  private async warmupEntityCache(entity: string, id: string): Promise<BootstrapSSEPayload[]> {
    void id;
    const updates: BootstrapSSEPayload[] = [];
    await this.warmupEntityList(entity);

    if (['campaign', 'campaigns', 'offer', 'offers', 'click', 'clicks', 'conversion', 'conversions'].includes(entity)) {
      for (const range of DASHBOARD_REFRESH_RANGES) {
        await this.invalidateDashboardBootstrap(range);
        const update = await this.warmupDashboardBootstrap(range);
        if (update) {
          updates.push(update);
        }
      }
    }

    const affectedAdminPages = this.getAdminWarmPagesForEntity(entity);
    if (affectedAdminPages.length > 0) {
      await this.invalidateAdminBootstrapPages(affectedAdminPages);
      updates.push(...(await this.warmupAdminBootstrapPages(affectedAdminPages)));
    }

    return updates;
  }

  private async warmupDashboardData(range: string): Promise<void> {
    const dashboardQuery = createDashboardQueryService(this.env);

    await this.primeCacheEntry(
      '/api/analytics/dashboard',
      CacheKeyBuilder.dashboard(range),
      range,
      () => dashboardQuery.getDashboardStats(range, this.env)
    );

    await this.primeCacheEntry(
      '/api/analytics/recent-clicks',
      CacheKeyBuilder.custom(['recent-clicks', range, 'limit-10', 'all']),
      range,
      async () => {
        const result = await dashboardQuery.getRecentClicks({
          limit: 10,
          range,
        });

        return success({
          list: result.list.map((item: any) => this.formatRecentClick(item)),
          total: result.total,
          dataSource: result.dataSource,
          queryTime: new Date().toISOString(),
        });
      }
    );

    for (const entityType of DASHBOARD_ENTITY_TYPES) {
      await this.primeCacheEntry(
        '/api/analytics/entity-stats',
        CacheKeyBuilder.custom(['entity-stats', entityType, range]),
        range,
        async () => {
          const stats = await dashboardQuery.getEntityStats(entityType, range).catch(() => []);
          return success(stats);
        }
      );
    }
  }

  private async warmupEntityList(entity: string): Promise<void> {
    const dashboardQuery = createDashboardQueryService(this.env);

    for (const range of DASHBOARD_REFRESH_RANGES) {
      await this.primeCacheEntry(
        '/api/analytics/entity-stats',
        CacheKeyBuilder.custom(['entity-stats', entity, range]),
        range,
        async () => {
          const stats = await dashboardQuery.getEntityStats(entity, range).catch(() => []);
          return success(stats);
        }
      );
    }
  }

  private getDashboardBootstrapKeys(ranges: string[]): string[] {
    const namespace = getWorkerVersionInfo(this.env).namespace;

    return ranges.map((range) => {
      const url = new URL(`https://cache.local/dashboard?range=${encodeURIComponent(range)}`);
      const scope = createDashboardPageScope(url);
      return buildDashboardBootstrapCacheKey(scope, namespace);
    });
  }

  private async invalidateDashboardBootstrap(range: string): Promise<void> {
    await this.cacheManager.invalidateBatch(this.getDashboardBootstrapKeys([range]));
  }

  private async warmupDashboardBootstrap(range: string): Promise<BootstrapSSEPayload | null> {
    const url = new URL(`https://cache.local/dashboard?range=${encodeURIComponent(range)}`);
    const scope = createDashboardPageScope(url);
    const requestedHash = buildDashboardBootstrapPath(scope).split('/').pop()?.replace(/\.json$/i, '') || '';
    const response = await serveDashboardBootstrap(
      new Request(`https://cache.local/__bootstrap/dashboard/${requestedHash}.json?range=${encodeURIComponent(range)}`),
      this.env,
      requestedHash
    );
    const current = (await response.json()) as BootstrapCurrentEnvelope;

    return {
      cacheKey: buildDashboardBootstrapCacheKey(scope, getWorkerVersionInfo(this.env).namespace),
      page: current.page,
      scopeHash: current.scopeHash,
      version: current.contentVersion,
    };
  }

  private getAdminWarmPagesForEntity(entity: string): AdminPageKey[] {
    switch (entity) {
      case 'campaign':
      case 'campaigns':
        return ['campaigns', 'trends', 'audit', 'conversions'];
      case 'offer':
      case 'offers':
        return ['campaigns', 'offers'];
      case 'landing':
      case 'landings':
        return ['campaigns', 'landings'];
      case 'traffic-source':
        return ['campaigns', 'traffic-sources'];
      case 'affiliate-network':
        return ['affiliate-networks'];
      case 'domain':
        return ['domains'];
      case 'click':
      case 'clicks':
        return ['audit', 'trends'];
      case 'conversion':
      case 'conversions':
        return ['conversions', 'trends'];
      case 'rule':
        return ['rules'];
      case 'user-preferences':
        return ['settings'];
      case 'blacklist':
        return ['blacklist'];
      case 'whitelist':
        return ['whitelist'];
      default:
        return [];
    }
  }

  private getAdminBootstrapWarmSpecs(pages?: AdminPageKey[]): AdminBootstrapWarmSpec[] {
    const defaults = getRecentDateRange(7);
    const specs: AdminBootstrapWarmSpec[] = [
      ...(['today', 'last7days', 'last30days'] as const).map((range) => ({
        page: 'campaigns' as const,
        url: new URL(`https://cache.local/campaigns?range=${encodeURIComponent(range)}`),
      })),
      { page: 'landings', url: new URL('https://cache.local/landings') },
      { page: 'offers', url: new URL('https://cache.local/offers') },
      { page: 'traffic-sources', url: new URL('https://cache.local/traffic-sources') },
      { page: 'affiliate-networks', url: new URL('https://cache.local/affiliate-networks') },
      { page: 'domains', url: new URL('https://cache.local/domains') },
      { page: 'rules', url: new URL('https://cache.local/rules') },
      { page: 'trends', url: new URL(`https://cache.local/trends?startDate=${defaults.startDate}&endDate=${defaults.endDate}`) },
      { page: 'audit', url: new URL('https://cache.local/audit') },
      { page: 'conversions', url: new URL('https://cache.local/conversions') },
      { page: 'settings', url: new URL('https://cache.local/settings') },
      { page: 'blacklist', url: new URL('https://cache.local/blacklist') },
      { page: 'whitelist', url: new URL('https://cache.local/whitelist') },
    ];

    if (!pages || pages.length === 0) {
      return specs;
    }

    const allowed = new Set(pages);
    return specs.filter((spec) => allowed.has(spec.page));
  }

  private getRealtimeAdminBootstrapWarmSpecs(): AdminBootstrapWarmSpec[] {
    const defaults = getRecentDateRange(7);

    return [
      { page: 'campaigns', url: new URL('https://cache.local/campaigns?range=today') },
      {
        page: 'trends',
        url: new URL(`https://cache.local/trends?startDate=${defaults.startDate}&endDate=${defaults.endDate}`),
      },
      { page: 'audit', url: new URL('https://cache.local/audit') },
      { page: 'conversions', url: new URL('https://cache.local/conversions') },
    ];
  }

  private getAdminBootstrapKeysForPages(specs: AdminBootstrapWarmSpec[]): string[] {
    const namespace = getWorkerVersionInfo(this.env).namespace;

    return specs.flatMap((spec) => {
      const match = matchAdminPage(spec.url);
      if (!match) {
        return [];
      }

      return [buildAdminBootstrapCacheKey(spec.url, match, namespace)];
    });
  }

  private getAdminBootstrapKeysForEntity(entity: string): string[] {
    return this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(this.getAdminWarmPagesForEntity(entity)));
  }

  private async invalidateAdminBootstrapPages(pages?: AdminPageKey[]): Promise<void> {
    const keys = this.getAdminBootstrapKeysForPages(this.getAdminBootstrapWarmSpecs(pages));
    if (keys.length === 0) {
      return;
    }

    await this.cacheManager.invalidateBatch(keys);
  }

  private async invalidateAdminBootstrapSpecs(specs: AdminBootstrapWarmSpec[]): Promise<void> {
    const keys = this.getAdminBootstrapKeysForPages(specs);
    if (keys.length === 0) {
      return;
    }

    await this.cacheManager.invalidateBatch(keys);
  }

  private async warmupAdminBootstrapPages(pages?: AdminPageKey[]): Promise<BootstrapSSEPayload[]> {
    return this.warmupAdminBootstrapSpecs(this.getAdminBootstrapWarmSpecs(pages));
  }

  private async warmupAdminBootstrapSpecs(specs: AdminBootstrapWarmSpec[]): Promise<BootstrapSSEPayload[]> {
    const updates: BootstrapSSEPayload[] = [];

    for (const spec of specs) {
      const match = matchAdminPage(spec.url);
      if (!match) {
        continue;
      }

      const requestedHash = buildAdminBootstrapPath(spec.url, match).split('/').pop()?.replace(/\.json$/i, '') || '';
      const requestUrl = new URL(`https://cache.local/__bootstrap/${match.page}/${requestedHash}.json`);
      for (const [key, value] of spec.url.searchParams.entries()) {
        requestUrl.searchParams.set(key, value);
      }
      requestUrl.searchParams.set('__pathname', spec.url.pathname);

      const response = await serveAdminPageBootstrap(new Request(requestUrl.toString()), this.env, match.page, requestedHash);
      const current = (await response.json()) as BootstrapCurrentEnvelope;
      updates.push({
        cacheKey: buildAdminBootstrapCacheKey(spec.url, match, getWorkerVersionInfo(this.env).namespace),
        page: current.page,
        scopeHash: current.scopeHash,
        version: current.contentVersion,
      });
    }

    return updates;
  }


  private async primeCacheEntry<T>(
    requestPath: string,
    cacheKey: string,
    range: string,
    fetcher: () => Promise<T>
  ): Promise<void> {
    const cacheType = ETagCacheManager.inferCacheType(requestPath, range);
    const policy = CACHE_CONFIGS[cacheType];

    await this.cacheManager.fetch(
      new Request(`https://cache.local${requestPath}?range=${encodeURIComponent(range)}`),
      fetcher,
      {
        cacheKey,
        edgeTTL: policy.edgeMaxAge,
        workersTTL: Math.max(30, Math.floor(policy.edgeMaxAge / 10)),
        forceRefresh: true,
      }
    );
  }

  private formatRecentClick(item: any) {
    return {
      event_id: item.event_id || item.clickId || '',
      datetime: item.datetime || item.timestamp || '',
      campaign: item.campaign || item.campaignId || '',
      stream: item.stream || item.flowId || '',
      landing: item.landing || item.landingPageId || '',
      offer: item.offer || item.offerId || '',
      source: item.source || '',
      ip: item.ip || '127.0.0.1',
      country: item.country || '',
      region: item.region || '',
      city: item.city || '',
      isp: item.isp || '',
      operator: item.operator || '',
      device_type: item.device_type || item.device || '',
      device_model: item.device_model || '',
      os: item.os || '',
      os_version: item.os_version || '',
      browser: item.browser || '',
      browser_version: item.browser_version || '',
      os_icon: item.os_icon || '',
      browser_icon: item.browser_icon || '',
      connection_type: item.connection_type || '',
      proxy: item.proxy || 'No',
      creative_id: item.creative_id || '',
      external_id: item.external_id || '',
      ad_campaign_id: item.ad_campaign_id || '',
      sub_id: item.sub_id || '',
      sub1: item.sub1 || item.subId1 || '',
      sub2: item.sub2 || item.subId2 || '',
      sub3: item.sub3 || item.subId3 || '',
      sub4: item.sub4 || '',
      sub5: item.sub5 || '',
      referrer: item.referrer || item.referer || '',
      referrer_domain: item.referrer_domain || '',
      search_engine: item.search_engine || '',
      keyword: item.keyword || '',
      destination: item.destination || '',
      cost: item.cost || '$0.00',
      bot: item.bot || 'No',
      unique_stream: item.unique_stream || 'Yes',
      unique_campaign: item.unique_campaign || 'Yes',
      user_agent: item.user_agent || item.userAgent || '',
      visitor_code: item.visitor_code || item.visitorId || '',
      fingerprint: item.fingerprint || '',
      risk_score: item.risk_score || item.riskScore || 0,
      cf_bot_score: item.cf_bot_score || item.cfBotScore || 0,
    };
  }

  private validateAuth(authHeader: string | null): boolean {
    if (!authHeader) {
      return false;
    }

    return authHeader.replace('Bearer ', '') === this.env.CACHE_UPDATE_TOKEN;
  }
}

export function createCacheUpdateRoutes(env: Env) {
  const service = new CacheUpdateService(env);

  return {
    async handle(request: Request): Promise<Response> {
      return service.handleManualUpdate(request);
    },
    async onDataChanged(
      entity: string,
      id: string,
      action: 'create' | 'update' | 'delete',
      userId?: string
    ): Promise<void> {
      return service.onDataChanged(entity, id, action, userId);
    },
    async handleScheduled(event: ScheduledRefreshEvent): Promise<void> {
      return service.handleScheduledRefresh(event);
    },
    async getSSEStats(): Promise<{ totalUsers: number; totalConnections: number }> {
      return service.getSSEStats();
    },
  };
}
