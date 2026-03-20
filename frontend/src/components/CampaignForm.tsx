/**
 * File: CampaignForm.tsx
 * Purpose: Campaign创建和编辑表单组件
 * Input/Output: 接收campaign数据，输出表单提交事件
 * Logic: 多标签页表单，包含Main、Schema、Filters、Monitoring、Notes
 */

import React, { useState } from 'react';
import { X, Plus, Trash2, Settings, Filter, Activity, FileText, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Filter types based on Keitaro documentation
const FILTER_TYPES = [
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'device_type', label: 'Device Type', category: 'Device' },
  { value: 'os', label: 'Operating System', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
  { value: 'ip', label: 'IP Address', category: 'Network' },
  { value: 'isp', label: 'ISP', category: 'Network' },
  { value: 'referrer', label: 'Referrer', category: 'Traffic' },
  { value: 'user_agent', label: 'User Agent', category: 'Traffic' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'regex', label: 'Matches Regex' },
  { value: 'in_list', label: 'In List' },
  { value: 'not_in_list', label: 'Not In List' },
];

interface Filter {
  id: string;
  type: string;
  operator: string;
  value: string;
  isNot: boolean;
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
  filters: Filter[];
  filterLogic: 'AND' | 'OR';
  notes: string;
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
    filters: initialData?.filters || [],
    filterLogic: initialData?.filterLogic || 'AND',
    notes: initialData?.notes || '',
  });

  const handleChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'country',
      operator: 'equals',
      value: '',
      isNot: false,
    };
    setFormData(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (filterId: string, field: keyof Filter, value: any) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.map(f =>
        f.id === filterId ? { ...f, [field]: value } : f
      )
    }));
  };

  const removeFilter = (filterId: string) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
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
                    Domain
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleChange('domain', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
                    placeholder="example.com"
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
                    <option value="google">Google Ads</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="native">Native Ads</option>
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
              <div className="bg-surface-container p-6 rounded-sm">
                <h3 className="text-sm font-bold text-primary mb-4">Flow Schema</h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  Define the flow structure for this campaign. Flows determine how traffic is distributed between landing pages and offers.
                </p>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm"
                >
                  <Plus size={16} />
                  Add Flow
                </button>
              </div>
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-on-surface-variant">Filter Logic:</span>
                  <div className="flex bg-surface-container rounded-sm">
                    {(['AND', 'OR'] as const).map((logic) => (
                      <button
                        key={logic}
                        type="button"
                        onClick={() => handleChange('filterLogic', logic)}
                        className={cn(
                          "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition-all",
                          formData.filterLogic === logic
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:bg-surface-container-highest"
                        )}
                      >
                        {logic}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addFilter}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm"
                >
                  <Plus size={16} />
                  Add Filter
                </button>
              </div>

              <div className="space-y-3">
                {formData.filters.map((filter, index) => (
                  <div key={filter.id} className="flex items-center gap-3 bg-surface-container p-4 rounded-sm">
                    <span className="text-xs font-bold text-on-surface-variant w-8">{index + 1}</span>
                    
                    <select
                      value={filter.type}
                      onChange={(e) => updateFilter(filter.id, 'type', e.target.value)}
                      className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm"
                    >
                      {FILTER_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => updateFilter(filter.id, 'isNot', !filter.isNot)}
                      className={cn(
                        "px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition-all",
                        filter.isNot
                          ? "bg-error text-on-error"
                          : "bg-secondary text-on-secondary"
                      )}
                    >
                      {filter.isNot ? 'IS NOT' : 'IS'}
                    </button>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                      className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 bg-surface border border-outline-variant text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => removeFilter(filter.id)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {formData.filters.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant">
                    <p>No filters added yet</p>
                    <p className="text-sm mt-1">Click "Add Filter" to create traffic filters</p>
                  </div>
                )}
              </div>
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
