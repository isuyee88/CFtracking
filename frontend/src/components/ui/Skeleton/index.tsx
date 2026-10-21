/**
 * Skeleton 骨架屏组件
 * 
 * 用途：在数据加载时显示占位符，提升用户感知性能
 * 输入：变体类型、尺寸、是否带动画
 * 输出：骨架屏占位元素
 * 交互：无（纯展示组件）
 */

import React from 'react';
import { cn } from '@/utils/cn';

export interface SkeletonProps {
  /** 变体类型 */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 是否显示动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animated = true,
  className,
}) => {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700';
  const animationStyles = animated ? 'animate-pulse' : '';

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const defaultHeights = {
    text: '1rem',
    circular: '2.5rem',
    rectangular: '6rem',
    rounded: '4rem',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height || defaultHeights[variant],
  };

  return (
    <div
      className={cn(baseStyles, animationStyles, variantStyles[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
};

// ==================== 预设骨架屏组件 ====================

export interface SkeletonTextProps {
  /** 行数 */
  lines?: number;
  /** 最后一行宽度百分比 */
  lastLineWidth?: string;
  /** 行间距 */
  gap?: number;
  /** 自定义类名 */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  gap = 2,
  className,
}) => {
  return (
    <div className={cn('flex flex-col', className)} style={{ gap: `${gap * 0.25}rem` }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={16}
        />
      ))}
    </div>
  );
};

export interface SkeletonAvatarProps {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 自定义类名 */
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className,
}) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  return (
    <Skeleton
      variant="circular"
      width={sizeMap[size]}
      height={sizeMap[size]}
      className={className}
    />
  );
};

export interface SkeletonCardProps {
  /** 是否有图片 */
  hasImage?: boolean;
  /** 图片高度 */
  imageHeight?: number;
  /** 内容行数 */
  contentLines?: number;
  /** 自定义类名 */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  imageHeight = 160,
  contentLines = 3,
  className,
}) => {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      {hasImage && (
        <Skeleton variant="rectangular" height={imageHeight} animated />
      )}
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="70%" height={20} />
        <SkeletonText lines={contentLines} gap={2} />
      </div>
    </div>
  );
};

export interface SkeletonTableProps {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
  /** 是否有表头 */
  hasHeader?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* 表头 */}
      {hasHeader && (
        <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              variant="text"
              width={`${100 / columns}%`}
              height={20}
            />
          ))}
        </div>
      )}
      
      {/* 表格行 */}
      <div className="space-y-4 pt-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="text"
                width={`${100 / columns}%`}
                height={16}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface SkeletonMetricCardProps {
  /** 自定义类名 */
  className?: string;
}

export const SkeletonMetricCard: React.FC<SkeletonMetricCardProps> = ({
  className,
}) => {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton variant="text" width={80} height={14} />
          <Skeleton variant="text" width={120} height={32} />
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" width={40} height={20} />
            <Skeleton variant="text" width={60} height={14} />
          </div>
        </div>
        <Skeleton variant="rounded" width={48} height={48} className="rounded-xl" />
      </div>
    </div>
  );
};

export interface SkeletonListProps {
  /** 项目数量 */
  count?: number;
  /** 是否有头像 */
  hasAvatar?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  hasAvatar = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" height={16} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
          <Skeleton variant="text" width={60} height={14} />
        </div>
      ))}
    </div>
  );
};

export interface SkeletonPageProps {
  /** 页面类型 */
  type?: 'dashboard' | 'list' | 'detail' | 'form';
  /** 自定义类名 */
  className?: string;
}

export const SkeletonPage: React.FC<SkeletonPageProps> = ({
  type = 'dashboard',
  className,
}) => {
  if (type === 'dashboard') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="rounded" width={120} height={40} />
        </div>
        
        {/* 指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
        
        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rounded" height={300} className="lg:col-span-2" />
          <Skeleton variant="rounded" height={300} />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* 页面标题和工具栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton variant="text" width={150} height={32} />
          <div className="flex gap-2">
            <Skeleton variant="rounded" width={200} height={40} />
            <Skeleton variant="rounded" width={100} height={40} />
          </div>
        </div>
        
        {/* 表格 */}
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* 返回按钮和标题 */}
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={250} height={32} />
        </div>
        
        {/* 详情内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
          <div className="flex items-start gap-6">
            <SkeletonAvatar size="xl" />
            <div className="flex-1 space-y-4">
              <Skeleton variant="text" width="60%" height={24} />
              <SkeletonText lines={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="text" width={80} height={14} />
                <Skeleton variant="text" width="100%" height={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className={cn('space-y-6 max-w-2xl', className)}>
        {/* 页面标题 */}
        <Skeleton variant="text" width={200} height={32} />
        
        {/* 表单字段 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" width={100} height={16} />
              <Skeleton variant="rounded" width="100%" height={40} />
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Skeleton variant="rounded" width={120} height={40} />
            <Skeleton variant="rounded" width={100} height={40} />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Skeleton;
