/**
 * @fileoverview 缓存更新API服务 (优化版 - 集成SSE)
 * @description 提供手动触发、编程式更新和定时刷新的缓存更新机制,并通过SSE实时通知客户端
 * @module services/cache/cache-update-service
 * 
 * 输入: HTTP请求(手动触发) / 数据变更事件(编程式) / 定时任务(自动刷新)
 * 输出: 缓存更新结果 + SSE推送通知
 * 逻辑交互: 调用UnifiedCacheManager进行缓存操作,通过SSE通知客户端
 * 前后端交互: 通过API路由暴露手动触发接口
 */

import type { Env } from '@/config/env';
import { UnifiedCacheManager, CacheKeyBuilder } from './unified-cache-manager';
import { SSECacheNotificationService } from './sse-cache-notification';
import { ConfigSnapshotPublisher } from './config-snapshot.service';

/**
 * 缓存更新方式
 */
export enum CacheUpdateTrigger {
  MANUAL = 'manual',           // 手动触发(SSH/API)
  PROGRAMMATIC = 'programmatic', // 编程式更新(数据变更后)
  SCHEDULED = 'scheduled',     // 定时刷新(Cron)
  EVENT_DRIVEN = 'event',      // 事件驱动(SSE/Webhook)
}

/**
 * 缓存更新结果
 */
export interface CacheUpdateResult {
  success: boolean;
  trigger: CacheUpdateTrigger;
  keys: string[];
  duration: number;
  timestamp: string;
  errors?: string[];
  notifiedUsers?: number; // SSE通知的用户数
}

/**
 * 控制面写入后运维侧已知、但行数据本身已无法回读的上下文。
 * 全部可选，现有调用方保持兼容。
 */
export interface DataChangeContext {
  /** Campaign 改名/删除前的 alias，用于清理旧 clickcfg 键。 */
  previousAlias?: string;
  /** 变更/删除的 Flow 所属 Campaign，用于列表缓存键与重发。 */
  campaignId?: string;
  /** 删除会级联移除关联行，受影响 alias 必须先捕获再传入。 */
  affectedAliases?: string[];
}

/**
 * 缓存更新服务 (优化版 - 集成SSE)
 */
export class CacheUpdateService {
  private cacheManager: UnifiedCacheManager;
  private sseNotification: SSECacheNotificationService;
  
  constructor(private env: Env) {
    this.cacheManager = new UnifiedCacheManager(env);
    this.sseNotification = new SSECacheNotificationService(env);
  }
  
