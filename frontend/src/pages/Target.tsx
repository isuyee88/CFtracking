/**
 * @file Target 页面：管理投放定向草稿（国家/设备/浏览器/系统等）。
 * @owner frontend
 * @invariant 数据只存在浏览器 localStorage：当前 Worker 没有 /api/targets 契约，不能假装已同步。
 * @invariant 增删改都在本页完成并立即落盘；表格空态只由 VirtualTableEnhanced 渲染一次。
 * @see docs/architecture/cftracking-admin-ux-review-2026-10-20.md
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Target as TargetIcon, X } from 'lucide-react';
import type { Target } from '../services/api';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import { TablePagination } from '../components/TablePagination';
import { PageNotice } from '../components/PageNotice';
import { useClientPagination } from '../hooks/useClientPagination';

const TARGETS_KEY = 'cftracking-targets';

const TARGET_TYPES: Target['type'][] = ['country', 'device', 'browser', 'os', 'isp', 'ip'];

/** 读取本机草稿；损坏的 JSON 视为空列表，避免整页白屏。 */
function loadTargets(): Target[] {
  try {
    const saved = window.localStorage.getItem(TARGETS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as Target[]) : [];
  } catch {
    return [];
  }
}

interface TargetDraft {
  name: string;
  type: Target['type'];
  values: string;
  status: Target['status'];
}

const EMPTY_DRAFT: TargetDraft = { name: '', type: 'country', values: '', status: 'active' };

