import type { Env } from '@/config/env';
import { CacheKeyBuilder, UnifiedCacheManager } from './unified-cache-manager';
import { createSSECacheNotification, type SSECacheNotificationService } from './sse-cache-notification';

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

export class CacheUpdateService {
  private readonly cacheManager: UnifiedCacheManager;
  private readonly sseNotification: SSECacheNotificationService;

  constructor(private readonly env: Env) {
    this.cacheManager = new UnifiedCacheManager(env);
    this.sseNotification = createSSECacheNotification(env);
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
        await this.warmupEntityCache(entity, id);
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
        keys.push(CacheKeyBuilder.dashboard(range));
      } catch (error) {
        errors.push(`Dashboard ${range}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    for (const entity of ['campaigns', 'offers', 'flows']) {
      try {
        await this.warmupEntityList(entity);
        keys.push(CacheKeyBuilder.entityList(entity));
      } catch (error) {
        errors.push(`Entity ${entity}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
      keys.push(key);
    }

    await this.sseNotification.notifyCacheInvalidatedMany(keys);
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

    for (let page = 1; page <= 10; page++) {
      const key = CacheKeyBuilder.entityList(entity, page);
      await this.cacheManager.invalidate(key);
      keys.push(key);
    }

    await this.warmupEntityList(entity);
    await this.sseNotification.notifyCacheInvalidatedMany(keys);
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
    for (const range of ['today']) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      await this.sseNotification.notifyCacheInvalidated(key);
    }
  }

  private async refreshHourlyData(): Promise<void> {
    for (const range of ['last7days', 'last30days']) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      await this.sseNotification.notifyCacheInvalidated(key);
    }
  }

  private async refreshDailyData(): Promise<void> {
    for (const entity of ['campaigns', 'offers', 'flows', 'landings']) {
      await this.warmupEntityList(entity);
    }
  }

  private getRelatedCacheKeys(entity: string, id: string): string[] {
    const keys: string[] = [];

    for (let page = 1; page <= 5; page++) {
      keys.push(CacheKeyBuilder.entityList(entity, page));
    }

    keys.push(CacheKeyBuilder.entityDetail(entity, id));

    if (['campaign', 'offer', 'click', 'conversion'].includes(entity)) {
      keys.push(CacheKeyBuilder.dashboard('today'));
      keys.push(CacheKeyBuilder.dashboard('last7days'));
      keys.push(CacheKeyBuilder.dashboard('last30days'));
    }

    return keys;
  }

  private async warmupEntityCache(entity: string, id: string): Promise<void> {
    void CacheKeyBuilder.entityDetail(entity, id);
  }

  private async warmupDashboardData(_range: string): Promise<void> {
    // Reserved for targeted warmup of dashboard endpoints.
  }

  private async warmupEntityList(_entity: string): Promise<void> {
    // Reserved for targeted warmup of entity list endpoints.
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
