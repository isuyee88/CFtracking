/**
 * @fileoverview 骨架屏组件
 * @description 用于页面加载时显示占位符，提升用户体验
 * @module components/Skeleton
 * 
 * 功能:
 *   - 提供多种骨架屏样式
 *   - 支持自定义尺寸和样式
 *   - 动画效果
 * 
 * 输入: 尺寸、样式配置
 * 输出: 骨架屏UI组件
 */

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 基础骨架屏元素
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = 'md'
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        roundedClasses[rounded],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

// 文本骨架屏
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          className="my-2"
        />
      ))}
    </div>
  );
};

// 卡片骨架屏
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      <Skeleton height={20} width="60%" className="mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
};

// 表格行骨架屏
export const SkeletonTableRow: React.FC<{ columns?: number; className?: string }> = ({
  columns = 5,
  className
}) => {
  return (
    <div className={cn('flex gap-4 p-4 border-b', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === 0 ? '20%' : i === columns - 1 ? '10%' : '15%'}
        />
      ))}
    </div>
  );
};

// 表格骨架屏
export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
  className?: string;
}> = ({
  rows = 10,
  columns = 5,
  showHeader = true,
  className
}) => {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* 表头骨架 */}
      {showHeader && (
        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 border-b font-medium">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              height={16}
              width={i === 0 ? '20%' : i === columns - 1 ? '10%' : '15%'}
            />
          ))}
        </div>
      )}
      
      {/* 表格行骨架 */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
};

// 统计卡片骨架屏
export const SkeletonMetricCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-6 bg-white dark:bg-gray-800 rounded-lg shadow', className)}>
      <Skeleton height={12} width="40%" className="mb-2" />
      <Skeleton height={32} width="60%" className="mb-2" />
      <Skeleton height={12} width="20%" />
    </div>
  );
};

// 图表骨架屏
export const SkeletonChart: React.FC<{ 
  height?: number | string;
  className?: string;
}> = ({
  height = 300,
  className
}) => {
  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      <Skeleton height={20} width="30%" className="mb-4" />
      <Skeleton 
        height={typeof height === 'number' ? height : 300} 
        width="100%" 
        className="rounded"
      />
    </div>
  );
};

// 日期选择器骨架屏
export const SkeletonDatePicker: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex gap-2', className)}>
      <Skeleton height={40} width={120} />
      <Skeleton height={40} width={40} rounded="md" />
      <Skeleton height={40} width={120} />
    </div>
  );
};

// 筛选器骨架屏
export const SkeletonFilter: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex gap-2', className)}>
      <Skeleton height={36} width={100} />
      <Skeleton height={36} width={100} />
      <Skeleton height={36} width={100} />
    </div>
  );
};

// 分页骨架屏
export const SkeletonPagination: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-between p-4', className)}>
      <Skeleton height={32} width={100} />
      <div className="flex gap-2">
        <Skeleton height={32} width={32} rounded="md" />
        <Skeleton height={32} width={32} rounded="md" />
        <Skeleton height={32} width={32} rounded="md" />
      </div>
      <Skeleton height={32} width={100} />
    </div>
  );
};

export default Skeleton;
