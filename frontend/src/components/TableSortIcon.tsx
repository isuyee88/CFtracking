/**
 * File: TableSortIcon.tsx
 * Purpose: Ant Design 风格排序图标组件
 * Input: sortOrder - 当前排序状态，onSort - 排序切换回调
 * Output: 渲染排序图标按钮
 * Logic: 显示双箭头，根据排序状态高亮对应箭头
 */

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableSortIconProps {
  sortOrder?: 'ascend' | 'descend' | null;
  onSort: (order: 'ascend' | 'descend' | null) => void;
  sortDirections?: ('ascend' | 'descend')[];
  className?: string;
}

export const TableSortIcon: React.FC<TableSortIconProps> = ({
  sortOrder,
  onSort,
  sortDirections = ['ascend', 'descend'],
  className,
}) => {
  const handleToggle = () => {
    const currentIndex = sortOrder ? sortDirections.indexOf(sortOrder) : -1;
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= sortDirections.length || currentIndex === -1) {
      nextIndex = 0;
    }
    
    const nextOrder = sortDirections[nextIndex];
    onSort(nextOrder);
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      className={cn(
        'ml-1 flex flex-col items-center justify-center gap-0.5 p-0.5 rounded transition-colors',
        sortOrder ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600',
        className
      )}
      type="button"
    >
      <ArrowUp 
        className={cn(
          'w-2.5 h-2.5 transition-opacity',
          sortOrder === 'ascend' ? 'opacity-100' : 'opacity-30'
        )}
      />
      <ArrowDown 
        className={cn(
          'w-2.5 h-2.5 transition-opacity',
          sortOrder === 'descend' ? 'opacity-100' : 'opacity-30'
        )}
      />
    </button>
  );
};

export default TableSortIcon;
