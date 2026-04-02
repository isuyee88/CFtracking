/**
 * @fileoverview 缓存刷新队列消费者
 * @description 使用Cloudflare Queues替代Cron，实现更灵活的缓存刷新机制
 * @module services/cache/cache-refresh-consumer
 * 
 * 输入: 队列消息(缓存刷新任务)
 * 输出: 缓存刷新结果
 * 逻辑交互: 接收队列消息，执行缓存刷新
 * 前后端交互: 通过队列触发，无需HTTP请求
 */

import type { Env } from '@/config/env';
import { createCacheUpdateRoutes } from './cache-update-service';

/**
 * 队列消息类型
 */
export interface CacheRefreshMessage {
  type: 'realtime' | 'hourly' | 'daily' | 'warmup' | 'custom';
  timestamp: number;
  payload?: {
    keys?: string[];
    range?: string;
    entity?: string;
  };
}

/**
 * 缓存刷新队列消费者
 */
export class CacheRefreshConsumer {
  /**
   * 处理队列消息
   */
  static async handle(
    batch: Message<CacheRefreshMessage>[],
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[Queue Consumer] Processing ${batch.messages.length} messages`);
    
    const cacheUpdate = createCacheUpdateRoutes(env);
    
    for (const message of batch.messages) {
      const task = message.body;
      
      console.log(`[Queue Consumer] Processing task: ${task.type}`);
      
      try {
        switch (task.type) {
          case 'realtime':
            // 刷新实时数据(每5分钟)
            await this.refreshRealtime(cacheUpdate, task);
            break;
          
          case 'hourly':
            // 刷新小时数据(每小时)
            await this.refreshHourly(cacheUpdate, task);
            break;
          
          case 'daily':
            // 刷新每日数据(每天)
            await this.refreshDaily(cacheUpdate, task);
            break;
          
          case 'warmup':
            // 缓存预热
            await this.warmup(cacheUpdate, task);
            break;
          
          case 'custom':
            // 自定义刷新
            await this.refreshCustom(cacheUpdate, task);
            break;
          
          default:
            console.warn(`[Queue Consumer] Unknown task type: ${task.type}`);
        }
        
        // 标记消息已处理
        message.ack();
        
      } catch (error) {
        console.error(`[Queue Consumer] Task failed:`, error);
        
        // 重试消息(最多3次)
        message.retry();
      }
    }
  }
  
  /**
   * 刷新实时数据
   */
  private static async refreshRealtime(
    cacheUpdate: ReturnType<typeof createCacheUpdateRoutes>,
    task: CacheRefreshMessage
  ): Promise<void> {
    console.log('[Queue Consumer] Refreshing realtime data...');
    
    // 模拟ScheduledEvent
    const event = {
      type: 'scheduled' as const,
      scheduledTime: new Date(task.timestamp).toISOString(),
      cron: '*/5 * * * *',
    };
    
    await cacheUpdate.handleScheduled(event);
  }
  
  /**
   * 刷新小时数据
   */
  private static async refreshHourly(
    cacheUpdate: ReturnType<typeof createCacheUpdateRoutes>,
    task: CacheRefreshMessage
  ): Promise<void> {
    console.log('[Queue Consumer] Refreshing hourly data...');
    
    const event = {
      type: 'scheduled' as const,
      scheduledTime: new Date(task.timestamp).toISOString(),
      cron: '0 * * * *',
    };
    
    await cacheUpdate.handleScheduled(event);
  }
  
  /**
   * 刷新每日数据
   */
  private static async refreshDaily(
    cacheUpdate: ReturnType<typeof createCacheUpdateRoutes>,
    task: CacheRefreshMessage
  ): Promise<void> {
    console.log('[Queue Consumer] Refreshing daily data...');
    
    const event = {
      type: 'scheduled' as const,
      scheduledTime: new Date(task.timestamp).toISOString(),
      cron: '0 0 * * *',
    };
    
    await cacheUpdate.handleScheduled(event);
  }
  
  /**
   * 缓存预热
   */
  private static async warmup(
    cacheUpdate: ReturnType<typeof createCacheUpdateRoutes>,
    task: CacheRefreshMessage
  ): Promise<void> {
    console.log('[Queue Consumer] Warming up cache...');
    
    // 发送HTTP请求触发预热
    const request = new Request('http://internal/cache-update?action=warm-cache', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CACHE_UPDATE_TOKEN}`,
      },
    });
    
    await cacheUpdate.handle(request);
  }
  
  /**
   * 自定义刷新
   */
  private static async refreshCustom(
    cacheUpdate: ReturnType<typeof createCacheUpdateRoutes>,
    task: CacheRefreshMessage
  ): Promise<void> {
    console.log('[Queue Consumer] Custom refresh:', task.payload);
    
    if (task.payload?.keys) {
      // 刷新指定的缓存键
      const request = new Request(`http://internal/cache-update?action=purge-key&key=${task.payload.keys[0]}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CACHE_UPDATE_TOKEN}`,
        },
      });
      
      await cacheUpdate.handle(request);
    }
  }
}

/**
 * 队列消息发送器
 */
export class CacheRefreshScheduler {
  constructor(private queue: Queue) {}
  
  /**
   * 发送实时刷新任务(延迟5分钟)
   */
  async scheduleRealtimeRefresh(): Promise<void> {
    await this.queue.send({
      type: 'realtime',
      timestamp: Date.now(),
    }, {
      delaySeconds: 300, // 5分钟后执行
    });
  }
  
  /**
   * 发送小时刷新任务(延迟1小时)
   */
  async scheduleHourlyRefresh(): Promise<void> {
    await this.queue.send({
      type: 'hourly',
      timestamp: Date.now(),
    }, {
      delaySeconds: 3600, // 1小时后执行
    });
  }
  
  /**
   * 发送每日刷新任务(延迟到明天0点)
   */
  async scheduleDailyRefresh(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const delaySeconds = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
    
    await this.queue.send({
      type: 'daily',
      timestamp: tomorrow.getTime(),
    }, {
      delaySeconds,
    });
  }
  
  /**
   * 发送缓存预热任务
   */
  async scheduleWarmup(): Promise<void> {
    await this.queue.send({
      type: 'warmup',
      timestamp: Date.now(),
    });
  }
  
  /**
   * 发送自定义刷新任务
   */
  async scheduleCustomRefresh(keys: string[], delaySeconds?: number): Promise<void> {
    await this.queue.send({
      type: 'custom',
      timestamp: Date.now(),
      payload: { keys },
    }, delaySeconds ? { delaySeconds } : undefined);
  }
}
