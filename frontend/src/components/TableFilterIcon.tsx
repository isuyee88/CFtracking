/**
 * File: TableFilterIcon.tsx
 * Purpose: 筛选图标组件
 * Input: filtered - 是否有筛选，onClick - 点击回调
 * Output: 渲染筛选图标按钮
 * Logic: 根据筛选状态显示不同颜色
 */

import React from 'react';
import { Filter } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableFilterIconProps {
  filtered?: boolean;
  onClick?: () => void;
  className?: string;
}

export const TableFilterIcon: React.FC<TableFilterIconProps> = ({
  filtered,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'ml-1 p-1 rounded transition-colors',
        filtered ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600',
        className
      )}
      type="button"
    >
      <Filter className="w-3.5 h-3.5" />
    </button>
  );
};

export default TableFilterIcon;
