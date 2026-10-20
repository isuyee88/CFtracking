/**
 * File: Target.tsx
 * Purpose: Target 页面，管理目标配置
 * Input/Output: 显示目标列表，支持 CRUD 操作
 * Logic: 目标管理，包括创建、编辑、删除目标
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Check, X, Target as TargetIcon, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Target } from '../services/api';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TARGETS_KEY = 'cftracking-targets';

function loadTargets(): Target[] {
  try {
    const saved = window.localStorage.getItem(TARGETS_KEY);
    return saved ? JSON.parse(saved) as Target[] : [];
  } catch {
    return [];
  }
}

// Target 接口已从 api.ts 导入

export const TargetPage: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    } catch {
      // Storage unavailable; the page remains usable for this session.
    }
  }, [targets]);

  const handleCreate = (data: Partial<Target>) => {
    const newTarget: Target = {
      id: Date.now().toString(),
      name: data.name || '',
      type: data.type || 'country',
      values: data.values || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setTargets([...targets, newTarget]);
    setIsCreating(false);
  };

  const handleUpdate = (id: string, data: Partial<Target>) => {
    setTargets(targets.map(t => t.id === id ? { ...t, ...data } : t));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg-default flex items-center gap-2">
          <TargetIcon size={28} />
          Target Management
        </h1>
        <p className="text-fg-muted mt-1">Configure targeting rules for your campaigns</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-fg-muted">
            Total: {targets.length} targets
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="btn-create flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md"
          >
            <Plus size={16} />
            Add Target
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <VirtualTableEnhanced
          tableId="targets"
          columns={[
            { key: 'name', label: 'Name', width: '240px', className: 'flex-1 min-w-0', render: (_: unknown, target: Target) => <span className="font-medium text-fg-default">{target.name}</span> },
            { key: 'type', label: 'Type', width: '100px', render: (_: unknown, target: Target) => <span className="capitalize text-fg-muted">{target.type}</span> },
            { key: 'values', label: 'Values', width: '300px', render: (_: unknown, target: Target) => <span className="truncate text-fg-muted">{target.values.join(', ')}</span> },
            { key: 'status', label: 'Status', width: '100px', render: (_: unknown, target: Target) => <span className={target.status === 'active' ? 'px-2 py-1 text-xs font-medium rounded bg-success/20 text-success' : 'px-2 py-1 text-xs font-medium rounded bg-warning/20 text-warning'}>{target.status.toUpperCase()}</span> },
            { key: 'actions', label: '', width: '88px', align: 'center', render: (_: unknown, target: Target) => <div className="flex justify-center gap-2"><button type="button" onClick={() => setEditingId(target.id)} className="rounded p-2 text-fg-muted hover:bg-surface-container hover:text-fg-default" title="Edit"><Edit3 size={16} /></button><button type="button" onClick={() => handleDelete(target.id)} className="rounded p-2 text-fg-muted hover:bg-error/10 hover:text-error" title="Delete"><Trash2 size={16} /></button></div> },
          ]}
          data={targets}
          rowHeight={64}
          height="auto"
          emptyMessage={'No targets configured. Click "Add Target" to create one.'}
        />
        
        {targets.length === 0 && (
          <div className="p-8 text-center text-fg-muted">
            No targets configured. Click "Add Target" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// 骨架屏组件
// ============================================

const TargetSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-surface-hover rounded-sm"></div>
          <div>
            <div className="h-8 bg-surface-hover rounded w-48 mb-2"></div>
            <div className="h-4 bg-surface-hover rounded w-72"></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-surface-hover rounded w-32"></div>
          <div className="h-10 w-32 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="h-12 bg-surface-hover border-b border-outline-variant"></div>
        {[1,2,3,4,5].map((row) => (
          <div key={row} className="h-16 border-b border-outline-variant flex items-center px-4 gap-4">
            <div className="h-4 bg-surface-hover rounded w-48"></div>
            <div className="h-4 bg-surface-hover rounded w-24"></div>
            <div className="h-4 bg-surface-hover rounded w-64"></div>
            <div className="h-6 bg-surface-hover rounded w-16"></div>
            <div className="h-8 bg-surface-hover rounded w-20 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TargetPage;
