/**
 * File: FilterBuilder.tsx
 * Purpose: 可复用的过滤器构建组件
 * Input/Output: 接收过滤器配置，输出配置变更事件
 * Logic: 参考Keitaro的过滤功能，支持可视化构建过滤条件
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  FilterCondition,
  FilterGroup,
  FilterConfig,
  FilterLogic,
  FilterDefinition,
} from './FilterTypes';
import {
  FILTER_FIELDS,
  OPERATOR_CONFIG,
  FILTER_CATEGORIES,
} from './FilterTypes';
import { formatFilterDescription } from './FilterEngine';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 组件属性
interface FilterBuilderProps {
  config: FilterConfig;
  onChange: (config: FilterConfig) => void;
  availableFields?: FilterDefinition[];
  maxConditions?: number;
  maxGroups?: number;
  showPreview?: boolean;
  className?: string;
}

// 默认空配置
const createEmptyConfig = (): FilterConfig => ({
  groups: [createEmptyGroup()],
  globalLogic: 'AND',
});

const createEmptyGroup = (): FilterGroup => ({
  id: `group-${Date.now()}`,
  name: 'Filter Group',
  logic: 'AND',
  conditions: [createEmptyCondition()],
});

const createEmptyCondition = (): FilterCondition => ({
  id: `cond-${Date.now()}`,
  field: '',
  operator: 'equals',
  value: '',
});

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  config,
  onChange,
  availableFields = FILTER_FIELDS,
  maxConditions = 50,
  maxGroups = 10,
  showPreview = true,
  className,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 获取当前配置或使用默认
  const currentConfig = config || createEmptyConfig();

  // 更新配置
  const updateConfig = useCallback(
    (updates: Partial<FilterConfig>) => {
      onChange({ ...currentConfig, ...updates });
    },
    [currentConfig, onChange]
  );

  // 添加组
  const addGroup = () => {
    if (currentConfig.groups.length >= maxGroups) {
      alert(`Maximum ${maxGroups} groups allowed`);
      return;
    }
    const newGroup = createEmptyGroup();
    updateConfig({
      groups: [...currentConfig.groups, newGroup],
    });
    setExpandedGroups((prev) => new Set(prev).add(newGroup.id));
  };

  // 删除组
  const removeGroup = (groupId: string) => {
    updateConfig({
      groups: currentConfig.groups.filter((g) => g.id !== groupId),
    });
  };

  // 更新组
  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    updateConfig({
      groups: currentConfig.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    });
  };

  // 添加条件
  const addCondition = (groupId: string) => {
    const group = currentConfig.groups.find((g) => g.id === groupId);
    if (!group) return;

    if (group.conditions.length >= maxConditions) {
      alert(`Maximum ${maxConditions} conditions per group allowed`);
      return;
    }

    updateGroup(groupId, {
      conditions: [...group.conditions, createEmptyCondition()],
    });
  };

  // 删除条件
  const removeCondition = (groupId: string, conditionId: string) => {
    const group = currentConfig.groups.find((g) => g.id === groupId);
    if (!group) return;

    updateGroup(groupId, {
      conditions: group.conditions.filter((c) => c.id !== conditionId),
    });
  };

  // 更新条件
  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    const group = currentConfig.groups.find((g) => g.id === groupId);
    if (!group) return;

    updateGroup(groupId, {
      conditions: group.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  // 切换组展开状态
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 获取字段定义
  const getFieldDef = (fieldValue: string): FilterDefinition | undefined => {
    return availableFields.find((f) => f.value === fieldValue);
  };

  // 获取分类下的字段
  const getFieldsByCategory = (category: string) => {
    return availableFields.filter((f) => f.category === category);
  };

  // 统计条件数量
  const totalConditions = currentConfig.groups.reduce(
    (sum, g) => sum + g.conditions.length,
    0
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            <Filter size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-primary">Filter Builder</h3>
            <p className="text-xs text-on-surface-variant">
              {totalConditions} condition{totalConditions !== 1 ? 's' : ''} in{' '}
              {currentConfig.groups.length} group
              {currentConfig.groups.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Global Logic */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">Group Logic:</span>
          <div className="flex bg-surface-container rounded-sm">
            {(['AND', 'OR'] as FilterLogic[]).map((logic) => (
              <button
                key={logic}
                onClick={() => updateConfig({ globalLogic: logic })}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all',
                  currentConfig.globalLogic === logic
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                )}
              >
                {logic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {currentConfig.groups.map((group, groupIndex) => (
          <div
            key={group.id}
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-sm overflow-hidden"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between p-3 bg-surface-container-low border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="p-1 hover:bg-surface-container rounded transition-colors"
                >
                  {expandedGroups.has(group.id) ? (
                    <ChevronUp size={16} className="text-on-surface-variant" />
                  ) : (
                    <ChevronDown size={16} className="text-on-surface-variant" />
                  )}
                </button>
                <span className="text-sm font-bold text-primary">
                  Group {groupIndex + 1}
                </span>
                <span className="text-xs text-on-surface-variant">
                  ({group.conditions.length} conditions)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Group Logic */}
                <div className="flex bg-surface-container rounded-sm">
                  {(['AND', 'OR'] as FilterLogic[]).map((logic) => (
                    <button
                      key={logic}
                      onClick={() => updateGroup(group.id, { logic })}
                      className={cn(
                        'px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all',
                        group.logic === logic
                          ? 'bg-secondary text-on-secondary'
                          : 'text-on-surface-variant hover:bg-surface-container-highest'
                      )}
                    >
                      {logic}
                    </button>
                  ))}
                </div>

                {currentConfig.groups.length > 1 && (
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                    title="Remove group"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Conditions */}
            {expandedGroups.has(group.id) && (
              <div className="p-3 space-y-2">
                {group.conditions.map((condition, conditionIndex) => (
                  <FilterConditionRow
                    key={condition.id}
                    condition={condition}
                    conditionIndex={conditionIndex}
                    groupLogic={group.logic}
                    availableFields={availableFields}
                    onChange={(updates) =>
                      updateCondition(group.id, condition.id, updates)
                    }
                    onRemove={() =>
                      removeCondition(group.id, condition.id)
                    }
                    showLogic={conditionIndex > 0}
                  />
                ))}

                {/* Add Condition Button */}
                <button
                  onClick={() => addCondition(group.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-outline-variant text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-all rounded-sm"
                >
                  <Plus size={14} />
                  Add Condition
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Group Button */}
      <button
        onClick={addGroup}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container-high transition-colors rounded-sm"
      >
        <Plus size={16} />
        Add Filter Group
      </button>

      {/* Preview */}
      {showPreview && totalConditions > 0 && (
        <div className="p-4 bg-surface-container-low rounded-sm">
          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Filter Preview
          </h4>
          <div className="text-sm text-on-surface font-mono whitespace-pre-wrap">
            {currentConfig.groups.map((group, i) => (
              <div key={group.id}>
                {i > 0 && (
                  <span className="text-primary font-bold">
                    {' '}
                    {currentConfig.globalLogic}{' '}
                  </span>
                )}
                <span>(</span>
                {group.conditions.map((cond, j) => (
                  <span key={cond.id}>
                    {j > 0 && (
                      <span className="text-secondary font-bold">
                        {' '}
                        {group.logic}{' '}
                      </span>
                    )}
                    {formatFilterDescription(cond)}
                  </span>
                ))}
                <span>)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 单个条件行组件
interface FilterConditionRowProps {
  condition: FilterCondition;
  conditionIndex: number;
  groupLogic: FilterLogic;
  availableFields: FilterDefinition[];
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  showLogic: boolean;
}

const FilterConditionRow: React.FC<FilterConditionRowProps> = ({
  condition,
  conditionIndex,
  groupLogic,
  availableFields,
  onChange,
  onRemove,
  showLogic,
}) => {
  const fieldDef = availableFields.find((f) => f.value === condition.field);
  const availableOperators = fieldDef?.operators || ['equals'];
  const operatorConfig = OPERATOR_CONFIG[condition.operator];

  // 当字段改变时，重置操作符和值
  const handleFieldChange = (fieldValue: string) => {
    const newFieldDef = availableFields.find((f) => f.value === fieldValue);
    const newOperators = newFieldDef?.operators || ['equals'];
    onChange({
      field: fieldValue,
      operator: newOperators[0],
      value: '',
    });
  };

  return (
    <div className="flex items-start gap-2">
      {/* Logic Indicator */}
      {showLogic ? (
        <div className="flex-shrink-0 w-12 h-8 flex items-center justify-center">
          <span className="text-[10px] font-bold text-secondary uppercase">
            {groupLogic}
          </span>
        </div>
      ) : (
        <div className="flex-shrink-0 w-12 h-8 flex items-center justify-center">
          <span className="text-xs text-on-surface-variant">{conditionIndex + 1}</span>
        </div>
      )}

      {/* Field Selector */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="flex-shrink-0 w-40 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
      >
        <option value="">Select field...</option>
        {FILTER_CATEGORIES.map((cat) => {
          const catFields = availableFields.filter((f) => f.category === cat.value);
          if (catFields.length === 0) return null;
          return (
            <optgroup key={cat.value} label={cat.label}>
              {catFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {/* Operator Selector */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ operator: e.target.value as any })}
        disabled={!condition.field}
        className="flex-shrink-0 w-36 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm disabled:opacity-50"
      >
        {availableOperators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_CONFIG[op]?.label || op}
          </option>
        ))}
      </select>

      {/* Value Input */}
      {operatorConfig?.needsValue && (
        <div className="flex-1">
          {operatorConfig.allowMultiple ||
          condition.operator === 'in_list' ||
          condition.operator === 'not_in_list' ? (
            <input
              type="text"
              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
              onChange={(e) =>
                onChange({
                  value: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              placeholder={fieldDef?.placeholder || 'Enter values, comma separated'}
              className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
            />
          ) : condition.operator === 'between' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={Array.isArray(condition.value) ? condition.value[0] || '' : ''}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : ['', ''];
                  onChange({
                    value: [e.target.value, current[1] || ''],
                  });
                }}
                placeholder="Min"
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
              />
              <span className="text-on-surface-variant">-</span>
              <input
                type="text"
                value={Array.isArray(condition.value) ? condition.value[1] || '' : ''}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : ['', ''];
                  onChange({
                    value: [current[0] || '', e.target.value],
                  });
                }}
                placeholder="Max"
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
              />
            </div>
          ) : (
            <input
              type="text"
              value={condition.value as string}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={fieldDef?.placeholder || 'Enter value'}
              className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm focus:border-primary outline-none rounded-sm"
            />
          )}
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 text-on-surface-variant hover:text-error transition-colors"
        title="Remove condition"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default FilterBuilder;
