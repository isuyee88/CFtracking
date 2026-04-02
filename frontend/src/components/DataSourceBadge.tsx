/**
 * @fileoverview 数据源指示器组件
 * @description 显示当前数据来源（DO实时或D1归档）
 * @module components/DataSourceBadge
 *
 * 输入: dataSource ('DO' | 'D1' | 'MIXED')
 * 输出: 带样式的数据源徽章
 * 逻辑交互: 被 Dashboard.tsx 等页面调用
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { Database, Zap, Clock, AlertCircle } from 'lucide-react';

export interface DataSourceBadgeProps {
  dataSource: 'DO' | 'D1' | 'MIXED';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const dataSourceConfig = {
  DO: {
    label: 'Durable Objects',
    sublabel: '实时数据',
    description: '数据来源: Durable Objects (实时)',
    icon: Zap,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
  D1: {
    label: 'D1 Database',
    sublabel: '归档数据',
    description: '数据来源: D1数据库 (归档)',
    icon: Database,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  MIXED: {
    label: 'Mixed',
    sublabel: '混合数据',
    description: '数据来源: 混合 (DO + D1)',
    icon: Clock,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/20',
    dotColor: 'bg-purple-500',
  },
};

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  dataSource,
  className,
  showLabel = true,
  size = 'md',
}) => {
  const config = dataSourceConfig[dataSource] || dataSourceConfig.DO;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border transition-all',
        config.bgColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
      title={config.description}
    >
      <span className={cn('relative flex h-2 w-2')}>
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            config.dotColor
          )}
        />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)} />
      </span>
      <Icon size={iconSizes[size]} className={config.textColor} />
      {showLabel && (
        <span className={cn('font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export interface DataSourceInfoProps {
  dataSource: 'DO' | 'D1' | 'MIXED';
  queryTime?: string;
  className?: string;
}

export const DataSourceInfo: React.FC<DataSourceInfoProps> = ({
  dataSource,
  queryTime,
  className,
}) => {
  const config = dataSourceConfig[dataSource] || dataSourceConfig.DO;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <DataSourceBadge dataSource={dataSource} size="sm" />
      <span className="text-xs text-on-surface-variant">
        {dataSource === 'DO' && 'Durable Objects 实时数据，最近90天'}
        {dataSource === 'D1' && 'D1 归档数据，每日汇总更新'}
        {dataSource === 'MIXED' && '跨时间段混合查询'}
      </span>
      {queryTime && (
        <span className="text-xs text-on-surface-variant/60">
          • 查询时间: {new Date(queryTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export interface DataSourceWarningProps {
  dataSource: 'DO' | 'D1' | 'MIXED';
  className?: string;
}

export const DataSourceWarning: React.FC<DataSourceWarningProps> = ({
  dataSource,
  className,
}) => {
  if (dataSource === 'D1') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400', className)}>
        <AlertCircle size={14} />
        <span>数据为每日汇总，更新可能有延迟</span>
      </div>
    );
  }
  return null;
};

export default DataSourceBadge;
