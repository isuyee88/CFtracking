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
import { fetchTrafficSources, createTrafficSource, updateTrafficSource, deleteTrafficSource } from '../services/api';
import { ExportButton } from '../components/ExportButton';
import { formatTrafficSourceForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import type { TrafficSource, ParameterTemplate, PostbackConfig } from '../types/trafficSource';
import { getTemplateById } from '../data/trafficSourceTemplates';

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
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Fetch traffic sources from API
  useEffect(() => {
    const loadTrafficSources = async () => {
      try {
        setLoading(true);
        const data = await fetchTrafficSources();
        if (Array.isArray(data)) {
          setTrafficSources(data);
        } else {
          // Use mock data if API fails
          setTrafficSources([
            {
              id: 'ts1',
              name: 'Facebook Ads',
              type: 'social',
              status: 'active',
              postbackUrl: 'https://facebook.com/postback',
              costModel: 'cpc',
              costValue: 0.5,
              currency: 'USD',
              campaignCount: 5,
              clicks: 45200,
              conversions: 1240,
              revenue: 45200.00,
              cost: 32750.00,
              profit: 12450.00,
              roi: 38.0,
              updatedAt: '2024-01-15T10:30:00Z'
            },
            {
              id: 'ts2',
              name: 'Google Ads',
              type: 'search',
              status: 'active',
              postbackUrl: 'https://google.com/postback',
              costModel: 'cpc',
              costValue: 1.2,
              currency: 'USD',
              campaignCount: 3,
              clicks: 38500,
              conversions: 980,
              revenue: 38500.00,
              cost: 28700.00,
              profit: 9800.00,
              roi: 34.0,
              updatedAt: '2024-01-14T15:45:00Z'
            },
            {
              id: 'ts3',
              name: 'TikTok Ads',
              type: 'social',
              status: 'paused',
              postbackUrl: 'https://tiktok.com/postback',
              costModel: 'cpm',
              costValue: 5.0,
              currency: 'USD',
              campaignCount: 2,
              clicks: 22100,
              conversions: 310,
              revenue: 22100.00,
              cost: 19000.00,
              profit: 3100.00,
              roi: 16.0,
              updatedAt: '2024-01-13T09:15:00Z'
            },
            {
              id: 'ts4',
              name: 'Taboola Native',
              type: 'native',
              status: 'active',
              postbackUrl: 'https://taboola.com/postback',
              costModel: 'cpc',
              costValue: 0.3,
              currency: 'USD',
              campaignCount: 1,
              clicks: 15600,
              conversions: 210,
              revenue: 15600.00,
              cost: 15750.00,
              profit: -150.00,
              roi: -1.0,
              updatedAt: '2024-01-12T16:20:00Z'
            }
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load traffic sources');
      } finally {
        setLoading(false);
      }
    };

    loadTrafficSources();
  }, []);

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
      console.error('Failed to save traffic source:', err);
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
    } catch (err) {
      console.error('Failed to delete traffic source:', err);
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
    } catch (err) {
      console.error('Bulk action failed:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
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
                  filterStatus === tab ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic Sources Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant"
                    checked={selectedItems.size === filteredSources.length && filteredSources.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
<th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Source</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cost Model</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">Campaigns</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Revenue</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Profit</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">ROI</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedSources.map((source) => (
                <tr 
                  key={source.id} 
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors",
                    selectedItems.has(source.id) && "bg-surface-container/30"
                  )}
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-outline-variant"
                      checked={selectedItems.has(source.id)}
                      onChange={() => handleSelectItem(source.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Globe size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary">{source.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-on-surface-variant">ID: {source.displayId || source.id}</p>
                          {source.templateId && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              {getTemplateName(source.templateId)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                      getTypeColor(source.type)
                    )}>
                      {getTypeLabel(source.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                      source.status === 'active' ? "bg-secondary-container text-secondary" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        source.status === 'active' ? "bg-secondary" : "bg-on-surface-variant"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{source.status}</span>
                    </div>
                  </td>
<td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-surface uppercase">{source.costModel}</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {source.costValue} {source.currency}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-on-surface">
                      {source.campaignCount !== undefined ? source.campaignCount : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(source.clicks || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-on-surface">{(source.conversions || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-secondary">
                      ${typeof source.revenue === 'number' ? source.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : source.revenue}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "text-sm font-medium",
                      (typeof source.profit === 'number' ? source.profit : parseFloat(source.profit as string)) < 0 ? "text-error" : "text-secondary"
                    )}>
                      ${typeof source.profit === 'number' 
                        ? (source.profit < 0 ? '-' : '') + Math.abs(source.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : source.profit}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "text-sm font-medium px-2 py-1 rounded-sm",
                      (typeof source.roi === 'number' ? source.roi : parseFloat(source.roi as string)) < 0 ? "bg-error/10 text-error" : "bg-secondary-container text-secondary"
                    )}>
                      {typeof source.roi === 'number' ? `${source.roi}%` : source.roi}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      {source.parameters && (
                        <span className="p-1.5 text-on-surface-variant/50" title="Has Parameters">
                          <Code size={14} />
                        </span>
                      )}
                      {source.postbackConfig && (
                        <span className="p-1.5 text-on-surface-variant/50" title="Has Postback">
                          <Link size={14} />
                        </span>
                      )}
                      {source.apiConfig && parseJsonField<{enabled: boolean}>(source.apiConfig, {enabled: false}).enabled && (
                        <span className="p-1.5 text-secondary/70" title="API Enabled">
                          <Plug size={14} />
                        </span>
                      )}
                      <button 
                        onClick={() => handleEditSource(source)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSource(source.id)}
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

        {filteredSources.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No traffic sources found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSources.length)} of {filteredSources.length}
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

export default TrafficSources;
