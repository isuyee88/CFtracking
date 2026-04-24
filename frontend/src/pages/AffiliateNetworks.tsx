/**
 * File: AffiliateNetworks.tsx
 * Purpose: Affiliate Networks 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Affiliate Network 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Check,
  X,
  Loader2,
  Link,
  Key,
  Shield,
  Copy,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityForm, type FormField } from '../components/EntityForm';
import { fetchAffiliateNetworks, createAffiliateNetwork, updateAffiliateNetwork, deleteAffiliateNetwork } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatAffiliateNetworkForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { AFFILIATE_NETWORK_TEMPLATES, getAffiliateTemplateById, type AffiliateNetworkOfferParameter } from '../data/affiliateNetworkTemplates';
import { readBootstrapPage } from '../services/bootstrap';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AffiliateNetwork {
  id: string;
  displayId?: string;
  name: string;
  type: 'soap' | 'rest' | 'api' | 'other';
  status: 'active' | 'paused' | 'deleted';
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  postbackUrl?: string;
  offerParameters?: AffiliateNetworkOfferParameter[];
  templateId?: string;
  offerCount?: number;
  offers?: number;
  clicks?: number;
  conversions?: number;
  epc: number | string;
  cr: number | string;
  revenue: number | string;
  updatedAt: string;
}

interface OfferParameter {
  name: string;
  value: string;
  description?: string;
}

const NETWORK_FIELDS: FormField[] = [
  {
    name: 'name',
    label: 'Network Name',
    type: 'text',
    required: true,
    placeholder: 'Enter network name',
    maxLength: FIELD_MAX_LENGTH.NAME,
  },
  {
    name: 'templateId',
    label: 'Template',
    type: 'select',
    description: 'Select a pre-configured template or Custom for manual setup',
    options: [
      { value: 'custom', label: 'Custom / Manual Setup' },
      { value: 'adcombo', label: 'AdCombo' },
      { value: 'drcash', label: 'Dr.Cash' },
      { value: 'leadalb', label: 'Leadbit' },
      { value: 'm4leads', label: 'M4Leads' },
      { value: 'partners1xbet', label: 'Partners1xBet' },
      { value: 'trafficlight', label: 'Traffic Light' },
      { value: 'melbetaffiliates', label: 'Melbetaffiliates' },
      { value: 'clickbank', label: 'ClickBank' }
    ]
  },
  {
    name: 'type',
    label: 'Integration Type',
    type: 'select',
    required: true,
    options: [
      { value: 'soap', label: 'SOAP' },
      { value: 'rest', label: 'REST API' },
      { value: 'api', label: 'API' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    name: 'apiUrl',
    label: 'API URL',
    type: 'url',
    placeholder: 'https://api.network.com/endpoint',
    maxLength: FIELD_MAX_LENGTH.URL,
    validation: (value) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    }
  },
  {
    name: 'apiKey',
    label: 'API Key',
    type: 'text',
    placeholder: 'Enter your API key',
    maxLength: FIELD_MAX_LENGTH.API_KEY,
  },
  {
    name: 'apiSecret',
    label: 'API Secret',
    type: 'text',
    placeholder: 'Enter your API secret (if required)',
    maxLength: FIELD_MAX_LENGTH.API_SECRET,
  },
  {
    name: 'postbackUrl',
    label: 'Postback URL',
    type: 'url',
    description: 'The URL where the affiliate network sends conversion notifications. Copy this to your affiliate network settings.',
    placeholder: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}',
    maxLength: FIELD_MAX_LENGTH.URL,
  },
  {
    name: 'offerParameters',
    label: 'Offer Parameters',
    type: 'json',
    description: 'Parameters added to each offer URL. Example: subid={{subid}}, sub2={{source}}',
    placeholder: '[\n  {"name": "Click ID", "value": "subid={{subid}}", "description": "Keitaro Click ID"},\n  {"name": "Source", "value": "sub2={{source}}", "description": "Traffic source"}\n]'
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' }
    ]
  },
  {
    name: 'notes',
    label: 'Notes',
    type: 'textarea',
    placeholder: 'Add notes about this network...',
    maxLength: FIELD_MAX_LENGTH.NOTES,
  }
];

export const AffiliateNetworks = () => {
  const bootstrap = readBootstrapPage<{ affiliateNetworks?: AffiliateNetwork[] }>('affiliate-networks');
  const hasBootstrap = Boolean(bootstrap);
  const [networks, setNetworks] = useState<AffiliateNetwork[]>(
    Array.isArray(bootstrap?.data?.affiliateNetworks) ? bootstrap.data.affiliateNetworks : []
  );
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedNetwork, setSelectedNetwork] = useState<Partial<AffiliateNetwork> | undefined>(undefined);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const getNetworkFieldsWithTemplate = (templateId?: string): FormField[] => {
    const fields = [...NETWORK_FIELDS];
    if (templateId && templateId !== 'custom') {
      const template = getAffiliateTemplateById(templateId);
      if (template) {
        const paramField = fields.find(f => f.name === 'offerParameters');
        if (paramField && template.parameters.length > 0) {
          paramField.placeholder = template.parameters
            .map(p => `${p.name}: ${p.value}`)
            .join('\n');
        }
      }
    }
    return fields;
  };

  const computedFields = useMemo(() => {
    return getNetworkFieldsWithTemplate(selectedNetwork?.templateId);
  }, [selectedNetwork?.templateId]);

  // Fetch affiliate networks from API
  useEffect(() => {
    const loadNetworks = async () => {
      try {
        if (!hasBootstrap && networks.length === 0) {
          setLoading(true);
        }
        const data = await fetchAffiliateNetworks();
        if (Array.isArray(data)) {
          setNetworks(data);
        } else {
          // Use mock data if API fails
          setNetworks([
            {
              id: 'an1',
              name: 'OddBytes Network',
              type: 'soap',
              status: 'active',
              apiUrl: 'https://api.oddbytes.com/v1',
              apiKey: '••••••••••••',
              offerCount: 124,
              clicks: 15000,
              conversions: 345,
              epc: 0.85,
              cr: 2.3,
              revenue: 12450.00,
              updatedAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 'an2',
              name: 'PropellerAds Network',
              type: 'rest',
              status: 'active',
              apiUrl: 'https://api.propellerads.com/v2',
              apiKey: '••••••••••••',
              offerCount: 89,
              clicks: 12000,
              conversions: 216,
              epc: 1.20,
              cr: 1.8,
              revenue: 8920.00,
              updatedAt: '2024-01-14T15:45:00Z'
            },
            {
              id: 'an3',
              name: 'AdCash Network',
              type: 'rest',
              status: 'paused',
              apiUrl: 'https://api.adcash.com/v1',
              apiKey: '••••••••••••',
              offerCount: 45,
              clicks: 8000,
              conversions: 96,
              epc: 0.45,
              cr: 1.2,
              revenue: 5430.00,
              updatedAt: '2024-01-13T09:15:00Z'
            }
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load affiliate networks');
      } finally {
        setLoading(false);
      }
    };

    loadNetworks();
  }, [hasBootstrap, networks.length]);

  const handleCreateNetwork = () => {
    setFormMode('create');
    setSelectedNetwork(undefined);
    setIsFormOpen(true);
  };

  const handleEditNetwork = (network: AffiliateNetwork) => {
    setFormMode('edit');
    setSelectedNetwork(network);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    const submitData = {
      ...formData,
      offerParameters: formData.offerParameters || []
    };

    try {
      if (formMode === 'create') {
        const network = await createAffiliateNetwork(submitData);
        if (network && network.id) {
          setNetworks(prev => [...prev, network]);
        }
      } else if (selectedNetwork?.id) {
        const network = await updateAffiliateNetwork(selectedNetwork.id, submitData);
        if (network && network.id) {
          setNetworks(prev =>
            prev.map(n => n.id === selectedNetwork.id ? network : n)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save affiliate network:', err);
      if (formMode === 'create') {
        const newNetwork: AffiliateNetwork = {
          id: `an${Date.now()}`,
          name: formData.name,
          type: formData.type || 'api',
          status: formData.status || 'active',
          apiUrl: formData.apiUrl || '',
          apiKey: formData.apiKey ? '••••••••••••' : '',
          apiSecret: formData.apiSecret || '',
          postbackUrl: formData.postbackUrl || '',
          offerParameters: formData.offerParameters || [],
          templateId: formData.templateId || '',
          offerCount: 0,
          clicks: 0,
          conversions: 0,
          epc: 0,
          cr: 0,
          revenue: 0,
          updatedAt: new Date().toISOString()
        };
        setNetworks(prev => [...prev, newNetwork]);
      } else {
        setNetworks(prev =>
          prev.map(n =>
            n.id === selectedNetwork?.id
              ? { ...n, ...submitData, updatedAt: new Date().toISOString() }
              : n
          )
        );
      }
      setIsFormOpen(false);
    }
  };

  const handleDeleteNetwork = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate network?')) return;
    
    try {
      await deleteAffiliateNetwork(id);
      setNetworks(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete affiliate network:', err);
      setNetworks(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredNetworks.map(n => n.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = async (action: 'activate' | 'pause' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${ids.length} affiliate networks?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteAffiliateNetwork(id)));
        setNetworks(prev => prev.filter(n => !ids.includes(n.id)));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateAffiliateNetwork(id, { status: newStatus })));
        setNetworks(prev => 
          prev.map(n => 
            ids.includes(n.id) ? { ...n, status: newStatus as any } : n
          )
        );
      }
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  // Filter networks
  const filteredNetworks = networks.filter(network => {
    const matchesSearch = 
      network.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      network.apiUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || network.status === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNetworks.length / itemsPerPage);
  const paginatedNetworks = filteredNetworks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      soap: 'SOAP',
      rest: 'REST API',
      api: 'API',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      soap: 'bg-blue-100 text-blue-700',
      rest: 'bg-green-100 text-green-700',
      api: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entity Form Modal */}
      <EntityForm
        key={`${formMode}-${selectedNetwork?.id || 'new'}`}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        title="Affiliate Network"
        fields={computedFields}
        initialData={selectedNetwork}
        mode={formMode}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Affiliate Networks</h1>
          <p className="text-sm text-on-surface-variant">Manage your affiliate network connections</p>
        </div>
        <div className="flex gap-3">
          {/* Date Range Picker */}
          <div className="w-[280px]">
            <QuickDateRangePicker
              value="today"
              onChange={(preset, range) => {
                if (range) {
                  setDateRange({
                    from: range.startDate.split('T')[0],
                    to: range.endDate.split('T')[0]
                  });
                }
              }}
              showTime={false}
              maxRangeDays={365}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
            <Filter size={16} />
            Filters
          </button>
          <ExportButton 
            data={networks.map(formatAffiliateNetworkForExport)}
            filename="affiliate-networks"
            label="Export"
          />
          <button 
            onClick={handleCreateNetwork}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm"
          >
            <Plus size={18} />
            New Network
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 ? (
            <>
              <span className="text-sm text-on-surface-variant mr-2">{selectedItems.size} selected</span>
              <button 
                onClick={() => handleBulkAction('activate')}
                className="btn-icon-create p-2 rounded transition-colors" 
                title="Activate"
              >
                <Play size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('pause')}
                className="btn-icon-pause p-2 rounded transition-colors" 
                title="Pause"
              >
                <Pause size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('delete')}
                className="btn-icon-delete p-2 rounded transition-colors" 
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
              <div className="h-6 w-px bg-outline-variant/20 mx-2" />
            </>
          ) : (
            <>
              <button className="btn-icon-create p-2 rounded transition-colors" title="Play"><Play size={18} /></button>
              <button className="btn-icon-pause p-2 rounded transition-colors" title="Pause"><Pause size={18} /></button>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded" title="Copy"><Copy size={18} /></button>
              <button className="btn-icon-delete p-2 rounded transition-colors" title="Delete"><Trash2 size={18} /></button>
              <div className="h-6 w-px bg-outline-variant/20 mx-2" />
            </>
          )}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by name or API URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total: {filteredNetworks.length}
          </span>
          <div className="flex bg-surface-container p-1 rounded-sm">
            {(['All', 'Active', 'Paused'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => { setFilterStatus(tab); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  filterStatus === tab 
                    ? tab === 'Active' 
                      ? "tab-status-active active" 
                      : tab === 'Paused' 
                        ? "tab-status-paused active" 
                        : "tab-status-all active"
                    : tab === 'Active'
                      ? "tab-status-active"
                      : tab === 'Paused'
                        ? "tab-status-paused"
                        : "tab-status-all"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Networks Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant"
                    checked={selectedItems.size === filteredNetworks.length && filteredNetworks.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Network</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Offers</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">EPC</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">CR</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Revenue</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedNetworks.map((network) => (
                <tr 
                  key={network.id} 
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors",
                    selectedItems.has(network.id) && "bg-surface-container/30"
                  )}
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-outline-variant"
                      checked={selectedItems.has(network.id)}
                      onChange={() => handleSelectItem(network.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Network size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-primary truncate max-w-[180px]" title={network.name}>
                          {truncateLabel(network.name, DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Link size={12} />
                          <span className="truncate max-w-[150px]" title={network.apiUrl || 'No API URL'}>
                            {truncateLabel(network.apiUrl || 'No API URL', DISPLAY_MAX_LENGTH.TABLE_SECONDARY_TEXT)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                      getTypeColor(network.type)
                    )}>
                      {getTypeLabel(network.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                      network.status === 'active' ? "status-active" : "status-paused"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        network.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{network.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-on-surface">
                      {network.offerCount !== undefined ? network.offerCount : network.offers || 0}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-primary">
                      ${typeof network.epc === 'number' ? network.epc.toFixed(2) : network.epc}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-primary">
                      {typeof network.cr === 'number' ? `${network.cr}%` : network.cr}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-secondary">
                      ${typeof network.revenue === 'number' ? network.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : network.revenue}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditNetwork(network)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteNetwork(network.id)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredNetworks.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No affiliate networks found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredNetworks.length)} of {filteredNetworks.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "p-2 rounded-sm transition-colors",
                  currentPage === 1 
                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 text-sm font-medium rounded-sm transition-colors",
                    currentPage === page
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "p-2 rounded-sm transition-colors",
                  currentPage === totalPages 
                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateNetworks;
