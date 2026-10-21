/**
 * @fileoverview Data source indicator.
 * @description Shows where the dashboard numbers come from (Analytics Engine realtime or D1 archive).
 * @module components/DataSourceBadge
 *
 * Input: dataSource ('AE' | 'D1' | 'MIXED')
 * Output: a badge with the source label and tone
 * Used by: Dashboard and other analytics surfaces.
 * @invariant Colors come from semantic tokens so light/dark stay legible.
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { Database, Zap, Clock, AlertCircle } from 'lucide-react';

export interface DataSourceBadgeProps {
  dataSource: 'AE' | 'D1' | 'MIXED';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const dataSourceConfig = {
  AE: {
    label: 'Analytics Engine',
    sublabel: 'Realtime',
    description: 'Source: Analytics Engine (realtime)',
    icon: Zap,
    bgColor: 'bg-accent-fg/10',
    textColor: 'text-accent-fg',
    borderColor: 'border-accent-fg/20',
    dotColor: 'bg-accent-fg',
  },
  D1: {
    label: 'D1 Database',
    sublabel: 'Archive',
    description: 'Source: D1 database (archive)',
    icon: Database,
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
    dotColor: 'bg-warning',
  },
  MIXED: {
    label: 'Mixed',
    sublabel: 'Mixed',
    description: 'Source: mixed (AE + D1)',
    icon: Clock,
    bgColor: 'bg-secondary/10',
    textColor: 'text-secondary',
    borderColor: 'border-secondary/20',
    dotColor: 'bg-secondary',
  },
};

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  dataSource,
  className,
  showLabel = true,
  size = 'md',
}) => {
  const config = dataSourceConfig[dataSource] || dataSourceConfig.AE;
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
  dataSource: 'AE' | 'D1' | 'MIXED';
  queryTime?: string;
  className?: string;
}

export const DataSourceInfo: React.FC<DataSourceInfoProps> = ({
  dataSource,
  queryTime,
  className,
}) => {
  const config = dataSourceConfig[dataSource] || dataSourceConfig.AE;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <DataSourceBadge dataSource={dataSource} size="sm" />
      <span className="text-xs text-on-surface-variant">
        {dataSource === 'AE' && 'Realtime events, queried on demand'}
        {dataSource === 'D1' && 'Archived totals, rolled up daily'}
        {dataSource === 'MIXED' && 'Mixed range spanning realtime and archive'}
      </span>
      {queryTime && (
        <span className="text-xs text-on-surface-variant/60">
          • Query time: {new Date(queryTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export interface DataSourceWarningProps {
  dataSource: 'AE' | 'D1' | 'MIXED';
  className?: string;
}

export const DataSourceWarning: React.FC<DataSourceWarningProps> = ({
  dataSource,
  className,
}) => {
  if (dataSource === 'D1') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-warning', className)}>
        <AlertCircle size={14} />
        <span>Archived totals are updated daily and may lag behind realtime events.</span>
      </div>
    );
  }
  return null;
};

export default DataSourceBadge;
