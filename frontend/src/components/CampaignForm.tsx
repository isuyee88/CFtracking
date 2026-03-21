/**
 * File: CampaignForm.tsx
 * Purpose: Campaign创建和编辑表单组件
 * Input/Output: 接收campaign数据，输出表单提交事件
 * Logic: 多标签页表单，包含Main、Schema、Filters、Monitoring、Notes
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Filter, Activity, FileText, GripVertical } from 'lucide-react';
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

interface CampaignFormData {
  name: string;
  alias: string;
  domain: string;
  group: string;
  trafficSource: string;
  flowRotation: 'weight' | 'priority' | 'random';
  costModel: 'cpc' | 'cpa' | 'cpm';
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
  const [formData, setFormData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    alias: initialData?.alias || '',
    domain: initialData?.domain || '',
    group: initialData?.group || '',
    trafficSource: initialData?.trafficSource || '',
    flowRotation: initialData?.flowRotation || 'weight',
    costModel: initialData?.costModel || 'cpc',
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
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
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
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
                    <option value="cpc">CPC</option>
                    <option value="cpa">CPA</option>
                    <option value="cpm">CPM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Uniqueness (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.uniquenessTTL}
                    onChange={(e) => handleChange('uniquenessTTL', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Visitor Binding
                  </label>
                  <select
                    value={formData.visitorBinding}
                    onChange={(e) => handleChange('visitorBinding', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                  >
                    <option value="none">None</option>
                    <option value="cookie">Cookie</option>
                    <option value="ip">IP Address</option>
                  </select>
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
