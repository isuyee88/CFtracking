/**
 * @fileoverview React Hook - 云端同步管理
 * @description 使用 SSE 实现跨设备的用户偏好云端同步
 * @module hooks/useCloudSync
 * 
 * 输入输出:
 * - 输入：userId, apiBaseUrl, onSync, onConflict, reconnectInterval
 * - 输出：同步状态、推送/拉取函数、SSE 连接管理
 * 
 * 前后端交互:
 * - HTTP POST: 推送更新到 Durable Object
 * - HTTP GET: 拉取最新数据
 * - SSE: 监听服务器推送的更新通知
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { storageManager } from '@/utils/storage/StorageManager';

/**
 * 同步状态
 */
interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: Error | null;
  isConnected: boolean;  // SSE 连接状态
}

/**
 * 云同步配置选项
 */
interface CloudSyncOptions {
  userId: string;
  apiBaseUrl?: string;
  onSync?: (data: any) => void;
  onConflict?: (local: any, server: any) => void;
  reconnectInterval?: number;  // 重连间隔（毫秒）
}

/**
 * 云端同步 Hook
 */
export function useCloudSync(options: CloudSyncOptions) {
  const {
    userId,
    apiBaseUrl = '/api/user-preferences',
    onSync,
    onConflict,
    reconnectInterval = 5000,  // 5 秒重连
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    error: null,
    isConnected: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const deviceIdRef = useRef<string>(getDeviceId());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * 获取 Durable Object Stub URL
   */
  const getDOUrl = useCallback(async (): Promise<string> => {
    const response = await fetch(`${apiBaseUrl}/stub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get DO stub');
    }
    
    const { url } = await response.json();
    return url;
  }, [userId, apiBaseUrl]);

  /**
   * 推送更新到云端（立即执行）
   */
  const pushToCloud = useCallback(async (preferences: any): Promise<boolean> => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      const doUrl = await getDOUrl();
      
      // 获取本地已知版本
      const lastVersion = await storageManager.get<number>(
        `cf:v1:sync:version:${userId}`
      );

      const response = await fetch(`${doUrl}/preferences`, {
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
          // 冲突处理
          await handleConflict(result.serverVersion, preferences);
        }
        throw new Error(result.error || 'Push failed');
      }

      // 更新本地版本记录
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
      console.error('[CloudSync] Push failed:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error : new Error('Push failed'),
      }));
      return false;
    }
  }, [userId, getDOUrl, onConflict]);

  /**
   * 拉取最新数据（收到 SSE 通知后调用）
   */
  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      const doUrl = await getDOUrl();

      // 拉取完整数据
      const response = await fetch(`${doUrl}/preferences`);
      const cloudData = await response.json();

      // 检查是否是自己的更新
      if (cloudData.lastModifiedBy === deviceIdRef.current) {
        // 是自己的更新，不需要拉取
        setSyncState(prev => ({ ...prev, isSyncing: false }));
        return false;
      }

      // 更新本地存储
      await storageManager.setBatch(cloudData.preferences);
      await storageManager.set(
        `cf:v1:sync:version:${userId}`,
        cloudData.lastUpdated
      );

      // 通知回调
      onSync?.(cloudData.preferences);

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));

      return true;

    } catch (error) {
      console.error('[CloudSync] Pull failed:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error : new Error('Pull failed'),
      }));
      return false;
    }
  }, [userId, getDOUrl, onSync]);

  /**
   * 初始化 SSE 连接
   */
  const connectSSE = useCallback(async () => {
    try {
      const doUrl = await getDOUrl();
      const eventUrl = `${doUrl}/events`;
      
      // 如果已有连接，先关闭
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 创建 SSE 连接
      const eventSource = new EventSource(eventUrl);
      eventSourceRef.current = eventSource;

      // 连接成功
      eventSource.addEventListener('connected', (event) => {
        console.log('[CloudSync] SSE connected:', event.data);
        setSyncState(prev => ({ ...prev, isConnected: true, error: null }));
      });

      // 收到更新通知
      eventSource.addEventListener('preference_updated', async (event) => {
        console.log('[CloudSync] Received update notification:', event.data);
        
        const data = JSON.parse(event.data);
        
        // 检查是否是自己的更新
        if (data.modifiedBy === deviceIdRef.current) {
          return; // 忽略自己的更新
        }

        // 拉取最新数据
        await pullFromCloud();
      });

      // 连接错误
      eventSource.onerror = (error) => {
        console.error('[CloudSync] SSE error:', error);
        setSyncState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: new Error('SSE connection failed') 
        }));

        // 自动重连
        eventSource.close();
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[CloudSync] Attempting to reconnect SSE...');
          connectSSE();
        }, reconnectInterval);
      };

    } catch (error) {
      console.error('[CloudSync] Failed to connect SSE:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: error instanceof Error ? error : new Error('SSE connection failed') 
      }));
    }
  }, [getDOUrl, pullFromCloud, reconnectInterval]);

  /**
   * 冲突处理
   */
  const handleConflict = useCallback(async (serverData: any, localData: any) => {
    if (onConflict) {
      // 交给用户处理
      onConflict(localData, serverData);
    } else {
      // 默认策略：服务器胜出
      await storageManager.setBatch(serverData.preferences);
      onSync?.(serverData.preferences);
    }
  }, [onConflict, onSync]);

  /**
   * 包装存储设置，自动同步到云端
   */
  const setWithSync = useCallback(async <T>(
    key: string,
    value: T,
    options?: any
  ): Promise<void> => {
    // 先保存到本地
    await storageManager.set(key, value, options);

    // 推送到云端（会触发 SSE 广播）
    const preferences = await extractPreferences(key, value);
    await pushToCloud(preferences);
  }, [pushToCloud]);

  /**
   * 初始化同步
   */
  useEffect(() => {
    if (!userId) return;

    // 首次加载：拉取云端数据
    pullFromCloud();

    // 建立 SSE 连接
    connectSSE();

    // 清理
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, pullFromCloud, connectSSE]);

  /**
   * 手动同步
   */
  const forceSync = useCallback(async () => {
    await pushToCloud(await getAllPreferences());
    await pullFromCloud();
  }, [pushToCloud, pullFromCloud]);

  return {
    ...syncState,
    pushToCloud,
    pullFromCloud,
    forceSync,
    setWithSync,
    reconnect: connectSSE,  // 手动重连
  };
}

// ==================== 辅助函数 ====================

/**
 * 获取设备 ID（用于标识设备）
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('cf_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cf_device_id', deviceId);
  }
  return deviceId;
}

/**
 * 从键名提取偏好类型
 */
async function extractPreferences(key: string, value: any): Promise<any> {
  // 从键名提取偏好类型
  if (key.includes(':pref:user:')) {
    const type = key.split(':').pop();
    return { [type]: value };
  }
  return value;
}

/**
 * 获取所有偏好设置
 */
async function getAllPreferences(): Promise<any> {
  // 获取所有偏好
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
