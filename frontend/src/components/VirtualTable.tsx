/**
 * File: VirtualTable.tsx
 * Purpose: 虚拟滚动表格组件，只渲染可见区域的行以提升大表格性能
 * Input: columns - 列配置数组，data - 数据数组，rowHeight - 行高，height - 表格容器高度
 * Output: 渲染优化后的表格，仅显示可视区域内的行
 * Logic: 使用虚拟滚动技术，根据滚动位置计算可见行索引范围
 */

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface VirtualTableColumn<T = any> {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface VirtualTableProps<T = any> {
  columns: VirtualTableColumn<T>[];
  data: T[];
  rowHeight?: number;
  height?: number | string;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function VirtualTable<T = any>({
  columns,
  data,
  rowHeight = 48,
  height = 400,
  overscan = 5,
  className,
  onScroll,
  emptyMessage = 'No data found',
  loading = false,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === 'number' ? height : 400
  );

  // 更新容器高度
  useEffect(() => {
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
    
    // 计算可见区域的起始和结束索引
    const start = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    
    // 添加 overscan 以提高滚动体验
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

  // 加载状态
  if (loading) {
    return (
      <div
        ref={containerRef}
        className={cn('overflow-auto', className)}
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
        className={cn('overflow-auto', className)}
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
      className={cn('overflow-auto relative', className)}
      style={{ 
        height: typeof height === 'number' ? height : undefined,
        minHeight: typeof height === 'string' ? height : undefined,
      }}
    >
      {/* 占位元素，保持总高度 */}
      <div 
        className="relative"
        style={{ height: totalHeight }}
      >
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
            return (
              <div
                key={row.id || actualIndex}
                className="absolute w-full border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors"
                style={{
                  height: rowHeight,
                  top: index * rowHeight,
                }}
              >
                <div className="flex h-full items-center">
                  {columns.map((column) => {
                    const value = (row as any)[column.key];
                    const content = column.render 
                      ? column.render(value, row, actualIndex)
                      : value;

                    return (
                      <div
                        key={column.key}
                        className={cn(
                          'px-4 flex items-center',
                          column.align === 'center' && 'justify-center text-center',
                          column.align === 'right' && 'justify-end text-right',
                          column.align === 'left' && 'text-left',
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

export default VirtualTable;
