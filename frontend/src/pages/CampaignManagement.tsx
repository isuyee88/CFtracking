import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Plus, 
  Search, 
  MoreHorizontal, 
  ArrowUpRight, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  Edit3,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchCampaigns, fetchCampaign, createCampaign, updateCampaign, deleteCampaign, fetchEntityStats } from '../services/api';
import { CampaignForm } from '../components/CampaignForm';
import { ExportButton } from '../components/ExportButton';
import { formatCampaignForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { GroupByFilter, filterByGroupBy } from '../components/GroupByFilter';
import type { GroupByState, GroupByOption } from '../types/filter';
import { useToast } from '../components/Toast';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadBootstrapForLocation, normalizeRangeParam, readBootstrapPage } from '../services/bootstrap';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function resolveDateRangeFromPreset(preset: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  const normalizedPreset = normalizeRangeParam(preset);

  switch (normalizedPreset) {
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      return {
        from: start.toISOString().split('T')[0]!,
        to: start.toISOString().split('T')[0]!,
        pickerValue: 'yesterday',
      };
    case 'last7days':
      start.setDate(start.getDate() - 6);
      return {
        from: start.toISOString().split('T')[0]!,
        to: today.toISOString().split('T')[0]!,
        pickerValue: 'last7days',
      };
    case 'last30days':
      start.setDate(start.getDate() - 29);
      return {
        from: start.toISOString().split('T')[0]!,
        to: today.toISOString().split('T')[0]!,
        pickerValue: 'last30days',
      };
    case 'today':
    default:
      return {
        from: today.toISOString().split('T')[0]!,
        to: today.toISOString().split('T')[0]!,
        pickerValue: 'today',
      };
  }
}

function getCurrentRangePreset(fallback: string): string {
  if (typeof window === 'undefined') {
    return normalizeRangeParam(fallback);
  }

  return normalizeRangeParam(new URLSearchParams(window.location.search).get('range') || fallback);
}

const CAMPAIGN_ROW_HEIGHT = 72;
const CAMPAIGN_HEADER_HEIGHT = 72;
const CAMPAIGN_NAME_DISPLAY_LIMIT = 28;

function getCampaignTableHeight(rowCount: number): number {
  if (rowCount <= 0) {
    return 280;
  }

  // +2 补偿容器边框，避免出现 1-2px 的纵向滚动条
  return CAMPAIGN_HEADER_HEIGHT + rowCount * CAMPAIGN_ROW_HEIGHT + 2;
}

function truncateCampaignName(name: string): string {
  if (name.length <= CAMPAIGN_NAME_DISPLAY_LIMIT) {
    return name;
  }
  return `${name.slice(0, CAMPAIGN_NAME_DISPLAY_LIMIT - 1)}…`;
}

// Backend Campaign data structure
interface BackendCampaign {
  id: string;
  displayId?: string;
  name: string;
  alias: string;
  domain: string;
  group: string | null;
  trafficSource: string | null;
  flowRotation: string;
  costModel: string;
  trafficLoss: number;
  uniquenessTTL: number;
  visitorBinding: string;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  updatedAt: string;
  parameters: Record<string, any>;
}

// Frontend Campaign display structure
interface Campaign {
  id: string;
  displayId?: string;
  name: string;
  status: 'Active' | 'Paused' | 'Deleted';
  type: 'Redirect' | 'Direct';
  group: string;
  flow: string;
  source: string;
  clicks: number;
  conversions: number;
  revenue: string;
  profit: string;
  roi: string;
  epc: string;
  cpc: string;
  cr: string;
}

// Transform backend data to frontend format
interface CampaignStats {
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  unique_visitors: number;
}

