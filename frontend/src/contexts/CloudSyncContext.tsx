/**
 * @fileoverview 云同步 Context
 * @description 提供全局的云同步状态管理
 * @module contexts/CloudSyncContext
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';

interface CloudSyncContextValue {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: Error | null;
  retryCount: number;
  setWithSync: <T>(key: string, value: T, options?: any) => Promise<void>;
  forceSync: () => Promise<void>;
  reconnect: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

interface CloudSyncProviderProps {
  children: ReactNode;
  userId?: string;
}

export function CloudSyncProvider({ children, userId }: CloudSyncProviderProps) {
  const isLocalPreview =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalPreview) {
    const noopContextValue: CloudSyncContextValue = {
      isConnected: false,
      isSyncing: false,
      lastSyncTime: null,
      error: null,
      retryCount: 0,
      setWithSync: async () => undefined,
      forceSync: async () => undefined,
      reconnect: () => undefined,
    };

    return <CloudSyncContext.Provider value={noopContextValue}>{children}</CloudSyncContext.Provider>;
  }

  const cloudSync = useCloudSync({
    userId: userId || 'default-user',
    maxRetries: 5,
    initialRetryDelay: 2000,
    maxRetryDelay: 60000,
    onSync: (data) => {
      console.log('[CloudSyncContext] Data synced:', data);
    },
    onConflict: (local, server) => {
      console.warn('[CloudSyncContext] Conflict detected:', { local, server });
    },
  });

  return (
    <CloudSyncContext.Provider value={cloudSync}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSyncContext() {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error('useCloudSyncContext must be used within CloudSyncProvider');
  }
  return context;
}
