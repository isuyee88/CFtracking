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
  page?: string;
  scopeHash?: string;
  entity?: string;
  entityId?: string;
  action?: 'create' | 'update' | 'delete';
  message?: string;
  version?: string;
}
