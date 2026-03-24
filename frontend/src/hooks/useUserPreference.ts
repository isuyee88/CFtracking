/**
 * File: useUserPreference.ts
 * Purpose: 用户偏好设置的 React Hook，提供类型安全的偏好管理
 * Input/Output: 泛型偏好数据，自动持久化到 localStorage
 * Logic: 基于 StorageManager 实现，支持变化监听、数据验证
 */

import { useState, useEffect, useCallback } from 'react';
import { storageManager, getUserPreference, setUserPreference } from '../utils/storage/StorageManager';

// ==================== 类型定义 ====================

export interface UserPreferences {
  // 界面偏好
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  density: 'compact' | 'standard' | 'loose';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  
  // 表格配置
  tableConfigs: Record<string, TableConfig>;
  
  // 页面视图
  viewConfigs: Record<string, ViewConfig>;
  
  // 系统设置
  language: string;
  timezone: string;
  dateFormat: string;
  refreshInterval: number;
}

export interface TableConfig {
  columns: {
    visible: string[];
    order: string[];
    widths: Record<string, number>;
  };
  sorting: {
    column: string;
    direction: 'asc' | 'desc';
  } | null;
  filters: Record<string, any>;
  pagination: {
    pageSize: number;
    currentPage: number;
  };
}

export interface ViewConfig {
  timeRange?: {
    interval: string;
    from?: string;
    to?: string;
  };
  metrics?: string[];
  entities?: string[];
  selectedItems?: string[];
  expandedRows?: string[];
}

// ==================== 默认配置 ====================

const DEFAULT_PREFERENCES: Partial<UserPreferences> = {
  theme: 'auto',
  sidebarCollapsed: false,
  density: 'standard',
  fontSize: 'medium',
  animations: true,
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  refreshInterval: 30000, // 30 秒
  tableConfigs: {},
  viewConfigs: {},
};

// ==================== Hook 实现 ====================

export function useUserPreference<K extends keyof UserPreferences>(
  key: K,
  defaultValue?: UserPreferences[K]
): {
  value: UserPreferences[K];
  setValue: (value: UserPreferences[K] | ((prev: UserPreferences[K]) => UserPreferences[K])) => void;
  reset: () => void;
  loading: boolean;
  error: Error | null;
} {
  const [value, setValue] = useState<UserPreferences[K]>(
    defaultValue ?? DEFAULT_PREFERENCES[key] as UserPreferences[K]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载偏好
  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      try {
        setLoading(true);
        const stored = await getUserPreference<UserPreferences[K]>(key);
        if (mounted) {
          setValue(stored ?? defaultValue ?? DEFAULT_PREFERENCES[key] as UserPreferences[K]);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load preference'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPreference();

    return () => {
      mounted = true;
    };
  }, [key]); // 移除 defaultValue 依赖，避免无限循环

  // 保存偏好
  const setPreference = useCallback(
    async (newValue: UserPreferences[K] | ((prev: UserPreferences[K]) => UserPreferences[K])) => {
      try {
        const updatedValue = newValue instanceof Function ? newValue(value) : newValue;
        await setUserPreference(key, updatedValue);
        setValue(updatedValue);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save preference'));
        throw err;
      }
    },
    [key, value]
  );

  // 重置为默认值
  const reset = useCallback(async () => {
    try {
      const defaultValue = DEFAULT_PREFERENCES[key] as UserPreferences[K];
      await setUserPreference(key, defaultValue);
      setValue(defaultValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset preference'));
    }
  }, [key]);

  return {
    value,
    setValue: setPreference,
    reset,
    loading,
    error,
  };
}

// ==================== 专用 Hook ====================

// 主题偏好
export function useThemePreference() {
  const { value: theme, setValue: setTheme } = useUserPreference('theme', 'auto');
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}

// 表格配置
export function useTableConfig(tableId: string) {
  const { value: tableConfigs, setValue: setTableConfigs } = useUserPreference('tableConfigs', {});
  
  const config = tableConfigs[tableId] || {
    columns: {
      visible: [],
      order: [],
      widths: {},
    },
    sorting: null,
    filters: {},
    pagination: {
      pageSize: 25,
      currentPage: 1,
    },
  };

  const updateConfig = useCallback(
    async (updater: (prev: typeof config) => typeof config) => {
      const updatedConfig = updater(config);
      await setTableConfigs(prev => ({
        ...prev,
        [tableId]: updatedConfig,
      }));
    },
    [config, tableId, setTableConfigs]
  );

  return {
    config,
    updateConfig,
    resetConfig: async () => {
      await setTableConfigs(prev => {
        const { [tableId]: removed, ...rest } = prev;
        return rest;
      });
    },
  };
}

// 页面视图配置
export function useViewConfig(pageId: string) {
  const { value: viewConfigs, setValue: setViewConfigs } = useUserPreference('viewConfigs', {});
  
  const config = viewConfigs[pageId] || {};

  const updateConfig = useCallback(
    async (updater: (prev: typeof config) => typeof config) => {
      const updatedConfig = updater(config);
      await setViewConfigs(prev => ({
        ...prev,
        [pageId]: updatedConfig,
      }));
    },
    [config, pageId, setViewConfigs]
  );

  return {
    config,
    updateConfig,
    resetConfig: async () => {
      await setViewConfigs(prev => {
        const { [pageId]: removed, ...rest } = prev;
        return rest;
      });
    },
  };
}

// ==================== 批量操作 Hook ====================

export function useBulkPreferences() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveAll = useCallback(async (preferences: Partial<UserPreferences>) => {
    try {
      setLoading(true);
      const promises = Object.entries(preferences).map(([key, value]) =>
        setUserPreference(key, value)
      );
      await Promise.all(promises);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save preferences'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async (): Promise<Partial<UserPreferences>> => {
    try {
      setLoading(true);
      const keys = Object.keys(DEFAULT_PREFERENCES) as Array<keyof UserPreferences>;
      const promises = keys.map(key => getUserPreference(key));
      const results = await Promise.all(promises);
      
      const preferences: Partial<UserPreferences> = {};
      keys.forEach((key, index) => {
        if (results[index] !== null) {
          preferences[key] = results[index] as any;
        }
      });
      
      setError(null);
      return preferences;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load preferences'));
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAll = useCallback(async () => {
    try {
      setLoading(true);
      const keys = Object.keys(DEFAULT_PREFERENCES) as Array<keyof UserPreferences>;
      const promises = keys.map(key => setUserPreference(key, DEFAULT_PREFERENCES[key] as any));
      await Promise.all(promises);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset preferences'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    saveAll,
    loadAll,
    resetAll,
    loading,
    error,
  };
}

export default useUserPreference;
