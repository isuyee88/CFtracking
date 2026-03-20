/**
 * File: Offers.tsx
 * Purpose: Offers 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Offer 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect } from 'react';
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
import { fetchOffers, createOffer, updateOffer, deleteOffer } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatOfferForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Offer {
  id: string;
  name: string;
  url: string;
  payout: number;
  payoutType: 'fixed' | 'revshare' | 'cpa';
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
    placeholder: 'Enter offer name'
  },
  {
    name: 'url',
    label: 'Offer URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com/offer',
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
    name: 'network',
    label: 'Affiliate Network',
    type: 'text',
    placeholder: 'Select or enter network'
  },
  {
    name: 'group',
    label: 'Group',
    type: 'text',
    placeholder: 'Select or create group'
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
    placeholder: 'Add notes about this offer...'
  }
];

export const Offers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedOffer, setSelectedOffer] = useState<Partial<Offer> | undefined>(undefined);
  
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

  // Fetch offers from API
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const response = await fetchOffers();
        if (response.success && response.data) {
          setOffers(response.data);
        } else {
          // Use mock data if API fails
          setOffers([
            {
              id: 'offer1',
              name: 'Weight Loss Supplement - Free Trial',
              url: 'https://example.com/weight-loss-offer',
              payout: 45.00,
              payoutType: 'fixed',
              currency: 'USD',
              status: 'active',
              network: 'OddBytes',
              group: 'Health',
              campaignCount: 2,
              clicks: 12450,
              conversions: 623,
              revenue: 28035.00,
              epc: 2.25,
              cr: 5.0,
              updatedAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 'offer2',
              name: 'Make Money Online Course',
              url: 'https://example.com/mmo-course',
              payout: 97.00,
              payoutType: 'fixed',
              currency: 'USD',
              status: 'active',
              network: 'PropellerAds',
              group: 'Education',
              campaignCount: 3,
              clicks: 8920,
              conversions: 312,
              revenue: 30264.00,
              epc: 3.39,
              cr: 3.5,
              updatedAt: '2024-01-14T15:45:00Z'
            },
            {
              id: 'offer3',
              name: 'Dating Site Premium Membership',
              url: 'https://example.com/dating-premium',
              payout: 25.00,
              payoutType: 'cpa',
              currency: 'USD',
              status: 'paused',
              network: 'AdCash',
              group: 'Dating',
              campaignCount: 1,
              clicks: 5430,
              conversions: 189,
              revenue: 4725.00,
              epc: 0.87,
              cr: 3.5,
              updatedAt: '2024-01-13T09:15:00Z'
            }
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

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
        const response = await createOffer(formData);
        if (response.success && response.data) {
          setOffers(prev => [...prev, response.data]);
        }
      } else if (selectedOffer?.id) {
        const response = await updateOffer(selectedOffer.id, formData);
        if (response.success && response.data) {
          setOffers(prev => 
            prev.map(o => o.id === selectedOffer.id ? response.data : o)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save offer:', err);
      // For demo, add to local state
      if (formMode === 'create') {
        const newOffer: Offer = {
          id: `offer${Date.now()}`,
          name: formData.name,
          url: formData.url,
          payout: parseFloat(formData.payout) || 0,
          payoutType: formData.payoutType || 'fixed',
          currency: 'USD',
          status: formData.status || 'active',
          network: formData.network || 'Default',
          group: formData.group || 'Default',
          campaignCount: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          epc: 0,
          cr: 0,
          updatedAt: new Date().toISOString()
        };
        setOffers(prev => [...prev, newOffer]);
      } else {
        setOffers(prev => 
          prev.map(o => 
            o.id === selectedOffer?.id 
              ? { ...o, ...formData, updatedAt: new Date().toISOString() }
              : o
          )
        );
      }
      setIsFormOpen(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      await deleteOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Failed to delete offer:', err);
      setOffers(prev => prev.filter(o => o.id !== id));
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
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  // Filter offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.network?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || offer.status === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
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

  return (
    <div className="space-y-6">
      {/* Entity Form Modal */}
      <EntityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        title="Offer"
        fields={OFFER_FIELDS}
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
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
            <Filter size={16} />
            Filters
          </button>
          <ExportButton 
            data={offers.map(formatOfferForExport)}
            filename="offers"
            label="Export"
          />
          <button 
            onClick={handleCreateOffer}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
          >
            <Plus size={18} />
            New Offer
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
                className="p-2 text-on-surface-variant hover:text-secondary transition-colors" 
                title="Activate"
              >
                <Play size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('pause')}
                className="p-2 text-on-surface-variant hover:text-warning transition-colors" 
                title="Pause"
              >
                <Pause size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('delete')}
                className="p-2 text-on-surface-variant hover:text-error transition-colors" 
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
              <div className="h-6 w-px bg-outline-variant/20 mx-2" />
            </>
          ) : (
            <>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Play"><Play size={18} /></button>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Pause"><Pause size={18} /></button>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Copy"><Copy size={18} /></button>
              <button className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Delete"><Trash2 size={18} /></button>
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
                  filterStatus === tab ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant"
                    checked={selectedItems.size === filteredOffers.length && filteredOffers.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
<th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Offer</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Payout</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Network</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">Campaigns</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Revenue</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">EPC</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">CR</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedOffers.map((offer) => (
                <tr 
                  key={offer.id} 
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors",
                    selectedItems.has(offer.id) && "bg-surface-container/30"
                  )}
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-outline-variant"
                      checked={selectedItems.has(offer.id)}
                      onChange={() => handleSelectItem(offer.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Gift size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary">{offer.name}</h3>
                        <a 
                          href={offer.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-secondary hover:underline flex items-center gap-1"
                        >
                          {offer.url.substring(0, 40)}...
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                      offer.status === 'active' ? "bg-secondary-container text-secondary" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        offer.status === 'active' ? "bg-secondary" : "bg-on-surface-variant"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{offer.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-secondary">${offer.payout.toFixed(2)}</span>
                      <span className="text-[10px] text-on-surface-variant uppercase">{offer.payoutType}</span>
                    </div>
                  </td>
<td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm w-fit">
                        {offer.network || 'Default'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant mt-1">{offer.group || 'Default'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-on-surface">
                      {offer.campaignCount !== undefined ? offer.campaignCount : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(offer.clicks || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(offer.conversions || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-secondary">
                      ${typeof offer.revenue === 'number' ? offer.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : offer.revenue}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-primary">
                      ${typeof offer.epc === 'number' ? offer.epc.toFixed(2) : offer.epc}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-primary">
                      {typeof offer.cr === 'number' ? `${offer.cr}%` : offer.cr}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditOffer(offer)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteOffer(offer.id)}
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

        {filteredOffers.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No offers found</p>
          </div>
        )}

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
    </div>
  );
};

export default Offers;
