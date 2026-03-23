import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, fetchEntityStats } from '../services/api';
import { CampaignForm } from '../components/CampaignForm';
import { ExportButton } from '../components/ExportButton';
import { formatCampaignForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { GroupByFilter, filterByGroupBy } from '../components/GroupByFilter';
import type { GroupByState, GroupByOption } from '../types/filter';
import { useToast } from '../components/Toast';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export const CampaignManagement = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedCampaign, setSelectedCampaign] = useState<Partial<Campaign> | undefined>(undefined);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
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
      return '7days';
    } else if (diffDays === 29) {
      return '30days';
    }
    return 'custom';
  };

  const loadCampaignsWithStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [campaignsData, statsData] = await Promise.all([
        fetchCampaigns(),
        fetchEntityStats('campaigns', getRangeFromDates(dateRange.from, dateRange.to))
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
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    loadCampaignsWithStats();
  }, [loadCampaignsWithStats]);

  const handleCampaignClick = (id: string) => {
    navigate(`/campaigns/${id}`);
  };
  
  const handleCreateCampaign = () => {
    setFormMode('create');
    setSelectedCampaign(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditCampaign = (campaign: Campaign) => {
    setFormMode('edit');
    setSelectedCampaign(campaign);
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
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save campaign:', err);
      toast.error('Failed to Create Campaign', err instanceof Error ? err.message : 'Please check your input and try again.');
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
          onClick={() => window.location.reload()}
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
                    >
                      {row.name}
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
          rowHeight={72}
          height={400}
          overscan={5}
          selectable={false}
          emptyMessage="No campaigns found"
        />
      </div>
    </div>
  );
};

export default CampaignManagement;
