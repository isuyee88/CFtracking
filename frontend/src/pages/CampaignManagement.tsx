import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Plus, 
  Filter, 
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
import { fetchCampaigns, createCampaign } from '../services/api';
import { CampaignForm } from '../components/CampaignForm';
import { ExportButton } from '../components/ExportButton';
import { formatCampaignForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Backend Campaign data structure
interface BackendCampaign {
  id: string;
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
const transformCampaign = (backend: BackendCampaign): Campaign => ({
  id: backend.id,
  name: backend.name,
  status: backend.status === 'active' ? 'Active' : backend.status === 'paused' ? 'Paused' : 'Deleted',
  type: 'Redirect',
  group: backend.group || 'Default',
  flow: backend.flowRotation || 'Default',
  source: backend.trafficSource || 'Direct',
  clicks: 0,
  conversions: 0,
  revenue: '$0.00',
  profit: '$0.00',
  roi: '0%',
  epc: '$0.00',
  cpc: '$0.00',
  cr: '0%'
});

export const CampaignManagement = () => {
  const navigate = useNavigate();
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

  // Fetch campaigns from API
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetchCampaigns();
        if (response.success && response.data) {
          // Transform backend data to frontend format
          const transformedCampaigns = response.data.map((item: BackendCampaign) => transformCampaign(item));
          setCampaigns(transformedCampaigns);
        } else {
          setError('Failed to load campaigns');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

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
        const response = await createCampaign(formData);
        if (response.success && response.data) {
          const newCampaign = transformCampaign(response.data);
          setCampaigns(prev => [...prev, newCampaign]);
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save campaign:', err);
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
  
  const handleBulkAction = (action: 'activate' | 'pause' | 'delete') => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action} for items:`, Array.from(selectedItems));
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.id?.toString().includes(searchTerm) ||
                         campaign.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesStatus = filterStatus === 'All' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  
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
          <button className="flex items-center gap-2 px-4 py-2 border border-border-default text-fg-default text-sm font-medium hover:bg-surface-container transition-colors rounded-md">
            <Filter size={16} />
            Filters
          </button>
          <ExportButton 
            data={campaigns.map(formatCampaignForExport)}
            filename="campaigns"
            label="Export"
          />
          <button 
            onClick={handleCreateCampaign}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium hover:bg-primary-container transition-colors rounded-md"
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 ? (
            <>
              <span className="text-sm text-fg-muted mr-2">{selectedItems.size} selected</span>
              <button 
                onClick={() => handleBulkAction('activate')}
                className="p-2 text-fg-muted hover:text-success-fg transition-colors" 
                title="Activate"
              >
                <Play size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('pause')}
                className="p-2 text-fg-muted hover:text-warning-fg transition-colors" 
                title="Pause"
              >
                <Pause size={18} />
              </button>
              <button 
                onClick={() => handleBulkAction('delete')}
                className="p-2 text-fg-muted hover:text-danger-fg transition-colors" 
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
              <div className="h-6 w-px bg-border-default mx-2" />
            </>
          ) : (
            <>
              <button className="p-2 text-fg-muted hover:text-accent-fg transition-colors" title="Play"><Play size={18} /></button>
              <button className="p-2 text-fg-muted hover:text-accent-fg transition-colors" title="Pause"><Pause size={18} /></button>
              <button className="p-2 text-fg-muted hover:text-accent-fg transition-colors" title="Copy"><Copy size={18} /></button>
              <button className="p-2 text-fg-muted hover:text-danger-fg transition-colors" title="Delete"><Trash2 size={18} /></button>
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
                  filterStatus === tab ? "bg-primary text-on-primary shadow-sm" : "text-fg-muted hover:bg-surface-container-high hover:text-fg-default"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-border-default"
                    checked={selectedItems.size === filteredCampaigns.length && filteredCampaigns.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast">Campaign</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast">Type</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast">Group</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">Revenue</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">Profit</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">ROI</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">EPC</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-high-contrast text-right">CR</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.map((campaign) => (
                <tr 
                  key={campaign.id} 
                  className={cn(
                    "border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors",
                    selectedItems.has(campaign.id) && "bg-surface-container/30"
                  )}
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-outline-variant"
                      checked={selectedItems.has(campaign.id)}
                      onChange={() => handleSelectItem(campaign.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Zap size={20} className="text-primary" />
                      </div>
                      <div>
                        <button 
                          onClick={() => handleCampaignClick(campaign.id)}
                          className="font-bold text-high-contrast hover:text-secondary cursor-pointer link-primary"
                        >
                          {campaign.name}
                        </button>
                        <p className="text-xs text-medium-contrast">ID: {campaign.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                      campaign.status === 'Active' ? "bg-secondary-container text-secondary" : "bg-on-surface-variant/10 text-on-surface-variant"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        campaign.status === 'Active' ? "bg-secondary" : "bg-on-surface-variant"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{campaign.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-high-contrast">{campaign.type}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-medium-contrast rounded-sm">
                      {campaign.group}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-high-contrast">{campaign.clicks.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-high-contrast">{campaign.conversions.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-secondary">{campaign.revenue}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "text-sm font-semibold",
                      campaign.profit.startsWith('-') ? "text-error" : "text-secondary"
                    )}>{campaign.profit}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "text-sm font-semibold",
                      campaign.roi.startsWith('-') ? "text-error" : "text-secondary"
                    )}>{campaign.roi}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-high-contrast">{campaign.epc}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-high-contrast">{campaign.cr}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditCampaign(campaign)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCampaigns.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No campaigns found</p>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length}
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

export default CampaignManagement;
