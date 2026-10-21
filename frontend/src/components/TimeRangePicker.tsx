/**
 * File: TimeRangePicker.tsx
 * Purpose: 统一的时间范围选择器组件，基于 Trends 页面的实现
 * Input: value (startDate, endDate), 可选参数 showInterval, interval, onIntervalChange
 * Output: 选中的时间范围和可选的间隔
 * Logic: 提供预设快捷选项和自定义日期选择，支持间隔选择
 * 前后端交互: 无直接交互，通过回调返回选中的值
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface TimeRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  showInterval?: boolean;
  interval?: 'hour' | 'day' | 'week' | 'month';
  onIntervalChange?: (interval: 'hour' | 'day' | 'week' | 'month') => void;
  className?: string;
  presets?: Array<{ label: string; days: number | 'month' | 'lastMonth' | 'custom' }>;
}

const DEFAULT_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This month', days: 'month' },
  { label: 'Last month', days: 'lastMonth' },
  { label: 'Custom', days: 'custom' },
] as const;

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getPresetDates = (preset: number | 'month' | 'lastMonth' | 'custom') => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 0) {
    return { startDate: formatDate(today), endDate: formatDate(today) };
  } else if (preset === 1) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
  } else if (preset === 7 || preset === 30) {
    const start = new Date(today);
    start.setDate(start.getDate() - preset + 1);
    return { startDate: formatDate(start), endDate: formatDate(today) };
  } else if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatDate(start), endDate: formatDate(today) };
  } else if (preset === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  return null;
};

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  showInterval = false,
  interval = 'day',
  onIntervalChange,
  className = '',
  presets = DEFAULT_PRESETS,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Last 7 days');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRangeValue>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 初始化 selectedPreset
  useEffect(() => {
    const matchedPreset = presets.find(p => {
      const dates = getPresetDates(p.days);
      if (!dates) return false;
      return value.startDate === dates.startDate && value.endDate === dates.endDate;
    });
    if (matchedPreset) {
      setSelectedPreset(matchedPreset.label);
    }
  }, [value, presets]);

  // 关闭下拉菜单当点击外部
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
        setShowCustomDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = useCallback((preset: typeof presets[number]) => {
    setSelectedPreset(preset.label);
    setShowDateDropdown(false);

    if (preset.days === 'custom') {
      setShowCustomDatePicker(true);
      setTempDateRange(value);
    } else {
      const dates = getPresetDates(preset.days);
      if (dates) {
        onChange(dates);
      }
    }
  }, [value, onChange]);

  const handleCustomDateApply = useCallback(() => {
    onChange(tempDateRange);
    setShowCustomDatePicker(false);
    setSelectedPreset('Custom');
  }, [tempDateRange, onChange]);

  const handleIntervalChange = useCallback((newInterval: 'hour' | 'day' | 'week' | 'month') => {
    onIntervalChange?.(newInterval);
  }, [onIntervalChange]);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Date Range Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDateDropdown(!showDateDropdown)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-surface-container border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container-high transition-colors min-w-[160px]",
            showDateDropdown && "ring-2 ring-accent-fg/50"
          )}
          aria-haspopup="listbox"
          aria-expanded={showDateDropdown}
        >
          <Calendar size={16} className="text-fg-subtle" />
          <span className="flex-1 text-left truncate">{selectedPreset}</span>
          <ChevronDown size={16} className={cn("text-fg-subtle transition-transform", showDateDropdown && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        {showDateDropdown && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border-default rounded-md shadow-lg z-50 max-h-60 overflow-y-auto" role="listbox">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left hover:bg-surface-container transition-colors first:rounded-t-md last:rounded-b-md",
                  selectedPreset === preset.label && "bg-accent-fg/10 text-accent-fg"
                )}
                role="option"
                aria-selected={selectedPreset === preset.label}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Display selected date range */}
      <div className="flex items-center gap-2 text-sm text-fg-subtle">
        <span>{value.startDate}</span>
        <span>→</span>
        <span>{value.endDate}</span>
      </div>

      {/* Custom Date Picker Popup */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100] p-4" onClick={() => setShowCustomDatePicker(false)}>
          <div
            className="bg-surface border border-border-default rounded-lg shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-fg-default mb-4">Custom Date Range</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-fg-subtle block mb-2">Start Date</label>
                <input
                  type="date"
                  value={tempDateRange.startDate}
                  onChange={(e) => setTempDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full bg-surface-container border border-border-default rounded px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg focus:ring-2 focus:ring-accent-fg/20"
                />
              </div>
              <div>
                <label className="text-xs text-fg-subtle block mb-2">End Date</label>
                <input
                  type="date"
                  value={tempDateRange.endDate}
                  onChange={(e) => setTempDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  min={tempDateRange.startDate}
                  className="w-full bg-surface-container border border-border-default rounded px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg focus:ring-2 focus:ring-accent-fg/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomDatePicker(false)}
                  className="flex-1 px-4 py-2 text-sm text-fg-subtle hover:bg-surface-container rounded transition-colors border border-border-default"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCustomDateApply}
                  disabled={!tempDateRange.startDate || !tempDateRange.endDate || tempDateRange.endDate < tempDateRange.startDate}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm text-white rounded transition-colors",
                    "bg-accent-fg hover:bg-accent-fg/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interval Selector (Optional) */}
      {showInterval && (
        <>
          <div className="h-6 w-px bg-border-default mx-2" />
          <div className="flex items-center gap-1 bg-surface-container rounded-md p-1">
            {(['hour', 'day', 'week', 'month'] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleIntervalChange(i)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded transition-colors capitalize",
                  interval === i
                    ? "bg-surface text-fg-default shadow-sm"
                    : "text-fg-muted hover:text-fg-default"
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TimeRangePicker;
