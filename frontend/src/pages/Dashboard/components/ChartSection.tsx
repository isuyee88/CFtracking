/**
 * @fileoverview Chart Section 组件
 * @description 显示图表区域，包含数据选择和图表渲染
 * @module pages/Dashboard/components/ChartSection
 */

import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/utils/cn';

export interface ChartSectionProps {
  chartData: Array<Record<string, any>>;
  loading?: boolean;
  className?: string;
}

const DATA_KEYS = [
  { key: 'clicks', label: 'Clicks', colorVar: '--color-chart-1' },
  { key: 'uniqueVisitors', label: 'Unique Visitors', colorVar: '--color-chart-2' },
  { key: 'conversions', label: 'Conversions', colorVar: '--color-chart-3' },
  { key: 'cost', label: 'Cost', colorVar: '--color-chart-4' },
  { key: 'revenue', label: 'Revenue', colorVar: '--color-chart-5' },
  { key: 'profit', label: 'Profit', colorVar: '--color-chart-6' },
];

const getCssVarColor = (varName: string): string => {
  if (typeof window === 'undefined') return '#5e6ad2';
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || '#5e6ad2';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart-tooltip glassmorphism">
      <p className="tooltip-label">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="tooltip-item" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

export const ChartSection: React.FC<ChartSectionProps> = ({
  chartData,
  loading = false,
  className,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['clicks', 'uniqueVisitors']);
  const [chartColors, setChartColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const colors: Record<string, string> = {};
    DATA_KEYS.forEach(({ key, colorVar }) => {
      colors[key] = getCssVarColor(colorVar);
    });
    setChartColors(colors);
  }, []);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const processedData = useMemo(() => {
    return chartData.map((item, index) => ({
      ...item,
      name: item.date || item.hour || `Day ${index + 1}`,
    }));
  }, [chartData]);

  const getKeyColor = (key: string): string => {
    return chartColors[key] || `var(--color-chart-${DATA_KEYS.findIndex(d => d.key === key) + 1})`;
  };

  if (loading) {
    return (
      <div className={cn("chart-container", className)}>
        <div className="chart-loading">
          <div className="animate-pulse h-64 bg-surface-variant rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("chart-container", className)}>
      <div className="chart-controls">
        <div className="flex flex-wrap gap-2">
          {DATA_KEYS.map(({ key, label, colorVar }) => (
            <button
              key={key}
              onClick={() => toggleKey(key)}
              className={cn(
                "chart-key-button",
                selectedKeys.includes(key) && "chart-key-button-active"
              )}
              style={selectedKeys.includes(key) ? { 
                backgroundColor: `var(${colorVar})`,
                color: 'var(--color-fg-on-emphasis)'
              } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="name" 
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <YAxis 
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getKeyColor(key)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartSection;
