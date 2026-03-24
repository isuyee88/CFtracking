/**
 * File: ReportFilterBuilder.tsx
 * Purpose: 报表筛选构建器组件，参考 Keitaro 实现
 * Input: columns - 可用列配置，filters - 当前筛选条件，onFiltersChange - 筛选变化回调
 * Output: 渲染筛选构建器 UI，支持多条件组合、逻辑运算符
 */

import React, { useState, useMemo } from 'react';
import { Plus, X, ChevronDown, Filter, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ReportColumn {
  key: string;
  label: string;
  category: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'AND' | 'OR';
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_empty'
  | 'is_not_empty';

interface FilterOperatorOption {
  value: FilterOperator;
  label: string;
  applicableTo: ('string' | 'number' | 'date' | 'boolean')[];
  requiresValue: boolean;
}

const FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: 'equals', label: '等于', applicableTo: ['string', 'number', 'date', 'boolean'], requiresValue: true },
  { value: 'not_equals', label: '不等于', applicableTo: ['string', 'number', 'date', 'boolean'], requiresValue: true },
  { value: 'contains', label: '包含', applicableTo: ['string'], requiresValue: true },
  { value: 'not_contains', label: '不包含', applicableTo: ['string'], requiresValue: true },
  { value: 'starts_with', label: '开头是', applicableTo: ['string'], requiresValue: true },
  { value: 'ends_with', label: '结尾是', applicableTo: ['string'], requiresValue: true },
  { value: 'greater_than', label: '大于', applicableTo: ['number', 'date'], requiresValue: true },
  { value: 'less_than', label: '小于', applicableTo: ['number', 'date'], requiresValue: true },
  { value: 'greater_than_or_equal', label: '大于等于', applicableTo: ['number', 'date'], requiresValue: true },
  { value: 'less_than_or_equal', label: '小于等于', applicableTo: ['number', 'date'], requiresValue: true },
  { value: 'in', label: '在...中', applicableTo: ['string', 'number'], requiresValue: true },
  { value: 'not_in', label: '不在...中', applicableTo: ['string', 'number'], requiresValue: true },
  { value: 'between', label: '在...之间', applicableTo: ['number', 'date'], requiresValue: true },
  { value: 'is_empty', label: '为空', applicableTo: ['string', 'number', 'date'], requiresValue: false },
  { value: 'is_not_empty', label: '不为空', applicableTo: ['string', 'number', 'date'], requiresValue: false },
];

interface ReportFilterBuilderProps {
  columns: ReportColumn[];
  filters: ReportFilter[];
  onFiltersChange: (filters: ReportFilter[]) => void;
}

