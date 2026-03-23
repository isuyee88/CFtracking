/**
 * File: TableFilterDropdown.tsx
 * Purpose: Ant Design 风格筛选菜单组件
 * Input: column - 列配置，selectedKeys - 当前筛选值，confirm/clearFilters - 操作回调
 * Output: 渲染筛选下拉菜单
 * Logic: 支持文本搜索和预设选项筛选
 */

import React, { useRef, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableFilterDropdownProps {
  column: any;
  selectedKeys: any[];
  setSelectedKeys: (keys: any[]) => void;
  confirm: () => void;
  clearFilters: () => void;
  filterMultiple?: boolean;
  className?: string;
}

export const TableFilterDropdown: React.FC<TableFilterDropdownProps> = ({
  column,
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
  filterMultiple = true,
  className,
}) => {
  const searchInput = useRef<HTMLInputElement>(null);
  const hasPresets = column.filters && column.filters.length > 0;

  // 自动聚焦
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInput.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = () => {
    confirm();
  };

  const handleReset = () => {
    clearFilters();
    confirm();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePresetClick = (value: any) => {
    if (filterMultiple) {
      // 多选模式
      const newKeys = selectedKeys.includes(value)
        ? selectedKeys.filter(k => k !== value)
        : [...selectedKeys, value];
      setSelectedKeys(newKeys);
    } else {
      // 单选模式
      setSelectedKeys(selectedKeys.includes(value) ? [] : [value]);
    }
  };

  return (
    <div className={cn(
      'p-3 bg-white rounded-md border border-gray-200 shadow-lg min-w-[200px]',
      className
    )}>
      {/* 文本搜索框 */}
      <div className="mb-3">
        <div className="relative">
          <input
            ref={searchInput}
            type="text"
            className={cn(
              'w-full pl-3 pr-3 py-2 text-sm',
              'border border-gray-300 rounded',
              'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              'placeholder:text-gray-400'
            )}
            placeholder={`Search ${column.label}...`}
            value={selectedKeys[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedKeys(value ? [value] : []);
            }}
            onKeyDown={handleKeyPress}
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* 预设选项 */}
      {hasPresets && (
        <div className="mb-3 space-y-1">
          {column.filters.map((filter: { text: string; value: any }) => {
            const isSelected = selectedKeys.includes(filter.value);
            return (
              <div
                key={String(filter.value)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded cursor-pointer transition-colors',
                  'flex items-center gap-2',
                  isSelected
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={() => handlePresetClick(filter.value)}
              >
                {filterMultiple && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isSelected}
                    onChange={() => {}}
                  />
                )}
                <span>{filter.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium',
            'bg-blue-500 text-white rounded',
            'hover:bg-blue-600 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          Search
        </button>
        <button
          onClick={handleReset}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium',
            'bg-gray-100 text-gray-700 rounded',
            'hover:bg-gray-200 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
            'flex items-center justify-center gap-1'
          )}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default TableFilterDropdown;
