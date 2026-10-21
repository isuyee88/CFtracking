/**
 * @fileoverview SSR 数据获取 Hook
 * @description 用于在组件中获取 SSR 预加载的数据，支持 SSE 实时更新
 * @module hooks/useSSRData
 *
 * 功能:
 *   - 获取 SSR 预加载数据
 *   - 支持 SSE 实时更新
 *   - 自动回退到 HTTP 请求
 *   - 支持数据订阅
 *
 * 输入: 数据键名、可选的 fetcher 函数
 * 输出: 数据、加载状态、错误、刷新方法
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataCache } from '@/context/DataCacheContext';

export interface UseSSRDataOptions<T> {
  key: string;
  fetcher?: () => Promise<T>;
  initialData?: T;
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseSSRDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export function useSSRData<T = any>(
  key: string,
  fetcher?: () => Promise<T>,
  options: Omit<UseSSRDataOptions<T>, 'key' | 'fetcher'> = {}
): UseSSRDataResult<T> {
  const {
    initialData,
    enabled = true,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    onSuccess,
    onError,
  } = options;

  const { get, set, subscribe, isHydrated, isSSEConnected } = useDataCache();
  
  const [data, setData] = useState<T | undefined>(() => {
    const cached = get<T>(key as any);
    return cached ?? initialData;
  });
  
  const [isLoading, setIsLoading] = useState(!data && enabled);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(!!data);
  const [isStale, setIsStale] = useState(false);
  
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    if (!fetcher || !enabled) return;
    if (isFetchingRef.current && !force) return;

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    if (!force && timeSinceLastFetch < 1000) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      set(key as any, result);
      setIsFromCache(false);
      setIsStale(false);
      lastFetchTimeRef.current = now;
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setIsError(true);
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [key, fetcher, enabled, set, onSuccess, onError]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    set(key as any, newData);
    setIsFromCache(false);
    setIsStale(false);
  }, [key, set]);

  useEffect(() => {
    if (!enabled) return;

    const cachedData = get<T>(key as any);
    if (cachedData) {
      setData(cachedData);
      setIsFromCache(true);
      setIsLoading(false);
    }
  }, [key, enabled, get]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe(key as any, (newData: T) => {
      setData(newData);
      setIsFromCache(true);
      setIsStale(false);
      setIsLoading(false);
      setIsError(false);
      setError(null);
    });

    return unsubscribe;
  }, [key, enabled, subscribe]);

  useEffect(() => {
    if (!enabled || !isHydrated) return;

    const cachedData = get<T>(key as any);
    
    if (!cachedData && fetcher) {
      if (!isSSEConnected || refetchOnMount) {
        fetchData();
      }
    }
  }, [key, enabled, isHydrated, isSSEConnected, refetchOnMount, get, fetcher, fetchData]);

  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 30000) {
        setIsStale(true);
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, fetchData]);

  useEffect(() => {
    if (!isSSEConnected && data && fetcher && enabled) {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 60000) {
        setIsStale(true);
      }
    }
  }, [isSSEConnected, data, fetcher, enabled]);

  return {
    data,
    isLoading,
    isError,
    error,
    isFromCache,
    isStale,
    refetch,
    mutate,
  };
}

export function useSSRDataMultiple<T extends Record<string, any>>(
  keys: string[],
  fetchers?: Partial<Record<keyof T, () => Promise<T[keyof T]>>>
): Record<keyof T, UseSSRDataResult<T[keyof T]>> {
  const results = {} as Record<keyof T, UseSSRDataResult<T[keyof T]>>;

  keys.forEach((key) => {
    results[key as keyof T] = useSSRData<T[keyof T]>(
      key,
      fetchers?.[key as keyof T]
    );
  });

  return results;
}

export function useSSRDataStatus() {
  const { isHydrated, isSSEConnected, cache } = useDataCache();
  
  return {
    isHydrated,
    isSSEConnected,
    hasData: Object.values(cache).some(v => v !== null),
    cacheKeys: Object.keys(cache).filter(k => cache[k as keyof typeof cache] !== null),
  };
}

export default useSSRData;
