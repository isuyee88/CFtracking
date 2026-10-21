/**
 * @fileoverview Recent Clicks Section 组件
 * @description 显示最近点击数据的表格区域
 * @module pages/Dashboard/components/RecentClicksSection
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { RECENT_CLICKS_COLUMNS } from '../config';

export interface RecentClicksSectionProps {
  clicks: any[];
  selectedColumns?: string[];
  loading?: boolean;
  className?: string;
}

const formatCellValue = (value: any, key: string): string => {
  if (value === null || value === undefined) return '-';
  
  if (key === 'datetime') {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
};

const RecentClicksTable = ({ 
  data, 
  columns 
}: { 
  data: any[]; 
  columns: typeof RECENT_CLICKS_COLUMNS;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-text-secondary">No recent clicks available</p>
      </div>
    );
  }

  return (
    <div className="recent-clicks-wrapper">
      <table className="recent-clicks-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th 
                key={col.key} 
                style={{ width: col.width, textAlign: 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, index) => (
            <tr key={row.event_id || row.id || index}>
              {columns.map(col => (
                <td key={col.key}>
                  {formatCellValue(row[col.key], col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RecentClicksSection: React.FC<RecentClicksSectionProps> = ({
  clicks,
  selectedColumns = ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination'],
  loading = false,
  className,
}) => {
  const visibleColumns = RECENT_CLICKS_COLUMNS.filter(col => 
    selectedColumns.includes(col.key)
  );

  if (loading) {
    return (
      <div className={cn("recent-clicks-section", className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-surface-variant rounded mb-4" />
          <div className="h-48 bg-surface-variant rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("recent-clicks-section", className)}>
      <div className="section-header">
        <h3 className="section-title">Recent Clicks</h3>
        <span className="section-count">{clicks.length} records</span>
      </div>
      
      <RecentClicksTable 
        data={clicks} 
        columns={visibleColumns}
      />
    </div>
  );
};

export default RecentClicksSection;
