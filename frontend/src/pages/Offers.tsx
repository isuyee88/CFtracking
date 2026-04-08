/**
 * File: Offers.tsx
 * Purpose: Offers 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Offer 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gift, 
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
  Copy,
  Check,
  X,
  Loader2,
  DollarSign,
  TrendingUp,
  Percent
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityForm, type FormField } from '../components/EntityForm';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { fetchOffers, createOffer, updateOffer, deleteOffer, fetchAffiliateNetworks } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatOfferForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { FilterPanel, type FilterConfig, type FilterValues } from '../components/FilterPanel';
import { useToast } from '../components/Toast';
import { readBootstrapPage } from '../services/bootstrap';
import { COUNTRIES, getCountryLabel } from '../data/countries';
import { useLocation } from 'react-router-dom';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RedirectType = 'http' | 'meta' | 'js' | 'js_blank' | 'double' | 'remote';
type ActionType = 'local' | 'redirect' | 'preload' | 'action';

interface Offer {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  payout: number;
  payoutType: 'fixed' | 'revshare' | 'cpa';
  redirectType: RedirectType;
  actionType: ActionType;
  countries: string[];
  currency: string;
  status: 'active' | 'paused' | 'deleted';
  network: string;
  group: string;
  campaignCount?: number;
  clicks: number;
  conversions: number;
  revenue: number | string;
  epc: number | string;
  cr: number | string;
  updatedAt: string;
}

const OFFER_FIELDS: FormField[] = [
  {
    name: 'name',
    label: 'Offer Name',
    type: 'text',
    required: true,
    placeholder: 'Enter offer name',
    maxLength: FIELD_MAX_LENGTH.NAME,
  },
  {
    name: 'url',
    label: 'Offer URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com/offer',
    maxLength: FIELD_MAX_LENGTH.URL,
    validation: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    }
  },
  {
    name: 'payout',
    label: 'Payout',
    type: 'number',
    required: true,
    placeholder: '0.00'
  },
  {
    name: 'payoutType',
    label: 'Payout Type',
    type: 'select',
    required: true,
    options: [
      { value: 'fixed', label: 'Fixed' },
      { value: 'revshare', label: 'RevShare' },
      { value: 'cpa', label: 'CPA' }
    ]
  },
  {
    name: 'redirectType',
    label: 'Redirect Type',
    type: 'select',
    required: true,
    options: [
      { value: 'http', label: 'HTTP Redirect (302)' },
      { value: 'meta', label: 'Meta Redirect' },
      { value: 'js', label: 'JS Redirect' },
      { value: 'js_blank', label: 'JS Redirect (Blank Referrer)' },
      { value: 'double', label: 'Double Meta Redirect' },
      { value: 'remote', label: 'Remote Redirect' }
    ]
  },
  {
    name: 'actionType',
    label: 'Action Type',
    type: 'select',
    required: true,
    options: [
      { value: 'local', label: 'Local' },
      { value: 'redirect', label: 'Redirect' },
      { value: 'preload', label: 'Preload' },
      { value: 'action', label: 'Action' }
    ]
  },
  {
    name: 'countries',
    label: 'Countries',
    type: 'multiselect',
    options: COUNTRIES,
    description: 'Select target countries for this offer'
  },
  {
    name: 'network',
    label: 'Affiliate Network',
    type: 'select'
  },
  {
    name: 'group',
    label: 'Group',
    type: 'text',
    placeholder: 'Select or create group',
    maxLength: FIELD_MAX_LENGTH.GROUP,
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
    placeholder: 'Add notes about this offer...',
    maxLength: FIELD_MAX_LENGTH.NOTES,
  }
];

export const Offers = () => {
  const toast = useToast();
  const location = useLocation();
  const bootstrap = readBootstrapPage<{ offers?: Offer[]; affiliateNetworks?: Array<{ id: string; name: string }> }>('offers');
  const hasBootstrap = Boolean(bootstrap);
  const [offers, setOffers] = useState<Offer[]>(Array.isArray(bootstrap?.data?.offers) ? bootstrap.data.offers : []);
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedOffer, setSelectedOffer] = useState<Partial<Offer> | undefined>(undefined);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return new URLSearchParams(window.location.search).get('search') || '';
  });
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Affiliate networks state
  const [affiliateNetworks, setAffiliateNetworks] = useState<{id: string; name: string}[]>(
    Array.isArray(bootstrap?.data?.affiliateNetworks)
      ? bootstrap.data.affiliateNetworks.map((network: any) => ({ id: network.id, name: network.name }))
      : []
  );

  // Fetch affiliate networks for dropdown
  useEffect(() => {
    setSearchTerm(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterValues]);

  useEffect(() => {
    if (affiliateNetworks.length > 0) {
      return;
    }

    const loadAffiliateNetworks = async () => {
      try {
        const data = await fetchAffiliateNetworks();
        if (Array.isArray(data)) {
          setAffiliateNetworks(data.map(n => ({ id: n.id, name: n.name })));
        }
      } catch (err) {
        console.error('Failed to load affiliate networks:', err);
      }
    };
    loadAffiliateNetworks();
  }, [affiliateNetworks.length]);

  // Fetch offers from API
  useEffect(() => {
    const loadOffers = async () => {
      try {
        if (!hasBootstrap && offers.length === 0) {
          setLoading(true);
        }
        setError(null);
        const data = await fetchOffers();
        if (Array.isArray(data)) {
          setOffers(data);
        } else {
          setError('Failed to load offers');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, [hasBootstrap, offers.length]);

  const handleCreateOffer = () => {
    setFormMode('create');
    setSelectedOffer(undefined);
    setIsFormOpen(true);
  };

  const handleEditOffer = (offer: Offer) => {
    setFormMode('edit');
    setSelectedOffer(offer);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      if (formMode === 'create') {
        const offer = await createOffer(formData);
        if (offer && offer.id) {
          setOffers(prev => [...prev, offer]);
        }
      } else if (selectedOffer?.id) {
        const offer = await updateOffer(selectedOffer.id, formData);
        if (offer && offer.id) {
          setOffers(prev =>
            prev.map(o => o.id === selectedOffer.id ? offer : o)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Failed to save offer', err instanceof Error ? err.message : 'Unknown error');
      return;
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      await deleteOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
      toast.success('Offer deleted successfully');
    } catch (err) {
      toast.error('Failed to delete offer', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredOffers.map(o => o.id)));
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
      if (!confirm(`Are you sure you want to delete ${ids.length} offers?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteOffer(id)));
        setOffers(prev => prev.filter(o => !ids.includes(o.id)));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateOffer(id, { status: newStatus })));
        setOffers(prev => 
          prev.map(o => 
            ids.includes(o.id) ? { ...o, status: newStatus as any } : o
          )
        );
      }
      setSelectedItems(new Set());
      toast.success('Bulk action completed successfully');
    } catch (err) {
      toast.error('Bulk action failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Filter configs
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'deleted', label: 'Deleted' },
      ],
    },
    {
      key: 'payoutType',
      label: 'Payout Type',
      type: 'select',
      options: [
        { value: 'fixed', label: 'Fixed' },
        { value: 'revshare', label: 'RevShare' },
        { value: 'cpa', label: 'CPA' },
      ],
    },
    {
      key: 'group',
      label: 'Group',
      type: 'search',
      placeholder: 'Search by group...',
    },
    {
      key: 'network',
      label: 'Network',
      type: 'search',
      placeholder: 'Search by network...',
    },
  ];

  // Filter offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.network?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || offer.status === filterStatus.toLowerCase();
    
    // Apply filter panel filters
    const matchesFilters = Object.entries(filterValues).every(([key, value]) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
        return true;
      }
      const offerValue = (offer as any)[key];
      const offerValueStr = offerValue?.toString().toLowerCase() || '';
      const filterValueStr = value?.toString().toLowerCase() || '';
      
      if (Array.isArray(value)) {
        return value.some(v => offerValueStr === v.toLowerCase());
      }
      
      // For search type, use includes
      const config = filterConfigs.find(c => c.key === key);
      if (config?.type === 'search') {
        return offerValueStr.includes(filterValueStr);
      }
      
      return offerValueStr === filterValueStr;
    });
    
    return matchesSearch && matchesStatus && matchesFilters;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const paginatedOffers = filteredOffers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  const computedFields = [...OFFER_FIELDS];
  const networkField = computedFields.find(f => f.name === 'network');
  if (networkField) {
    networkField.options = affiliateNetworks.map(n => ({ value: n.id, label: n.name }));
  }

  return (
    <div className="space-y-6">
      {/* Entity Form Modal */}
      <EntityForm
        key={`${formMode}-${selectedOffer?.id || 'new'}`}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        title="Offer"
        fields={computedFields}
        initialData={selectedOffer}
        mode={formMode}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Offers</h1>
          <p className="text-sm text-on-surface-variant">Manage your affiliate offers and payouts</p>
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
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <Filter size={16} />
            Filters
            {Object.keys(filterValues).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary text-on-primary text-xs rounded-full">
                {Object.keys(filterValues).length}
              </span>
            )}
          </button>
          <ExportButton 
            data={offers.map(formatOfferForExport)}
            filename="offers"
            label="Export"
          />
          <button 
            onClick={handleCreateOffer}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm"
          >
            <Plus size={18} />
            New Offer
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

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
              placeholder="Search by name, URL, network, or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total: {filteredOffers.length}
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

      {/* Offers Table - 使用虚拟滚动 */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <VirtualTableEnhanced
          tableId="offers"
          columns={[
            {
              key: 'select',
              label: '',
              width: '50px',
              render: (_, row) => (
                <input
                  type="checkbox"
                  className="rounded border-outline-variant"
                  checked={selectedItems.has(row.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectItem(row.id);
                  }}
                />
              ),
            },
            {
              key: 'name',
              label: 'Offer',
              width: '300px',
              // 筛选和排序配置
              filters: [
                { text: 'Active', value: 'active' },
                { text: 'Paused', value: 'paused' },
                { text: 'Deleted', value: 'deleted' },
              ],
              onFilter: (value, record) => record.status?.includes(value),
              sorter: (a, b) => a.name.localeCompare(b.name),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                    <Gift size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-primary truncate max-w-[220px]" title={row.name}>
                      {truncateLabel(row.name, DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                    </h3>
                    <a 
                      href={row.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:underline flex items-center gap-1 max-w-[220px]"
                      title={row.url}
                    >
                      <span className="truncate">
                        {truncateLabel(row.url, DISPLAY_MAX_LENGTH.TABLE_SECONDARY_TEXT)}
                      </span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '120px',
              // 筛选和排序配置
              filters: [
                { text: 'Active', value: 'active' },
                { text: 'Paused', value: 'paused' },
                { text: 'Deleted', value: 'deleted' },
              ],
              onFilter: (value, record) => record.status === value,
              sorter: (a, b) => a.status.localeCompare(b.status),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                  row.status === 'active' ? "status-active" : row.status === 'paused' ? "status-paused" : "status-deleted"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    row.status === 'active' ? "bg-green-500" : row.status === 'paused' ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{row.status}</span>
                </div>
              ),
            },
            {
              key: 'payout',
              label: 'Payout',
              width: '120px',
              sorter: (a, b) => a.payout - b.payout,
              showSorter: true,
              render: (_, row) => (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-secondary">${row.payout.toFixed(2)}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase">{row.payoutType}</span>
                </div>
              ),
            },
            {
              key: 'actionType',
              label: 'Action Type',
              width: '100px',
              filters: [
                { text: 'Local', value: 'local' },
                { text: 'Redirect', value: 'redirect' },
                { text: 'Preload', value: 'preload' },
                { text: 'Action', value: 'action' },
              ],
              onFilter: (value, record) => record.actionType === value,
              sorter: (a, b) => (a.actionType || 'local').localeCompare(b.actionType || 'local'),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <span className={cn(
                  "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                  row.actionType === 'local' ? "bg-blue-100 text-blue-700" :
                  row.actionType === 'redirect' ? "bg-green-100 text-green-700" :
                  row.actionType === 'preload' ? "bg-purple-100 text-purple-700" :
                  "bg-orange-100 text-orange-700"
                )}>
                  {row.actionType || 'local'}
                </span>
              ),
            },
            {
              key: 'countries',
              label: 'Countries',
              width: '150px',
              render: (_, row) => {
                const countries = row.countries || [];
                if (countries.length === 0) {
                  return <span className="text-xs text-on-surface-variant">All</span>;
                }
                if (countries.length <= 3) {
                  return (
                    <div className="flex flex-wrap gap-1">
                      {countries.map(code => (
                        <span key={code} className="px-1.5 py-0.5 bg-surface-container text-[10px] font-medium text-on-surface-variant rounded">
                          {code}
                        </span>
                      ))}
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-surface-container text-[10px] font-medium text-on-surface-variant rounded">
                      {countries[0]}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      +{countries.length - 1} more
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'network',
              label: 'Network',
              width: '200px',
              // 筛选配置
              filters: [
                { text: 'Default', value: 'Default' },
                { text: 'Custom', value: 'Custom' },
              ],
              onFilter: (value, record) => (record.network || 'Default').includes(value),
              sorter: (a, b) => (a.network || 'Default').localeCompare(b.network || 'Default'),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <div className="flex flex-col">
                  <span
                    className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm w-fit max-w-[140px] truncate"
                    title={row.network || 'Default'}
                  >
                    {truncateLabel(row.network || 'Default', DISPLAY_MAX_LENGTH.TAG_TEXT)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1 truncate max-w-[160px]" title={row.group || 'Default'}>
                    {truncateLabel(row.group || 'Default', DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                  </span>
                </div>
              ),
            },
            {
              key: 'campaignCount',
              label: 'Campaigns',
              width: '100px',
              align: 'center',
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">
                  {value !== undefined ? value : '-'}
                </span>
              ),
            },
            {
              key: 'clicks',
              label: 'Clicks',
              width: '100px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">{(value || 0).toLocaleString()}</span>
              ),
            },
            {
              key: 'conversions',
              label: 'Conv.',
              width: '80px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">{(value || 0).toLocaleString()}</span>
              ),
            },
            {
              key: 'revenue',
              label: 'Revenue',
              width: '100px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-secondary">
                  ${typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
                </span>
              ),
            },
            {
              key: 'epc',
              label: 'EPC',
              width: '80px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-primary">
                  ${typeof value === 'number' ? value.toFixed(2) : value}
                </span>
              ),
            },
            {
              key: 'cr',
              label: 'CR',
              width: '80px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-primary">
                  {typeof value === 'number' ? `${value}%` : value}
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              width: '100px',
              render: (_, row) => (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditOffer(row as Offer)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteOffer(row.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={paginatedOffers}
          rowHeight={72}
          height={400}
          overscan={5}
          selectable={false}
          selectedRows={selectedItems}
          onSelectionChange={setSelectedItems}
          getRowId={(row) => row.id}
          emptyMessage="No offers found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOffers.length)} of {filteredOffers.length}
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

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        configs={filterConfigs}
        values={filterValues}
        onChange={setFilterValues}
        onApply={() => {
          setCurrentPage(1);
          setIsFilterOpen(false);
        }}
        onReset={() => {
          setFilterValues({});
          setCurrentPage(1);
        }}
        resultCount={filteredOffers.length}
        totalCount={offers.length}
      />
    </div>
  );
};

export default Offers;
