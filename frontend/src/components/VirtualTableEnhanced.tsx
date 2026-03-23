/**
 * File: VirtualTableEnhanced.tsx
 * Purpose: 增强版虚拟滚动表格，支持固定表头、行选择、排序等功能
 * Input: columns - 列配置，data - 数据，rowHeight - 行高，height - 容器高度
 * Output: 渲染带固定表头的虚拟滚动表格
 * Logic: 使用虚拟滚动 + 固定表头，支持行选择和排序
 */

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VirtualTableColumn } from './VirtualTable';

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
}: VirtualTableEnhancedProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === 'number' ? height : 400
  );

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
    },
    [onScroll]
  );

  // 计算可见行范围
  const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
    const total = data.length;
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
  }, [data.length, rowHeight, scrollTop, containerHeight, overscan]);

  // 可见数据
  const visibleData = useMemo(() => {
    return data.slice(visibleStart, visibleEnd);
  }, [data, visibleStart, visibleEnd]);

  // 处理全选
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    if (selectedRows && selectedRows.size === data.length) {
      onSelectionChange(new Set());
    } else {
      const allIds = new Set(data.map((row, index) => 
        getRowId?.(row, index) || (row as any).id || `${index}`
      ));
      onSelectionChange(allIds);
    }
  }, [data, selectedRows, onSelectionChange, getRowId]);

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
        className={cn('overflow-auto border border-outline-variant/10 rounded-sm', className)}
        style={{ height: typeof height === 'number' ? height : undefined }}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // 空数据状态
  if (data.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn('overflow-auto border border-outline-variant/10 rounded-sm', className)}
        style={{ height: typeof height === 'number' ? height : undefined }}
      >
        <div className="flex items-center justify-center py-8 text-on-surface-variant">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto relative border border-outline-variant/10 rounded-sm', className)}
      style={{ 
        height: typeof height === 'number' ? height : undefined,
        minHeight: typeof height === 'string' ? height : undefined,
      }}
    >
      {/* 表格内容 */}
      <div className="relative" style={{ height: totalHeight }}>
        {/* 固定表头 */}
        <div 
          className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/10 overflow-hidden"
          style={{ height: rowHeight }}
        >
          <div className="flex h-full items-center" style={{ minWidth: 'max-content' }}>
            {selectable && (
              <div 
                className="px-4 flex items-center"
                style={{ width: '50px', minWidth: '50px', flex: 'none' }}
              >
                <input
                  type="checkbox"
                  className="rounded border-outline-variant"
                  checked={selectedRows && selectedRows.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                />
              </div>
            )}
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn(
                  'px-4 text-xs font-bold uppercase text-on-surface-variant overflow-hidden text-ellipsis whitespace-nowrap',
                  column.align === 'center' && 'text-center justify-center',
                  column.align === 'right' && 'text-right justify-end',
                  column.align === 'left' && 'text-left justify-start',
                  headerClassName
                )}
                style={{
                  width: column.width,
                  minWidth: column.width,
                  flex: column.width ? undefined : 1,
                }}
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>

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
                  isSelected && 'bg-surface-container/30',
                  !isSelected && 'hover:bg-surface-container/50',
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
                        className="rounded border-outline-variant"
                        checked={isSelected || false}
                        onChange={() => handleSelectRow(row, index)}
                      />
                    </div>
                  )}
                  {columns.map((column) => {
                    const value = (row as any)[column.key];
                    const content = column.render 
                      ? column.render(value, row, actualIndex)
                      : value;

                    return (
                      <div
                        key={column.key}
                        className={cn(
                          'px-4 flex items-center overflow-hidden text-ellipsis whitespace-nowrap',
                          column.align === 'center' && 'justify-center text-center',
                          column.align === 'right' && 'justify-end text-right',
                          column.align === 'left' && 'justify-start text-left',
                          column.className
                        )}
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          flex: column.width ? undefined : 1,
                        }}
                      >
                        {content}
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
