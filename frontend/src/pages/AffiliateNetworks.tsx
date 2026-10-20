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
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import { TablePagination } from '../components/TablePagination';
import { ExportButton } from '../components/ExportButton';
import { formatAffiliateNetworkForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { AFFILIATE_NETWORK_TEMPLATES, getAffiliateTemplateById, type AffiliateNetworkOfferParameter } from '../data/affiliateNetworkTemplates';
import { usePageData } from '@/context/DataCacheContext';

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
    placeholder: 'Enter network name'
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
    placeholder: 'Enter your API key'
  },
  {
    name: 'apiSecret',
    label: 'API Secret',
    type: 'text',
    placeholder: 'Enter your API secret (if required)'
  },
  {
    name: 'postbackUrl',
    label: 'Postback URL',
    type: 'url',
    description: 'The URL where the affiliate network sends conversion notifications. Copy this to your affiliate network settings.',
    placeholder: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}'
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
    placeholder: 'Add notes about this network...'
  }
];

export const AffiliateNetworks = () => {
  // 使用 usePageData hook 自动处理 SSR 缓存、加载和错误状态
  const { data: networksData, isLoading, error, refetch } = usePageData(
    'affiliateNetworks',
    fetchAffiliateNetworks
  );
  
  const [networks, setNetworks] = useState<AffiliateNetwork[]>([]);
  
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

  // 当 networksData 变化时，更新本地状态
  useEffect(() => {
    if (!networksData) return;
    
    // 确保数据是数组
    if (Array.isArray(networksData)) {
      setNetworks(networksData);
    }
  }, [networksData]);

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

  if (isLoading && networks.length === 0) {
    return <AffiliateNetworkSkeleton />;
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

      <div className="hidden md:block">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredNetworks.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="networks"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedNetworks.map((network) => (
          <article key={network.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-primary">{network.name}</h2>
                <p className="mt-0.5 truncate text-xs text-on-surface-variant">{network.apiUrl || 'No API URL'}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest', network.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>{network.status}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-fg-subtle">Type</dt><dd className="mt-0.5 text-fg-default">{getTypeLabel(network.type)}</dd></div>
              <div><dt className="text-fg-subtle">Offers</dt><dd className="mt-0.5 text-fg-default">{network.offerCount ?? network.offers ?? 0}</dd></div>
              <div><dt className="text-fg-subtle">EPC</dt><dd className="mt-0.5 font-mono text-fg-default">${typeof network.epc === 'number' ? network.epc.toFixed(2) : network.epc}</dd></div>
              <div><dt className="text-fg-subtle">Revenue</dt><dd className="mt-0.5 font-mono text-secondary">${typeof network.revenue === 'number' ? network.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : network.revenue}</dd></div>
            </dl>
            <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant/10 pt-2">
              <button type="button" onClick={() => handleEditNetwork(network)} className="rounded-md border border-outline-variant/30 px-3 py-1.5 text-xs text-fg-default">Edit</button>
              <button type="button" onClick={() => handleDeleteNetwork(network.id)} className="rounded-md border border-error/20 px-3 py-1.5 text-xs text-error">Delete</button>
            </div>
          </article>
        ))}
        {paginatedNetworks.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">No affiliate networks found</div>}
      </div>

      <div className="hidden md:block">
        <VirtualTableEnhanced
          tableId="affiliate-networks"
          columns={[
            {
              key: 'name',
              label: 'Network',
              width: '220px',
              className: 'flex-1 min-w-0',
              sorter: (a: AffiliateNetwork, b: AffiliateNetwork) => a.name.localeCompare(b.name),
              showSorter: true,
              render: (_: unknown, network: AffiliateNetwork) => (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                    <Network size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-primary">{network.name}</p>
                    <p className="truncate text-xs text-fg-muted">{network.apiUrl || 'No API URL'}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              width: '100px',
              sorter: (a: AffiliateNetwork, b: AffiliateNetwork) => getTypeLabel(a.type).localeCompare(getTypeLabel(b.type)),
              showSorter: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-widest', getTypeColor(network.type))}>{getTypeLabel(network.type)}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              width: '110px',
              sorter: (a: AffiliateNetwork, b: AffiliateNetwork) => a.status.localeCompare(b.status),
              showSorter: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-widest', network.status === 'active' ? 'status-active' : 'status-paused')}>{network.status}</span>,
            },
            {
              key: 'offers',
              label: 'Offers',
              width: '86px',
              align: 'right',
              defaultHidden: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className="text-fg-default">{network.offerCount ?? network.offers ?? 0}</span>,
            },
            {
              key: 'epc',
              label: 'EPC',
              width: '86px',
              align: 'right',
              defaultHidden: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className="font-mono text-primary">${typeof network.epc === 'number' ? network.epc.toFixed(2) : network.epc}</span>,
            },
            {
              key: 'cr',
              label: 'CR',
              width: '76px',
              align: 'right',
              defaultHidden: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className="font-mono text-primary">{typeof network.cr === 'number' ? String(network.cr) + '%' : network.cr}</span>,
            },
            {
              key: 'revenue',
              label: 'Revenue',
              width: '110px',
              align: 'right',
              sorter: (a: AffiliateNetwork, b: AffiliateNetwork) => Number(a.revenue || 0) - Number(b.revenue || 0),
              showSorter: true,
              render: (_: unknown, network: AffiliateNetwork) => <span className="font-mono text-secondary">${typeof network.revenue === 'number' ? network.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : network.revenue}</span>,
            },
            {
              key: 'actions',
              label: '',
              width: '88px',
              align: 'center',
              render: (_: unknown, network: AffiliateNetwork) => (
                <div className="flex items-center justify-center gap-1">
                  <button type="button" onClick={() => handleEditNetwork(network)} className="p-2 text-fg-muted hover:text-primary" title="Edit"><Edit3 size={16} /></button>
                  <button type="button" onClick={() => handleDeleteNetwork(network.id)} className="p-2 text-fg-muted hover:text-error" title="Delete"><Trash2 size={16} /></button>
                </div>
              ),
            },
          ]}
          data={paginatedNetworks}
          rowHeight={72}
          height="auto"
          selectable
          selectedRows={selectedItems}
          onSelectionChange={setSelectedItems}
          getRowId={(row) => row.id}
          emptyMessage="No affiliate networks found"
        />
      </div>
    </div>
  );
};

// Skeleton component for table rows
const AffiliateNetworkSkeleton = () => (
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
        <div className="w-32 h-10 bg-surface-container rounded"></div>
      </div>
    </div>
    
    {/* Toolbar */}
    <div className="bg-surface-container-lowest p-4 whisper-shadow animate-pulse">
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-surface-container rounded"></div>
          <div className="w-8 h-8 bg-surface-container rounded"></div>
          <div className="w-8 h-8 bg-surface-container rounded"></div>
          <div className="w-8 h-8 bg-surface-container rounded"></div>
        </div>
        <div className="relative flex-1 min-w-[300px]">
          <div className="w-full h-10 bg-surface-container rounded"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-4 bg-surface-container rounded"></div>
          <div className="flex gap-2">
            <div className="w-16 h-10 bg-surface-container rounded"></div>
            <div className="w-16 h-10 bg-surface-container rounded"></div>
            <div className="w-16 h-10 bg-surface-container rounded"></div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Table */}
    <div className="bg-surface-container-lowest whisper-shadow overflow-hidden animate-pulse">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border-b border-outline-variant/10 p-4">
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 bg-surface-container rounded"></div>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-surface-container rounded"></div>
              <div className="space-y-2">
                <div className="w-48 h-4 bg-surface-container rounded"></div>
                <div className="w-64 h-3 bg-surface-container rounded"></div>
              </div>
            </div>
            <div className="w-20 h-8 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-surface-container rounded"></div>
              <div className="w-8 h-8 bg-surface-container rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AffiliateNetworks;
