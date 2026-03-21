import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ChevronDown,
  Menu,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Rule {
  id: string;
  displayId?: string;
  name: string;
  type: 'campaign' | 'platform';
  priority: number;
  enabled: boolean;
  status: 'active' | 'paused' | 'deleted';
  conditions: any[];
  actions: any[];
  createdAt: string;
  updatedAt: string;
}

const mockRules: Rule[] = [
  {
    id: '1',
    name: 'Low ROI Blocker',
    type: 'campaign',
    priority: 1,
    enabled: true,
    status: 'active',
    conditions: [
      { metric: 'roi', operator: '<', value: 0.5, duration: '24h' }
    ],
    actions: [
      { type: 'pause_campaign', platform: 'all', parameters: {} }
    ],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'High Volume Scaler',
    type: 'campaign',
    priority: 2,
    enabled: false,
    status: 'paused',
    conditions: [
      { metric: 'clicks', operator: '>', value: 10000, duration: '1h' }
    ],
    actions: [
      { type: 'increase_bid', platform: 'google', parameters: { percentage: 20 } }
    ],
    createdAt: '2024-01-14T15:45:00Z',
    updatedAt: '2024-01-14T15:45:00Z'
  },
  {
    id: '3',
    name: 'Fraud Protection',
    type: 'platform',
    priority: 1,
    enabled: true,
    status: 'active',
    conditions: [
      { metric: 'cr', operator: '<', value: 0.01, duration: '6h' }
    ],
    actions: [
      { type: 'block_traffic', platform: 'all', parameters: { source: 'suspicious' } }
    ],
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z'
  }
];

export const RuleManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'campaign' | 'platform'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'paused' | 'deleted'>('all');

  const filteredRules = mockRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || rule.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || rule.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreate = () => {
    setIsEditMode(false);
    setSelectedRule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rule: Rule) => {
    setIsEditMode(true);
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    // In a real app, this would call an API
    alert(`Deleting rule ${id}`);
  };

  const handleToggleStatus = (id: string) => {
    // In a real app, this would call an API
    alert(`Toggling status for rule ${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary">Rule Management</h2>
          <p className="text-sm text-on-surface-variant">Automate campaign optimization with intelligent rules</p>
        </div>
        <button 
          onClick={handleCreate} 
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
        >
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
          <input 
            type="text" 
            placeholder="Search rules..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm cursor-pointer" onClick={() => { /* Dropdown logic would go here */ }}>
            <span className="text-sm font-medium text-on-surface-variant">All Types</span>
            <ChevronDown size={16} className="text-on-surface-variant/60" />
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm cursor-pointer" onClick={() => { /* Dropdown logic would go here */ }}>
            <span className="text-sm font-medium text-on-surface-variant">All Status</span>
            <ChevronDown size={16} className="text-on-surface-variant/60" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{filteredRules.length} rules</span>
          <div className="h-6 w-px bg-outline-variant/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{mockRules.length} total</span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant w-20">
                  <div className="flex items-center">
                    <input type="checkbox" className="rounded-none border-outline-variant" />
                    <span className="ml-2 text-xs font-bold uppercase tracking-wider">Select</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Enabled</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <input type="checkbox" className="rounded-none border-outline-variant" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors cursor-pointer">{rule.name}</span>
                      <span className="text-[10px] text-on-surface-variant/60">{rule.updatedAt}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-sm",
                      rule.type === 'campaign' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                    )}>
                      {rule.type === 'campaign' ? 'Campaign' : 'Platform'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-mono text-primary">{rule.priority}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-sm",
                      rule.status === 'active' ? "bg-secondary/10 text-secondary" :
                        rule.status === 'paused' ? "bg-error/10 text-error" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      {rule.status === 'active' ? 'Active' : rule.status === 'paused' ? 'Paused' : 'Deleted'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        rule.enabled ? "bg-secondary" : "bg-on-surface-variant/30"
                      )} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(rule)} 
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(rule.id)} 
                        className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-on-surface-variant/60">
                    No rules match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <div className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
        isModalOpen && "block",
        !isModalOpen && "hidden"
      )}>
        <div className="bg-surface-container-lowest p-8 w-full max-w-md rounded-lg whisper-shadow relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold text-primary">
              {isEditMode ? 'Edit Rule' : 'Create Rule'}
            </h3>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Rule Name
              </label>
              <input 
                type="text" 
                placeholder="Enter rule name"
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Rule Type
                </label>
                <div className="relative">
                  <div className="flex items-center justify-between w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm cursor-pointer">
                    <span className="text-sm font-medium text-on-surface-variant">Campaign</span>
                    <ChevronDown size={16} className="text-on-surface-variant/60" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Priority
                </label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Conditions (JSON)
              </label>
              <textarea 
                rows="4"
                placeholder='[{"metric": "roi", "operator": "<", "value": 0.5, "duration": "24h"}]'
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Actions (JSON)
              </label>
              <textarea 
                rows="4"
                placeholder='[{"type": "pause_campaign", "platform": "all", "parameters": {}}]'
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 bg-surface border border-outline-variant rounded"
                />
                <span className="ml-2 text-sm font-medium text-on-surface-variant">Enabled</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
              >
                {isEditMode ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};