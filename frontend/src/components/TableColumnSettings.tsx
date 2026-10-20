/**
 * @file 表格列布局：显示/隐藏、排序、持久化。
 * @platform cftracking
 * @owner frontend
 * @invariant 每个 tableId 独立持久化；至少保留一列；锁定列不可隐藏/移动。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Columns3, RotateCcw, X } from 'lucide-react';

export interface TableColumnItem {
  key: string;
  label: string;
  locked?: boolean;
  defaultHidden?: boolean;
}

interface ColumnLayout {
  order: string[];
  hidden: string[];
}

const STORAGE_PREFIX = 'cftracking-table-columns:';

function loadLayout(tableId: string, items: TableColumnItem[]): ColumnLayout {
  const defaults = {
    order: items.map((item) => item.key),
    hidden: items.filter((item) => item.defaultHidden && !item.locked).map((item) => item.key),
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + tableId);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ColumnLayout>;
    const known = new Set(items.map((item) => item.key));
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((key) => known.has(key))
      : defaults.order;
    for (const item of items) if (!order.includes(item.key)) order.push(item.key);
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((key) => known.has(key) && !items.find((item) => item.key === key)?.locked)
      : [];
    return { order, hidden };
  } catch {
    return defaults;
  }
}

export function useTableColumnLayout(tableId: string, items: TableColumnItem[]) {
  const [layout, setLayout] = useState<ColumnLayout>(() => loadLayout(tableId, items));

  useEffect(() => {
    setLayout(loadLayout(tableId, items));
    // Only reset when the table identity changes; column metadata is merged by the setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(layout));
    } catch {
      // localStorage may be unavailable in private mode; layout still works in memory.
    }
  }, [layout, tableId]);

  const toggle = useCallback((key: string) => {
    setLayout((current) => {
      if (current.hidden.includes(key)) {
        return { ...current, hidden: current.hidden.filter((item) => item !== key) };
      }
      const visibleCount = items.filter((item) => !item.locked && !current.hidden.includes(item.key)).length;
      if (visibleCount <= 1) return current;
      return { ...current, hidden: [...current.hidden, key] };
    });
  }, [items]);

  const move = useCallback((key: string, direction: -1 | 1) => {
    setLayout((current) => {
      const index = current.order.indexOf(key);
      if (index < 0) return current;
      let target = index + direction;
      while (target >= 0 && target < current.order.length && items.find((item) => item.key === current.order[target])?.locked) {
        target += direction;
      }
      if (target < 0 || target >= current.order.length) return current;
      const order = [...current.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, order };
    });
  }, [items]);

  const reset = useCallback(() => setLayout({ order: items.map((item) => item.key), hidden: [] }), [items]);

  const visible = useMemo(
    () => layout.order.filter((key) => !layout.hidden.includes(key)),
    [layout],
  );

  return { layout, visible, toggle, move, reset };
}

export function TableColumnSettings({
  items,
  visible,
  onToggle,
  onMove,
  onReset,
  compact = false,
}: {
  items: TableColumnItem[];
  visible: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-surface px-2.5 text-xs font-medium text-fg-default hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-accent-fg"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Table columns"
        title="Table columns"
      >
        <Columns3 size={14} aria-hidden="true" />
        {!compact && (
          <>
            Columns
            <span className="rounded bg-surface-container-high px-1 text-[10px] text-fg-subtle">{visible.length}</span>
          </>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Table columns"
            className="flex max-h-[82vh] w-full max-w-sm flex-col rounded-t-2xl border border-border-default bg-surface-container-lowest shadow-2xl sm:max-h-[76vh] sm:rounded-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
              <div>
                <p className="text-sm font-semibold text-fg-default">Columns</p>
                <p className="text-[11px] text-fg-subtle">Show, hide or reorder</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close column settings" className="rounded p-1 text-fg-subtle hover:bg-surface-container-high">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-2">
              {items.map((item) => {
                const isVisible = visible.includes(item.key);
                return (
                  <div key={item.key} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      disabled={item.locked}
                      onChange={() => onToggle(item.key)}
                      aria-label={`Show ${item.label || item.key}`}
                      className="rounded border-border-default"
                    />
                    <span className={`min-w-0 flex-1 truncate text-xs ${item.locked ? 'text-fg-subtle' : 'text-fg-default'}`}>
                      {item.label || item.key}
                    </span>
                    {!item.locked && (
                      <>
                        <button
                          type="button"
                          onClick={() => onMove(item.key, -1)}
                          className="rounded p-1 text-fg-subtle hover:bg-surface-container-high disabled:opacity-30"
                          aria-label={`Move ${item.label || item.key} up`}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(item.key, 1)}
                          className="rounded p-1 text-fg-subtle hover:bg-surface-container-high disabled:opacity-30"
                          aria-label={`Move ${item.label || item.key} down`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={onReset} className="mx-3 mb-3 mt-0 inline-flex shrink-0 items-center gap-1 border-t border-border-default pt-2 text-xs text-accent-fg hover:underline">
              <RotateCcw size={12} /> Reset columns
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
