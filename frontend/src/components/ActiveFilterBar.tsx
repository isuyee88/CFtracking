/**
 * @file 已生效筛选条件 chips。
 * @platform cftracking
 * @owner frontend
 * @invariant 只展示/清除已生效条件，不在这里改业务筛选逻辑。
 */
import React from 'react';
import { X } from 'lucide-react';

export interface ActiveFilterItem {
  key: string;
  label: string;
  onClear: () => void;
}

export function ActiveFilterBar({
  items,
  onClearAll,
  className = '',
}: {
  items: ActiveFilterItem[];
  onClearAll?: () => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Active filters">
      <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Active</span>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-container-low py-1 pe-1 ps-2.5 text-xs text-fg-default">
          {item.label}
          <button
            type="button"
            onClick={item.onClear}
            className="rounded-full p-0.5 text-fg-subtle hover:bg-surface-container-high hover:text-fg-default focus-visible:ring-2 focus-visible:ring-accent-fg"
            aria-label={`Clear ${item.label}`}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && items.length > 1 && (
        <button type="button" onClick={onClearAll} className="text-xs text-accent-fg hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
}

export default ActiveFilterBar;