const transformCampaign = (backend: BackendCampaign, stats?: CampaignStats): Campaign => ({
  id: backend.displayId || backend.id,
  name: backend.name,
  status: backend.status === 'active' ? 'Active' : backend.status === 'paused' ? 'Paused' : 'Deleted',
  type: 'Redirect',
  group: backend.group || 'Default',
  flow: backend.flowRotation || 'Default',
  source: backend.trafficSource || 'Direct',
  clicks: stats?.clicks || 0,
  conversions: stats?.conversions || 0,
  revenue: `$${(stats?.revenue || 0).toFixed(2)}`,
  profit: `$${((stats?.revenue || 0) - (stats?.spend || 0)).toFixed(2)}`,
  roi: stats?.spend ? `${((((stats?.revenue || 0) - stats.spend) / stats.spend) * 100).toFixed(1)}%` : '0%',
  epc: stats?.clicks ? `$${((stats?.revenue || 0) / stats.clicks).toFixed(2)}` : '$0.00',
  cpc: stats?.clicks ? `$${((stats?.spend || 0) / stats.clicks).toFixed(2)}` : '$0.00',
  cr: stats?.clicks ? `${(((stats?.conversions || 0) / stats.clicks) * 100).toFixed(1)}%` : '0%'
});

function mapBackendCampaignToFormData(campaign: BackendCampaign | Record<string, any>) {
  return {
    id: campaign.id,
    name: campaign.name || '',
    alias: campaign.alias || '',
    domain: campaign.domain || '',
    group: campaign.group || '',
    trafficSource: campaign.trafficSource || '',
    flowRotation: campaign.flowRotation || 'weight',
    costModel: campaign.costModel || 'cpc',
    costValue: Number(campaign.costValue || 0),
    currency: campaign.currency || 'USD',
    uniquenessMethod: campaign.uniquenessMethod || 'none',
    uniquenessParameter: campaign.uniquenessParameter || '',
    uniquenessTTL: Number(campaign.uniquenessTTL || 86400),
    visitorBinding: campaign.visitorBinding || 'none',
    status: campaign.status || 'active',
    notes: campaign.notes || '',
    flows: Array.isArray(campaign.flows) ? campaign.flows : [],
    connections: Array.isArray(campaign.connections) ? campaign.connections : [],
    filterConfig: campaign.filterConfig,
  };
}

function mapBootstrapCampaigns(bundle: {
  data?: {
    campaigns?: BackendCampaign[];
    entityStats?: CampaignStats[];
  };
} | null | undefined): Campaign[] {
  const statsMap = new Map<string, CampaignStats>();

  if (Array.isArray(bundle?.data?.entityStats)) {
    bundle.data.entityStats.forEach((stat) => {
      if (stat?.name) {
        statsMap.set(stat.name, stat);
      }
    });
  }

  if (!Array.isArray(bundle?.data?.campaigns)) {
    return [];
  }

  return bundle.data.campaigns.map((item) => {
    const campaignStats =
      statsMap.get(item.displayId || '') ||
      statsMap.get(item.id) ||
      statsMap.get(item.name);
    return transformCampaign(item, campaignStats);
  });
}

