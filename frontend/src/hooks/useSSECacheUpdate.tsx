/**
 * @fileoverview SSE cache update React hook
 * @description Subscribe to cache update events and expose connection state.
 */

import { useEffect, useRef, useState } from 'react';
import { SSEEventType, type SSEEvent } from '@/services/cache/sse-cache-notification';

export interface UseSSECacheUpdateConfig {
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: SSEEvent) => void;
}

export interface UseSSECacheUpdateReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useSSECacheUpdate(
  config: UseSSECacheUpdateConfig = {}
): UseSSECacheUpdateReturn {
  const {
    userId,
    autoReconnect = true,
    reconnectInterval = 5000,
    onConnectionChange,
    onError,
    onEvent,
  } = config;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const connect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = userId ? `/events/cache?userId=${userId}` : '/events/cache';
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      onConnectionChange?.(true);
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      onConnectionChange?.(false);
      onError?.(new Error('SSE connection error'));

      eventSource.close();
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null;
      }

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, reconnectInterval);
      }
    };

    const bindEvent = (eventType: SSEEventType) => {
      eventSource.addEventListener(eventType, (event) => {
        const data = JSON.parse(event.data) as SSEEvent;
        setLastEvent(data);
        onEvent?.(data);
      });
    };

    bindEvent(SSEEventType.CACHE_INVALIDATED);
    bindEvent(SSEEventType.CACHE_UPDATED);
    bindEvent(SSEEventType.DATA_CHANGED);
    bindEvent(SSEEventType.FORCE_REFRESH);
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange?.(false);
  };

  const reconnect = () => {
    disconnect();
    connect();
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [userId, autoReconnect, reconnectInterval, onConnectionChange, onError, onEvent]);

  return {
    isConnected,
    lastEvent,
    reconnect,
    disconnect,
  };
}

export function SSEStatusBadge() {
  const { isConnected } = useSSECacheUpdate();

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      {isConnected ? 'Real-time' : 'Offline'}
    </div>
  );
}

export function SSEEventLog() {
  const { lastEvent } = useSSECacheUpdate();

  if (!lastEvent) {
    return null;
  }

  return (
    <div className="text-xs text-gray-500">
      Last update: {lastEvent.cacheKey} at {new Date(lastEvent.timestamp).toLocaleTimeString()}
    </div>
  );
}
