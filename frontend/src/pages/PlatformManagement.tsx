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
  Link,
  Zap,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Platform {
  id: string;
  name: string;
  type: 'soap' | 'rest';
  version: string;
  description?: string;
  actions: string[];
  configured: boolean;
  status: 'active' | 'inactive';
  config?: {
    apiKey?: string;
    wsdlUrl?: string;
    apiUrl?: string;
  };
}

const mockPlatforms: Platform[] = [
  {
    id: 'oddbytes',
    name: 'OddBytes',
    type: 'soap',
    version: 'v2.1',
    description: 'Global affiliate network with SOAP API integration',
    actions: ['getOffers', 'getConversions', 'getPayments'],
    configured: true,
    status: 'active',
    config: {
      apiKey: 'sk_live_************',
      wsdlUrl: 'https://api.oddbytes.com/soap/v2.1?wsdl'
    }
  },
  {
    id: 'propellerads',
    name: 'PropellerAds',
    type: 'rest',
    version: 'v5',
    description: 'High-performance ad network with REST API',
    actions: ['getCampaigns', 'createCampaign', 'getStatistics'],
    configured: true,
    status: 'active',
    config: {
      apiKey: 'sk_live_************',
      apiUrl: 'https://ssp-api.propellerads.com/v5'
    }
  },
  {
    id: 'adcash',
    name: 'AdCash',
    type: 'rest',
    version: 'v3',
    description: 'Premium ad network with real-time bidding',
    actions: ['getOffers', 'getStats', 'getPayments'],
    configured: false,
    status: 'inactive'
  }
];

export const PlatformManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'soap' | 'rest'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPlatforms = mockPlatforms.filter(platform => {
    const matchesSearch = platform.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || platform.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || platform.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreate = () => {
    setIsEditMode(false);
    setSelectedPlatform(null);
    setIsModalOpen(true);
  };

  const handleEdit = (platform: Platform) => {
    setIsEditMode(true);
    setSelectedPlatform(platform);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    // In a real app, this would call an API
    alert(`Deleting platform ${id}`);
  };

  const handleToggleStatus = (id: string) => {
    // In a real app, this would call an API
    alert(`Toggling status for platform ${id}`);
  };

  const handleTestConnection = (platform: Platform) => {
    // In a real app, this would call an API
    alert(`Testing connection for ${platform.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary">Platform Management</h2>
          <p className="text-sm text-on-surface-variant">Manage your affiliate network connections</p>
        </div>
        <button 
          onClick={handleCreate} 
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
        >
          <Plus size={18} />
          Add Platform
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
          <input 
            type="text" 
            placeholder="Search platforms..." 
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{filteredPlatforms.length} platforms</span>
          <div className="h-6 w-px bg-outline-variant/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{mockPlatforms.length} total</span>
        </div>
      </div>

      {/* Platforms Table */}
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
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Configured</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredPlatforms.map((platform) => (
                <tr key={platform.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <input type="checkbox" className="rounded-none border-outline-variant" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors cursor-pointer">{platform.name}</span>
                      <span className="text-[10px] text-on-surface-variant/60">{platform.version}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-sm",
                      platform.type === 'soap' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                    )}>
                      {platform.type === 'soap' ? 'SOAP' : 'REST'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-sm",
                      platform.status === 'active' ? "bg-secondary/10 text-secondary" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      {platform.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-sm",
                      platform.configured ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
                    )}>
                      {platform.configured ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(platform)} 
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleTestConnection(platform)} 
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                        title="Test Connection"
                      >
                        <Zap size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(platform.id)} 
                        className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlatforms.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant/60">
                    No platforms match your filters
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
              {isEditMode ? 'Edit Platform' : 'Add Platform'}
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
                Platform ID
              </label>
              <input 
                type="text" 
                placeholder="Enter platform ID (e.g., oddbytes)"
                disabled={isEditMode}
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Platform Name
              </label>
              <input 
                type="text" 
                placeholder="Enter platform name"
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Platform Type
                </label>
                <div className="relative">
                  <div className="flex items-center justify-between w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm cursor-pointer">
                    <span className="text-sm font-medium text-on-surface-variant">SOAP</span>
                    <ChevronDown size={16} className="text-on-surface-variant/60" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Version
                </label>
                <input 
                  type="text" 
                  placeholder="Enter version (e.g., v2.1)"
                  className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Description
              </label>
              <textarea 
                rows="3"
                placeholder="Enter platform description"
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                API Key
              </label>
              <input 
                type="password"
                placeholder="Enter API key"
                className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  WSDL URL (SOAP only)
                </label>
                <input 
                  type="text" 
                  placeholder="Enter WSDL URL"
                  className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  API URL (REST only)
                </label>
                <input 
                  type="text" 
                  placeholder="Enter API URL"
                  className="w-full pl-3 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 bg-surface border border-outline-variant rounded"
                />
                <span className="ml-2 text-sm font-medium text-on-surface-variant">Enabled by Default</span>
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
                {isEditMode ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};