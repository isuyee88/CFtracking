/**
 * File: ReportColumnSelector.tsx
 * Purpose: 报表列选择器组件，参考 Keitaro 实现
 * Input: columns - 所有可用列配置，selectedColumns - 已选中的列，onColumnsChange - 列变化回调
 * Output: 渲染列选择器 UI，支持搜索、分类、批量操作
 */

import React, { useState, useMemo } from 'react';
import { Search, Check, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ReportColumn {
  key: string;
  label: string;
  category: 'basic' | 'metric' | 'dimension' | 'tracking' | 'geo' | 'device' | 'traffic';
  enabled: boolean;
  width?: string;
  description?: string;
}

interface ReportColumnSelectorProps {
  columns: ReportColumn[];
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础信息',
  metric: '指标数据',
  dimension: '维度信息',
  tracking: '追踪参数',
  geo: '地理信息',
  device: '设备信息',
  traffic: '流量来源',
};

const CATEGORY_ORDER = ['basic', 'metric', 'dimension', 'geo', 'device', 'traffic', 'tracking'];

export const ReportColumnSelector: React.FC<ReportColumnSelectorProps> = ({
  columns,
  selectedColumns,
  onColumnsChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true,
    metric: true,
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // 按类别分组列
  const columnsByCategory = useMemo(() => {
    const grouped: Record<string, ReportColumn[]> = {};
    
    columns.forEach((column) => {
      if (!grouped[column.category]) {
        grouped[column.category] = [];
      }
      grouped[column.category].push(column);
    });

    // 按类别顺序排序
    const sorted: Record<string, ReportColumn[]> = {};
    CATEGORY_ORDER.forEach((category) => {
      if (grouped[category]) {
        sorted[category] = grouped[category];
      }
    });

    return sorted;
  }, [columns]);

  // 搜索过滤
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columnsByCategory;

    const filtered: Record<string, ReportColumn[]> = {};
    const term = searchTerm.toLowerCase();

    Object.entries(columnsByCategory).forEach(([category, cols]) => {
      const matched = cols.filter(
        (col) =>
          col.label.toLowerCase().includes(term) ||
          col.key.toLowerCase().includes(term) ||
          col.description?.toLowerCase().includes(term)
      );
      if (matched.length > 0) {
        filtered[category] = matched;
      }
    });

    return filtered;
  }, [columnsByCategory, searchTerm]);

  // 切换类别展开/折叠
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 切换列选中状态
  const toggleColumn = (columnKey: string) => {
    if (selectedColumns.includes(columnKey)) {
      onColumnsChange(selectedColumns.filter((c) => c !== columnKey));
    } else {
      onColumnsChange([...selectedColumns, columnKey]);
    }
  };

  // 批量启用/禁用类别
  const toggleCategoryColumns = (category: string, enabled: boolean) => {
    const categoryCols = columnsByCategory[category]?.map((c) => c.key) || [];
    let newColumns = [...selectedColumns];

    if (enabled) {
      // 启用类别下所有列
      categoryCols.forEach((key) => {
        if (!newColumns.includes(key)) {
          newColumns.push(key);
        }
      });
    } else {
      // 禁用类别下所有列
      newColumns = newColumns.filter((key) => !categoryCols.includes(key));
    }

    onColumnsChange(newColumns);
  };

  // 全选/全不选
  const toggleAll = (enabled: boolean) => {
    if (enabled) {
      onColumnsChange(columns.map((c) => c.key));
    } else {
      onColumnsChange([]);
    }
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖拽放置
  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) return;

    const fromIndex = selectedColumns.indexOf(draggedColumn);
    const toIndex = selectedColumns.indexOf(targetKey);

    if (fromIndex === -1 || toIndex === -1) return;

    const newColumns = [...selectedColumns];
    newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, draggedColumn);

    onColumnsChange(newColumns);
    setDraggedColumn(null);
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-sm border border-outline-variant">
      {/* 头部操作区 */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-on-surface">列选择</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="text-xs text-primary hover:text-primary-dark transition-colors"
              title="全选所有列"
            >
              全选
            </button>
            <span className="text-outline-variant">|</span>
            <button
              onClick={() => toggleAll(false)}
              className="text-xs text-primary hover:text-primary-dark transition-colors"
              title="取消选择所有列"
            >
              全不选
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            placeholder="搜索列..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-2 text-sm',
              'bg-surface-container border border-outline-variant rounded-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'placeholder:text-fg-muted text-fg-default'
            )}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-container-high rounded-full"
            >
              <X className="w-3 h-3 text-fg-muted" />
            </button>
          )}
        </div>

        {/* 已选列数统计 */}
        <div className="mt-2 text-xs text-fg-muted">
          已选择 <span className="text-primary font-medium">{selectedColumns.length}</span> /{' '}
          <span className="font-medium">{columns.length}</span> 列
        </div>
      </div>

      {/* 列列表 */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredColumns).map(([category, cols]) => {
          const isExpanded = expandedCategories[category] !== false;
          const selectedInCategory = cols.filter((c) => selectedColumns.includes(c.key)).length;
          const allSelected = selectedInCategory === cols.length;

          return (
            <div key={category} className="border-b border-outline-variant/50 last:border-b-0">
              {/* 类别标题 */}
              <div
                className={cn(
                  'flex items-center justify-between px-4 py-2.5',
                  'bg-surface-container/30 hover:bg-surface-container/50',
                  'cursor-pointer transition-colors'
                )}
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-fg-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-fg-muted" />
                  )}
                  <span className="text-sm font-medium text-on-surface">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-xs text-fg-muted">({cols.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted">
                    {selectedInCategory}/{cols.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategoryColumns(category, !allSelected);
                    }}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-sm transition-colors',
                      allSelected
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'bg-surface-container text-fg-muted hover:bg-surface-container-high'
                    )}
                  >
                    {allSelected ? '已选' : '全选'}
                  </button>
                </div>
              </div>

              {/* 列选项 */}
              {isExpanded && (
                <div className="py-1">
                  {cols.map((column) => {
                    const isSelected = selectedColumns.includes(column.key);
                    const isDragging = draggedColumn === column.key;

                    return (
                      <div
                        key={column.key}
                        draggable={isSelected}
                        onDragStart={(e) => handleDragStart(e, column.key)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.key)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2',
                          'hover:bg-surface-container/50 transition-colors',
                          isSelected && 'bg-primary/5',
                          isDragging && 'opacity-50',
                          !isSelected && 'cursor-pointer'
                        )}
                      >
                        {/* 拖拽手柄 */}
                        {isSelected && (
                          <GripVertical className="w-3.5 h-3.5 text-fg-muted cursor-grab active:cursor-grabbing flex-shrink-0" />
                        )}

                        {/* 复选框 */}
                        <input
                          type="checkbox"
                          id={`col-${column.key}`}
                          checked={isSelected}
                          onChange={() => toggleColumn(column.key)}
                          className={cn(
                            'w-4 h-4 rounded border-outline-variant',
                            'text-primary focus:ring-primary/20',
                            'cursor-pointer'
                          )}
                        />

                        {/* 列信息 */}
                        <label
                          htmlFor={`col-${column.key}`}
                          className={cn(
                            'flex-1 text-sm cursor-pointer',
                            isSelected ? 'text-on-surface font-medium' : 'text-fg-muted'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>{column.label}</span>
                            {column.description && (
                              <span className="text-xs text-fg-muted" title={column.description}>
                                ℹ️
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-fg-muted font-mono mt-0.5">{column.key}</div>
                        </label>

                        {/* 选中图标 */}
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 无搜索结果 */}
        {Object.keys(filteredColumns).length === 0 && (
          <div className="p-8 text-center text-fg-muted">
            <p className="text-sm">未找到匹配的列</p>
            <p className="text-xs mt-1">尝试其他搜索关键词</p>
          </div>
        )}
      </div>
    </div>
  );
};