export const CampaignManagement = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const bootstrap = readBootstrapPage<{ campaigns?: BackendCampaign[]; entityStats?: CampaignStats[] }>('campaigns');
  const hasBootstrap = Boolean(bootstrap);
  const initialBootstrapCampaigns = mapBootstrapCampaigns(bootstrap);
  const urlRangePreset =
    typeof window !== 'undefined' ? new URLSearchParams(location.search).get('range') || null : null;
  const initialRangePreset =
    urlRangePreset || (typeof bootstrap?.scope?.range === 'string' ? bootstrap.scope.range : 'today');
  const initialDateRange = resolveDateRangeFromPreset(initialRangePreset);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialBootstrapCampaigns);
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: initialDateRange.from,
    to: initialDateRange.to
  });
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedCampaign, setSelectedCampaign] = useState<Record<string, any> | undefined>(undefined);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [groupByStates, setGroupByStates] = useState<GroupByState[]>([]);

  const getRangeFromDates = (from: string, to: string): string => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const isToday = fromDate.toDateString() === today.toDateString();
      return isToday ? 'today' : 'yesterday';
    } else if (diffDays === 6) {
      return 'last7days';
    } else if (diffDays === 29) {
      return 'last30days';
    }
    return 'custom';
  };

  const loadCampaignsWithStats = useCallback(async () => {
    try {
      if (!hasBootstrap && campaigns.length === 0) {
        setLoading(true);
      }
      setError(null);

      const refreshedBootstrap = await loadBootstrapForLocation().catch(() => null);
      const requestedRange = getCurrentRangePreset(
        initialRangePreset || getRangeFromDates(dateRange.from, dateRange.to)
      );

      if (
        refreshedBootstrap?.page === 'campaigns' &&
        (refreshedBootstrap.scope?.range || 'today') === requestedRange
      ) {
        const bootstrapCampaigns = mapBootstrapCampaigns(refreshedBootstrap as typeof bootstrap);
        if (bootstrapCampaigns.length > 0) {
          setCampaigns(bootstrapCampaigns);
          return;
        }
      }
      
      const [campaignsData, statsData] = await Promise.all([
        fetchCampaigns(),
        fetchEntityStats('campaigns', requestedRange)
      ]);
      
      if (Array.isArray(campaignsData)) {
        const statsMap = new Map<string, CampaignStats>();
        if (Array.isArray(statsData)) {
          statsData.forEach((stat: any) => {
            if (stat.name) {
              statsMap.set(stat.name, stat);
            }
          });
        }
        
        const transformedCampaigns = campaignsData.map((item: BackendCampaign) => {
          const campaignStats = statsMap.get(item.displayId) || statsMap.get(item.id) || statsMap.get(item.name);
          return transformCampaign(item, campaignStats);
        });
        setCampaigns(transformedCampaigns);
      } else {
        setError('Failed to load campaigns');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [campaigns.length, dateRange.from, dateRange.to, hasBootstrap, initialRangePreset, location.search]);

  useEffect(() => {
    loadCampaignsWithStats();
  }, [loadCampaignsWithStats]);

  useEffect(() => {
    setSearchTerm(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, groupByStates]);

  const handleCampaignClick = (id: string) => {
    navigate(`/campaigns/${id}`);
  };
  
  const handleCreateCampaign = () => {
    setFormMode('create');
    setSelectedCampaign(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditCampaign = async (campaign: Campaign) => {
    setFormMode('edit');

    try {
      const fullCampaign = await fetchCampaign(campaign.id);
      setSelectedCampaign(mapBackendCampaignToFormData(fullCampaign));
    } catch (err) {
      toast.error('Failed to load campaign', err instanceof Error ? err.message : 'Unknown error');
      return;
    }

    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (formData: any) => {
    try {
      if (formMode === 'create') {
        const campaign = await createCampaign(formData);
        // createCampaign returns the campaign object directly
        if (campaign && campaign.id) {
          const newCampaign = transformCampaign(campaign);
          setCampaigns(prev => [...prev, newCampaign]);
          toast.success('Campaign Created', `Campaign "${formData.name}" has been created successfully.`);
        }
      } else if (selectedCampaign?.id) {
        const campaign = await updateCampaign(selectedCampaign.id, formData);
        if (campaign && campaign.id) {
          await loadCampaignsWithStats();
          toast.success('Campaign Updated', `Campaign "${formData.name}" has been updated successfully.`);
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save campaign:', err);
      toast.error(
        formMode === 'create' ? 'Failed to Create Campaign' : 'Failed to Update Campaign',
        err instanceof Error ? err.message : 'Please check your input and try again.'
      );
    }
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredCampaigns.map(c => c.id)));
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
    
    if (ids.length === 0) {
      toast.warning('No Selection', 'Please select at least one campaign.');
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${ids.length} campaigns?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteCampaign(id)));
        setCampaigns(prev => prev.filter(c => !ids.includes(c.id)));
        toast.success('Campaigns Deleted', `${ids.length} campaigns have been deleted.`);
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateCampaign(id, { status: newStatus })));
        setCampaigns(prev => 
          prev.map(c => 
            ids.includes(c.id) ? { ...c, status: action === 'activate' ? 'Active' : 'Paused' } : c
          )
        );
        toast.success('Status Updated', `${ids.length} campaigns have been ${action === 'activate' ? 'activated' : 'paused'}.`);
      }
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Bulk action failed:', err);
      toast.error('Action Failed', err instanceof Error ? err.message : 'Failed to perform bulk action.');
    }
  };

  // Group By options for campaigns
  const CAMPAIGN_GROUP_BY_OPTIONS: GroupByOption[] = [
    { value: 'status', label: 'Status', category: 'Status' },
    { value: 'type', label: 'Type', category: 'Campaign' },
    { value: 'group', label: 'Group', category: 'Campaign' },
    { value: 'source', label: 'Traffic Source', category: 'Traffic' },
    { value: 'flow', label: 'Flow', category: 'Campaign' },
  ];

  // Filter campaigns
  const filteredCampaigns = React.useMemo(() => {
    let result = campaigns.filter(campaign => {
      const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.id?.toString().includes(searchTerm) ||
                           campaign.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           false;
      const matchesStatus = filterStatus === 'All' || campaign.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
    
    // Apply Group By filters
    result = filterByGroupBy(result, groupByStates);
    
    return result;
  }, [campaigns, searchTerm, filterStatus, groupByStates]);
  
  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 让每页数据完整展示，避免表格内部出现向下滚动条
  const tableHeight = getCampaignTableHeight(paginatedCampaigns.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-error">
        <X size={48} className="mb-4" />
        <p className="text-lg font-bold">{error}</p>
        <button 
          onClick={() => void loadCampaignsWithStats()}
          className="mt-4 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Campaign Form Modal */}
      <CampaignForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedCampaign}
        mode={formMode}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-fg-default">Campaign Management</h1>
          <p className="text-sm text-fg-muted">Manage your tracking campaigns and traffic distribution</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Date Range Picker */}
          <div className="w-[280px]">
            <QuickDateRangePicker
              value={initialDateRange.pickerValue}
              onChange={(preset, range) => {
                const normalizedPreset = normalizeRangeParam(preset);
                const nextUrl = normalizedPreset ? `/campaigns?range=${normalizedPreset}` : '/campaigns';
                if (range) {
                  setDateRange({
                    from: range.startDate.split('T')[0]!,
                    to: range.endDate.split('T')[0]!,
                  });
                }
                navigate(nextUrl);
              }}
              showTime={false}
              maxRangeDays={365}
            />
          </div>
          <ExportButton 
            data={campaigns.map(formatCampaignForExport)}
            filename="campaigns"
            label="Export"
          />
          <button 
            onClick={handleCreateCampaign}
            className="btn-create flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md"
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Group By Filter */}
      <div className="card p-4">
        <GroupByFilter
          data={campaigns}
          groupByOptions={CAMPAIGN_GROUP_BY_OPTIONS}
          value={groupByStates}
          onChange={setGroupByStates}
          maxLevels={3}
        />
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 ? (
            <>
              <span className="text-sm text-fg-muted mr-2">{selectedItems.size} selected</span>
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
              <div className="h-6 w-px bg-border-default mx-2" />
            </>
          ) : (
            <>
              <button className="btn-icon-create p-2 rounded transition-colors" title="Play"><Play size={18} /></button>
              <button className="btn-icon-pause p-2 rounded transition-colors" title="Pause"><Pause size={18} /></button>
              <button className="p-2 text-fg-muted hover:text-accent-fg transition-colors rounded" title="Copy"><Copy size={18} /></button>
              <button className="btn-icon-delete p-2 rounded transition-colors" title="Delete"><Trash2 size={18} /></button>
              <div className="h-6 w-px bg-border-default mx-2" />
            </>
          )}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, ID, or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-canvas text-sm border border-border-default focus:border-accent-fg focus:ring-2 focus:ring-accent-subtle rounded-md outline-none transition-all text-fg-default placeholder:text-fg-subtle"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-fg-subtle">
            Total: {filteredCampaigns.length}
          </span>
          <div className="flex bg-surface-container p-1 rounded-md border border-border-default">
            {(['All', 'Active', 'Paused'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => { setFilterStatus(tab); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
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

      {/* Campaigns Table - VirtualTableEnhanced */}
      <div className="card overflow-hidden">
        <VirtualTableEnhanced
          tableId="campaigns"
          className="overflow-y-hidden"
          columns={[
            {
              key: 'select',
              label: '',
              width: '40px',
              align: 'center',
              render: (_: any, row: any) => (
                <input 
                  type="checkbox" 
                  className="rounded border-border-default"
                  checked={selectedItems.has(row.id)}
                  onChange={() => handleSelectItem(row.id)}
                />
              ),
            },
            {
              key: 'name',
              label: 'Campaign',
              width: '300px',
              sorter: (a: any, b: any) => a.name.localeCompare(b.name),
              showSorter: true,
              render: (_: any, row: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                    <Zap size={20} className="text-primary" />
                  </div>
                  <div>
                    <button 
                      onClick={() => handleCampaignClick(row.id)}
                      className="font-bold text-high-contrast hover:text-secondary cursor-pointer link-primary"
                      title={row.name}
                    >
                      {truncateCampaignName(row.name)}
                    </button>
                    <p className="text-xs text-medium-contrast">ID: {row.displayId || row.id}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '120px',
              filters: [
                { text: 'Active', value: 'Active' },
                { text: 'Paused', value: 'Paused' },
                { text: 'Deleted', value: 'Deleted' },
              ],
              onFilter: (value: any, record: any) => record.status === value,
              sorter: (a: any, b: any) => a.status.localeCompare(b.status),
              showSorter: true,
              showFilter: true,
              render: (_: any, row: any) => (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                  row.status === 'Active' ? "status-active" : row.status === 'Paused' ? "status-paused" : "status-deleted"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    row.status === 'Active' ? "bg-green-500" : row.status === 'Paused' ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{row.status}</span>
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              width: '100px',
              sorter: (a: any, b: any) => a.type.localeCompare(b.type),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm text-high-contrast">{row.type}</span>
              ),
            },
            {
              key: 'group',
              label: 'Group',
              width: '120px',
              sorter: (a: any, b: any) => a.group.localeCompare(b.group),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-medium-contrast rounded-sm">
                  {row.group}
                </span>
              ),
            },
            {
              key: 'clicks',
              label: 'Clicks',
              width: '100px',
              align: 'right',
              sorter: (a: any, b: any) => a.clicks - b.clicks,
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm font-semibold text-high-contrast">{row.clicks.toLocaleString()}</span>
              ),
            },
            {
              key: 'conversions',
              label: 'Conv.',
              width: '80px',
              align: 'right',
              sorter: (a: any, b: any) => a.conversions - b.conversions,
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm font-semibold text-high-contrast">{row.conversions.toLocaleString()}</span>
              ),
            },
            {
              key: 'revenue',
              label: 'Revenue',
              width: '100px',
              align: 'right',
              sorter: (a: any, b: any) => parseFloat(a.revenue.replace('$', '')) - parseFloat(b.revenue.replace('$', '')),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm font-semibold text-secondary">{row.revenue}</span>
              ),
            },
            {
              key: 'profit',
              label: 'Profit',
              width: '100px',
              align: 'right',
              sorter: (a: any, b: any) => parseFloat(a.profit.replace('$', '')) - parseFloat(b.profit.replace('$', '')),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className={cn(
                  "text-sm font-semibold",
                  row.profit.startsWith('-') ? "text-error" : "text-secondary"
                )}>{row.profit}</span>
              ),
            },
            {
              key: 'roi',
              label: 'ROI',
              width: '100px',
              align: 'right',
              sorter: (a: any, b: any) => parseFloat(a.roi.replace('%', '')) - parseFloat(b.roi.replace('%', '')),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className={cn(
                  "text-sm font-semibold",
                  row.roi.startsWith('-') ? "text-error" : "text-secondary"
                )}>{row.roi}</span>
              ),
            },
            {
              key: 'epc',
              label: 'EPC',
              width: '100px',
              align: 'right',
              sorter: (a: any, b: any) => parseFloat(a.epc.replace('$', '')) - parseFloat(b.epc.replace('$', '')),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm font-semibold text-high-contrast">{row.epc}</span>
              ),
            },
            {
              key: 'cr',
              label: 'CR',
              width: '80px',
              align: 'right',
              sorter: (a: any, b: any) => parseFloat(a.cr.replace('%', '')) - parseFloat(b.cr.replace('%', '')),
              showSorter: true,
              render: (_: any, row: any) => (
                <span className="text-sm font-semibold text-high-contrast">{row.cr}</span>
              ),
            },
            {
              key: 'actions',
              label: '',
              width: '80px',
              align: 'center',
              render: (_: any, row: any) => (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditCampaign(row)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              ),
            },
          ]}
          data={paginatedCampaigns}
          rowHeight={CAMPAIGN_ROW_HEIGHT}
          height={tableHeight}
          overscan={5}
          selectable={false}
          emptyMessage="No campaigns found"
        />
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
          <div className="text-sm text-on-surface-variant">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 rounded-sm border border-outline-variant/20 px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 rounded-sm border border-outline-variant/20 px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CampaignManagement;
