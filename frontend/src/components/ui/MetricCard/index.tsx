/**
 * File: index.tsx
 * Purpose: 指标卡片组件 - 显示关键业务指标
 * Input/Output: 接收指标数据，渲染指标卡片
 * Logic: 显示标题、数值、趋势，支持加载状态和多种颜色主题
 */

import React from 'react';
import { TrendIndicator } from '@/components/ui/TrendIndicator';
import type { TrendDirection } from '@/components/ui/TrendIndicator';
import { semanticColors, trendColors } from '@/theme/colors';
import { cn } from '@/utils/cn';

export type MetricColor = 'primary' | 'success' | 'danger' | 'warning' | 'secondary';

export interface MetricCardProps {
  /** 指标标题 */
  title: string;
  /** 指标数值 */
  value: string | number;
  /** 趋势值 */
  trendValue?: number;
  /** 趋势方向 */
  trendDirection?: TrendDirection;
  /** 是否为正向趋势 */
  isPositiveTrend?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
  /** 颜色主题 */
  color?: MetricColor;
  /** 副标题/描述 */
  subtitle?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 指标卡片组件
 * 
 * @example
 * // 基础用法
 * <MetricCard
 *   title="总点击数"
 *   value="12,543"
 *   trendValue={12.5}
 *   trendDirection="up"
 *   icon={<MousePointer />}
 * />
 * 
 * // 带颜色主题
 * <MetricCard
 *   title="转化率"
   value="3.2%"
 *   trendValue={-2.1}
 *   trendDirection="down"
 *   color="success"
 *   icon={<TrendingUp />}
 * />
 * 
 * // 加载状态
 * <MetricCard title="总收入" value="$45,231" loading />
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trendValue,
  trendDirection,
  isPositiveTrend,
  icon,
  color = 'primary',
  subtitle,
  loading = false,
  onClick,
  className,
}) => {
  // 获取颜色配置
  const getColorConfig = () => {
    switch (color) {
      case 'success':
        return {
          iconBg: semanticColors.success.light,
          iconColor: semanticColors.success.DEFAULT,
        };
      case 'danger':
        return {
          iconBg: semanticColors.danger.light,
          iconColor: semanticColors.danger.DEFAULT,
        };
      case 'warning':
        return {
          iconBg: semanticColors.warning.light,
          iconColor: semanticColors.warning.DEFAULT,
        };
      case 'secondary':
        return {
          iconBg: semanticColors.secondary.light,
          iconColor: semanticColors.secondary.DEFAULT,
        };
      case 'primary':
      default:
        return {
          iconBg: semanticColors.primary.light,
          iconColor: semanticColors.primary.DEFAULT,
        };
    }
  };

  const colorConfig = getColorConfig();

  // 骨架屏加载状态
  if (loading) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-slate-700',
          'animate-pulse',
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
            {subtitle && <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>}
          </div>
          {icon && (
            <div className="h-12 w-12 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
          )}
        </div>
        {trendValue !== undefined && (
          <div className="mt-4 h-6 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-slate-700',
        'transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer hover:border-gray-200 dark:hover:border-slate-600',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </p>
          
          {/* 数值 */}
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white truncate">
            {value}
          </p>
          
          {/* 副标题 */}
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* 图标 */}
        {icon && (
          <div
            className="flex-shrink-0 ml-4 p-3 rounded-lg"
            style={{
              backgroundColor: colorConfig.iconBg,
            }}
          >
            <span style={{ color: colorConfig.iconColor }}>
              {icon}
            </span>
          </div>
        )}
      </div>
      
      {/* 趋势指示器 */}
      {trendValue !== undefined && trendDirection && (
        <div className="mt-4 flex items-center gap-2">
          <TrendIndicator
            value={trendValue}
            direction={trendDirection}
            isPositive={isPositiveTrend}
            size="sm"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            较上期
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * 指标卡片网格布局
 */
export const MetricCardGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}> = ({ children, className, columns = 4 }) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
};

export default MetricCard;