export const ReportFilterBuilder: React.FC<ReportFilterBuilderProps> = ({
  columns,
  filters,
  onFiltersChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  // 添加筛选条件
  const addFilter = () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;

    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      field: firstColumn.key,
      operator: 'equals',
      value: '',
      logic: filters.length > 0 ? 'AND' : undefined,
    };

    onFiltersChange([...filters, newFilter]);
  };

  // 移除筛选条件
  const removeFilter = (filterId: string) => {
    onFiltersChange(filters.filter((f) => f.id !== filterId));
  };

  // 更新筛选条件
  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    onFiltersChange(
      filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
    );
  };

  // 移动筛选条件
  const moveFilter = (fromIndex: number, toIndex: number) => {
    const newFilters = [...filters];
    const [removed] = newFilters.splice(fromIndex, 1);
    newFilters.splice(toIndex, 0, removed);
    onFiltersChange(newFilters);
  };

  // 获取列类型
  const getColumnType = (fieldKey: string): 'string' | 'number' | 'date' | 'boolean' => {
    const column = columns.find((c) => c.key === fieldKey);
    return column?.type || 'string';
  };

  // 获取可用的操作符
  const getAvailableOperators = (fieldKey: string) => {
    const columnType = getColumnType(fieldKey);
    return FILTER_OPERATORS.filter((op) => op.applicableTo.includes(columnType));
  };

  return (
    <div className="bg-surface rounded-sm border border-outline-variant">
      {/* 筛选器头部 */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b border-outline-variant',
          'cursor-pointer hover:bg-surface-container/30 transition-colors'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-fg-muted" />
          <h3 className="font-display font-semibold text-on-surface">筛选条件</h3>
          {filters.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {filters.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addFilter();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加条件
          </button>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-fg-muted transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* 筛选器内容 */}
      {expanded && (
        <div className="p-4 space-y-3">
          {filters.length === 0 ? (
            <div className="text-center py-8 text-fg-muted">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无筛选条件</p>
              <p className="text-xs mt-1">点击"添加条件"开始设置筛选</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <FilterRow
                  key={filter.id}
                  filter={filter}
                  index={index}
                  columns={columns}
                  onUpdate={(updates) => updateFilter(filter.id, updates)}
                  onRemove={() => removeFilter(filter.id)}
                  onMove={(toIndex) => moveFilter(index, toIndex)}
                  canChangeLogic={index > 0}
                />
              ))}
            </div>
          )}

          {/* 底部操作 */}
          {filters.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
              <button
                onClick={addFilter}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加条件
              </button>
              {filters.length > 0 && (
                <button
                  onClick={() => onFiltersChange([])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 rounded-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空所有
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface FilterRowProps {
  filter: ReportFilter;
  index: number;
  columns: ReportColumn[];
  onUpdate: (updates: Partial<ReportFilter>) => void;
  onRemove: () => void;
  onMove: (toIndex: number) => void;
  canChangeLogic: boolean;
}

const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  index,
  columns,
  onUpdate,
  onRemove,
  onMove,
  canChangeLogic,
}) => {
  const columnType = useMemo(
    () =>
      columns.find((c) => c.key === filter.field)?.type || 'string',
    [columns, filter.field]
  );

  const availableOperators = useMemo(
    () => getAvailableOperatorsForType(columnType),
    [columnType]
  );

  return (
    <div className="flex items-center gap-2 p-3 bg-surface-container/30 rounded-sm border border-outline-variant/50">
      {/* 逻辑运算符 */}
      {canChangeLogic && (
        <select
          value={filter.logic || 'AND'}
          onChange={(e) => onUpdate({ logic: e.target.value as 'AND' | 'OR' })}
          className={cn(
            'px-2 py-1.5 text-xs font-medium rounded-sm border',
            'bg-surface border-outline-variant text-on-surface',
            'focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
          title="逻辑关系"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}

      {/* 字段选择 */}
      <select
        value={filter.field}
        onChange={(e) => {
          const newField = e.target.value;
          const newType = columns.find((c) => c.key === newField)?.type || 'string';
          const defaultOperator = getAvailableOperatorsForType(newType)[0]?.value || 'equals';
          onUpdate({ field: newField, operator: defaultOperator, value: '' });
        }}
        className={cn(
          'flex-1 min-w-[150px] px-3 py-1.5 text-sm rounded-sm border',
          'bg-surface border-outline-variant text-on-surface',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      >
        {columns.map((col) => (
          <option key={col.key} value={col.key}>
            {col.label}
          </option>
        ))}
      </select>

      {/* 操作符选择 */}
      <select
        value={filter.operator}
        onChange={(e) => {
          const newOperator = e.target.value as FilterOperator;
          const requiresValue = FILTER_OPERATORS.find(
            (op) => op.value === newOperator
          )?.requiresValue;
          onUpdate({
            operator: newOperator,
            value: requiresValue ? filter.value : '',
          });
        }}
        className={cn(
          'w-[140px] px-3 py-1.5 text-sm rounded-sm border',
          'bg-surface border-outline-variant text-on-surface',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      >
        {availableOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* 值输入 */}
      {requiresValueForOperator(filter.operator) && (
        <FilterValueInput
          filter={filter}
          columnType={columnType}
          onUpdate={onUpdate}
        />
      )}

      {/* 移除按钮 */}
      <button
        onClick={onRemove}
        className="p-1.5 text-fg-muted hover:text-error hover:bg-error/10 rounded-sm transition-colors"
        title="移除条件"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface FilterValueInputProps {
  filter: ReportFilter;
  columnType: 'string' | 'number' | 'date' | 'boolean';
  onUpdate: (updates: Partial<ReportFilter>) => void;
}

const FilterValueInput: React.FC<FilterValueInputProps> = ({
  filter,
  columnType,
  onUpdate,
}) => {
  if (filter.operator === 'between') {
    return (
      <div className="flex items-center gap-1">
        <input
          type={columnType === 'date' ? 'date' : columnType === 'number' ? 'number' : 'text'}
          value={filter.value?.[0] || ''}
          onChange={(e) => onUpdate({ value: [e.target.value, filter.value?.[1] || ''] })}
          placeholder="开始值"
          className={cn(
            'w-[120px] px-2 py-1.5 text-sm rounded-sm border',
            'bg-surface border-outline-variant text-on-surface',
            'focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
        />
        <span className="text-fg-muted text-sm">至</span>
        <input
          type={columnType === 'date' ? 'date' : columnType === 'number' ? 'number' : 'text'}
          value={filter.value?.[1] || ''}
          onChange={(e) => onUpdate({ value: [filter.value?.[0] || '', e.target.value] })}
          placeholder="结束值"
          className={cn(
            'w-[120px] px-2 py-1.5 text-sm rounded-sm border',
            'bg-surface border-outline-variant text-on-surface',
            'focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
        />
      </div>
    );
  }

  if (filter.operator === 'in' || filter.operator === 'not_in') {
    return (
      <input
        type="text"
        value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
        onChange={(e) =>
          onUpdate({ value: e.target.value.split(',').map((v: string) => v.trim()) })
        }
        placeholder="用逗号分隔多个值"
        className={cn(
          'w-[200px] px-2 py-1.5 text-sm rounded-sm border',
          'bg-surface border-outline-variant text-on-surface',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      />
    );
  }

  if (columnType === 'boolean') {
    return (
      <select
        value={filter.value || 'true'}
        onChange={(e) => onUpdate({ value: e.target.value === 'true' })}
        className={cn(
          'w-[120px] px-2 py-1.5 text-sm rounded-sm border',
          'bg-surface border-outline-variant text-on-surface',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      >
        <option value="true">是</option>
        <option value="false">否</option>
      </select>
    );
  }

  return (
    <input
      type={columnType === 'number' ? 'number' : columnType === 'date' ? 'date' : 'text'}
      value={filter.value || ''}
      onChange={(e) =>
        onUpdate({ value: columnType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })
      }
      placeholder={columnType === 'number' ? '输入数值' : columnType === 'date' ? '选择日期' : '输入值'}
      className={cn(
        'w-[150px] px-2 py-1.5 text-sm rounded-sm border',
        'bg-surface border-outline-variant text-on-surface',
        'focus:outline-none focus:ring-2 focus:ring-primary/20'
      )}
    />
  );
};

// 辅助函数
function getAvailableOperatorsForType(
  type: 'string' | 'number' | 'date' | 'boolean'
): FilterOperatorOption[] {
  return FILTER_OPERATORS.filter((op) => op.applicableTo.includes(type));
}

function requiresValueForOperator(operator: FilterOperator): boolean {
  const op = FILTER_OPERATORS.find((o) => o.value === operator);
  return op?.requiresValue ?? true;
}
