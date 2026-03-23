/**
 * File: DateRangePicker.tsx
 * Purpose: 统一日期时间范围选择器组件
 * Input/Output: 接收日期范围值和变更回调，输出选中的日期时间范围
 * Logic: 基于 Ant Design RangePicker 封装，支持预设快捷选项
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DatePicker } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';

const { RangePicker } = DatePicker;

// ============================================
// 类型定义
// ============================================

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerComponentProps {
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue | null) => void;
  showTime?: boolean;
  placeholder?: [string, string];
  className?: string;
  disabled?: boolean;
  format?: string;
  size?: 'small' | 'middle' | 'large';
  disableFuture?: boolean;
  maxRangeDays?: number;
}

// ============================================
// 预设配置
// ============================================

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'Last 3 Months', value: 'last3months' },
  { label: 'This Month', value: 'thismonth' },
  { label: 'Last Month', value: 'lastmonth' },
  { label: 'This Year', value: 'thisyear' },
  { label: 'Last Year', value: 'lastyear' },
];

const getPresetRange = (preset: string): [Dayjs, Dayjs] => {
  const now = dayjs();
  switch (preset) {
    case 'today': return [now.startOf('day'), now.endOf('day')];
    case 'yesterday': return [now.subtract(1, 'day').startOf('day'), now.subtract(1, 'day').endOf('day')];
    case 'last7days': return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
    case 'last30days': return [now.subtract(29, 'day').startOf('day'), now.endOf('day')];
    case 'last3months': return [now.subtract(3, 'month').startOf('day'), now.endOf('day')];
    case 'thismonth': return [now.startOf('month'), now.endOf('month')];
    case 'lastmonth': return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')];
    case 'thisyear': return [now.startOf('year'), now.endOf('year')];
    case 'lastyear': return [now.subtract(1, 'year').startOf('year'), now.subtract(1, 'year').endOf('year')];
    default: return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
  }
};

// ============================================
// 主组件 - 完整的日期范围选择器
// ============================================

export const DateRangePickerComponent: React.FC<DateRangePickerComponentProps> = ({
  value,
  onChange,
  showTime = true,
  placeholder = ['Start Date', 'End Date'],
  className = '',
  disabled = false,
  format,
  size = 'middle',
  disableFuture = true,
  maxRangeDays,
}) => {
  const finalFormat = format || (showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');

  const rangeValue: [Dayjs | null, Dayjs | null] | null = useMemo(() => {
    if (!value) return null;
    return [dayjs(value.startDate), dayjs(value.endDate)];
  }, [value]);

  const disabledDate = useCallback((current: Dayjs, info?: { from?: Dayjs }) => {
    if (!current) return false;
    if (disableFuture && current > dayjs().endOf('day')) return true;
    if (maxRangeDays && info?.from) {
      const diff = Math.abs(current.diff(info.from, 'day'));
      if (diff > maxRangeDays) return true;
    }
    return false;
  }, [disableFuture, maxRangeDays]);

  const handleChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      onChange?.(null);
      return;
    }
    onChange?.({ startDate: dates[0].toISOString(), endDate: dates[1].toISOString() });
  }, [onChange]);

  const antdPresets: RangePickerProps['presets'] = useMemo(() => {
    return PRESETS.map(p => ({
      label: p.label,
      value: getPresetRange(p.value),
    }));
  }, []);

  return (
    <div className={`date-range-picker-wrapper ${className}`}>
      <RangePicker
        value={rangeValue}
        onChange={handleChange}
        showTime={showTime ? { format: 'HH:mm:ss', showNow: true } : false}
        format={finalFormat}
        presets={antdPresets}
        disabledDate={disabledDate}
        placeholder={placeholder}
        disabled={disabled}
        size={size}
        allowClear
        className="w-full"
        suffixIcon={<Calendar size={14} className="text-on-surface-variant" />}
      />
    </div>
  );
};

// ============================================
// 快捷选择器组件 - 使用 RangePicker 自带的预设功能
// ============================================

export interface QuickDateRangePickerProps {
  value?: string;
  onChange?: (value: string, dateRange?: DateRangeValue) => void;
  showTime?: boolean;
  maxRangeDays?: number;
}

export const QuickDateRangePicker: React.FC<QuickDateRangePickerProps> = ({
  value = 'last7days',
  onChange,
  showTime = false,
  maxRangeDays,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(getDateRange(value));

  const handleChange = (range: DateRangeValue | null) => {
    setDateRange(range);
    if (range) {
      // 尝试匹配预设
      const matchedPreset = PRESETS.find(p => {
        const [start, end] = getPresetRange(p.value);
        return dayjs(range.startDate).isSame(start, 'second') && 
               dayjs(range.endDate).isSame(end, 'second');
      });
      onChange?.(matchedPreset?.value || 'custom', range);
    }
  };

  return (
    <DateRangePickerComponent
      value={dateRange || undefined}
      onChange={handleChange}
      showTime={showTime}
      maxRangeDays={maxRangeDays}
    />
  );
};

// ============================================
// 工具函数
// ============================================

export const getDateRange = (type: string): DateRangeValue => {
  const [start, end] = getPresetRange(type);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

export const formatDateRange = (range: DateRangeValue | null, format = 'YYYY-MM-DD HH:mm'): string => {
  if (!range) return 'Not selected';
  return `${dayjs(range.startDate).format(format)} - ${dayjs(range.endDate).format(format)}`;
};

export default DateRangePickerComponent;
