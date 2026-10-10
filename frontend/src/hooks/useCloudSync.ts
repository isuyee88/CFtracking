/**
 * @fileoverview React Hook - 云端同步管理
 * @description 使用 SSE 实现跨设备的用户偏好云端同步
 * @module hooks/useCloudSync
 * 
 * 输入输出:
 * - 输入：userId, apiBaseUrl, onSync, onConflict
 * - 输出：同步状态、推送/拉取函数、SSE 连接管理
 * 
 * 前后端交互:
 * - HTTP POST: 推送更新到 Worker 代理
 * - HTTP GET: 拉取最新数据
 * - SSE: 监听服务器推送的更新通知
 * 
 * 改进：
 * - 指数退避重连策略
 * - 最大重试次数限制
 * - 错误类型区分（网络错误 vs 致命错误）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { storageManager } from '@/utils/storage/StorageManager';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: Error | null;
  isConnected: boolean;
  retryCount: number;
}

interface CloudSyncOptions {
  userId: string;
  apiBaseUrl?: string;
  onSync?: (data: any) => void;
  onConflict?: (local: any, server: any) => void;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRY_DELAY = 60000;

export function useCloudSync(options: CloudSyncOptions) {
  const {
    userId,
    apiBaseUrl = '/api/user-preferences',
    onSync,
    onConflict,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialRetryDelay = DEFAULT_INITIAL_RETRY_DELAY,
    maxRetryDelay = DEFAULT_MAX_RETRY_DELAY,
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    error: null,
    isConnected: false,
    retryCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const deviceIdRef = useRef<string>(getDeviceId());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const isFatalErrorRef = useRef(false);

  const calculateBackoff = useCallback((attempt: number): number => {
    const delay = Math.min(
      initialRetryDelay * Math.pow(2, attempt),
      maxRetryDelay
    );
    return delay + Math.random() * 1000;
  }, [initialRetryDelay, maxRetryDelay]);

  const isFatalError = useCallback((error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('mixed content') ||
      message.includes('blocked') ||
      message.includes('cors') ||
      message.includes('forbidden')
    );
  }, []);

  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    if (isFatalErrorRef.current) {
      console.log('[CloudSync] Skipping pull due to fatal error');
      return false;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      const response = await fetch(`${apiBaseUrl}/preferences/${userId}`, {
        headers: {
          'X-Device-ID': deviceIdRef.current,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const cloudData = await response.json();

      retryCountRef.current = 0;
      isFatalErrorRef.current = false;

      if (cloudData.lastModifiedBy === deviceIdRef.current) {
        setSyncState(prev => ({ ...prev, isSyncing: false, retryCount: 0 }));
        return false;
      }

      if (cloudData.preferences) {
        await storageManager.setBatch(cloudData.preferences);
        await storageManager.set(
          `cf:v1:sync:version:${userId}`,
          cloudData.lastUpdated
        );
        onSync?.(cloudData.preferences);
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        retryCount: 0,
      }));

      return true;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Pull failed');
      console.error('[CloudSync] Pull failed:', err.message);

      if (isFatalError(err)) {
        isFatalErrorRef.current = true;
        console.error('[CloudSync] Fatal error detected, stopping retries');
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: err,
          retryCount: retryCountRef.current,
        }));
        return false;
      }

      retryCountRef.current++;

      if (retryCountRef.current >= maxRetries) {
        console.error('[CloudSync] Max retries reached');
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: new Error(`Max retries (${maxRetries}) reached`),
          retryCount: retryCountRef.current,
        }));
        return false;
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: err,
        retryCount: retryCountRef.current,
      }));

      const delay = calculateBackoff(retryCountRef.current);
      console.log(`[CloudSync] Retrying in ${Math.round(delay / 1000)}s (attempt ${retryCountRef.current}/${maxRetries})`);

      return false;
    }
  }, [userId, apiBaseUrl, onSync, maxRetries, isFatalError, calculateBackoff]);

  const connectSSE = useCallback(() => {
    if (isFatalErrorRef.current || retryCountRef.current >= maxRetries) {
      console.log('[CloudSync] Not connecting SSE due to previous errors');
      return;
    }

    try {
      const eventUrl = `${apiBaseUrl}/events/${userId}`;
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(eventUrl);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        console.log('[CloudSync] SSE connected:', event.data);
        retryCountRef.current = 0;
        isFatalErrorRef.current = false;
        setSyncState(prev => ({ 
          ...prev, 
          isConnected: true, 
          error: null,
          retryCount: 0 
        }));
      });

      eventSource.addEventListener('preference_updated', async (event) => {
        console.log('[CloudSync] Received update notification:', event.data);
        
        const data = JSON.parse(event.data);
        
        if (data.modifiedBy === deviceIdRef.current) {
          return;
        }

        await pullFromCloud();
      });

      eventSource.onerror = () => {
        console.error('[CloudSync] SSE error');
        
        eventSource.close();
        
        if (isFatalErrorRef.current || retryCountRef.current >= maxRetries) {
          setSyncState(prev => ({ 
            ...prev, 
            isConnected: false,
          }));
          return;
        }

        retryCountRef.current++;
        setSyncState(prev => ({ 
          ...prev, 
          isConnected: false, 
          retryCount: retryCountRef.current,
        }));

        if (retryCountRef.current < maxRetries) {
          const delay = calculateBackoff(retryCountRef.current);
          console.log(`[CloudSync] SSE reconnecting in ${Math.round(delay / 1000)}s (attempt ${retryCountRef.current}/${maxRetries})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, delay);
        }
      };

    } catch (error) {
      console.error('[CloudSync] Failed to connect SSE:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: error instanceof Error ? error : new Error('SSE connection failed') 
      }));
    }
  }, [userId, apiBaseUrl, pullFromCloud, maxRetries, calculateBackoff]);

  const pushToCloud = useCallback(async (preferences: any): Promise<boolean> => {
    if (isFatalErrorRef.current) {
      console.log('[CloudSync] Skipping push due to fatal error');
      return false;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      const lastVersion = await storageManager.get<number>(
        `cf:v1:sync:version:${userId}`
      );

      const response = await fetch(`${apiBaseUrl}/preferences/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceIdRef.current,
        },
        body: JSON.stringify({
          preferences,
          lastKnownVersion: lastVersion || 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && onConflict) {
          const serverData = result.serverVersion || result;
          onConflict(preferences, serverData);
        }
        throw new Error(result.error || 'Push failed');
      }

      await storageManager.set(
        `cf:v1:sync:version:${userId}`,
        result.version
      );

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));

      return true;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Push failed');
      console.error('[CloudSync] Push failed:', err.message);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: err,
      }));
      return false;
    }
  }, [userId, apiBaseUrl, onConflict]);

  const handleConflict = useCallback(async (serverData: any, localData: any) => {
    if (onConflict) {
      onConflict(localData, serverData);
    } else {
      await storageManager.setBatch(serverData.preferences);
      onSync?.(serverData.preferences);
    }
  }, [onConflict, onSync]);

  const setWithSync = useCallback(async <T>(
    key: string,
    value: T,
    options?: any
  ): Promise<void> => {
    await storageManager.set(key, value, options);
    const preferences = await extractPreferences(key, value);
    await pushToCloud(preferences);
  }, [pushToCloud]);

  useEffect(() => {
    if (!userId) return;

    const initSync = async () => {
      await pullFromCloud();
      connectSSE();
    };

    initSync();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId]);

  const forceSync = useCallback(async () => {
    retryCountRef.current = 0;
    isFatalErrorRef.current = false;
    await pushToCloud(await getAllPreferences());
    await pullFromCloud();
  }, [pushToCloud, pullFromCloud]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    isFatalErrorRef.current = false;
    setSyncState(prev => ({ ...prev, error: null, retryCount: 0 }));
    pullFromCloud();
    connectSSE();
  }, [pullFromCloud, connectSSE]);

  return {
    ...syncState,
    pushToCloud,
    pullFromCloud,
    forceSync,
    setWithSync,
    reconnect,
  };
}

function getDeviceId(): string {
  let deviceId: string | null = null;
  try {
    deviceId = localStorage.getItem('cf_device_id');
  } catch {
    deviceId = null;
  }
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      localStorage.setItem('cf_device_id', deviceId);
    } catch {
      // Ignore storage write failures in restricted contexts.
    }
  }
  return deviceId;
}

async function extractPreferences(key: string, value: any): Promise<any> {
  if (key.includes(':pref:user:')) {
    const type = key.split(':').pop();
    return { [type]: value };
  }
  return value;
}

async function getAllPreferences(): Promise<any> {
  const keys = ['ui', 'tables', 'views', 'system'];
  const preferences: any = {};
  
  for (const key of keys) {
    const value = await storageManager.get(`cf:v1:pref:user:${key}`);
    if (value) {
      preferences[key] = value;
    }
  }
  
  return preferences;
}
