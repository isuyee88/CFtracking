/**
 * @fileoverview Metric Cards Section 组件
 * @description 显示指标卡片的网格布局
 * @module pages/Dashboard/components/MetricCardsSection
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface MetricCardData {
  key: string;
  label: string;
  value: string;
  trend?: string;
  isPositive?: boolean;
}

export interface MetricCardsSectionProps {
  metrics: MetricCardData[];
  loading?: boolean;
  className?: string;
}

const LoadingSpinner = ({ size = 24 }: { size?: number }) => (
  <div className="flex items-center justify-center">
    <div 
      className="animate-spin rounded-full border-t-2 border-b-2 border-primary"
      style={{ width: size, height: size }}
    />
  </div>
);

const MetricCard = ({ 
  metric, 
  index 
}: { 
  metric: MetricCardData; 
  index: number;
}) => {
  const styleIndex = index % 2;
  const styles = [
    { gradient: 'metric-gradient', accent: 'from-secondary-fixed-dim/20' },
    { gradient: 'metric-gradient-alt', accent: 'from-secondary/20' },
  ];
  const style = styles[styleIndex];

  return (
    <div className={cn("metric-card metric-card-hover", style.gradient)}>
      <div className={cn("metric-card-accent", style.accent)} />
      <p className="metric-label">{metric.label}</p>
      <h3 className="metric-value">{metric.value || '-'}</h3>
      <p className={cn(
        "metric-trend",
        metric.isPositive ? "metric-trend-up" : "metric-trend-down"
      )}>
        {metric.isPositive ? '↑' : '↓'} {metric.trend || ''}
      </p>
    </div>
  );
};

export const MetricCardsSection: React.FC<MetricCardsSectionProps> = ({
  metrics,
  loading = false,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3", className)}>
        {Array(7).fill(0).map((_, index) => (
          <MetricCard 
            key={index} 
            metric={{ key: '', label: 'Loading...', value: '' }} 
            index={index} 
          />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3", className)}>
      {metrics.filter(Boolean).map((metric, index) => (
        <MetricCard 
          key={metric.key || index} 
          metric={metric} 
          index={index} 
        />
      ))}
    </div>
  );
};

export default MetricCardsSection;
