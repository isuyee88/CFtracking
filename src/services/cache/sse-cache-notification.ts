import type { Env } from '@/config/env';
import { getCacheEventBrokerStub } from '@/handlers/do';
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

interface NotifyResponse {
  totalUsers: number;
  totalConnections: number;
}

export class SSECacheNotificationService {
  constructor(private readonly env: Env) {}

  async handleConnection(_request: Request, userId: string): Promise<Response> {
    const stub = getCacheEventBrokerStub(this.env);

    return stub.fetch(
      new Request(`https://do/events?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
      })
    );
  }

  async notifyCacheInvalidated(cacheKey: string, userId?: string): Promise<void> {
    await this.dispatchEvents(
      [
        {
          type: SSEEventType.CACHE_INVALIDATED,
          timestamp: Date.now(),
          cacheKey,
        },
      ],
      userId
    );
  }

  async notifyCacheInvalidatedMany(cacheKeys: string[], userId?: string): Promise<void> {
    if (cacheKeys.length === 0) {
      return;
    }

    await this.dispatchEvents(
      cacheKeys.map((cacheKey) => ({
        type: SSEEventType.CACHE_INVALIDATED,
        timestamp: Date.now(),
        cacheKey,
      })),
      userId
    );
  }

  async notifyDataChanged(
    entity: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    userId?: string
  ): Promise<void> {
    await this.dispatchEvents(
      [
        {
          type: SSEEventType.DATA_CHANGED,
          timestamp: Date.now(),
          cacheKey: CacheKeyBuilder.entityDetail(entity, entityId),
          entity,
          entityId,
          action,
        },
      ],
      userId
    );
  }

  async forceRefresh(cacheKeys: string[], userId?: string): Promise<void> {
    if (cacheKeys.length === 0) {
      return;
    }

    await this.dispatchEvents(
      cacheKeys.map((cacheKey) => ({
        type: SSEEventType.FORCE_REFRESH,
        timestamp: Date.now(),
        cacheKey,
        message: 'Please refresh this data',
      })),
      userId
    );
  }

  async getStats(): Promise<{ totalUsers: number; totalConnections: number }> {
    const stub = getCacheEventBrokerStub(this.env);
    const response = await stub.fetch(new Request('https://do/stats'));

    if (!response.ok) {
      return { totalUsers: 0, totalConnections: 0 };
    }

    return (await response.json()) as NotifyResponse;
  }

  private async dispatchEvents(events: SSEEvent[], userId?: string): Promise<void> {
    const stub = getCacheEventBrokerStub(this.env);

    await stub.fetch(
      new Request('https://do/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          events,
        }),
      })
    );
  }
}

let sharedNotificationService: SSECacheNotificationService | null = null;

export function createSSECacheNotification(env: Env): SSECacheNotificationService {
  if (!sharedNotificationService) {
    sharedNotificationService = new SSECacheNotificationService(env);
  }

  return sharedNotificationService;
}
