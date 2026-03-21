/**
 * File: GroupByFilter.tsx
 * Purpose: 通用 Group By 筛选组件
 * Input/Output: 接收数据和配置，输出筛选后的状态
 * Logic: 支持多级分组和值联动筛选
 */

import React, { useState, useMemo } from 'react';
import { Layers, X, Plus } from 'lucide-react';
import type { GroupByOption, GroupByState } from '../types/filter';

interface GroupByFilterProps<T> {
  data: T[];
  groupByOptions: GroupByOption[];
  value: GroupByState[];
  onChange: (states: GroupByState[]) => void;
  maxLevels?: number;
  placeholder?: string;
}

export function GroupByFilter<T extends Record<string, any>>({
  data,
  groupByOptions,
  value,
  onChange,
  maxLevels = 3,
  placeholder = 'Select field to group by...'
}: GroupByFilterProps<T>) {
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});

  const addGroupBy = () => {
    if (value.length < maxLevels) {
      const availableOptions = getAvailableOptions();
      if (availableOptions.length > 0) {
        onChange([...value, { field: availableOptions[0].value, value: 'all' }]);
      }
    }
  };

  const removeGroupBy = (index: number) => {
    const newStates = value.filter((_, i) => i !== index);
    onChange(newStates);
  };

  const updateGroupBy = (index: number, field: string) => {
    const newStates = [...value];
    newStates[index] = { field, value: 'all' };
    onChange(newStates);
  };

  const updateGroupValue = (index: number, val: string) => {
    const newStates = [...value];
    newStates[index] = { ...newStates[index], value: val };
    onChange(newStates);
  };

  const getAvailableOptions = (currentIndex?: number) => {
    const usedFields = value
      .filter((_, i) => currentIndex === undefined || i !== currentIndex)
      .map(s => s.field);
    return groupByOptions.filter(opt => !usedFields.includes(opt.value));
  };

  const getUniqueValues = (field: string): string[] => {
    if (!field || !data.length) return [];
    const values = new Set<string>();
    data.forEach(item => {
      const val = item[field];
      if (val !== undefined && val !== null && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  };

  const getFilteredValues = (field: string, searchValue: string): string[] => {
    const allValues = getUniqueValues(field);
    if (!searchValue) return allValues;
    return allValues.filter(v => 
      v.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  const getOptionLabel = (field: string): string => {
    return groupByOptions.find(o => o.value === field)?.label || field;
  };

  const getCategoryLabel = (field: string): string => {
    return groupByOptions.find(o => o.value === field)?.category || '';
  };

  const groupedOptions = useMemo(() => {
    const groups: Record<string, GroupByOption[]> = {};
    groupByOptions.forEach(opt => {
      if (!groups[opt.category]) {
        groups[opt.category] = [];
      }
      groups[opt.category].push(opt);
    });
    return groups;
  }, [groupByOptions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Layers size={16} className="text-fg-muted" />
        <span className="text-sm font-medium text-fg-muted">Group By:</span>
        
        {value.map((state, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Group By 字段选择 */}
            <select
              value={state.field}
              onChange={(e) => updateGroupBy(index, e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-surface-container text-fg-default border border-border-default focus:outline-none focus:border-accent-fg min-w-[120px]"
            >
              <option value="">{placeholder}</option>
              {Object.entries(groupedOptions).map(([category, options]) => (
                <optgroup key={category} label={category}>
                  {options
                    .filter(opt => 
                      opt.value === state.field || 
                      !value.some((s, i) => i !== index && s.field === opt.value)
                    )
                    .map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))
                  }
                </optgroup>
              ))}
            </select>

            {/* Group Value 联动筛选 */}
            {state.field && (
              <select
                value={state.value}
                onChange={(e) => updateGroupValue(index, e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded bg-surface-container text-fg-default border border-border-default focus:outline-none focus:border-accent-fg min-w-[120px]"
              >
                <option value="all">All {getOptionLabel(state.field)}</option>
                {getFilteredValues(state.field, searchValues[state.field] || '').map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            )}

            {/* 删除按钮 */}
            <button
              onClick={() => removeGroupBy(index)}
              className="p-1 text-fg-muted hover:text-error transition-colors"
              title="Remove"
            >
              <X size={14} />
            </button>

            {index < value.length - 1 && (
              <span className="text-fg-muted text-xs">→</span>
            )}
          </div>
        ))}

        {/* 添加 Group By 按钮 */}
        {value.length < maxLevels && (
          <button
            onClick={addGroupBy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-surface-container text-fg-muted hover:text-fg-default hover:bg-surface-container-hover border border-border-default transition-all"
          >
            <Plus size={14} />
            Add Group
          </button>
        )}
      </div>

      {/* 活跃的筛选条件显示 */}
      {value.some(s => s.value !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-fg-muted">Active filters:</span>
          {value
            .filter(s => s.value !== 'all')
            .map((state, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-sm"
              >
                <span className="font-medium">{getOptionLabel(state.field)}:</span>
                <span>{state.value}</span>
                <button
                  onClick={() => updateGroupValue(index, 'all')}
                  className="ml-1 hover:text-error"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          }
          <button
            onClick={() => onChange(value.map(s => ({ ...s, value: 'all' })))}
            className="text-xs text-error hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 预定义的 Group By 选项配置
 */
export const DEFAULT_GROUP_BY_OPTIONS: GroupByOption[] = [
  // Campaign & Traffic
  { value: 'campaign', label: 'Campaign', category: 'Campaign & Traffic' },
  { value: 'stream', label: 'Stream', category: 'Campaign & Traffic' },
  { value: 'landing', label: 'Landing Page', category: 'Campaign & Traffic' },
  { value: 'offer', label: 'Offer', category: 'Campaign & Traffic' },
  { value: 'source', label: 'Traffic Source', category: 'Campaign & Traffic' },
  { value: 'affiliate_network', label: 'Affiliate Network', category: 'Campaign & Traffic' },
  
  // Geo
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'isp', label: 'ISP', category: 'Geo' },
  { value: 'operator', label: 'Mobile Operator', category: 'Geo' },
  
  // Device & System
  { value: 'device_type', label: 'Device Type', category: 'Device & System' },
  { value: 'device_model', label: 'Device Model', category: 'Device & System' },
  { value: 'os', label: 'Operating System', category: 'Device & System' },
  { value: 'os_version', label: 'OS Version', category: 'Device & System' },
  { value: 'browser', label: 'Browser', category: 'Device & System' },
  { value: 'browser_version', label: 'Browser Version', category: 'Device & System' },
  
  // Network
  { value: 'ip', label: 'IP Address', category: 'Network' },
  { value: 'connection_type', label: 'Connection Type', category: 'Network' },
  { value: 'proxy', label: 'Proxy Status', category: 'Network' },
  
  // Tracking IDs
  { value: 'visitor_code', label: 'Visitor Code', category: 'Tracking IDs' },
  { value: 'creative_id', label: 'Creative ID', category: 'Tracking IDs' },
  { value: 'external_id', label: 'External ID', category: 'Tracking IDs' },
  { value: 'ad_campaign_id', label: 'Ad Campaign ID', category: 'Tracking IDs' },
  
  // Sub IDs
  { value: 'sub_id', label: 'Sub ID', category: 'Sub IDs' },
  { value: 'sub1', label: 'Sub ID 1', category: 'Sub IDs' },
  { value: 'sub2', label: 'Sub ID 2', category: 'Sub IDs' },
  { value: 'sub3', label: 'Sub ID 3', category: 'Sub IDs' },
  { value: 'sub4', label: 'Sub ID 4', category: 'Sub IDs' },
  { value: 'sub5', label: 'Sub ID 5', category: 'Sub IDs' },
  
  // Time
  { value: 'day_of_week', label: 'Day of Week', category: 'Time' },
  { value: 'hour', label: 'Hour of Day', category: 'Time' },
  { value: 'date', label: 'Date', category: 'Time' },
  { value: 'month', label: 'Month', category: 'Time' },
  
  // Referrer
  { value: 'referrer', label: 'Referrer', category: 'Referrer' },
  { value: 'referrer_domain', label: 'Referrer Domain', category: 'Referrer' },
  { value: 'search_engine', label: 'Search Engine', category: 'Referrer' },
  { value: 'keyword', label: 'Keyword', category: 'Referrer' },
  
  // Status
  { value: 'status', label: 'Status', category: 'Status' },
  { value: 'type', label: 'Type', category: 'Status' },
];

/**
 * 辅助函数：根据 GroupByState 过滤数据
 */
export function filterByGroupBy<T extends Record<string, any>>(
  data: T[],
  groupByStates: GroupByState[]
): T[] {
  return data.filter(item => {
    return groupByStates.every(state => {
      if (state.value === 'all' || !state.field) return true;
      const itemValue = item[state.field];
      return String(itemValue) === state.value;
    });
  });
}

/**
 * 辅助函数：根据 GroupByState 对数据进行分组
 */
export function groupDataBy<T extends Record<string, any>>(
  data: T[],
  groupByStates: GroupByState[]
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  
  if (groupByStates.length === 0 || !groupByStates[0].field) {
    result.set('All', data);
    return result;
  }
  
  const firstGroup = groupByStates[0];
  
  data.forEach(item => {
    const keyValue = item[firstGroup.field];
    const key = keyValue !== undefined && keyValue !== null && keyValue !== '' 
      ? String(keyValue) 
      : 'Unknown';
    
    if (!result.has(key)) {
      result.set(key, []);
    }
    result.get(key)!.push(item);
  });
  
  return result;
}

export default GroupByFilter;
