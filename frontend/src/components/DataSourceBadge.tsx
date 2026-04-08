import React from 'react';
import { Database, Zap, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DataSourceBadgeProps {
  dataSource: 'DO' | 'D1' | 'MIXED';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const dataSourceConfig = {
  DO: {
    label: 'Durable Objects',
    description: 'Data source: Durable Objects (real-time)',
    icon: Zap,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-700',
    infoText: 'Durable Objects real-time data',
  },
  D1: {
    label: 'D1 Database',
    description: 'Data source: D1 database (archived)',
    icon: Database,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-700',
    infoText: 'D1 archived data',
  },
  MIXED: {
    label: 'Mixed',
    description: 'Data source: mixed (DO + D1)',
    icon: Clock,
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
    borderColor: 'border-violet-200',
    dotColor: 'bg-violet-700',
    infoText: 'Mixed time-range query',
  },
} as const;

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
            'absolute inline-flex h-full w-full rounded-full opacity-35',
            config.dotColor
          )}
        />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)} />
      </span>
      <Icon size={iconSizes[size]} className={config.textColor} />
      {showLabel && <span className={cn('font-medium', config.textColor)}>{config.label}</span>}
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
  const formattedQueryTime = queryTime
    ? new Date(queryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className={cn('flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3', className)}>
      <div className="flex items-center gap-2">
        <DataSourceBadge dataSource={dataSource} size="sm" />
        <span className="text-xs text-on-surface-variant">{config.infoText}</span>
      </div>
      <span className="text-xs tabular-nums text-on-surface-variant">Query time: {formattedQueryTime}</span>
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
  if (dataSource !== 'D1') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400', className)}>
      <AlertCircle size={14} />
      <span>Archived D1 data may update with delay.</span>
    </div>
  );
};

export default DataSourceBadge;
