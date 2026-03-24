/**
 * File: VirtualTableEnhanced.tsx
 * Purpose: 增强版虚拟滚动表格，支持固定表头、行选择、筛选、排序等功能
 * Input: columns - 列配置（支持 filters/sorters），data - 数据，rowHeight - 行高，height - 容器高度
 * Output: 渲染带筛选和排序功能的虚拟滚动表格
 * Logic: 使用虚拟滚动 + 固定表头，集成 Ant Design 风格筛选和排序
 */

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VirtualTableColumn } from './VirtualTable';
import { TableSortIcon } from './TableSortIcon';
import { TableFilterIcon } from './TableFilterIcon';
import { TableFilterDropdown } from './TableFilterDropdown';
import { processTableData } from '../utils/tableUtils';
import { useTablePersistence, type TableFilterState, type TableSorterState } from '../hooks/useTablePersistence';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface VirtualTableEnhancedProps<T = any> {
  columns: VirtualTableColumn<T>[];
  data: T[];
  rowHeight?: number;
  height?: number | string;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedRows: Set<string>) => void;
  getRowId?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  headerClassName?: string;
  rowClassName?: (row: T, index: number) => string;
  
  // === 新增：筛选和排序配置 ===
  tableId?: string; // 表格唯一标识，用于 localStorage 持久化
  onChange?: (pagination: any, filters: TableFilterState, sorter: TableSorterState | null) => void;
}

