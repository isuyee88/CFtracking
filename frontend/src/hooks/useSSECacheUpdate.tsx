/**
 * @fileoverview SSE缓存更新React Hook
 * @description 客户端通过SSE实时接收缓存更新通知,自动刷新数据
 * @module frontend/hooks/useSSECacheUpdate
 * 
 * 输入: SSE事件流
 * 输出: 缓存更新通知 + 自动刷新触发
 * 逻辑交互: 与React Query集成,自动失效和重新获取数据
 * 前后端交互: 通过EventSource连接SSE端点
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SSEEventType, type SSEEvent } from '@/services/cache/sse-cache-notification';

/**
 * SSE缓存更新Hook配置
 */
export interface UseSSECacheUpdateConfig {
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * SSE缓存更新Hook返回值
 */
export interface UseSSECacheUpdateReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * SSE缓存更新Hook
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { isConnected, lastEvent } = useSSECacheUpdate({
 *     userId: 'user-123',
 *     onConnectionChange: (connected) => {
 *       console.log('SSE connected:', connected);
 *     },
 *   });
 *   
 *   return (
 *     <div>
 *       <div>Connection: {isConnected ? '✅' : '❌'}</div>
 *       {lastEvent && <div>Last update: {lastEvent.cacheKey}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSSECacheUpdate(
  config: UseSSECacheUpdateConfig = {}
): UseSSECacheUpdateReturn {
  const {
    userId,
    autoReconnect = true,
    reconnectInterval = 5000,
    onConnectionChange,
    onError,
  } = config;
  
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  
  /**
   * 连接SSE
   */
  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const url = userId 
      ? `/api/cache/events?userId=${userId}`
      : '/api/cache/events';
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      onConnectionChange?.(true);
    };
    
    eventSource.onerror = (error) => {
      console.error('[SSE] Error:', error);
      setIsConnected(false);
      onConnectionChange?.(false);
      onError?.(new Error('SSE connection error'));
      
      // 自动重连
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[SSE] Reconnecting...');
          connect();
        }, reconnectInterval);
      }
    };
    
    // 监听缓存失效事件
    eventSource.addEventListener(SSEEventType.CACHE_INVALIDATED, (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      console.log('[SSE] Cache invalidated:', data.cacheKey);
      setLastEvent(data);
      
      // 失效对应的React Query缓存
      invalidateCacheByKey(data.cacheKey);
    });
    
    // 监听数据变更事件
    eventSource.addEventListener(SSEEventType.DATA_CHANGED, (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      console.log('[SSE] Data changed:', data.entity, data.entityId);
      setLastEvent(data);
      
      // 失效相关缓存
      if (data.entity && data.entityId) {
        queryClient.invalidateQueries({
          queryKey: [data.entity, data.entityId],
        });
      }
    });
    
    // 监听强制刷新事件
    eventSource.addEventListener(SSEEventType.FORCE_REFRESH, (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      console.log('[SSE] Force refresh:', data.cacheKey);
      setLastEvent(data);
      
      // 强制刷新所有缓存
      if (data.cacheKey === '*') {
        queryClient.invalidateQueries();
      } else {
        invalidateCacheByKey(data.cacheKey);
      }
    });
  };
  
  /**
   * 根据缓存键失效React Query缓存
   */
  const invalidateCacheByKey = (cacheKey: string) => {
    // 解析缓存键
    // 格式: cftrack:v1:{resource}:{identifier}
    const parts = cacheKey.split(':');
    
    if (parts.length < 4) return;
    
    const resource = parts[2];
    const identifier = parts[3];
    
    // 根据资源类型失效对应的查询
    switch (resource) {
      case 'dashboard':
        queryClient.invalidateQueries({
          queryKey: ['dashboard', identifier],
        });
        break;
      
      case 'campaigns':
      case 'offers':
      case 'flows':
      case 'landings':
        if (identifier === 'list') {
          // 失效列表查询
          queryClient.invalidateQueries({
            queryKey: [resource, 'list'],
          });
        } else {
          // 失效详情查询
          queryClient.invalidateQueries({
            queryKey: [resource, identifier],
          });
        }
        break;
      
      case 'stats':
        queryClient.invalidateQueries({
          queryKey: ['stats', identifier],
        });
        break;
      
      default:
        // 通用失效
        queryClient.invalidateQueries({
          queryKey: [resource],
        });
    }
  };
  
  /**
   * 断开连接
   */
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
  
  /**
   * 重连
   */
  const reconnect = () => {
    disconnect();
    connect();
  };
  
  // 组件挂载时连接
  useEffect(() => {
    connect();
    
    // 组件卸载时断开
    return () => {
      disconnect();
    };
  }, [userId]); // userId变化时重新连接
  
  return {
    isConnected,
    lastEvent,
    reconnect,
    disconnect,
  };
}

/**
 * SSE连接状态指示器组件
 * 
 * @example
 * ```tsx
 * function SSEStatusBadge() {
 *   const { isConnected } = useSSECacheUpdate();
 *   
 *   return (
 *     <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
 *       {isConnected ? '🟢 Real-time' : '🔴 Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function SSEStatusBadge() {
  const { isConnected } = useSSECacheUpdate();
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isConnected 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      {isConnected ? 'Real-time' : 'Offline'}
    </div>
  );
}

/**
 * SSE事件日志组件
 * 
 * @example
 * ```tsx
 * function SSEEventLog() {
 *   const { lastEvent } = useSSECacheUpdate();
 *   
 *   if (!lastEvent) return null;
 *   
 *   return (
 *     <div className="text-xs text-gray-500">
 *       Last update: {lastEvent.cacheKey} at {new Date(lastEvent.timestamp).toLocaleTimeString()}
 *     </div>
 *   );
 * }
 * ```
 */
export function SSEEventLog() {
  const { lastEvent } = useSSECacheUpdate();
  
  if (!lastEvent) return null;
  
  return (
    <div className="text-xs text-gray-500">
      Last update: {lastEvent.cacheKey} at{' '}
      {new Date(lastEvent.timestamp).toLocaleTimeString()}
    </div>
  );
}
