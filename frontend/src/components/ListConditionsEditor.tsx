import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export type ListConditionMode = 'all' | 'any';
export type ListConditionOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'exists';
export type ListConditionField =
  | 'ip'
  | 'asn'
  | 'userAgent'
  | 'zoneId'
  | 'country'
  | 'device'
  | 'isp'
  | 'fingerprint'
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

const fieldOptions: Array<{ value: ListConditionField; label: string }> = [
  { value: 'ip', label: 'IP' },
  { value: 'asn', label: 'ASN' },
  { value: 'userAgent', label: 'User Agent' },
  { value: 'zoneId', label: 'Zone ID' },
  { value: 'country', label: 'Country' },
  { value: 'device', label: 'Device' },
  { value: 'isp', label: 'ISP' },
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'utmSource', label: 'UTM Source' },
  { value: 'utmCampaign', label: 'UTM Campaign' },
  { value: 'browser', label: 'Browser' },
  { value: 'subId1', label: 'SubID 1' },
  { value: 'subId2', label: 'SubID 2' },
  { value: 'subId3', label: 'SubID 3' },
  { value: 'subId4', label: 'SubID 4' },
  { value: 'subId5', label: 'SubID 5' },
];

const operatorOptions: Array<{ value: ListConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in', label: 'In (comma list)' },
  { value: 'exists', label: 'Exists' },
];

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

      {conditions.length === 0 && (
        <p className="text-xs text-on-surface-variant">
          No conditions yet. Add rules like Country contains, SUBID in list, Fingerprint equals.
        </p>
      )}

      {conditions.map((condition, index) => (
        <div key={`${condition.field}-${condition.operator}-${index}`} className="grid grid-cols-12 gap-2 items-start">
          <select
            value={condition.field}
            onChange={(e) => updateCondition(index, { field: e.target.value as ListConditionField })}
            className="col-span-4 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none"
          >
            {fieldOptions.map((option) => (
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
            <input
              type="text"
              value={getDisplayValue(condition)}
              onChange={(e) => updateConditionValue(index, e.target.value)}
              placeholder={condition.operator === 'in' ? 'a,b,c' : 'Enter value'}
              className="col-span-4 px-2 py-2 bg-surface text-xs border border-outline-variant focus:border-primary outline-none"
            />
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
      ))}
    </div>
  );
}

export default ListConditionsEditor;
