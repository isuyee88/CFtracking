/**
 * File: TrafficSources.tsx
 * Purpose: Traffic Sources 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Traffic Source 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
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
  Zap,
  TrendingUp,
  DollarSign,
  Code,
  Link,
  Plug,
  LayoutTemplate
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrafficSourceForm } from '../components/TrafficSourceForm';
import { useToast } from '../components/Toast';
import { fetchTrafficSources, createTrafficSource, updateTrafficSource, deleteTrafficSource } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatTrafficSourceForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import type { TrafficSource, ParameterTemplate, PostbackConfig } from '../types/trafficSource';
import { getTemplateById } from '../data/trafficSourceTemplates';
import { usePageData } from '@/context/DataCacheContext';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import { TablePagination } from '../components/TablePagination';



function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 解析 JSON 字段
 */
const parseJsonField = <T,>(field: any, defaultValue: T): T => {
  if (!field) return defaultValue;
  if (typeof field === 'object') return field as T;
  try {
    return JSON.parse(field) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * 获取模板名称
 */
const getTemplateName = (templateId?: string): string => {
  if (!templateId) return 'Custom';
  const template = getTemplateById(templateId);
  return template?.name || templateId;
};

export const TrafficSources = () => {
  const toast = useToast();
  
  // 使用 usePageData hook 自动处理 SSR 缓存、加载和错误状态
  const { data: trafficSourcesData, isLoading, error, refetch } = usePageData(
    'trafficSources',
    fetchTrafficSources
  );
  
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedSource, setSelectedSource] = useState<Partial<TrafficSource> | undefined>(undefined);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  const [filterType, setFilterType] = useState<string>('All');
  
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

  // 当 trafficSourcesData 变化时，更新本地状态
  useEffect(() => {
    if (!trafficSourcesData) return;
    
    // 确保数据是数组
    if (Array.isArray(trafficSourcesData)) {
      setTrafficSources(trafficSourcesData);
    }
  }, [trafficSourcesData]);

  const handleCreateSource = () => {
    setFormMode('create');
    setSelectedSource(undefined);
    setIsFormOpen(true);
  };

  const handleEditSource = (source: TrafficSource) => {
    setFormMode('edit');
    
    // Convert apiConfig to form fields
    const formData: Record<string, any> = { ...source };
    if (source.apiConfig) {
      try {
        const config = typeof source.apiConfig === 'string' 
          ? JSON.parse(source.apiConfig) 
          : source.apiConfig;
        formData.apiEnabled = config.enabled;
        formData.apiBaseUrl = config.baseUrl;
        formData.apiKey = config.apiKey;
      } catch {
        // Ignore parse error
      }
    }
    
    setSelectedSource(formData);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    // Convert API config fields to apiConfig object
    const apiConfig = formData.apiEnabled ? {
      enabled: true,
      baseUrl: formData.apiBaseUrl || '',
      apiKey: formData.apiKey || ''
    } : undefined;

    // Prepare data for API
    const submitData = {
      ...formData,
      apiConfig
    };

    // Remove individual API fields
    delete submitData.apiEnabled;
    delete submitData.apiBaseUrl;
    delete submitData.apiKey;

    try {
      if (formMode === 'create') {
        const source = await createTrafficSource(submitData);
        if (source && source.id) {
          setTrafficSources(prev => [...prev, source]);
        }
      } else if (selectedSource?.id) {
        const source = await updateTrafficSource(selectedSource.id, submitData);
        if (source && source.id) {
          setTrafficSources(prev =>
            prev.map(s => s.id === selectedSource.id ? source : s)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Failed to save traffic source', err instanceof Error ? err.message : 'Unknown error');
      // For demo, add to local state with apiConfig preserved
      if (formMode === 'create') {
        const newSource: TrafficSource = {
          id: `ts${Date.now()}`,
          name: submitData.name,
          type: submitData.type || 'other',
          status: submitData.status || 'active',
          postbackUrl: submitData.postbackUrl || '',
          costModel: submitData.costModel || 'cpc',
          costValue: parseFloat(submitData.costValue) || 0,
          currency: submitData.currency || 'USD',
          apiConfig: submitData.apiConfig,
          campaignCount: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          roi: 0,
          updatedAt: new Date().toISOString()
        };
        setTrafficSources(prev => [...prev, newSource]);
      } else {
        setTrafficSources(prev => 
          prev.map(s => 
            s.id === selectedSource?.id 
              ? { ...s, ...submitData, updatedAt: new Date().toISOString() }
              : s
          )
        );
      }
      setIsFormOpen(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this traffic source?')) return;
    
    try {
      await deleteTrafficSource(id);
      setTrafficSources(prev => prev.filter(s => s.id !== id));
      toast.success('Traffic source deleted successfully');
    } catch (err) {
      toast.error('Failed to delete traffic source', err instanceof Error ? err.message : 'Unknown error');
      setTrafficSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredSources.map(s => s.id)));
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
      if (!confirm(`Are you sure you want to delete ${ids.length} traffic sources?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteTrafficSource(id)));
        setTrafficSources(prev => prev.filter(s => !ids.includes(s.id)));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateTrafficSource(id, { status: newStatus })));
        setTrafficSources(prev => 
          prev.map(s => 
            ids.includes(s.id) ? { ...s, status: newStatus as any } : s
          )
        );
      }
      setSelectedItems(new Set());
      toast.success('Bulk action completed successfully');
    } catch (err) {
      toast.error('Bulk action failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Filter traffic sources
  const filteredSources = trafficSources.filter(source => {
    const matchesSearch = 
      source.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      source.postbackUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || source.status === filterStatus.toLowerCase();
    const matchesType = filterType === 'All' || source.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      social: 'Social',
      search: 'Search',
      native: 'Native',
      push: 'Push',
      pop: 'Pop',
      display: 'Display',
      email: 'Email',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      social: 'bg-blue-100 text-blue-700',
      search: 'bg-green-100 text-green-700',
      native: 'bg-purple-100 text-purple-700',
      push: 'bg-orange-100 text-orange-700',
      pop: 'bg-pink-100 text-pink-700',
      display: 'bg-yellow-100 text-yellow-700',
      email: 'bg-indigo-100 text-indigo-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Skeleton component for table rows
  const TrafficSourceSkeleton = () => (
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4"></th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t border-outline-variant/10">
                  <td className="px-4 py-4">
                    <div className="w-5 h-5 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container rounded"></div>
                      <div className="space-y-2">
                        <div className="w-48 h-4 bg-surface-container rounded"></div>
                        <div className="w-32 h-3 bg-surface-container rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-24 h-6 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-20 h-6 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="w-32 h-4 bg-surface-container rounded"></div>
                      <div className="w-24 h-3 bg-surface-container rounded"></div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="w-12 h-4 bg-surface-container rounded mx-auto"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-16 h-4 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-12 h-4 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-20 h-4 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-20 h-4 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-16 h-6 bg-surface-container rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-surface-container rounded"></div>
                      <div className="w-8 h-8 bg-surface-container rounded"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isLoading && trafficSources.length === 0) {
    return <TrafficSourceSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Traffic Source Form Modal */}
      <TrafficSourceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedSource}
        mode={formMode}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Traffic Sources</h1>
          <p className="text-sm text-on-surface-variant">Manage your traffic sources and campaigns</p>
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
            data={trafficSources.map(formatTrafficSourceForExport)}
            filename="traffic-sources"
            label="Export"
          />
          <button 
            onClick={handleCreateSource}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm"
          >
            <Plus size={18} />
            New Traffic Source
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
              placeholder="Search by name or postback URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total: {filteredSources.length}
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
          totalItems={filteredSources.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="sources"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedSources.map((source) => (
          <article key={source.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-primary">{source.name}</h2>
                <p className="mt-0.5 truncate text-xs text-on-surface-variant">ID: {source.displayId || source.id}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest', source.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>{source.status}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-fg-subtle">Type</dt><dd className="mt-0.5 text-fg-default">{getTypeLabel(source.type)}</dd></div>
              <div><dt className="text-fg-subtle">Cost</dt><dd className="mt-0.5 text-fg-default">{source.costModel} {source.costValue} {source.currency}</dd></div>
              <div><dt className="text-fg-subtle">Clicks</dt><dd className="mt-0.5 font-mono text-fg-default">{(source.clicks || 0).toLocaleString()}</dd></div>
              <div><dt className="text-fg-subtle">Revenue</dt><dd className="mt-0.5 font-mono text-secondary">${typeof source.revenue === 'number' ? source.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : source.revenue}</dd></div>
            </dl>
            <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant/10 pt-2">
              <button type="button" onClick={() => handleEditSource(source)} className="rounded-md border border-outline-variant/30 px-3 py-1.5 text-xs text-fg-default">Edit</button>
              <button type="button" onClick={() => handleDeleteSource(source.id)} className="rounded-md border border-error/20 px-3 py-1.5 text-xs text-error">Delete</button>
            </div>
          </article>
        ))}
        {paginatedSources.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">No traffic sources found</div>}
      </div>

      <div className="hidden md:block">
        <VirtualTableEnhanced
          tableId="traffic-sources"
          columns={[
            {
              key: 'name',
              label: 'Source',
              width: '220px',
              className: 'flex-1 min-w-0',
              sorter: (a: TrafficSource, b: TrafficSource) => a.name.localeCompare(b.name),
              showSorter: true,
              render: (_: unknown, source: TrafficSource) => (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                    <Globe size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-primary">{source.name}</p>
                    <p className="truncate text-xs text-fg-muted">ID: {source.displayId || source.id}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              width: '100px',
              render: (_: unknown, source: TrafficSource) => <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-widest', getTypeColor(source.type))}>{getTypeLabel(source.type)}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              width: '110px',
              render: (_: unknown, source: TrafficSource) => <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-widest', source.status === 'active' ? 'status-active' : 'status-paused')}>{source.status}</span>,
            },
            {
              key: 'costModel',
              label: 'Cost Model',
              width: '100px',
              defaultHidden: true,
              render: (_: unknown, source: TrafficSource) => <span className="text-xs text-fg-default">{source.costModel} <span className="text-fg-subtle">{source.costValue} {source.currency}</span></span>,
            },
            {
              key: 'campaigns',
              label: 'Campaigns',
              width: '90px',
              align: 'center',
              defaultHidden: true,
              render: (_: unknown, source: TrafficSource) => <span className="text-fg-default">{source.campaignCount ?? '-'}</span>,
            },
            {
              key: 'clicks',
              label: 'Clicks',
              width: '80px',
              align: 'right',
              sorter: (a: TrafficSource, b: TrafficSource) => (a.clicks || 0) - (b.clicks || 0),
              showSorter: true,
              render: (_: unknown, source: TrafficSource) => <span className="font-mono text-fg-default">{(source.clicks || 0).toLocaleString()}</span>,
            },
            {
              key: 'conversions',
              label: 'Conv.',
              width: '80px',
              align: 'right',
              render: (_: unknown, source: TrafficSource) => <span className="font-mono text-fg-default">{(source.conversions || 0).toLocaleString()}</span>,
            },
            {
              key: 'revenue',
              label: 'Revenue',
              width: '100px',
              align: 'right',
              sorter: (a: TrafficSource, b: TrafficSource) => Number(a.revenue || 0) - Number(b.revenue || 0),
              showSorter: true,
              render: (_: unknown, source: TrafficSource) => <span className="font-mono text-secondary">${typeof source.revenue === 'number' ? source.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : source.revenue}</span>,
            },
            {
              key: 'profit',
              label: 'Profit',
              width: '90px',
              align: 'right',
              defaultHidden: true,
              render: (_: unknown, source: TrafficSource) => <span className={cn('font-mono', Number(source.profit) < 0 ? 'text-error' : 'text-secondary')}>${source.profit}</span>,
            },
            {
              key: 'roi',
              label: 'ROI',
              width: '76px',
              align: 'right',
              defaultHidden: true,
              render: (_: unknown, source: TrafficSource) => <span className={cn('px-2 py-1 text-xs font-medium', Number(source.roi) < 0 ? 'bg-error/10 text-error' : 'bg-secondary-container text-secondary')}>{typeof source.roi === 'number' ? String(source.roi) + '%' : source.roi}</span>,
            },
            {
              key: 'actions',
              label: '',
              width: '88px',
              align: 'center',
              render: (_: unknown, source: TrafficSource) => (
                <div className="flex items-center justify-center gap-1">
                  <button type="button" onClick={() => handleEditSource(source)} className="p-2 text-fg-muted hover:text-primary" title="Edit"><Edit3 size={16} /></button>
                  <button type="button" onClick={() => handleDeleteSource(source.id)} className="p-2 text-fg-muted hover:text-error" title="Delete"><Trash2 size={16} /></button>
                </div>
              ),
            },
          ]}
          data={paginatedSources}
          rowHeight={72}
          height="auto"
          selectable
          selectedRows={selectedItems}
          onSelectionChange={setSelectedItems}
          getRowId={(row) => row.id}
          emptyMessage="No traffic sources found"
        />
      </div>
    </div>
  );
};

export default TrafficSources;
