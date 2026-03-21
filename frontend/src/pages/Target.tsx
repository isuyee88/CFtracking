/**
 * File: Target.tsx
 * Purpose: Target 页面，管理目标配置
 * Input/Output: 显示目标列表，支持 CRUD 操作
 * Logic: 目标管理，包括创建、编辑、删除目标
 */

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, Target as TargetIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TargetItem {
  id: string;
  name: string;
  type: 'country' | 'device' | 'browser' | 'os' | 'isp' | 'ip';
  values: string[];
  status: 'active' | 'paused';
  createdAt: string;
}

const mockTargets: TargetItem[] = [
  {
    id: '1',
    name: 'Tier 1 Countries',
    type: 'country',
    values: ['US', 'UK', 'CA', 'AU', 'DE'],
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Mobile Devices',
    type: 'device',
    values: ['Mobile', 'Tablet'],
    status: 'active',
    createdAt: '2024-01-16T14:20:00Z'
  }
];

export const TargetPage: React.FC = () => {
  const [targets, setTargets] = useState<TargetItem[]>(mockTargets);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = (data: Partial<TargetItem>) => {
    const newTarget: TargetItem = {
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

  const handleUpdate = (id: string, data: Partial<TargetItem>) => {
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
        <table className="w-full">
          <thead className="bg-surface-container">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">Values</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {targets.map((target) => (
              <tr key={target.id} className="hover:bg-surface-container-high transition-colors">
                <td className="px-4 py-4">
                  <span className="font-medium text-fg-default">{target.name}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-fg-muted capitalize">{target.type}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-fg-muted">{target.values.join(', ')}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    target.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  )}>
                    {target.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(target.id)}
                      className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container transition-colors rounded"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(target.id)}
                      className="p-2 text-fg-muted hover:text-error hover:bg-error/10 transition-colors rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {targets.length === 0 && (
          <div className="p-8 text-center text-fg-muted">
            No targets configured. Click "Add Target" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetPage;
