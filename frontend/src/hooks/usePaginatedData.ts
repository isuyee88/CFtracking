/**
 * @fileoverview 分页数据管理 Hook
 * @description 提供优化的分页数据处理，支持预加载和缓存
 * @module hooks/usePaginatedData
 *
 * 功能:
 *   - 分页数据获取
 *   - 智能预加载
 *   - 缓存管理
 *   - 加载状态管理
 *
 * 输入: 分页参数、数据获取函数
 * 输出: 分页数据、加载状态、操作方法
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import multiLevelCache from '@/utils/multi-level-cache';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface PaginatedDataResult<T> {
  data: T[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: Error | null;
  isFromCache: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  total: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  refresh: () => Promise<void>;
  prefetchPage: (page: number) => Promise<void>;
}

interface PaginatedDataOptions {
  initialPage?: number;
  initialPageSize?: number;
  cacheKey: string;
  ttl?: number;
  preloadThreshold?: number; // 预加载阈值（当前页 ±N 页）
}

export function usePaginatedData<T>(
  fetcher: (params: PaginationParams) => Promise<{ list: T[]; meta: PaginationMeta }>,
  options: PaginatedDataOptions
): PaginatedDataResult<T> {
  const {
    initialPage = 1,
    initialPageSize = 20,
    cacheKey,
    ttl = 30 * 1000, // 30秒
    preloadThreshold = 1,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    totalPages: 0,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const currentPageRef = useRef(initialPage);
  const pageSizeRef = useRef(initialPageSize);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取分页数据
  const fetchData = useCallback(async (page: number, pageSize: number, useCache: boolean = true) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const cacheKeyForPage = `${cacheKey}-${page}-${pageSize}`;

    // 尝试从缓存获取
    if (useCache) {
      const cached = multiLevelCache.get<{ list: T[]; meta: PaginationMeta }>(cacheKeyForPage, { ttl });
      if (cached) {
        console.log(`[usePaginatedData] Using cached data for page ${page}`);
        setData(cached.list);
        setMeta(cached.meta);
        setIsFromCache(true);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      const result = await fetcher({ page, pageSize });

      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result.list);
      setMeta(result.meta);

      // 存入缓存
      multiLevelCache.set(cacheKeyForPage, result, { ttl, level: ['memory', 'session'] });

      currentPageRef.current = page;
      pageSizeRef.current = pageSize;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, cacheKey, ttl]);

  // 预加载页面
  const prefetchPage = useCallback(async (page: number) => {
    const cacheKeyForPage = `${cacheKey}-${page}-${pageSizeRef.current}`;

    // 如果已有缓存，跳过
    if (multiLevelCache.has(cacheKeyForPage, { ttl })) {
      return;
    }

    console.log(`[usePaginatedData] Prefetching page ${page}`);

    try {
      const result = await fetcher({ page, pageSize: pageSizeRef.current });
      multiLevelCache.set(cacheKeyForPage, result, { ttl, level: ['memory'] });
    } catch (err) {
      console.warn(`[usePaginatedData] Prefetch failed for page ${page}:`, err);
    }
  }, [fetcher, cacheKey, ttl]);

  // 智能预加载
  useEffect(() => {
    if (preloadThreshold > 0) {
      // 预加载下一页
      if (meta.page < meta.totalPages) {
        prefetchPage(meta.page + 1);
      }
      // 预加载上一页
      if (meta.page > 1) {
        prefetchPage(meta.page - 1);
      }
    }
  }, [meta.page, meta.totalPages, prefetchPage, preloadThreshold]);

  // 初始加载
  useEffect(() => {
    fetchData(initialPage, initialPageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 页面跳转
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= meta.totalPages && page !== currentPageRef.current) {
      fetchData(page, pageSizeRef.current);
    }
  }, [meta.totalPages, fetchData]);

  // 下一页
  const nextPage = useCallback(() => {
    if (meta.page < meta.totalPages) {
      goToPage(meta.page + 1);
    }
  }, [meta.page, meta.totalPages, goToPage]);

  // 上一页
  const prevPage = useCallback(() => {
    if (meta.page > 1) {
      goToPage(meta.page - 1);
    }
  }, [meta.page, goToPage]);

  // 设置每页大小
  const setPageSize = useCallback((size: number) => {
    pageSizeRef.current = size;
    fetchData(1, size, false); // 改变页面大小时，重新从第一页开始
  }, [fetchData]);

  // 刷新当前页
  const refresh = useCallback(async () => {
    await fetchData(currentPageRef.current, pageSizeRef.current, false);
  }, [fetchData]);

  return {
    data,
    meta,
    isLoading,
    error,
    isFromCache,
    currentPage: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    total: meta.total,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    refresh,
    prefetchPage,
  };
}

export default usePaginatedData;
