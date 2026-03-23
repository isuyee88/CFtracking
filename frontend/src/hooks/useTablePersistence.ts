/**
 * File: useTablePersistence.ts
 * Purpose: 表格状态持久化 Hook，使用 localStorage 保存和恢复筛选、排序状态
 * Input: tableId - 表格唯一标识
 * Output: filters, sorter 状态及更新函数
 * Logic: 自动从 localStorage 加载状态，并在状态变化时自动保存
 */

import { useState, useEffect, useCallback } from 'react';

export interface TableFilterState {
  [key: string]: any[] | null;
}

export interface TableSorterState {
  columnKey: string;
  order: 'ascend' | 'descend' | null;
}

export function useTablePersistence(tableId: string) {
  // 筛选状态
  const [filters, setFilters] = useState<TableFilterState>(() => {
    try {
      const saved = localStorage.getItem(`table-${tableId}-filters`);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
      return {};
    }
  });

  // 排序状态
  const [sorter, setSorter] = useState<TableSorterState | null>(() => {
    try {
      const saved = localStorage.getItem(`table-${tableId}-sorter`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load sorter from localStorage:', error);
      return null;
    }
  });

  // 保存筛选状态到 localStorage
  const updateFilters = useCallback((newFilters: TableFilterState) => {
    setFilters(newFilters);
    try {
      localStorage.setItem(`table-${tableId}-filters`, JSON.stringify(newFilters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [tableId]);

  // 保存排序状态到 localStorage
  const updateSorter = useCallback((newSorter: TableSorterState | null) => {
    setSorter(newSorter);
    try {
      localStorage.setItem(`table-${tableId}-sorter`, JSON.stringify(newSorter || {}));
    } catch (error) {
      console.error('Failed to save sorter to localStorage:', error);
    }
  }, [tableId]);

  // 清除所有状态
  const clearAll = useCallback(() => {
    updateFilters({});
    updateSorter(null);
    localStorage.removeItem(`table-${tableId}-filters`);
    localStorage.removeItem(`table-${tableId}-sorter`);
  }, [tableId, updateFilters, updateSorter]);

  return {
    filters,
    setFilters: updateFilters,
    sorter,
    setSorter: updateSorter,
    clearAll,
  };
}

export default useTablePersistence;
