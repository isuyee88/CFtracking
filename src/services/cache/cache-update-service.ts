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
import { UnifiedCacheManager, CacheKeyBuilder, CacheStrategy } from './unified-cache-manager';
import { SSECacheNotificationService, SSEEventType } from './sse-cache-notification';

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
   */
  async onDataChanged(
    entity: string,
    id: string,
    action: 'create' | 'update' | 'delete',
    userId?: string
  ): Promise<void> {
    console.log(`[CacheUpdate] Entity ${entity}:${id} ${action}d`);
    
    const start = Date.now();
    
    try {
      // 根据实体类型失效相关缓存
      const keysToInvalidate = this.getRelatedCacheKeys(entity, id, action);
      
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
      
      // 预热关键缓存
      if (action !== 'delete') {
        await this.warmupEntityCache(entity, id);
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
    
    // 失效所有页的列表缓存
    for (let page = 1; page <= 10; page++) {
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
  private getRelatedCacheKeys(entity: string, id: string, action: string): string[] {
    const keys: string[] = [];
    
    // 实体列表缓存
    for (let page = 1; page <= 5; page++) {
      keys.push(CacheKeyBuilder.entityList(entity, page));
    }
    
    // 实体详情缓存
    keys.push(CacheKeyBuilder.entityDetail(entity, id));
    
    // Dashboard统计缓存
    if (['campaign', 'offer', 'click', 'conversion'].includes(entity)) {
      keys.push(CacheKeyBuilder.dashboard('today'));
      keys.push(CacheKeyBuilder.dashboard('last7days'));
      keys.push(CacheKeyBuilder.dashboard('last30days'));
    }
    
    return keys;
  }
  
  /**
   * 预热实体缓存
   */
  private async warmupEntityCache(entity: string, id: string): Promise<void> {
    // 预热实体详情
    const detailKey = CacheKeyBuilder.entityDetail(entity, id);
    // 实际实现中需要获取实体数据并缓存
    // const data = await this.fetchEntityDetail(entity, id);
    // await this.cacheManager.fetch(...)
  }
  
  /**
   * 预热Dashboard数据
   */
  private async warmupDashboardData(range: string): Promise<void> {
    // 实际实现中需要调用DashboardQueryService获取数据
    // const data = await this.dashboardService.getDashboardStats(range);
    // 然后通过cacheManager.fetch()方法缓存
  }
  
  /**
   * 预热实体列表
   */
  private async warmupEntityList(entity: string): Promise<void> {
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
      userId?: string
    ): Promise<void> {
      return service.onDataChanged(entity, id, action, userId);
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
