/**
 * @fileoverview 数据缓存 Context
 * @description 管理 SSR 预加载数据和客户端请求的数据缓存
 * @module context/DataCacheContext
 *
 * 功能:
 *   - 存储 SSR 预加载的数据
 *   - 提供数据订阅机制
 *   - 支持增量更新
 *   - 数据有效性验证
 *
 * 输入: SSR 预加载数据、API 请求数据
 * 输出: 缓存数据、更新方法、订阅机制
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface DataMetadata {
  timestamp: number;
  version: string;
  hash: string;
  source: 'SSR' | 'API' | 'CACHE';
  ttl: number;
  lastAccessed: number;
}

export interface PageData {
  [key: string]: any;
}

export interface DataCacheState {
  dashboard: PageData | null;
  campaigns: any[] | null;
  landings: any[] | null;
  offers: any[] | null;
  trafficSources: any[] | null;
  affiliateNetworks: any[] | null;
  rules: any[] | null;
  platforms: any[] | null;
  clicks: { list: any[]; meta: { total: number; page: number; pageSize: number; totalPages: number } } | null;
  clicksStats: PageData | null;
  conversions: any[] | null;
  conversionsStats: PageData | null;
  blacklist: any[] | null;
  whitelist: any[] | null;
  trends: PageData | null;
  reports: PageData | null;
  settings: PageData | null;
  help: PageData | null;
  targets: any[] | null;
  metadata: {
    lastUpdated: number;
    version: string;
    dataSource: string;
  } | null;
}

export interface DataCacheContextValue {
  cache: DataCacheState;
  isHydrated: boolean;
  get: <T>(key: keyof DataCacheState) => T | null;
  set: (key: keyof DataCacheState, data: any, metadata?: Partial<DataMetadata>) => void;
  subscribe: (key: keyof DataCacheState, callback: (data: any) => void) => () => void;
  invalidate: (key: keyof DataCacheState) => void;
  invalidateAll: () => void;
  isDataValid: (key: keyof DataCacheState, maxAge?: number) => boolean;
}

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

const INITIAL_CACHE: DataCacheState = {
  dashboard: null,
  campaigns: null,
  landings: null,
  offers: null,
  trafficSources: null,
  affiliateNetworks: null,
  rules: null,
  platforms: null,
  clicks: null,
  clicksStats: null,
  conversions: null,
  conversionsStats: null,
  blacklist: null,
  whitelist: null,
  trends: null,
  reports: null,
  settings: null,
  help: null,
  targets: null,
  metadata: null,
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 已知返回数组类型的 cache key
 * SSR 注入的数据可能是 { list: [], meta: {} } 格式，需要标准化为数组
 */
const ARRAY_CACHE_KEYS: Set<string> = new Set([
  'campaigns', 'landings', 'offers', 'trafficSources', 'affiliateNetworks',
  'rules', 'platforms', 'conversions', 'blacklist', 'whitelist', 'targets',
]);

/**
 * 标准化 SSR 数据格式
 * SSR 注入的数据格式可能是 { list: [], meta: {} }，但前端期望的是数组
 */
function normalizeSSRData(key: string, data: any): any {
  if (!data) return data;
  if (!ARRAY_CACHE_KEYS.has(key)) return data;
  if (Array.isArray(data)) return data;
  // 如果是 { list: [], meta: {} } 格式，提取 list
  if (data && typeof data === 'object' && Array.isArray(data.list)) {
    return data.list;
  }
  return data;
}

interface DataCacheProviderProps {
  children: React.ReactNode;
  initialData?: Partial<DataCacheState>;
}

