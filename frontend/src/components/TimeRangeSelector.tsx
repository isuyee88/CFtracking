/**
 * @fileoverview 时间范围选择组件
 * @description 提供时间范围选择功能，支持今天、昨天、最近7天、本月、最近30天、上月、最近90天
 * @module components/TimeRangeSelector
 *
 * 输入: value (当前选中的时间范围), onChange (值变化回调)
 * 输出: 下拉选择框组件
 * 逻辑交互: 被Dashboard等页面调用
 */

import React from 'react';

export interface TimeRangeOption {
  value: string;
  label: string;
  days?: number;
  description: string;
}

export interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TIME_RANGES: TimeRangeOption[] = [
  { value: 'today', label: '今天', days: 1, description: '今日数据' },
  { value: 'yesterday', label: '昨天', days: 1, description: '昨日数据' },
  { value: 'last7days', label: '最近7天', days: 7, description: '最近7天数据' },
  { value: 'thismonth', label: '本月', description: '当前月份数据' },
  { value: 'last30days', label: '最近30天', days: 30, description: '最近30天数据' },
  { value: 'lastmonth', label: '上月', description: '上个月数据' },
  { value: 'last90days', label: '最近90天', days: 90, description: '最近90天数据' },
];

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
  value, 
  onChange, 
  className 
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'}
    >
      {TIME_RANGES.map((range) => (
        <option key={range.value} value={range.value}>
          {range.label} - {range.description}
        </option>
      ))}
    </select>
  );
};

export default TimeRangeSelector;