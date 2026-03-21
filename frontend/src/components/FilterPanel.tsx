/**
 * File: FilterPanel.tsx
 * Purpose: 通用筛选面板组件
 * Input/Output: 接收筛选配置，输出筛选条件变更
 * Logic: 可复用的筛选面板，支持多种筛选类型
 */

import React, { useState, useEffect } from 'react';
import { X, Filter, ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 筛选选项类型
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

// 筛选配置
export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'search';
  options?: FilterOption[];
  placeholder?: string;
}

// 筛选值
export interface FilterValues {
  [key: string]: string | string[] | { from?: string; to?: string } | undefined;
}

// 组件属性
interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  configs: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  resultCount?: number;
  totalCount?: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  configs,
  values,
  onChange,
  onApply,
  onReset,
  resultCount,
  totalCount,
}) => {
  if (!isOpen) return null;

  const activeFilterCount = Object.values(values).filter(
    (v) => v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleValueChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleClearFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-96 max-w-full bg-surface-container-lowest h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-primary">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-on-primary text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-sm transition-colors"
          >
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Active Filters
              </span>
              <button
                onClick={onReset}
                className="text-xs text-error hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(values).map(([key, value]) => {
                if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
                  return null;
                }
                const config = configs.find((c) => c.key === key);
                if (!config) return null;

                let displayValue = '';
                if (Array.isArray(value)) {
                  displayValue = value.join(', ');
                } else if (typeof value === 'object') {
                  displayValue = `${value.from || ''} - ${value.to || ''}`;
                } else {
                  const option = config.options?.find((o) => o.value === value);
                  displayValue = option?.label || value;
                }

                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-sm"
                  >
                    <span className="font-medium">{config.label}:</span>
                    <span className="truncate max-w-[120px]">{displayValue}</span>
                    <button
                      onClick={() => handleClearFilter(key)}
                      className="ml-1 hover:text-error"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {configs.map((config) => (
            <div key={config.key}>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                {config.label}
              </label>

              {config.type === 'select' && (
                <select
                  value={(values[config.key] as string) || ''}
                  onChange={(e) => handleValueChange(config.key, e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
                >
                  <option value="">{config.placeholder || 'All'}</option>
                  {config.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {option.count !== undefined && ` (${option.count})`}
                    </option>
                  ))}
                </select>
              )}

              {config.type === 'multiselect' && (
                <div className="space-y-1 max-h-48 overflow-y-auto border border-outline-variant rounded-sm p-2">
                  {config.options?.map((option) => {
                    const selectedValues = (values[config.key] as string[]) || [];
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-colors',
                          isSelected ? 'bg-primary/10' : 'hover:bg-surface-container'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleValueChange(config.key, [...selectedValues, option.value]);
                            } else {
                              handleValueChange(
                                config.key,
                                selectedValues.filter((v) => v !== option.value)
                              );
                            }
                          }}
                          className="text-primary"
                        />
                        <span className="text-sm flex-1">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-on-surface-variant">({option.count})</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {config.type === 'search' && (
                <input
                  type="text"
                  value={(values[config.key] as string) || ''}
                  onChange={(e) => handleValueChange(config.key, e.target.value || undefined)}
                  placeholder={config.placeholder || 'Search...'}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
                />
              )}

              {config.type === 'date' && (
                <input
                  type="date"
                  value={(values[config.key] as string) || ''}
                  onChange={(e) => handleValueChange(config.key, e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
                />
              )}

              {config.type === 'daterange' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={((values[config.key] as any)?.from as string) || ''}
                    onChange={(e) =>
                      handleValueChange(config.key, {
                        ...(values[config.key] as any),
                        from: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
                  />
                  <span className="text-on-surface-variant">-</span>
                  <input
                    type="date"
                    value={((values[config.key] as any)?.to as string) || ''}
                    onChange={(e) =>
                      handleValueChange(config.key, {
                        ...(values[config.key] as any),
                        to: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/10 space-y-3">
          {(resultCount !== undefined || totalCount !== undefined) && (
            <div className="text-center text-sm text-on-surface-variant">
              Showing <span className="font-bold text-primary">{resultCount}</span> of{' '}
              <span className="font-bold">{totalCount}</span> results
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
            >
              Reset
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
