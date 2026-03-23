/**
 * File: tableUtils.ts
 * Purpose: 表格工具函数 - 筛选、排序、多列同时筛选（AND 逻辑）
 * Input: data - 原始数据，columns - 列配置，filters - 筛选状态，sorter - 排序状态
 * Output: 处理后的数据
 * Logic: 先应用筛选（AND 逻辑），再应用排序
 */

import type { VirtualTableColumn } from './VirtualTable';
import type { TableFilterState, TableSorterState } from '../hooks/useTablePersistence';

/**
 * 应用多列筛选（AND 逻辑）
 * - 遍历所有筛选列
 * - 每列内部多个值为 OR 逻辑
 * - 列与列之间为 AND 逻辑
 */
export function applyFilters<T>(
  data: T[],
  columns: VirtualTableColumn<T>[],
  filters: TableFilterState
): T[] {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter((record) => {
    // 遍历所有筛选列，AND 逻辑
    return Object.entries(filters).every(([columnKey, filterValues]) => {
      // 没有筛选值或空数组，不过滤
      if (!filterValues || filterValues.length === 0) {
        return true;
      }

      const column = columns.find((col) => col.key === columnKey);
      if (!column) {
        return true;
      }

      // 使用列的 onFilter 函数，多值筛选（OR 逻辑）
      return filterValues.some((value) => {
        if (column.onFilter) {
          return column.onFilter(value, record);
        }
        // 默认筛选：精确匹配
        const recordValue = (record as any)[column.dataIndex || column.key];
        if (typeof recordValue === 'string') {
          return recordValue.toLowerCase().includes(String(value).toLowerCase());
        }
        return recordValue === value;
      });
    });
  });
}

/**
 * 应用排序
 */
export function applySorter<T>(
  data: T[],
  columns: VirtualTableColumn<T>[],
  sorter: TableSorterState | null
): T[] {
  if (!sorter || !sorter.columnKey || !sorter.order) {
    return data;
  }

  const column = columns.find((col) => col.key === sorter.columnKey);
  if (!column) {
    return data;
  }

  // 获取排序函数
  let sortFn: ((a: T, b: T) => number) | undefined;
  
  if (typeof column.sorter === 'function') {
    sortFn = column.sorter;
  } else if (column.sorter === true && column.dataIndex) {
    // 默认比较函数
    sortFn = (a: T, b: T) => {
      const aValue = (a as any)[column.dataIndex!];
      const bValue = (b as any)[column.dataIndex!];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue, 'zh-CN');
      }
      
      return String(aValue).localeCompare(String(bValue));
    };
  }

  if (!sortFn) {
    return data;
  }

  // 创建副本并排序
  const sortedData = [...data];
  sortedData.sort((a, b) => {
    const result = sortFn!(a, b);
    return sorter.order === 'ascend' ? result : -result;
  });

  return sortedData;
}

/**
 * 处理表格变化（筛选 + 排序）
 * 返回处理后的数据
 */
export function processTableData<T>(
  data: T[],
  columns: VirtualTableColumn<T>[],
  filters: TableFilterState,
  sorter: TableSorterState | null
): T[] {
  // 先应用筛选
  const filteredData = applyFilters(data, columns, filters);
  
  // 再应用排序
  const sortedData = applySorter(filteredData, columns, sorter);
  
  return sortedData;
}

/**
 * 清除指定列的筛选
 */
export function clearColumnFilter(
  filters: TableFilterState,
  columnKey: string
): TableFilterState {
  const newFilters = { ...filters };
  delete newFilters[columnKey];
  return newFilters;
}

/**
 * 清除所有筛选
 */
export function clearAllFilters(): TableFilterState {
  return {};
}

/**
 * 切换排序状态
 */
export function toggleSortOrder(
  currentOrder: 'ascend' | 'descend' | null,
  sortDirections: ('ascend' | 'descend')[] = ['ascend', 'descend']
): 'ascend' | 'descend' | null {
  const currentIndex = currentOrder ? sortDirections.indexOf(currentOrder) : -1;
  let nextIndex = currentIndex + 1;
  
  if (nextIndex >= sortDirections.length || currentIndex === -1) {
    nextIndex = 0;
  }
  
  return sortDirections[nextIndex];
}

export default {
  applyFilters,
  applySorter,
  processTableData,
  clearColumnFilter,
  clearAllFilters,
  toggleSortOrder,
};
