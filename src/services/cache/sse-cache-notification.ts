import type { Env } from '@/config/env';
import { CacheKeyBuilder } from './unified-cache-manager';

export enum SSEEventType {
  CACHE_INVALIDATED = 'cache-invalidated',
  CACHE_UPDATED = 'cache-updated',
  DATA_CHANGED = 'data-changed',
  FORCE_REFRESH = 'force-refresh',
}

export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
  cacheKey: string;
  entity?: string;
  entityId?: string;
  action?: 'create' | 'update' | 'delete';
  message?: string;
}

export class SSEConnectionManager {
  private connections = new Map<string, Set<ReadableStreamDefaultController>>();
  private readonly maxConnectionsPerUser = 5;

  addConnection(userId: string, controller: ReadableStreamDefaultController): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }

    const userConnections = this.connections.get(userId)!;

    if (userConnections.size >= this.maxConnectionsPerUser) {
      const oldest = userConnections.values().next().value;
      oldest?.close();
      if (oldest) {
        userConnections.delete(oldest);
      }
    }

    userConnections.add(controller);
    console.log(`[SSE] Connection added for user ${userId}, total: ${userConnections.size}`);
  }

  removeConnection(userId: string, controller: ReadableStreamDefaultController): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

    userConnections.delete(controller);
    if (userConnections.size === 0) {
      this.connections.delete(userId);
    }
  }

  sendToUser(userId: string, event: SSEEvent): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

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

  private formatSSEMessage(event: SSEEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}

export class SSECacheNotificationService {
  private connectionManager: SSEConnectionManager;

  constructor(_env: Env) {
    this.connectionManager = new SSEConnectionManager();
  }

  async handleConnection(request: Request, userId: string): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        this.connectionManager.addConnection(userId, controller);

        const connectEvent: SSEEvent = {
          type: SSEEventType.CACHE_UPDATED,
          timestamp: Date.now(),
          cacheKey: 'connection',
          message: 'SSE connection established',
        };

        controller.enqueue(new TextEncoder().encode(this.formatSSEMessage(connectEvent)));

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
          } catch {
            clearInterval(heartbeat);
            this.connectionManager.removeConnection(userId, controller);
          }
        }, 30000);

        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          this.connectionManager.removeConnection(userId, controller);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Accel-Buffering': 'no',
      },
    });
  }

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

  getStats(): { totalUsers: number; totalConnections: number } {
    return this.connectionManager.getStats();
  }

  private formatSSEMessage(event: SSEEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}

let sharedNotificationService: SSECacheNotificationService | null = null;

export function createSSECacheNotification(env: Env): SSECacheNotificationService {
  if (!sharedNotificationService) {
    sharedNotificationService = new SSECacheNotificationService(env);
  }

  return sharedNotificationService;
}