export const TargetPage: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [draft, setDraft] = useState<TargetDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 与其它列表页一致：每页 10 条，分页条在表格之上，移动端用卡片。
  const { rows: paginatedTargets, page, pageSize, totalItems, totalPages, setPage } = useClientPagination(targets, {
    pageSize: 10,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    } catch {
      // 存储不可用（隐私模式/配额满）时保持当前会话可用，不阻断操作。
    }
  }, [targets]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setError(null);
  };

  const openEdit = (target: Target) => {
    setEditingId(target.id);
    setDraft({
      name: target.name,
      type: target.type,
      values: target.values.join(', '),
      status: target.status,
    });
    setError(null);
  };

  const closeDraft = () => {
    setDraft(null);
    setEditingId(null);
    setError(null);
  };

  const submitDraft = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const values = draft.values
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!name) return setError('Name is required.');
    if (values.length === 0) return setError('Add at least one value, separated by commas.');

    if (editingId) {
      setTargets((current) =>
        current.map((target) =>
          target.id === editingId ? { ...target, name, type: draft.type, values, status: draft.status } : target,
        ),
      );
    } else {
      setTargets((current) => [
        ...current,
        {
          id: `${Date.now()}`,
          name,
          type: draft.type,
          values,
          status: draft.status,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    closeDraft();
  };

  const removeTarget = (target: Target) => {
    const confirmed = window.confirm(`Delete target "${target.name}" from this browser?`);
    if (!confirmed) return;
    setTargets((current) => current.filter((item) => item.id !== target.id));
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        width: '240px',
        className: 'flex-1 min-w-0',
        render: (_: unknown, target: Target) => <span className="font-medium text-fg-default">{target.name}</span>,
      },
      {
        key: 'type',
        label: 'Type',
        width: '100px',
        render: (_: unknown, target: Target) => <span className="capitalize text-fg-muted">{target.type}</span>,
      },
      {
        key: 'values',
        label: 'Values',
        width: '300px',
        render: (_: unknown, target: Target) => (
          <span className="truncate text-fg-muted" title={target.values.join(', ')}>
            {target.values.join(', ')}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: '100px',
        render: (_: unknown, target: Target) => (
          <span
            className={
              target.status === 'active'
                ? 'rounded bg-success/20 px-2 py-1 text-xs font-medium uppercase text-success'
                : 'rounded bg-warning/20 px-2 py-1 text-xs font-medium uppercase text-warning'
            }
          >
            {target.status}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        width: '96px',
        align: 'center' as const,
        render: (_: unknown, target: Target) => (
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(target)}
              className="rounded p-2 text-fg-muted hover:bg-surface-container hover:text-fg-default"
              title="Edit"
              aria-label={`Edit target ${target.name}`}
            >
              <Edit3 size={16} />
            </button>
            <button
              type="button"
              onClick={() => removeTarget(target)}
              className="rounded p-2 text-fg-muted hover:bg-error/10 hover:text-error"
              title="Delete"
              aria-label={`Delete target ${target.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    // 列定义只依赖渲染函数与被引用的稳定回调；数据通过 data 传入，无需进依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-fg-default">
          <TargetIcon size={28} />
          Target Management
        </h1>
        <p className="mt-1 text-fg-muted">Configure targeting rules for your campaigns</p>
      </header>

      <PageNotice
        title="Targets are saved in this browser only"
        description="There is no targeting API in this deployment yet, so entries stay in local storage and the click router does not use them."
        hint="Keep drafts here, but apply real targeting through campaign rules until the server-side API ships."
      />

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-fg-muted">
            Total: {targets.length} {targets.length === 1 ? 'target' : 'targets'}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="btn-create flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Target
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          label="targets"
        />

        <div className="space-y-3 p-3 md:hidden">
          {paginatedTargets.map((target) => (
            <article key={target.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-fg-default">{target.name}</h2>
                  <p className="mt-0.5 text-xs capitalize text-fg-muted">{target.type}</p>
                </div>
                <span
                  className={
                    target.status === 'active'
                      ? 'shrink-0 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold uppercase text-success'
                      : 'shrink-0 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase text-warning'
                  }
                >
                  {target.status}
                </span>
              </div>
              <p className="mt-3 break-words text-xs text-fg-default">{target.values.join(', ')}</p>
              <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant/10 pt-2">
                <button
                  type="button"
                  onClick={() => openEdit(target)}
                  className="rounded-md border border-outline-variant/30 px-3 py-1.5 text-xs text-fg-default"
                  aria-label={`Edit target ${target.name}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeTarget(target)}
                  className="rounded-md border border-error/20 px-3 py-1.5 text-xs text-error"
                  aria-label={`Delete target ${target.name}`}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {paginatedTargets.length === 0 && (
            <div className="rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-fg-muted">
              No targets yet. Use "Add Target" to create a local draft.
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <VirtualTableEnhanced
            tableId="targets"
            columns={columns}
            data={paginatedTargets}
            rowHeight={64}
            height="auto"
            emptyMessage={'No targets yet. Use "Add Target" to create a local draft.'}
          />
        </div>
      </section>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border-default bg-surface p-6" role="dialog" aria-modal="true" aria-labelledby="target-dialog-title">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="target-dialog-title" className="text-lg font-bold text-fg-default">
                {editingId ? 'Edit target' : 'Add target'}
              </h2>
              <button type="button" onClick={closeDraft} className="rounded p-2 text-fg-muted hover:bg-surface-container" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitDraft} className="space-y-4">
              <div>
                <label htmlFor="target-name" className="mb-1 block text-sm font-medium text-fg-default">
                  Name
                </label>
                <input
                  id="target-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-sm text-fg-default"
                  placeholder="US desktop traffic"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="target-type" className="mb-1 block text-sm font-medium text-fg-default">
                  Type
                </label>
                <select
                  id="target-type"
                  value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value as Target['type'] })}
                  className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-sm capitalize text-fg-default"
                >
                  {TARGET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="target-values" className="mb-1 block text-sm font-medium text-fg-default">
                  Values
                </label>
                <input
                  id="target-values"
                  value={draft.values}
                  onChange={(event) => setDraft({ ...draft, values: event.target.value })}
                  className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-sm text-fg-default"
                  placeholder="US, CA, GB"
                  aria-describedby="target-values-hint"
                />
                <p id="target-values-hint" className="mt-1 text-xs text-fg-subtle">
                  Comma separated; stored verbatim.
                </p>
              </div>

              <div>
                <label htmlFor="target-status" className="mb-1 block text-sm font-medium text-fg-default">
                  Status
                </label>
                <select
                  id="target-status"
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as Target['status'] })}
                  className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-sm capitalize text-fg-default"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </div>

              {error && (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-default pt-4">
                <button type="button" onClick={closeDraft} className="rounded-md border border-border-default px-4 py-2 text-sm text-fg-default">
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary">
                  {editingId ? 'Save changes' : 'Add target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetPage;