export function VirtualTableEnhanced<T = any>({
  columns,
  data,
  rowHeight = 48,
  height = 400,
  overscan = 5,
  className,
  onScroll,
  emptyMessage = 'No data found',
  loading = false,
  selectable = false,
  selectedRows,
  onSelectionChange,
  getRowId,
  onRowClick,
  headerClassName,
  rowClassName,
  tableId = 'default-table',
  onChange,
}: VirtualTableEnhancedProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === 'number' ? height : 400
  );
  
  // === 新增：筛选和排序状态（带持久化）===
  const { filters, setFilters, sorter, setSorter } = useTablePersistence(tableId);
  
  // 筛选下拉框可见状态
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);

  // 更新容器高度
  React.useEffect(() => {
    if (typeof height === 'number') {
      setContainerHeight(height);
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerHeight(rect.height || 400);
    }
  }, [height]);

  // 处理滚动
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
      // 滚动时关闭筛选下拉框
      if (openFilterDropdown) {
        setOpenFilterDropdown(null);
      }
    },
    [onScroll, openFilterDropdown]
  );
  
  // === 新增：处理筛选和排序后的数据 ===
  const processedData = useMemo(() => {
    return processTableData(data, columns, filters, sorter);
  }, [data, columns, filters, sorter]);

  // 计算可见行范围
  const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
    const total = processedData.length;
    const totalH = total * rowHeight;
    
    const start = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    
    const bufferedStart = Math.max(0, start - overscan);
    const bufferedEnd = Math.min(total, start + visibleCount + overscan);
    
    return {
      visibleStart: bufferedStart,
      visibleEnd: bufferedEnd,
      totalHeight: totalH,
    };
  }, [processedData.length, rowHeight, scrollTop, containerHeight, overscan]);

  // 可见数据
  const visibleData = useMemo(() => {
    return processedData.slice(visibleStart, visibleEnd);
  }, [processedData, visibleStart, visibleEnd]);

  // === 新增：处理排序 ===
  const handleSort = useCallback((columnKey: string, order: 'ascend' | 'descend' | null) => {
    const newSorter = order ? { columnKey, order } : null;
    setSorter(newSorter);
    onChange?.({}, filters, newSorter);
  }, [filters, setSorter, onChange]);

  // === 新增：处理筛选 ===
  const handleFilterConfirm = useCallback((columnKey: string, selectedKeys: any[]) => {
    const newFilters = {
      ...filters,
      [columnKey]: selectedKeys.length > 0 ? selectedKeys : null,
    };
    setFilters(newFilters);
    setOpenFilterDropdown(null);
    onChange?.({}, newFilters, sorter);
  }, [filters, setFilters, sorter, onChange]);

  const handleFilterClear = useCallback((columnKey: string) => {
    const newFilters = { ...filters };
    delete newFilters[columnKey];
    setFilters(newFilters);
    setOpenFilterDropdown(null);
    onChange?.({}, newFilters, sorter);
  }, [filters, setFilters, sorter, onChange]);

  // 处理全选
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    if (selectedRows && selectedRows.size === processedData.length) {
      onSelectionChange(new Set());
    } else {
      const allIds = new Set(processedData.map((row, index) => 
        getRowId?.(row, index) || (row as any).id || `${index}`
      ));
      onSelectionChange(allIds);
    }
  }, [processedData, selectedRows, onSelectionChange, getRowId]);

  // 处理单选
  const handleSelectRow = useCallback((row: T, index: number) => {
    if (!onSelectionChange) return;
    
    const rowId = getRowId?.(row, index) || (row as any).id || `${visibleStart + index}`;
    const newSelected = new Set(selectedRows);
    
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    
    onSelectionChange(newSelected);
  }, [selectedRows, onSelectionChange, getRowId, visibleStart]);

  // 加载状态
  if (loading) {
    return (
      <div
        ref={containerRef}
        className={cn('overflow-auto border border-gray-200 rounded-md', className)}
        style={{ height: typeof height === 'number' ? height : undefined }}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // 空数据状态
  if (processedData.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn('overflow-auto border border-gray-200 rounded-md', className)}
        style={{ height: typeof height === 'number' ? height : undefined }}
      >
        <div className="flex items-center justify-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto relative border border-gray-200 rounded-md', className)}
      style={{ 
        height: typeof height === 'number' ? height : undefined,
        minHeight: typeof height === 'string' ? height : undefined,
      }}
    >
      {/* 固定表头 */}
      <div 
        className="sticky top-0 z-10 bg-surface-container dark:bg-surface-container-high border-b border-outline-variant/20"
        style={{ height: rowHeight, minWidth: 'max-content' }}
      >
        <div className="flex h-full items-center" style={{ minWidth: 'max-content' }}>
          {selectable && (
            <div 
              className="px-4 flex items-center"
              style={{ width: '50px', minWidth: '50px', flex: 'none' }}
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedRows && selectedRows.size === processedData.length && processedData.length > 0}
                onChange={handleSelectAll}
              />
            </div>
          )}
          {columns.map((column) => {
            const columnSortOrder = sorter?.columnKey === column.key ? sorter.order : column.sortOrder;
            const columnFilters = column.filteredValue || (filters[column.key] ? filters[column.key] : null);
            const hasFilter = columnFilters && (Array.isArray(columnFilters) ? columnFilters.length > 0 : true);
            const showSorter = column.showSorter !== false && (column.sorter || column.defaultSortOrder);
            const showFilter = column.showFilter !== false && (column.filters || column.onFilter);

            return (
              <div
                key={column.key}
                className={cn(
                  'px-4 flex items-center text-sm font-medium text-fg-default cursor-pointer hover:bg-surface-container-high/50 transition-colors',
                  column.align === 'center' && 'justify-center',
                  column.align === 'right' && 'justify-end',
                  column.align === 'left' && 'justify-start',
                  headerClassName
                )}
                style={{
                  width: column.width || 'auto',
                  minWidth: column.width || 'auto',
                  flex: column.width ? undefined : 1,
                }}
                onClick={() => showSorter && handleSort(column.key, columnSortOrder === 'ascend' ? 'descend' : columnSortOrder === 'descend' ? null : 'ascend')}
                title={column.label}
              >
                <span className="flex-1 truncate">{column.label}</span>
                
                {/* 排序图标 */}
                {showSorter && (
                  <TableSortIcon
                    sortOrder={columnSortOrder || null}
                    onSort={(order) => handleSort(column.key, order)}
                    sortDirections={column.sortDirections}
                  />
                )}
                
                {/* 筛选图标 */}
                {showFilter && (
                  <div className="relative">
                    <TableFilterIcon
                      filtered={!!hasFilter}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterDropdown(openFilterDropdown === column.key ? null : column.key);
                      }}
                    />
                    
                    {/* 筛选下拉菜单 */}
                    {openFilterDropdown === column.key && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFilterDropdown(null);
                          }}
                        />
                        <div 
                          className="absolute right-0 top-full mt-1 z-20"
                          style={{ minWidth: '220px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TableFilterDropdown
                            column={column}
                            selectedKeys={columnFilters || []}
                            setSelectedKeys={(keys) => {
                              // 临时更新，等待 confirm 才真正应用
                            }}
                            confirm={() => {
                              const keys = columnFilters || [];
                              handleFilterConfirm(column.key, keys);
                            }}
                            clearFilters={() => handleFilterClear(column.key)}
                            filterMultiple={column.filterMultiple}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="relative" style={{ height: totalHeight, minWidth: 'max-content' }}>
        {/* 可见行 */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: visibleStart * rowHeight,
            height: (visibleEnd - visibleStart) * rowHeight,
          }}
        >
          {visibleData.map((row, index) => {
            const actualIndex = visibleStart + index;
            const rowId = getRowId?.(row, actualIndex) || (row as any).id || `${actualIndex}`;
            const isSelected = selectedRows?.has(rowId);
            const customRowClass = rowClassName?.(row, actualIndex);
            
            return (
              <div
                key={rowId}
                className={cn(
                  'absolute w-full border-b border-outline-variant/10 transition-colors cursor-pointer',
                  isSelected && 'bg-accent-muted/20',
                  !isSelected && 'hover:bg-surface-container/30',
                  customRowClass
                )}
                style={{
                  height: rowHeight,
                  top: index * rowHeight,
                }}
                onClick={() => onRowClick?.(row, actualIndex)}
              >
                <div className="flex h-full items-center" style={{ minWidth: 'max-content' }}>
                  {selectable && (
                    <div 
                      className="px-4 flex items-center"
                      style={{ width: '50px', minWidth: '50px', flex: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected || false}
                        onChange={() => handleSelectRow(row, index)}
                      />
                    </div>
                  )}
                  {columns.map((column) => {
                    const value = (row as any)[column.dataIndex || column.key];
                    const content = column.render 
                      ? column.render(value, row, actualIndex)
                      : value;

                    return (
                      <div
                        key={column.key}
                        className={cn(
                          'px-4 flex items-center text-sm text-gray-700',
                          column.align === 'center' && 'justify-center',
                          column.align === 'right' && 'justify-end',
                          column.align === 'left' && 'justify-start',
                          column.className
                        )}
                        style={{
                          width: column.width || 'auto',
                          minWidth: column.width || 'auto',
                          flex: column.width ? undefined : 1,
                        }}
                      >
                        <span className="truncate w-full" title={typeof content === 'string' ? content : undefined}>
                          {content}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualTableEnhanced;