export function DataCacheProvider({ children, initialData }: DataCacheProviderProps) {
  const [cache, setCache] = useState<DataCacheState>(() => ({
    ...INITIAL_CACHE,
    ...initialData,
  }));
  const [isHydrated, setIsHydrated] = useState(false);
  
  const subscribersRef = useRef<Map<keyof DataCacheState, Set<(data: any) => void>>>(new Map());
  const metadataRef = useRef<Map<keyof DataCacheState, DataMetadata>>(new Map());

  const get = useCallback(<T,>(key: keyof DataCacheState): T | null => {
    return cache[key] as T | null;
  }, [cache]);

  const set = useCallback((key: keyof DataCacheState, data: any, metadata?: Partial<DataMetadata>) => {
    setCache(prev => ({
      ...prev,
      [key]: data,
    }));
    
    const meta: DataMetadata = {
      timestamp: metadata?.timestamp || Date.now(),
      version: metadata?.version || '1.0.0',
      hash: metadata?.hash || '',
      source: metadata?.source || 'API',
      ttl: metadata?.ttl || DEFAULT_TTL,
      lastAccessed: Date.now(),
    };
    
    metadataRef.current.set(key, meta);
    
    const subscribers = subscribersRef.current.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }, []);

  const subscribe = useCallback((key: keyof DataCacheState, callback: (data: any) => void): (() => void) => {
    if (!subscribersRef.current.has(key)) {
      subscribersRef.current.set(key, new Set());
    }
    subscribersRef.current.get(key)!.add(callback);
    
    return () => {
      subscribersRef.current.get(key)?.delete(callback);
    };
  }, []);

  const invalidate = useCallback((key: keyof DataCacheState) => {
    setCache(prev => ({
      ...prev,
      [key]: null,
    }));
    metadataRef.current.delete(key);
  }, []);

  const invalidateAll = useCallback(() => {
    setCache(INITIAL_CACHE);
    metadataRef.current.clear();
  }, []);

  const isDataValid = useCallback((key: keyof DataCacheState, maxAge?: number): boolean => {
    const meta = metadataRef.current.get(key);
    if (!meta) return false;
    
    const age = Date.now() - meta.timestamp;
    const ttl = maxAge || meta.ttl;
    
    return age < ttl;
  }, []);

  useEffect(() => {
    const ssrData = (window as any).__SSR_DATA__;
    if (ssrData) {
      // Normalize SSR data format (e.g., { list, meta } → array for ARRAY_CACHE_KEYS)
      const normalizedData: Partial<DataCacheState> = {};
      Object.keys(ssrData).forEach(key => {
        if (key !== 'metadata') {
          normalizedData[key as keyof DataCacheState] = normalizeSSRData(key, ssrData[key]);
        }
      });

      setCache(prev => ({
        ...prev,
        ...normalizedData,
      }));
      
      Object.keys(ssrData).forEach(key => {
        if (key !== 'metadata') {
          metadataRef.current.set(key as keyof DataCacheState, {
            timestamp: ssrData.metadata?.lastUpdated || Date.now(),
            version: ssrData.metadata?.version || '1.0.0',
            hash: '',
            source: 'SSR',
            ttl: DEFAULT_TTL,
            lastAccessed: Date.now(),
          });
        }
      });
      
      console.log('[DataCache] SSR data hydrated:', Object.keys(ssrData));
    }
    setIsHydrated(true);
  }, []);

  const value: DataCacheContextValue = {
    cache,
    isHydrated,
    get,
    set,
    subscribe,
    invalidate,
    invalidateAll,
    isDataValid,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache(): DataCacheContextValue {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

/**
 * 已知返回数组类型的 cache key
 * SSR 注入或缓存中的数据可能不是数组（如 { list: [], meta: {} }），
 * 而页面组件直接对返回值调用 .filter() / .map()，会导致 "x.filter is not a function"
 */
const ARRAY_TYPE_KEYS: Set<string> = new Set([
  'campaigns', 'landings', 'offers', 'trafficSources', 'affiliateNetworks',
  'rules', 'platforms', 'blacklist', 'whitelist', 'targets',
]);

/**
 * 确保数据是数组类型
 * 对于已知数组类型的 key，如果数据不是数组但包含 .list 属性，则提取 list
 */
function ensureArray(key: string, data: any): any {
  if (!data) return data;
  if (!ARRAY_TYPE_KEYS.has(key)) return data;
  if (Array.isArray(data)) return data;
  // 如果是 { list: [], meta: {} } 格式，提取 list
  if (data && typeof data === 'object' && Array.isArray(data.list)) {
    return data.list;
  }
  // 其他情况（比如 object），返回空数组防止崩溃
  console.warn(`[usePageData] Expected array for "${key}" but got ${typeof data}, returning []`);
  return [];
}

export function usePageData<T>(
  key: keyof DataCacheState,
  fetcher?: () => Promise<T>,
  options?: {
    /**
     * 参数化查询指纹（页码/每页条数/筛选/排序等拼接）。
     * 变化时重新执行 fetcher；不传则保持"仅挂载时取数一次"的旧行为。
     */
    refreshKey?: string | number;
  }
): {
  data: T | null;
  isLoading: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  isFromCache: boolean;
  refetch: () => Promise<void>;
} {
  const { get, set, subscribe, isHydrated, cache, isDataValid } = useDataCache();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const cachedData = get<T>(key);
    if (cachedData) {
      console.log(`[usePageData] Cache updated for ${key}:`, cachedData);
      setData(ensureArray(key, cachedData));
      setIsFromCache(true);
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, [key, get, cache]);

  useEffect(() => {
    const unsubscribe = subscribe(key, (newData: any) => {
      console.log(`[usePageData] Subscribe update for ${key}:`, newData);
      setData(ensureArray(key, newData));
      setIsFromCache(true);
      setIsLoading(false);
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setError(null);
    });
    return unsubscribe;
  }, [key, subscribe]);

  const refetch = useCallback(async () => {
    const currentFetcher = fetcherRef.current;
    if (!currentFetcher) {
      console.warn(`[usePageData] No fetcher provided for ${key}`);
      setIsInitialLoading(false);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    console.log(`[usePageData] Refetching ${key}...`);
    
    const hasExistingData = !!data;
    if (hasExistingData) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    setIsLoading(true);
    setError(null);

    try {
      const result = await currentFetcher();
      console.log(`[usePageData] Fetch result for ${key}:`, result);
      const normalizedResult = ensureArray(key, result);
      setData(normalizedResult);
      set(key, normalizedResult);
      setIsFromCache(false);
      setError(null);
    } catch (err) {
      console.error(`[usePageData] Fetch error for ${key}:`, err);
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [key, set, data]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    if (isHydrated) {
      hasInitializedRef.current = true;
      
      const cachedData = get<T>(key);
      const isValid = isDataValid(key);
      
      console.log(`[usePageData] Hydrated check for ${key}, cached:`, !!cachedData, 'valid:', isValid);
      
      if (cachedData && isValid) {
        console.log(`[usePageData] Using valid cache for ${key}`);
        setData(ensureArray(key, cachedData));
        setIsFromCache(true);
        setIsInitialLoading(false);
        setIsLoading(false);
      } else if (fetcherRef.current) {
        console.log(`[usePageData] No valid cache for ${key}, fetching...`);
        refetch();
      } else {
        setIsInitialLoading(false);
        setIsLoading(false);
      }
    }
  }, [isHydrated, key, get, isDataValid, refetch]);

  // 参数化查询（分页/筛选/排序）必须显式给出 refreshKey：
  // 仅靠 fetcher 身份变化不会触发取数，否则翻页后表格会一直停留在第 1 页数据。
  const refreshKey = options?.refreshKey;
  const lastRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (lastRefreshKeyRef.current === refreshKey) return;
    lastRefreshKeyRef.current = refreshKey;
    void refetch();
  }, [refreshKey, refetch]);

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefreshing,
    error,
    isFromCache,
    refetch,
  };
}

export default DataCacheContext;
