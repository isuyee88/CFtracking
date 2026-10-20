/**
 * File: RuleManagement.tsx
 * Purpose: 规则管理页面，创建和管理自动化规则
 * Input/Output: 展示规则列表，支持CRUD操作
 * Logic: 从API获取规则数据，提供创建、编辑、删除、启用/禁用功能
 * 前后端交互: 调用 /api/rules 接口
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  ChevronDown,
  Search,
  RefreshCw,
  AlertCircle,
  Play,
  Pause,
  History
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchRules, createRule, updateRule, deleteRule, enableRule, disableRule,
  type Rule, type CreateRuleDTO, type UpdateRuleDTO 
} from '../services/api';
import { usePageData } from '@/context/DataCacheContext';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RuleManagement = () => {
  // 使用 usePageData hook 自动处理 SSR 缓存、加载和错误状态
  const { data: rulesData, isLoading, error, refetch } = usePageData(
    'rules',
    fetchRules
  );
  
  const [rules, setRules] = useState<Rule[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'campaign' | 'platform' | 'flow'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'paused' | 'deleted'>('all');
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'campaign' as 'campaign' | 'platform' | 'flow',
    priority: 1,
    enabled: true,
    conditionsText: '[{"metric": "roi", "operator": "<", "value": 0.5, "duration": "24h"}]',
    actionsText: '[{"type": "pause_campaign", "platform": "all", "parameters": {}}]',
  });

  // 当 rulesData 变化时，更新本地状态
  useEffect(() => {
    if (!rulesData) return;
    
    // fetchRules 返回的是 { list: Rule[], meta: { total: number } }
    const data = rulesData as any;
    if (data.list && Array.isArray(data.list)) {
      setRules(data.list);
      setTotal(data.meta?.total || data.list.length);
    } else if (Array.isArray(rulesData)) {
      // 如果直接是数组
      setRules(rulesData);
      setTotal(rulesData.length);
    }
  }, [rulesData]);

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsEditMode(false);
    setSelectedRule(null);
    setFormData({
      name: '',
      description: '',
      type: 'campaign',
      priority: 1,
      enabled: true,
      conditionsText: '[{"metric": "roi", "operator": "<", "value": 0.5, "duration": "24h"}]',
      actionsText: '[{"type": "pause_campaign", "platform": "all", "parameters": {}}]',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (rule: Rule) => {
    setIsEditMode(true);
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      priority: rule.priority,
      enabled: rule.enabled,
      conditionsText: JSON.stringify(rule.conditions, null, 2),
      actionsText: JSON.stringify(rule.actions, null, 2),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete rule:', err);
      alert('Failed to delete rule');
    }
  };

  const handleToggleStatus = async (rule: Rule) => {
    try {
      const updated = rule.enabled ? await disableRule(rule.id) : await enableRule(rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      console.error('Failed to toggle rule status:', err);
      alert('Failed to toggle rule status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const conditions = JSON.parse(formData.conditionsText);
      const actions = JSON.parse(formData.actionsText);

      if (isEditMode && selectedRule) {
        const updateData: UpdateRuleDTO = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          enabled: formData.enabled,
          conditions,
          actions,
        };
        const updated = await updateRule(selectedRule.id, updateData);
        setRules(prev => prev.map(r => r.id === selectedRule.id ? updated : r));
      } else {
        const createData: CreateRuleDTO = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          enabled: formData.enabled,
          conditions,
          actions,
        };
        const created = await createRule(createData);
        setRules(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save rule:', err);
      alert(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && rules.length === 0) {
    return <RuleSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-danger">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error?.message || error}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-fg-default">Rule Management</h2>
          <p className="text-sm text-fg-muted">Automate campaign optimization with intelligent rules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch?.()}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleCreate} 
            className="flex items-center gap-2 px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 transition-all rounded"
          >
            <Plus size={18} />
            Create Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-surface p-4 rounded-lg border border-border-default">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search rules..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg transition-all"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
          className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
        >
          <option value="all">All Types</option>
          <option value="campaign">Campaign</option>
          <option value="platform">Platform</option>
          <option value="flow">Flow</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
          className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="deleted">Deleted</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">{filteredRules.length} rules</span>
          <div className="h-6 w-px bg-border-default" />
          <span className="text-xs text-fg-muted">{total} total</span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          {filteredRules.length > 0 ? (
                    <VirtualTableEnhanced
          tableId="rules"
          columns={[
            { key: 'name', label: 'Name', width: '220px', className: 'flex-1 min-w-0', render: (_: unknown, rule: any) => <div className="min-w-0"><p className="truncate font-medium text-fg-default">{rule.name}</p>{rule.description && <p className="truncate text-xs text-fg-muted">{rule.description}</p>}<p className="text-xs text-fg-subtle">{new Date(rule.updatedAt).toLocaleString()}</p></div> },
            { key: 'type', label: 'Type', width: '100px', render: (_: unknown, rule: any) => <span className={rule.type === 'campaign' ? 'rounded bg-accent-fg/10 px-2 py-1 text-xs text-accent-fg' : rule.type === 'platform' ? 'rounded bg-success/10 px-2 py-1 text-xs text-success' : 'rounded bg-warning/10 px-2 py-1 text-xs text-warning'}>{rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}</span> },
            { key: 'priority', label: 'Priority', width: '90px', align: 'right', render: (_: unknown, rule: any) => <span className="font-mono text-fg-default">{rule.priority}</span> },
            { key: 'status', label: 'Status', width: '100px', render: (_: unknown, rule: any) => <span className={rule.status === 'active' ? 'rounded bg-success/10 px-2 py-1 text-xs text-success' : rule.status === 'paused' ? 'rounded bg-warning/10 px-2 py-1 text-xs text-warning' : 'rounded bg-fg-muted/10 px-2 py-1 text-xs text-fg-muted'}>{rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}</span> },
            { key: 'enabled', label: 'Enabled', width: '80px', align: 'center', render: (_: unknown, rule: any) => <button type="button" onClick={() => handleToggleStatus(rule)} className={rule.enabled ? 'rounded p-1.5 text-success hover:bg-success/10' : 'rounded p-1.5 text-fg-muted hover:bg-surface-container'} title={rule.enabled ? 'Disable' : 'Enable'}>{rule.enabled ? <Play size={16} /> : <Pause size={16} />}</button> },
            { key: 'actions', label: '', width: '88px', align: 'center', render: (_: unknown, rule: any) => <div className="flex justify-center gap-1"><button type="button" onClick={() => handleEdit(rule)} className="rounded p-1.5 text-fg-muted hover:bg-surface-container hover:text-fg-default" title="Edit"><Edit3 size={14} /></button><button type="button" onClick={() => handleDelete(rule.id)} className="rounded p-1.5 text-fg-muted hover:bg-error/10 hover:text-error" title="Delete"><Trash2 size={14} /></button></div> },
          ]}
          data={filteredRules}
          rowHeight={72}
          height="auto"
          emptyMessage="No rules found"
        />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <History size={48} className="mb-4" />
              <p>No rules found</p>
              <p className="text-sm mt-2">Create your first rule to automate campaign optimization</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface p-6 w-full max-w-lg rounded-lg border border-border-default shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-fg-default">
                {isEditMode ? 'Edit Rule' : 'Create Rule'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Rule Name *
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter rule name"
                  required
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Description
                </label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Rule Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as typeof formData.type }))}
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  >
                    <option value="campaign">Campaign</option>
                    <option value="platform">Platform</option>
                    <option value="flow">Flow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Priority
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Conditions (JSON)
                </label>
                <textarea 
                  rows="3"
                  value={formData.conditionsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, conditionsText: e.target.value }))}
                  placeholder='[{"metric": "roi", "operator": "<", "value": 0.5}]'
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default font-mono focus:outline-none focus:border-accent-fg"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Actions (JSON)
                </label>
                <textarea 
                  rows="3"
                  value={formData.actionsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, actionsText: e.target.value }))}
                  placeholder='[{"type": "pause_campaign", "platform": "all"}]'
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default font-mono focus:outline-none focus:border-accent-fg"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-border-default"
                />
                <label htmlFor="enabled" className="text-sm text-fg-default">Enabled</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 rounded disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton component for rules list
const RuleSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-700">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="w-64 h-8 bg-surface-container rounded"></div>
        <div className="w-48 h-4 bg-surface-container rounded"></div>
      </div>
      <div className="flex gap-3 items-center">
        <div className="w-72 h-10 bg-surface-container rounded"></div>
        <div className="w-32 h-10 bg-surface-container rounded"></div>
        <div className="w-24 h-10 bg-surface-container rounded"></div>
      </div>
    </div>
    
    {/* Rules List Skeleton */}
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="card p-6 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-5 h-5 bg-surface-container rounded"></div>
              <div className="space-y-2 flex-1">
                <div className="w-48 h-5 bg-surface-container rounded"></div>
                <div className="w-64 h-4 bg-surface-container rounded"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-16 h-8 bg-surface-container rounded"></div>
              <div className="w-16 h-8 bg-surface-container rounded"></div>
              <div className="w-8 h-8 bg-surface-container rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RuleManagement;
