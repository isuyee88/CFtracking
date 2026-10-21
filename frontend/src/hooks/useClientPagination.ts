/**
 * @file 客户端分页状态 Hook。
 * @description 为表格页统一提供页码、每页条数、切片结果与筛选重置行为。
 * @owner frontend
 * @invariant resetKey 变化时回到第 1 页；页码始终收敛在 [1, totalPages]，不会出现空白页。
 * @see src/utils/pagination.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clampPage, getTotalPages, slicePage } from '../utils/pagination';

export interface UseClientPaginationOptions {
  /** 每页条数，默认 10。 */
  pageSize?: number;
  /**
   * 筛选条件指纹（搜索词、状态、日期、group-by 等拼接）。
   * 变化时自动回到第 1 页，避免筛选后停留在越界页导致表格空白。
   */
  resetKey?: string | number;
}

export interface UseClientPaginationResult<T> {
  /** 当前页数据切片。 */
  rows: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  /** 跳转页码，内部自动收敛。 */
  setPage: (page: number) => void;
  /** 回到第 1 页，供显式重置场景使用。 */
  resetPage: () => void;
}

export function useClientPagination<T>(
  allRows: readonly T[],
  { pageSize = 10, resetKey = '' }: UseClientPaginationOptions = {},
): UseClientPaginationResult<T> {
  const size = Math.max(1, Math.floor(Number(pageSize)) || 1);
  const [requestedPage, setRequestedPage] = useState(1);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // 渲染期同步：筛选条件一变就回到第 1 页，避免先渲染一帧越界页。
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setRequestedPage(1);
  }

  const totalItems = Array.isArray(allRows) ? allRows.length : 0;
  const totalPages = getTotalPages(totalItems, size);
  const page = clampPage(requestedPage, totalPages);

  // 数据变少导致页码越界时收敛写回，保证下一次翻页基于同一基准。
  useEffect(() => {
    if (requestedPage !== page) {
      setRequestedPage(page);
    }
  }, [requestedPage, page]);

  const rows = useMemo(() => slicePage(allRows, size, page), [allRows, size, page]);

  const setPage = useCallback(
    (next: number) => {
      setRequestedPage((current) => clampPage(Number(next) || current, totalPages));
    },
    [totalPages],
  );

  const resetPage = useCallback(() => setRequestedPage(1), []);

  return { rows, page, pageSize: size, totalItems, totalPages, setPage, resetPage };
}

export default useClientPagination;
