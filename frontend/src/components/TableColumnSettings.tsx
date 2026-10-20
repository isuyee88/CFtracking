/**
 * @file 表格列布局：显示/隐藏、排序、持久化。
 * @platform cftracking
 * @owner frontend
 * @invariant 每个 tableId 独立持久化；至少保留一列；锁定列不可隐藏/移动。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Columns3, RotateCcw, X } from 'lucide-react';

export interface TableColumnItem {
  key: string;
  label: string;
  locked?: boolean;
}

interface ColumnLayout {
  order: string[];
  hidden: string[];
}

const STORAGE_PREFIX = 'cftracking-table-columns:';

function loadLayout(tableId: string, items: TableColumnItem[]): ColumnLayout {
  const defaults = { order: items.map((item) => item.key), hidden: [] as string[] };
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
}: {
  items: TableColumnItem[];
  visible: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openPanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(320, window.innerWidth - 24);
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      });
    }
    setOpen((value) => !value);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPanel}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-surface px-2.5 text-xs font-medium text-fg-default hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-accent-fg"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Columns3 size={14} aria-hidden="true" />
        Columns
        <span className="rounded bg-surface-container-high px-1 text-[10px] text-fg-subtle">{visible.length}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Table columns"
            className="fixed z-50 w-[min(320px,calc(100vw-24px))] rounded-lg border border-border-default bg-surface-container-lowest p-3 shadow-xl"
            style={{ top: position.top, left: position.left }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-fg-default">Columns</p>
                <p className="text-[11px] text-fg-subtle">Show, hide or reorder</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close column settings" className="rounded p-1 text-fg-subtle hover:bg-surface-container-high">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {items.map((item, index) => {
                const isVisible = visible.includes(item.key);
                const previous = items.slice(0, index).reverse().find((candidate) => !candidate.locked);
                const next = items.slice(index + 1).find((candidate) => !candidate.locked);
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
                          disabled={!previous}
                          onClick={() => onMove(item.key, -1)}
                          className="rounded p-1 text-fg-subtle hover:bg-surface-container-high disabled:opacity-30"
                          aria-label={`Move ${item.label || item.key} up`}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={!next}
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

            <button type="button" onClick={onReset} className="mt-2 inline-flex items-center gap-1 text-xs text-accent-fg hover:underline">
              <RotateCcw size={12} /> Reset columns
            </button>
          </div>
        </>
      )}
    </>
  );
}