  /**
   * 处理手动触发缓存更新请求
   */
  async handleManualUpdate(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const key = url.searchParams.get('key');
    
    // 验证权限
    const authHeader = request.headers.get('Authorization');
    if (!this.validateAuth(authHeader)) {
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
        
        case 'refresh-entity':
          const entity = url.searchParams.get('entity');
          if (!entity) {
            return new Response('Missing entity parameter', { status: 400 });
          }
          result = await this.refreshEntity(entity);
          break;
        
        default:
          return new Response('Invalid action', { status: 400 });
      }
      
      return Response.json(result);
      
    } catch (error) {
      console.error('[CacheUpdate] Manual update failed:', error);
      
      return Response.json({
        success: false,
        trigger: CacheUpdateTrigger.MANUAL,
        keys: [],
        duration: Date.now() - start,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }, { status: 500 });
    }
  }
  
  /**
   * 编程式缓存更新(数据变更后自动触发) + SSE通知
   *
   * The click-config sync is isolated from page-cache maintenance: a Cache API
   * failure may skip one list/dashboard invalidation (recoverable by TTL), but
   * it must never leave `clickcfg:{alias}` on the pre-write offer URL. Awaited
   * by the admin write path; never called from the click path.
   */
  async onDataChanged(
    entity: string,
    id: string,
    action: 'create' | 'update' | 'delete',
    userId?: string,
    context: DataChangeContext = {}
  ): Promise<void> {
    console.log(`[CacheUpdate] Entity ${entity}:${id} ${action}d`);
    
    const start = Date.now();
    const clickLike = entity.startsWith('click') || entity.startsWith('conversion');
    
    try {
      try {
        // Click is an event, not page content: no cache invalidation. Conversion
        // only changes today's aggregate and the affected conversion entry.
        const keysToInvalidate = entity.startsWith('click')
          ? []
          : (entity.startsWith('conversion')
            ? [CacheKeyBuilder.entityDetail('conversion', id), CacheKeyBuilder.dashboard('today')]
            : this.getRelatedCacheKeys(entity, id, action, context));
        
        // 失效缓存
        await this.cacheManager.invalidateBatch(keysToInvalidate);
        
        // 通过SSE通知客户端
        for (const key of keysToInvalidate) {
          this.sseNotification.notifyCacheInvalidated(key, userId);
        }
        
        // 如果是特定实体变更,发送更详细的通知
        if (entity && id) {
          this.sseNotification.notifyDataChanged(entity, id, action, userId);
        }
        
        // 点击/转化是高频事件，不走全量预热。
        if (action !== 'delete' && !clickLike) {
          await this.warmupEntityCache(entity, id);
        }
      } catch (error) {
        console.error('[CacheUpdate] Page cache maintenance failed:', error);
      }

      // Control-plane changes must republish the click config for every alias
      // they affect; a retained key keeps redirecting to the old offer URL.
      // Click/conversion never enter this branch, keeping the click path off D1.
      if (!clickLike) {
        await this.syncClickConfig(entity, id, action, context);
      }
      
      const duration = Date.now() - start;
      console.log(`[CacheUpdate] Programmatic update + SSE notification completed in ${duration}ms`);
      
    } catch (error) {
      console.error('[CacheUpdate] Programmatic update failed:', error);
    }
  }
  
  /**
   * 定时刷新缓存(Cron Trigger)
   */
  async handleScheduledRefresh(event: ScheduledEvent): Promise<void> {
    console.log('[CacheUpdate] Scheduled refresh triggered:', event.cron);
    
    const start = Date.now();
    
    try {
      switch (event.cron) {
        case '*/5 * * * *': // 每5分钟
          await this.refreshRealtimeData();
          break;
        
        case '0 * * * *': // 每小时
          await this.refreshHourlyData();
          break;
        
        case '0 0 * * *': // 每天0点
          await this.refreshDailyData();
          break;
        
        default:
          console.log('[CacheUpdate] Unknown cron:', event.cron);
      }
      
      const duration = Date.now() - start;
      console.log(`[CacheUpdate] Scheduled refresh completed in ${duration}ms`);
      
    } catch (error) {
      console.error('[CacheUpdate] Scheduled refresh failed:', error);
    }
  }
  
  /**
   * 清空所有缓存
   */
  private async purgeAll(): Promise<CacheUpdateResult> {
    const start = Date.now();
    
    await this.cacheManager.clearAll();
    
    // 通知所有客户端强制刷新
    this.sseNotification.forceRefresh(['*']);
    
    const stats = this.sseNotification.getStats();
    
    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys: ['*'],
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }
  
  /**
   * 清空指定缓存键
   */
  private async purgeKey(key: string): Promise<CacheUpdateResult> {
    const start = Date.now();
    
    await this.cacheManager.invalidate(key);
    
    // 通知客户端
    this.sseNotification.notifyCacheInvalidated(key);
    
    const stats = this.sseNotification.getStats();
    
    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys: [key],
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }
  
  /**
   * 缓存预热
   */
  private async warmCache(): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];
    const errors: string[] = [];
    
    // 预热Dashboard数据
    const dashboardRanges = ['today', 'last7days', 'last30days'];
    for (const range of dashboardRanges) {
      try {
        const key = CacheKeyBuilder.dashboard(range);
        await this.warmupDashboardData(range);
        keys.push(key);
      } catch (error) {
        errors.push(`Dashboard ${range}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // 预热实体列表
    const entities = ['campaigns', 'offers', 'flows'];
    for (const entity of entities) {
      try {
        const key = CacheKeyBuilder.entityList(entity);
        await this.warmupEntityList(entity);
        keys.push(key);
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
  /**
   * 刷新Dashboard缓存
   */
  private async refreshDashboard(): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];
    
    const ranges = ['today', 'last7days', 'last30days'];
    
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      keys.push(key);
      
      // 通知客户端
      this.sseNotification.notifyCacheInvalidated(key);
    }
    
    const stats = this.sseNotification.getStats();
    
    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }
  
  /**
   * 刷新实体缓存
   */
  private async refreshEntity(entity: string): Promise<CacheUpdateResult> {
    const start = Date.now();
    const keys: string[] = [];
    
    // 失效第一页列表；其他页按需过期，不做 10 页 fan-out。
    for (let page = 1; page <= 1; page++) {
      const key = CacheKeyBuilder.entityList(entity, page);
      await this.cacheManager.invalidate(key);
      keys.push(key);
      
      // 通知客户端
      this.sseNotification.notifyCacheInvalidated(key);
    }
    
    // 预热第一页
    await this.warmupEntityList(entity);
    
    const stats = this.sseNotification.getStats();
    
    return {
      success: true,
      trigger: CacheUpdateTrigger.MANUAL,
      keys,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
      notifiedUsers: stats.totalUsers,
    };
  }
  
  /**
   * 刷新实时数据(每5分钟)
   */
  private async refreshRealtimeData(): Promise<void> {
    const ranges = ['today'];
    
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      
      // 通知客户端
      this.sseNotification.notifyCacheInvalidated(key);
    }
  }
  
  /**
   * 刷新小时数据(每小时)
   */
  private async refreshHourlyData(): Promise<void> {
    const ranges = ['last7days', 'last30days'];
    
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      
      // 通知客户端
      this.sseNotification.notifyCacheInvalidated(key);
    }
  }
  
  /**
   * 刷新每日数据(每天)
   */
  private async refreshDailyData(): Promise<void> {
    const entities = ['campaigns', 'offers', 'flows', 'landings'];
    
    for (const entity of entities) {
      await this.warmupEntityList(entity);
    }
  }
  
  /**
   * 获取相关缓存键
   */
  private getRelatedCacheKeys(entity: string, id: string, _action: string, context: DataChangeContext): string[] {
    const kind = this.normalizeEntity(entity);
    // Invalidate only the changed entry and the first list page. A full
    // dashboard/list fan-out turns one write into dozens of cache misses.
    const keys = [
      CacheKeyBuilder.entityDetail(kind, id),
      CacheKeyBuilder.entityList(kind, 1),
    ];

    // List routes build their ETag key from the query tuple inline, not with
    // CacheKeyBuilder. Cover the default first page the admin UI reads; other
    // filter/page variants still expire via the RECENT TTL.
    if (kind === 'offer') keys.push('offers:list:1:20:plain:all:', 'offers:list:1:20:stats:all:');
    if (kind === 'campaign') keys.push('campaigns:list:1:20:all:');
    if (kind === 'landing') keys.push('landings:list:1:20:plain', 'landings:list:1:20:stats');
    if (kind === 'flow' && context.campaignId) keys.push(`flows:list:${context.campaignId}`);

    return keys;
  }

  /**
   * Keep the alias-scoped click config in sync with the entity that changed.
   * Every branch runs on the write path so a click cannot observe pre-write
   * config; when the publish itself fails the publisher deletes the key, which
   * sends the click back to D1 instead of the old snapshot.
   */
  private async syncClickConfig(
    entity: string,
    id: string,
    action: 'create' | 'update' | 'delete',
    context: DataChangeContext
  ): Promise<void> {
    const publisher = new ConfigSnapshotPublisher(this.env);
    const kind = this.normalizeEntity(entity);

    switch (kind) {
      case 'campaign':
        if (action === 'delete') {
          const aliases = context.affectedAliases
            ?? (context.previousAlias ? [context.previousAlias] : []);
          await publisher.publishAliases(aliases);
        } else {
          await publisher.publishCampaign(id, context.previousAlias);
        }
        return;

      case 'offer':
        if (action === 'delete') {
          const aliases = context.affectedAliases?.length
            ? context.affectedAliases
            : await publisher.aliasesForOffer(id);
          await publisher.publishAliases(aliases);
        } else {
          await publisher.publishForOffer(id);
        }
        return;

      case 'flow':
        if (context.campaignId) {
          await publisher.publishCampaign(context.campaignId);
        } else if (action !== 'delete') {
          await publisher.publishForFlow(id);
        }
        return;

      case 'landing':
        if (action === 'delete') {
          const aliases = context.affectedAliases?.length
            ? context.affectedAliases
            : await publisher.aliasesForLandingPage(id);
          await publisher.publishAliases(aliases);
        } else {
          await publisher.publishForLandingPage(id);
        }
        return;

      default:
        return;
    }
  }

  /** Route handlers pass both `offer` and `offers`; treat them the same. */
  private normalizeEntity(entity: string): string {
    return entity.endsWith('s') ? entity.slice(0, -1) : entity;
  }
  
  /**
   * 预热实体缓存
   */
  private async warmupEntityCache(entity: string, id: string): Promise<void> {
    // 预热实体详情
    CacheKeyBuilder.entityDetail(entity, id);
    // 实际实现中需要获取实体数据并缓存
    // const data = await this.fetchEntityDetail(entity, id);
    // await this.cacheManager.fetch(...)
  }
  
  /**
   * 预热Dashboard数据
   */
  private async warmupDashboardData(_range: string): Promise<void> {
    // 实际实现中需要调用DashboardQueryService获取数据
    // const data = await this.dashboardService.getDashboardStats(range);
    // 然后通过cacheManager.fetch()方法缓存
  }
  
  /**
   * 预热实体列表
   */
  private async warmupEntityList(_entity: string): Promise<void> {
    // 实际实现中需要调用对应的Repository获取列表
    // const data = await this.repository.list(entity);
    // 然后通过cacheManager.fetch()方法缓存
  }
  
  /**
   * 验证权限
   */
  private validateAuth(authHeader: string | null): boolean {
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    return token === this.env.CACHE_UPDATE_TOKEN;
  }
  
  /**
   * 获取SSE连接统计
   */
  getSSEStats(): { totalUsers: number; totalConnections: number } {
    return this.sseNotification.getStats();
  }
}

/**
 * 缓存更新API路由
 */
export function createCacheUpdateRoutes(env: Env) {
  const service = new CacheUpdateService(env);
  
  return {
    /**
     * 处理缓存更新请求
     */
    async handle(request: Request): Promise<Response> {
      return service.handleManualUpdate(request);
    },
    
    /**
     * 处理数据变更事件
     */
    async onDataChanged(
      entity: string,
      id: string,
      action: 'create' | 'update' | 'delete',
      userId?: string,
      context: DataChangeContext = {}
    ): Promise<void> {
      return service.onDataChanged(entity, id, action, userId, context);
    },
    
    /**
     * 处理定时刷新
     */
    async handleScheduled(event: ScheduledEvent): Promise<void> {
      return service.handleScheduledRefresh(event);
    },
    
    /**
     * 获取SSE统计
     */
    getSSEStats(): { totalUsers: number; totalConnections: number } {
      return service.getSSEStats();
    },
  };
}
