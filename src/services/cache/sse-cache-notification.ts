/**
 * @fileoverview SSE缓存更新通知服务
 * @description 通过SSE实时推送缓存更新通知给客户端,确保客户端及时获取最新数据
 * @module services/cache/sse-cache-notification
 * 
 * 输入: 缓存更新事件
 * 输出: SSE推送通知
 * 逻辑交互: 集成到缓存更新流程
 * 前后端交互: 客户端通过EventSource订阅更新
 */

import type { Env } from '@/config/env';
import { CacheKeyBuilder } from './unified-cache-manager';

/**
 * SSE事件类型
 */
export enum SSEEventType {
  CACHE_INVALIDATED = 'cache-invalidated',     // 缓存失效
  CACHE_UPDATED = 'cache-updated',             // 缓存更新
  DATA_CHANGED = 'data-changed',               // 数据变更
  FORCE_REFRESH = 'force-refresh',             // 强制刷新
}

/**
 * SSE事件数据
 */
export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
  cacheKey: string;
  entity?: string;
  entityId?: string;
  action?: 'create' | 'update' | 'delete';
  message?: string;
}

/**
 * SSE连接管理器
 */
export class SSEConnectionManager {
  private connections = new Map<string, Set<ReadableStreamDefaultController>>();
  private readonly maxConnectionsPerUser = 5;
  
  /**
   * 添加连接
   */
  addConnection(userId: string, controller: ReadableStreamDefaultController): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    
    const userConnections = this.connections.get(userId)!;
    
    // 限制每个用户的连接数
    if (userConnections.size >= this.maxConnectionsPerUser) {
      // 移除最旧的连接
      const oldest = userConnections.values().next().value;
      oldest?.close();
      userConnections.delete(oldest!);
    }
    
    userConnections.add(controller);
    console.log(`[SSE] Connection added for user ${userId}, total: ${userConnections.size}`);
  }
  
  /**
   * 移除连接
   */
  removeConnection(userId: string, controller: ReadableStreamDefaultController): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(controller);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }
  
  /**
   * 向指定用户推送事件
   */
  sendToUser(userId: string, event: SSEEvent): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;
    
    const message = this.formatSSEMessage(event);
    
    for (const controller of userConnections) {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error('[SSE] Failed to send message:', error);
        this.removeConnection(userId, controller);
      }
    }
  }
  
  /**
   * 向所有用户广播事件
   */
  broadcast(event: SSEEvent): void {
    const message = this.formatSSEMessage(event);
    
    for (const [userId, connections] of this.connections) {
      for (const controller of connections) {
        try {
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          console.error('[SSE] Failed to broadcast:', error);
          this.removeConnection(userId, controller);
        }
      }
    }
  }
  
  /**
   * 格式化SSE消息
   */
  private formatSSEMessage(event: SSEEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }
  
  /**
   * 获取连接统计
   */
  getStats(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;
    for (const connections of this.connections.values()) {
      totalConnections += connections.size;
    }
    
    return {
      totalUsers: this.connections.size,
      totalConnections,
    };
  }
}

/**
 * SSE缓存通知服务
 */
export class SSECacheNotificationService {
  private connectionManager: SSEConnectionManager;
  
  constructor(private env: Env) {
    this.connectionManager = new SSEConnectionManager();
  }
  
  /**
   * 处理SSE连接请求
   */
  async handleConnection(request: Request, userId: string): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        // 添加连接
        this.connectionManager.addConnection(userId, controller);
        
        // 发送初始连接成功消息
        const connectEvent: SSEEvent = {
          type: SSEEventType.CACHE_UPDATED,
          timestamp: Date.now(),
          cacheKey: 'connection',
          message: 'SSE connection established',
        };
        
        controller.enqueue(
          new TextEncoder().encode(this.formatSSEMessage(connectEvent))
        );
        
        // 发送心跳
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
          } catch (error) {
            clearInterval(heartbeat);
            this.connectionManager.removeConnection(userId, controller);
          }
        }, 30000); // 30秒心跳
        
        // 清理
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          this.connectionManager.removeConnection(userId, controller);
        });
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
      },
    });
  }
  
  /**
   * 通知缓存失效
   */
  notifyCacheInvalidated(cacheKey: string, userId?: string): void {
    const event: SSEEvent = {
      type: SSEEventType.CACHE_INVALIDATED,
      timestamp: Date.now(),
      cacheKey,
    };
    
    if (userId) {
      this.connectionManager.sendToUser(userId, event);
    } else {
      this.connectionManager.broadcast(event);
    }
  }
  
  /**
   * 通知数据变更
   */
  notifyDataChanged(
    entity: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    userId?: string
  ): void {
    const cacheKey = CacheKeyBuilder.entityDetail(entity, entityId);
    
    const event: SSEEvent = {
      type: SSEEventType.DATA_CHANGED,
      timestamp: Date.now(),
      cacheKey,
      entity,
      entityId,
      action,
    };
    
    if (userId) {
      this.connectionManager.sendToUser(userId, event);
    } else {
      this.connectionManager.broadcast(event);
    }
  }
  
  /**
   * 强制客户端刷新
   */
  forceRefresh(cacheKeys: string[], userId?: string): void {
    for (const cacheKey of cacheKeys) {
      const event: SSEEvent = {
        type: SSEEventType.FORCE_REFRESH,
        timestamp: Date.now(),
        cacheKey,
        message: 'Please refresh this data',
      };
      
      if (userId) {
        this.connectionManager.sendToUser(userId, event);
      } else {
        this.connectionManager.broadcast(event);
      }
    }
  }
  
  /**
   * 格式化SSE消息
   */
  private formatSSEMessage(event: SSEEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }
  
  /**
   * 获取连接统计
   */
  getStats(): { totalUsers: number; totalConnections: number } {
    return this.connectionManager.getStats();
  }
}

/**
 * 创建SSE缓存通知服务实例
 */
export function createSSECacheNotification(env: Env): SSECacheNotificationService {
  return new SSECacheNotificationService(env);
}
