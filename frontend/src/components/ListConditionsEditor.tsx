import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LIST_CONDITION_FIELD_OPTIONS, getConditionFieldMeta } from '../constants/governance-ui';

export type ListConditionMode = 'all' | 'any';
export type ListConditionOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'exists';
export type ListConditionField =
  | 'ip'
  | 'asn'
  | 'visitorId'
  | 'userAgent'
  | 'zoneId'
  | 'country'
  | 'device'
  | 'isp'
  | 'ispType'
  | 'orgName'
  | 'fingerprint'
  | 'verifiedBot'
  | 'botScore'
  | 'ja3'
  | 'ja4'
  | 'jsDetectionPassed'
  | 'challengeState'
  | 'tokenReplayState'
  | 'campaignCount7d'
  | 'visitorRepeat7d'
  | 'ipRepeat7d'
  | 'suspiciousSignal'
  | 'utmSource'
  | 'utmCampaign'
  | 'browser'
  | 'subId1'
  | 'subId2'
  | 'subId3'
  | 'subId4'
  | 'subId5';

export interface ListCondition {
  field: ListConditionField;
  operator: ListConditionOperator;
  value?: string | string[];
}

interface ListConditionsEditorProps {
  title?: string;
  matchMode: ListConditionMode;
  conditions: ListCondition[];
  onMatchModeChange: (mode: ListConditionMode) => void;
  onConditionsChange: (conditions: ListCondition[]) => void;
}

const operatorOptions: Array<{ value: ListConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in', label: 'In (comma list)' },
  { value: 'exists', label: 'Exists' },
];

function describeMatchMode(mode: ListConditionMode, count: number): string {
  if (mode === 'any') {
    return count <= 1 ? 'Match ANY condition' : `Match ANY condition (${count} choices)`;
  }

  return count <= 1 ? 'Match ALL conditions' : `Match ALL conditions (${count} required)`;
}

function getDisplayValue(condition: ListCondition): string {
  if (Array.isArray(condition.value)) {
    return condition.value.join(', ');
  }
  return condition.value || '';
}

export function ListConditionsEditor({
  title = 'Rule Conditions',
  matchMode,
  conditions,
  onMatchModeChange,
  onConditionsChange,
}: ListConditionsEditorProps) {
  const addCondition = () => {
    onConditionsChange([
      ...conditions,
      {
        field: 'ip',
        operator: 'equals',
        value: '',
      },
    ]);
  };

  const removeCondition = (index: number) => {
    onConditionsChange(conditions.filter((_, idx) => idx !== index));
  };

  const updateCondition = (index: number, patch: Partial<ListCondition>) => {
    const next = conditions.map((condition, idx) => {
      if (idx !== index) return condition;
      return {
        ...condition,
        ...patch,
      };
    });
    onConditionsChange(next);
  };

  const updateConditionOperator = (index: number, operator: ListConditionOperator) => {
    const current = conditions[index];
    if (!current) return;

    if (operator === 'exists') {
      updateCondition(index, { operator, value: undefined });
      return;
    }
    if (operator === 'in') {
      const existing = Array.isArray(current.value) ? current.value : getDisplayValue(current).split(',').map((item) => item.trim()).filter(Boolean);
      updateCondition(index, { operator, value: existing });
      return;
    }
    updateCondition(index, { operator, value: Array.isArray(current.value) ? current.value.join(', ') : current.value || '' });
  };

  const updateConditionValue = (index: number, value: string) => {
    const current = conditions[index];
    if (!current) return;

    if (current.operator === 'in') {
      const values = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      updateCondition(index, { value: values });
      return;
    }
    updateCondition(index, { value });
  };

  return (
    <div className="space-y-3 rounded-sm border border-outline-variant/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-on-surface">{title}</span>
        <button
          type="button"
          onClick={addCondition}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary hover:bg-surface-container rounded-sm"
        >
          <Plus size={14} />
          Add Condition
        </button>
      </div>

      <div className="rounded-sm border border-outline-variant/40 bg-surface-container/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          Operator Logic
        </div>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-on-surface">{describeMatchMode(matchMode, conditions.length)}</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-on-surface-variant">Match</label>
            <select
              value={matchMode}
              onChange={(e) => onMatchModeChange(e.target.value as ListConditionMode)}
              className="px-3 py-1 bg-surface text-xs border border-outline-variant focus:border-primary outline-none"
            >
              <option value="all">ALL conditions (AND)</option>
              <option value="any">ANY condition (OR)</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Use ALL for tight blocking logic. Switch to ANY when a single suspicious signal should trigger the entry.
        </p>
      </div>

      {conditions.length === 0 && (
        <p className="text-xs text-on-surface-variant">
          No conditions yet. Add rules like Country contains, SUBID in list, Fingerprint equals.
        </p>
      )}

      {conditions.map((condition, index) => {
        const fieldMeta = getConditionFieldMeta(condition.field);
        const placeholder =
          condition.operator === 'in'
            ? fieldMeta.listPlaceholder || 'a,b,c'
            : fieldMeta.placeholder || 'Enter value';

        return (
          <div key={`${condition.field}-${condition.operator}-${index}`} className="space-y-1">
            <div className="grid grid-cols-12 gap-2 items-start">
              <select
                value={condition.field}
                onChange={(e) => updateCondition(index, { field: e.target.value as ListConditionField })}
                className="col-span-4 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none"
              >
                {LIST_CONDITION_FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={condition.operator}
                onChange={(e) => updateConditionOperator(index, e.target.value as ListConditionOperator)}
                className="col-span-3 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none"
              >
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {condition.operator !== 'exists' ? (
                condition.operator === 'in' ? (
                  <textarea
                    value={getDisplayValue(condition)}
                    onChange={(e) => updateConditionValue(index, e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    className="col-span-4 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none resize-y min-h-[88px]"
                  />
                ) : (
                  <textarea
                    value={getDisplayValue(condition)}
                    onChange={(e) => updateConditionValue(index, e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className="col-span-4 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none resize-y min-h-[56px]"
                  />
                )
              ) : (
                <div className="col-span-4 px-2 py-2 text-xs text-on-surface-variant border border-dashed border-outline-variant/40">
                  No value needed
                </div>
              )}

              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="col-span-1 inline-flex justify-center items-center py-2 text-on-surface-variant hover:text-error"
                title="Remove condition"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {fieldMeta.helpText ? (
              <p className="pl-1 text-[11px] text-on-surface-variant">{fieldMeta.helpText}</p>
            ) : null}
            {condition.operator === 'in' ? (
              <p className="pl-1 text-[11px] text-on-surface-variant">
                Enter multiple values separated by commas or new lines.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default ListConditionsEditor;
