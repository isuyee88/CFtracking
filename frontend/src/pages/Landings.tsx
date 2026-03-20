/**
 * File: Landings.tsx
 * Purpose: Landing Pages 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Landing Page 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect } from 'react';
import { 
  Image, 
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
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityForm, type FormField } from '../components/EntityForm';
import { fetchLandings, createLanding, updateLanding, deleteLanding } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatLandingPageForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LandingPage {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'paused' | 'deleted';
  group: string;
  clicks: number;
  conversions: number;
  cr: number | string;
  campaignCount?: number;
  updatedAt: string;
}

const LANDING_FIELDS: FormField[] = [
  {
    name: 'name',
    label: 'Landing Page Name',
    type: 'text',
    required: true,
    placeholder: 'Enter landing page name'
  },
  {
    name: 'url',
    label: 'URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com/landing-page',
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
    placeholder: 'Add notes about this landing page...'
  }
];

export const Landings = () => {
  const [landings, setLandings] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedLanding, setSelectedLanding] = useState<Partial<LandingPage> | undefined>(undefined);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Fetch landings from API
  useEffect(() => {
    const loadLandings = async () => {
      try {
        setLoading(true);
        const response = await fetchLandings();
        if (response.success && response.data) {
          setLandings(response.data);
        } else {
          // Use mock data if API fails
          setLandings([
            {
              id: 'lp1',
              name: 'Landing Page A - Product Demo',
              url: 'https://example.com/landing-a',
              status: 'active',
              group: 'Product',
              campaignCount: 3,
              clicks: 12450,
              conversions: 623,
              cr: 5.0,
              updatedAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 'lp2',
              name: 'Landing Page B - Lead Form',
              url: 'https://example.com/landing-b',
              status: 'active',
              group: 'Lead Gen',
              campaignCount: 2,
              clicks: 8920,
              conversions: 312,
              cr: 3.5,
              updatedAt: '2024-01-14T15:45:00Z'
            },
            {
              id: 'lp3',
              name: 'Landing Page C - Video Sales Letter',
              url: 'https://example.com/landing-c',
              status: 'paused',
              group: 'VSL',
              campaignCount: 1,
              clicks: 5430,
              conversions: 189,
              cr: 3.5,
              updatedAt: '2024-01-13T09:15:00Z'
            }
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load landings');
      } finally {
        setLoading(false);
      }
    };

    loadLandings();
  }, []);

  const handleCreateLanding = () => {
    setFormMode('create');
    setSelectedLanding(undefined);
    setIsFormOpen(true);
  };

  const handleEditLanding = (landing: LandingPage) => {
    setFormMode('edit');
    setSelectedLanding(landing);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      if (formMode === 'create') {
        const response = await createLanding(formData);
        if (response.success && response.data) {
          setLandings(prev => [...prev, response.data]);
        }
      } else if (selectedLanding?.id) {
        const response = await updateLanding(selectedLanding.id, formData);
        if (response.success && response.data) {
          setLandings(prev => 
            prev.map(lp => lp.id === selectedLanding.id ? response.data : lp)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save landing page:', err);
      // For demo, add to local state
      if (formMode === 'create') {
        const newLanding: LandingPage = {
          id: `lp${Date.now()}`,
          name: formData.name,
          url: formData.url,
          status: formData.status || 'active',
          group: formData.group || 'Default',
          campaignCount: 0,
          clicks: 0,
          conversions: 0,
          cr: 0,
          updatedAt: new Date().toISOString()
        };
        setLandings(prev => [...prev, newLanding]);
      } else {
        setLandings(prev => 
          prev.map(lp => 
            lp.id === selectedLanding?.id 
              ? { ...lp, ...formData, updatedAt: new Date().toISOString() }
              : lp
          )
        );
      }
      setIsFormOpen(false);
    }
  };

  const handleDeleteLanding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;
    
    try {
      await deleteLanding(id);
      setLandings(prev => prev.filter(lp => lp.id !== id));
    } catch (err) {
      console.error('Failed to delete landing page:', err);
      setLandings(prev => prev.filter(lp => lp.id !== id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredLandings.map(lp => lp.id)));
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
      if (!confirm(`Are you sure you want to delete ${ids.length} landing pages?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteLanding(id)));
        setLandings(prev => prev.filter(lp => !ids.includes(lp.id)));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateLanding(id, { status: newStatus })));
        setLandings(prev => 
          prev.map(lp => 
            ids.includes(lp.id) ? { ...lp, status: newStatus as any } : lp
          )
        );
      }
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  // Filter landings
  const filteredLandings = landings.filter(landing => {
    const matchesSearch = 
      landing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || landing.status === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLandings.length / itemsPerPage);
  const paginatedLandings = filteredLandings.slice(
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
        title="Landing Page"
        fields={LANDING_FIELDS}
        initialData={selectedLanding}
        mode={formMode}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Landing Pages</h1>
          <p className="text-sm text-on-surface-variant">Manage and optimize your landing pages</p>
        </div>
        <div className="flex gap-3 items-center">
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
            data={landings.map(formatLandingPageForExport)}
            filename="landing-pages"
            label="Export"
          />
          <button 
            onClick={handleCreateLanding}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
          >
            <Plus size={18} />
            New Landing Page
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
              placeholder="Search by name, URL, or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total: {filteredLandings.length}
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

      {/* Landing Pages Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant"
                    checked={selectedItems.size === filteredLandings.length && filteredLandings.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Landing Page</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">Campaigns</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">CR</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLandings.map((landing) => (
                <tr 
                  key={landing.id} 
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors",
                    selectedItems.has(landing.id) && "bg-surface-container/30"
                  )}
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-outline-variant"
                      checked={selectedItems.has(landing.id)}
                      onChange={() => handleSelectItem(landing.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Image size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary">{landing.name}</h3>
                        <a 
                          href={landing.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-secondary hover:underline flex items-center gap-1"
                        >
                          {landing.url}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                      landing.status === 'active' ? "bg-secondary-container text-secondary" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        landing.status === 'active' ? "bg-secondary" : "bg-on-surface-variant"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{landing.status}</span>
                    </div>
                  </td>
<td className="px-4 py-4">
                    <span className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm">
                      {landing.group || 'Default'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-on-surface">
                      {landing.campaignCount !== undefined ? landing.campaignCount : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(landing.clicks || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(landing.conversions || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-secondary">
                      {typeof landing.cr === 'number' ? `${landing.cr}%` : landing.cr}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditLanding(landing)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLanding(landing.id)}
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

        {filteredLandings.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No landing pages found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLandings.length)} of {filteredLandings.length}
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

export default Landings;
