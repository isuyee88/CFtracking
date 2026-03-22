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
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { fetchLandings, createLanding, updateLanding, deleteLanding } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatLandingPageForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { FilterPanel, type FilterConfig, type FilterValues } from '../components/FilterPanel';
import { useToast } from '../components/Toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LandingPage {
  id: string;
  displayId?: string;
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
  const toast = useToast();
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

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // Fetch landings from API
  useEffect(() => {
    const loadLandings = async () => {
      try {
        setLoading(true);
        const data = await fetchLandings();
        if (Array.isArray(data)) {
          setLandings(data);
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
        const landing = await createLanding(formData);
        if (landing && landing.id) {
          setLandings(prev => [...prev, landing]);
        }
      } else if (selectedLanding?.id) {
        const landing = await updateLanding(selectedLanding.id, formData);
        if (landing && landing.id) {
          setLandings(prev =>
            prev.map(lp => lp.id === selectedLanding.id ? landing : lp)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Failed to save landing page', err instanceof Error ? err.message : 'Unknown error');
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
      toast.success('Landing page deleted successfully');
    } catch (err) {
      toast.error('Failed to delete landing page', err instanceof Error ? err.message : 'Unknown error');
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
      key: 'group',
      label: 'Group',
      type: 'search',
      placeholder: 'Search by group...',
    },
  ];

  // Filter landings
  const filteredLandings = landings.filter(landing => {
    const matchesSearch = 
      landing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || landing.status === filterStatus.toLowerCase();
    
    // Apply filter panel filters
    const matchesFilters = Object.entries(filterValues).every(([key, value]) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
        return true;
      }
      const landingValue = (landing as any)[key];
      const landingValueStr = landingValue?.toString().toLowerCase() || '';
      const filterValueStr = value?.toString().toLowerCase() || '';
      
      if (Array.isArray(value)) {
        return value.some(v => landingValueStr === v.toLowerCase());
      }
      
      // For search type, use includes
      const config = filterConfigs.find(c => c.key === key);
      if (config?.type === 'search') {
        return landingValueStr.includes(filterValueStr);
      }
      
      return landingValueStr === filterValueStr;
    });
    
    return matchesSearch && matchesStatus && matchesFilters;
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
            data={landings.map(formatLandingPageForExport)}
            filename="landing-pages"
            label="Export"
          />
          <button 
            onClick={handleCreateLanding}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm"
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

      {/* Landing Pages Table - 使用虚拟滚动 */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <VirtualTableEnhanced
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
              label: 'Landing Page',
              width: '300px',
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                    <Image size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">{row.name}</h3>
                    <a 
                      href={row.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:underline flex items-center gap-1"
                    >
                      {row.url}
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
              render: (_, row) => (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                  row.status === 'active' ? "status-active" : "status-paused"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    row.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{row.status}</span>
                </div>
              ),
            },
            {
              key: 'group',
              label: 'Group',
              width: '150px',
              render: (_, row) => (
                <span className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm">
                  {row.group || 'Default'}
                </span>
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
              key: 'cr',
              label: 'CR',
              width: '80px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-secondary">
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
                    onClick={() => handleEditLanding(row as LandingPage)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteLanding(row.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={paginatedLandings}
          rowHeight={72}
          height={400}
          overscan={5}
          selectable={false}
          selectedRows={selectedItems}
          onSelectionChange={setSelectedItems}
          getRowId={(row) => row.id}
          emptyMessage="No landing pages found"
        />

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
        resultCount={filteredLandings.length}
        totalCount={landings.length}
      />
    </div>
  );
};

export default Landings;
