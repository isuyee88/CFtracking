/**
 * File: CampaignForm.tsx
 * Purpose: Campaign创建和编辑表单组件
 * Input/Output: 接收campaign数据，输出表单提交事件
 * Logic: 多标签页表单，包含Main、Schema、Filters、Monitoring、Notes
 * Features: Campaign URL自动生成、Uniqueness配置、Cost配置
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Settings, Filter, Activity, FileText, GripVertical, Copy, Check, Link } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FilterBuilder } from './filters';
import type { FilterConfig } from './filters';
import { FlowDesigner, type FlowNode, type FlowConnection } from './FlowDesigner';
import { fetchTrafficSources } from '../services/api';
import type { TrafficSource } from '../types/trafficSource';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type UniquenessMethod = 'ip' | 'ip_ua' | 'cookie' | 'parameter' | 'none';

interface CampaignFormData {
  name: string;
  alias: string;
  domain: string;
  group: string;
  trafficSource: string;
  flowRotation: 'weight' | 'priority' | 'random';
  costModel: 'cpc' | 'cpa' | 'cpm' | 'cps' | 'revshare';
  costValue: number;
  currency: string;
  uniquenessMethod: UniquenessMethod;
  uniquenessParameter: string;
  uniquenessTTL: number;
  visitorBinding: 'none' | 'cookie' | 'ip';
  status: 'active' | 'paused';
  filterConfig: FilterConfig;
  notes: string;
  flows: FlowNode[];
  connections: FlowConnection[];
}

interface CampaignFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CampaignFormData) => void;
  initialData?: Partial<CampaignFormData>;
  mode: 'create' | 'edit';
}

const TABS = [
  { id: 'main', label: 'Main', icon: Settings },
  { id: 'schema', label: 'Schema', icon: GripVertical },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'notes', label: 'Notes', icon: FileText },
];

export const CampaignForm: React.FC<CampaignFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [activeTab, setActiveTab] = useState('main');
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    alias: initialData?.alias || '',
    domain: initialData?.domain || '',
    group: initialData?.group || '',
    trafficSource: initialData?.trafficSource || '',
    flowRotation: initialData?.flowRotation || 'weight',
    costModel: initialData?.costModel || 'cpc',
    costValue: initialData?.costValue || 0,
    currency: initialData?.currency || 'USD',
    uniquenessMethod: initialData?.uniquenessMethod || 'none',
    uniquenessParameter: initialData?.uniquenessParameter || '',
    uniquenessTTL: initialData?.uniquenessTTL || 86400,
    visitorBinding: initialData?.visitorBinding || 'none',
    status: initialData?.status || 'active',
    filterConfig: initialData?.filterConfig || {
      groups: [{
        id: 'default-group',
        name: 'Default Group',
        logic: 'AND',
        conditions: []
      }],
      globalLogic: 'AND'
    },
    notes: initialData?.notes || '',
    flows: initialData?.flows || [],
    connections: initialData?.connections || [],
  });

  // 自动生成 Campaign URL
  const campaignUrl = useMemo(() => {
    if (!formData.domain || !formData.alias) return '';
    const protocol = formData.domain.startsWith('http') ? '' : 'https://';
    return `${protocol}${formData.domain}/${formData.alias}`;
  }, [formData.domain, formData.alias]);

  // 自动生成 alias（基于 name）
  const generateAlias = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  // 复制 URL 到剪贴板
  const copyToClipboard = async () => {
    if (campaignUrl) {
      await navigator.clipboard.writeText(campaignUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // 处理 name 变化，自动生成 alias
  const handleNameChange = (name: string) => {
    const alias = generateAlias(name);
    setFormData(prev => ({ ...prev, name, alias }));
  };

  useEffect(() => {
    const loadTrafficSources = async () => {
      try {
        const data = await fetchTrafficSources(false);
        if (Array.isArray(data)) {
          setTrafficSources(data);
        }
      } catch (err) {
        console.error('Failed to load traffic sources:', err);
      }
    };
    if (isOpen) {
      loadTrafficSources();
    }
  }, [isOpen]);

  const handleChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <h2 className="text-xl font-display font-bold text-primary">
            {mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-sm transition-colors">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Main Tab */}
          {activeTab === 'main' && (
            <div className="space-y-6">
              {/* Campaign URL Display */}
              {campaignUrl && (
                <div className="bg-primary-container/10 border border-primary/20 rounded-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                      <Link size={14} />
                      Campaign URL
                    </label>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-sm transition-colors"
                    >
                      {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                      {copiedUrl ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="block text-sm text-on-surface bg-surface px-3 py-2 rounded-sm font-mono break-all">
                    {campaignUrl}
                  </code>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    placeholder="Enter campaign name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Alias *
                  </label>
                  <input
                    type="text"
                    value={formData.alias}
                    onChange={(e) => handleChange('alias', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all font-mono"
                    placeholder="campaign-alias"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Domain *
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleChange('domain', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    placeholder="example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Group
                  </label>
                  <input
                    type="text"
                    value={formData.group}
                    onChange={(e) => handleChange('group', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    placeholder="Select or create group"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Traffic Source
                  </label>
                  <select
                    value={formData.trafficSource}
                    onChange={(e) => handleChange('trafficSource', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                  >
                    <option value="">Select source...</option>
                    {trafficSources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Flow Rotation
                  </label>
                  <select
                    value={formData.flowRotation}
                    onChange={(e) => handleChange('flowRotation', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                  >
                    <option value="weight">By Weight</option>
                    <option value="priority">By Priority</option>
                    <option value="random">Random</option>
                  </select>
                </div>
              </div>

              {/* Cost Configuration */}
              <div className="bg-surface-container p-4 rounded-sm">
                <h3 className="text-sm font-bold text-primary mb-4">Cost Configuration</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Cost Model
                    </label>
                    <select
                      value={formData.costModel}
                      onChange={(e) => handleChange('costModel', e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    >
                      <option value="cpc">CPC (Cost Per Click)</option>
                      <option value="cpa">CPA (Cost Per Action)</option>
                      <option value="cpm">CPM (Cost Per Mille)</option>
                      <option value="cps">CPS (Cost Per Sale)</option>
                      <option value="revshare">RevShare</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Cost Value
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.costValue}
                      onChange={(e) => handleChange('costValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                      placeholder="0.0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Uniqueness Configuration */}
              <div className="bg-surface-container p-4 rounded-sm">
                <h3 className="text-sm font-bold text-primary mb-4">Uniqueness (Deduplication)</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Uniqueness Method
                    </label>
                    <select
                      value={formData.uniquenessMethod}
                      onChange={(e) => handleChange('uniquenessMethod', e.target.value as UniquenessMethod)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    >
                      <option value="none">None (No Dedup)</option>
                      <option value="ip">IP Address</option>
                      <option value="ip_ua">IP + User Agent</option>
                      <option value="cookie">Cookie</option>
                      <option value="parameter">URL Parameter</option>
                    </select>
                  </div>
                  {formData.uniquenessMethod === 'parameter' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Parameter Name *
                      </label>
                      <input
                        type="text"
                        value={formData.uniquenessParameter}
                        onChange={(e) => handleChange('uniquenessParameter', e.target.value)}
                        className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                        placeholder="clickid"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      TTL (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.uniquenessTTL}
                      onChange={(e) => handleChange('uniquenessTTL', parseInt(e.target.value) || 86400)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Visitor Binding
                    </label>
                    <select
                      value={formData.visitorBinding}
                      onChange={(e) => handleChange('visitorBinding', e.target.value as 'none' | 'cookie' | 'ip')}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    >
                      <option value="none">None</option>
                      <option value="cookie">Cookie</option>
                      <option value="ip">IP Address</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="paused"
                      checked={formData.status === 'paused'}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">Paused</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Schema Tab */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              <FlowDesigner
                campaignId={formData.alias || 'new'}
                initialFlows={formData.flows}
                initialConnections={formData.connections}
                onSave={(flows, connections) => {
                  setFormData(prev => ({ ...prev, flows, connections }));
                }}
              />
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <FilterBuilder
                config={formData.filterConfig}
                onChange={(config) => handleChange('filterConfig', config)}
                showPreview={true}
              />
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="bg-surface-container p-6 rounded-sm">
                <h3 className="text-sm font-bold text-primary mb-4">Campaign Monitoring</h3>
                <p className="text-sm text-on-surface-variant">
                  Set up alerts and monitoring for this campaign. Coming soon...
                </p>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Campaign Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all resize-none"
                  placeholder="Add notes about this campaign..."
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm"
          >
            {mode === 'create' ? 'Create Campaign' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;
