import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  Play, 
  Pause, 
  Trash2, 
  Copy,
  TrendingUp,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Percent,
  Activity,
  BarChart3,
  Calendar,
  Globe,
  Target,
  Link,
  Settings,
  X,
  Check,
  Save,
  Plus,
  Filter,
  ChevronDown,
  AlertCircle,
  Bot,
  Clock,
  Smartphone,
  MapPin,
  Globe2,
  Monitor,
  Eye,
  User,
  Tag,
  Search,
  Shield,
  Code,
  FileCode,
  ExternalLink,
  Loader2,
  GitBranch
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchCampaign, updateCampaign, fetchCampaignStats } from '../services/api';
import { FlowDesigner } from '../components/FlowDesigner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
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

interface Filter {
  id: string;
  type: string;
  operator: string;
  value: string;
  isNot: boolean;
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
  url: string;
  clicks: number;
  conversions: number;
  revenue: string;
  profit: string;
  roi: string;
  epc: string;
  cpc: string;
  cr: string;
  budget: string;
  spent: string;
  targetGeo: string[];
  devices: string[];
  createdAt: string;
  updatedAt: string;
  filters: Filter[];
  filterLogic: 'AND' | 'OR';
}

// Transform backend data to frontend format
const transformCampaign = (backend: BackendCampaign): Campaign => {
  // Always use current domain from window location
  // This ensures we use the actual domain the user is currently accessing
  const currentDomain = window.location.host;
  // Build real tracking URL using current domain
  const trackingUrl = `https://${currentDomain}/${backend.alias}`;
  
  return {
    id: backend.id,
    name: backend.name,
    status: backend.status === 'active' ? 'Active' : backend.status === 'paused' ? 'Paused' : 'Deleted',
    type: 'Redirect',
    group: backend.group || 'Default',
    flow: backend.flowRotation || 'Default',
    source: backend.trafficSource || 'Direct',
    url: trackingUrl,
    clicks: 0,
    conversions: 0,
    revenue: '$0.00',
    profit: '$0.00',
    roi: '0%',
    epc: '$0.00',
    cpc: '$0.00',
    cr: '0%',
    budget: '$0.00',
    spent: '$0.00',
    targetGeo: [],
    devices: [],
    createdAt: backend.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    updatedAt: backend.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    filters: [],
    filterLogic: 'AND'
  };
};

// Filter types based on Keitaro RawClick documentation
const FILTER_TYPES = [
  { value: 'country', label: 'Country', icon: Globe2, category: 'Geo' },
  { value: 'region', label: 'Region/State', icon: MapPin, category: 'Geo' },
  { value: 'city', label: 'City', icon: MapPin, category: 'Geo' },
  { value: 'device_type', label: 'Device Type', icon: Smartphone, category: 'Device' },
  { value: 'os', label: 'Operating System', icon: Monitor, category: 'Device' },
  { value: 'browser', label: 'Browser', icon: Globe, category: 'Device' },
  { value: 'ip', label: 'IP Address', icon: Target, category: 'Network' },
  { value: 'referrer', label: 'Referrer', icon: Link, category: 'Referrer' },
  { value: 'user_agent', label: 'User Agent', icon: Bot, category: 'User Agent' },
  { value: 'time', label: 'Time Schedule', icon: Clock, category: 'Time' },
  { value: 'bot', label: 'Bot Detection', icon: Bot, category: 'Detection' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'in_list', label: 'In List' },
  { value: 'not_in_list', label: 'Not In List' },
];

export const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [editedCampaign, setEditedCampaign] = useState<Campaign | null>(null);
  const [activeEditSection, setActiveEditSection] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Fetch campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);

        const campaign = await fetchCampaign(id!);

        if (campaign && campaign.id) {
          const transformedCampaign = transformCampaign(campaign);
          setCampaign(transformedCampaign);

          try {
            const stats = await fetchCampaignStats(id!);
            if (stats) {
              setStats(stats);
            }
          } catch (statsErr) {
            console.warn('Stats API not available');
            setStats(null);
          }
        } else {
          setError('Campaign not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCampaign();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl text-on-surface-variant/20">404</div>
        <h2 className="text-2xl font-display font-bold text-primary">Campaign Not Found</h2>
        <p className="text-on-surface-variant">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
        <button 
          onClick={() => navigate('/campaigns')}
          className="modal-btn-secondary flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-sm"
        >
          <ArrowLeft size={18} />
          Back to Campaigns
        </button>
      </div>
    );
  }

  const handleEditClick = () => {
    setEditedCampaign({ ...campaign });
    setIsEditModalOpen(true);
    setActiveEditSection('basic');
  };

  const handleSave = async () => {
    if (editedCampaign) {
      try {
        const response = await updateCampaign(campaign.id, editedCampaign);
        if (response.success) {
          setCampaign({ ...editedCampaign, updatedAt: new Date().toISOString().split('T')[0] });
          setIsEditModalOpen(false);
          alert('Campaign updated successfully!');
        } else {
          alert('Failed to update campaign');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update campaign');
      }
    }
  };

  const handleCancel = () => {
    setIsEditModalOpen(false);
    setEditedCampaign(null);
    setActiveEditSection('basic');
  };

  const handleInputChange = (field: keyof Campaign, value: any) => {
    if (editedCampaign) {
      setEditedCampaign({ ...editedCampaign, [field]: value });
    }
  };

  // Filter management functions
  const addFilter = () => {
    if (editedCampaign) {
      const newFilter: Filter = {
        id: Date.now().toString(),
        type: 'country',
        operator: 'equals',
        value: '',
        isNot: false
      };
      setEditedCampaign({
        ...editedCampaign,
        filters: [...(editedCampaign.filters || []), newFilter]
      });
    }
  };

  const updateFilter = (filterId: string, field: keyof Filter, value: any) => {
    if (editedCampaign && editedCampaign.filters) {
      setEditedCampaign({
        ...editedCampaign,
        filters: editedCampaign.filters.map(f => 
          f.id === filterId ? { ...f, [field]: value } : f
        )
      });
    }
  };

  const removeFilter = (filterId: string) => {
    if (editedCampaign && editedCampaign.filters) {
      setEditedCampaign({
        ...editedCampaign,
        filters: editedCampaign.filters.filter(f => f.id !== filterId)
      });
    }
  };

  const toggleFilterLogic = () => {
    if (editedCampaign) {
      setEditedCampaign({
        ...editedCampaign,
        filterLogic: editedCampaign.filterLogic === 'AND' ? 'OR' : 'AND'
      });
    }
  };

  // Generate Tracking Script code
  const generateTrackingScript = (campaignId: string | number) => {
    const domain = window.location.host;
    return `<!-- CFTracking Tracking Script -->
<script>
(function() {
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: 'https://${domain}'
  };

  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      clickId: params.get('clickid') || params.get('subid'),
      subId1: params.get('subid1') || params.get('sub1'),
      subId2: params.get('subid2') || params.get('sub2'),
      subId3: params.get('subid3') || params.get('sub3'),
    };
  }

  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_visitor_id', visitorId);
    }
    return visitorId;
  }

  async function trackVisit() {
    const params = getUrlParams();
    const visitorId = getVisitorId();
    
    const trackData = {
      campaignId: CONFIG.campaignId,
      clickId: params.clickId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      subId1: params.subId1,
      subId2: params.subId2,
      subId3: params.subId3,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(CONFIG.workerUrl + '/api/tracking/script/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
    } catch (err) {
      console.error('[CFTracking] Track error:', err);
    }
  }

  window.KTracking = {
    ready: function(callback) {
      const params = getUrlParams();
      callback(params.clickId, null);
    },

    reportConversion: async function(payout, status, params, callback) {
      const urlParams = getUrlParams();
      const conversionData = {
        campaignId: CONFIG.campaignId,
        clickId: urlParams.clickId,
        payout: payout || 0,
        status: status || 'lead',
        tid: params?.tid || Math.floor(Math.random() * 1000000000).toString()
      };

      try {
        await fetch(CONFIG.workerUrl + '/api/tracking/script/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversionData)
        });
        console.log('[CFTracking] Conversion reported:', status);
        if (callback) callback();
      } catch (err) {
        console.error('[CFTracking] Conversion error:', err);
      }
    },

    update: async function(params) {
      console.log('[CFTracking] Update params:', params);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisit);
  } else {
    trackVisit();
  }
})();
</script>
<!-- End CFTracking Tracking Script -->`;
  };

  // Generate KClient JS code
  const generateKClientScript = (campaignId: string | number, base64: boolean) => {
    const domain = window.location.host;
    const script = `<!-- CFTracking KClient JS -->
<script>
(function() {
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: 'https://${domain}'
  };

  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_kclient_vid');
    if (!visitorId) {
      visitorId = 'kc_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_kclient_vid', visitorId);
    }
    return visitorId;
  }

  async function processTraffic() {
    const visitorId = getVisitorId();
    
    const requestData = {
      campaignId: CONFIG.campaignId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(CONFIG.workerUrl + '/api/tracking/kclient/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.action === 'redirect' && result.url) {
          window.location.href = result.url;
        } else if (result.action === 'show_content' && result.content) {
          document.open();
          document.write(result.content);
          document.close();
        }
      }
    } catch (err) {
      console.error('[CFTracking KClient] Process error:', err);
    }
  }

  processTraffic();
})();
</script>
<!-- End CFTracking KClient JS -->`;

    if (base64) {
      return `<!-- CFTracking KClient JS (Base64) -->
<script>
eval(atob('${btoa(script)}'));
</script>`;
    }
    return script;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'flow', label: 'Flow', icon: GitBranch },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'tracking-code', label: 'Tracking Code', icon: Code },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const editSections = [
    { id: 'basic', label: 'Basic Info', icon: Settings },
    { id: 'targeting', label: 'Targeting', icon: Globe },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'tracking', label: 'Tracking', icon: Link },
  ];

  // Use real stats data or fallback to empty arrays
  const chartData = stats?.chartData || [];
  const conversionData = stats?.conversionData || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/campaigns')}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-primary">{campaign.name}</h1>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-sm",
                campaign.status === 'Active' ? "status-active" : "status-paused"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  campaign.status === 'Active' ? "bg-green-500" : "bg-yellow-500"
                )} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{campaign.status}</span>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">{campaign.source} • {campaign.type} • {campaign.group}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
            <Copy size={16} />
            Copy Link
          </button>
          {campaign.status === 'Active' ? (
            <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
              <Pause size={16} />
              Pause
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
              <Play size={16} />
              Resume
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-error text-xs font-bold uppercase tracking-widest hover:bg-error/10 transition-colors">
            <Trash2 size={16} />
            Delete
          </button>
          <button 
            onClick={handleEditClick}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-sm"
          >
            <Edit3 size={18} />
            Edit Campaign
          </button>
        </div>
      </div>

      {/* Tracking URL */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tracking URL</span>
          <p className="text-sm font-mono text-primary truncate">{campaign.url}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
          <Copy size={16} />
          Copy
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Clicks</span>
          <p className="text-2xl font-display font-bold text-primary">{campaign.clicks.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Conv.</span>
          <p className="text-2xl font-display font-bold text-secondary">{campaign.conversions.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Revenue</span>
          <p className="text-2xl font-display font-bold text-secondary">{campaign.revenue}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Profit</span>
          <p className={cn(
            "text-2xl font-display font-bold",
            campaign.profit.startsWith('-') ? "text-error" : "text-secondary"
          )}>{campaign.profit}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ROI</span>
          <p className={cn(
            "text-2xl font-display font-bold",
            campaign.roi.startsWith('-') ? "text-error" : "text-secondary"
          )}>{campaign.roi}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">EPC</span>
          <p className="text-2xl font-display font-bold text-primary">{campaign.epc}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CPC</span>
          <p className="text-2xl font-display font-bold text-primary">{campaign.cpc}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CR</span>
          <p className="text-2xl font-display font-bold text-primary">{campaign.cr}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant/20">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary"
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 whisper-shadow">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Performance Overview</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant))" />
                  <XAxis dataKey="name" stroke="hsl(var(--on-surface-variant))" fontSize={12} />
                  <YAxis stroke="hsl(var(--on-surface-variant))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--surface-container))',
                      border: '1px solid hsl(var(--outline-variant))',
                      borderRadius: '4px'
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Campaign Info */}
            <div className="bg-surface-container-lowest p-6 whisper-shadow">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Flow</span>
                  <p className="text-sm font-medium text-on-surface">{campaign.flow}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Geography</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaign.targetGeo.map((geo) => (
                      <span key={geo} className="px-2 py-1 bg-surface-container text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {geo}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Devices</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaign.devices.map((device) => (
                      <span key={device} className="px-2 py-1 bg-surface-container text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {device}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-surface-container-lowest p-6 whisper-shadow">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Budget</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Budget</span>
                  <span className="text-sm font-medium text-on-surface">{campaign.budget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Spent</span>
                  <span className="text-sm font-medium text-on-surface">{campaign.spent}</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min((parseFloat(campaign.spent.replace(/[^0-9.]/g, '')) / parseFloat(campaign.budget.replace(/[^0-9.]/g, ''))) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flow' && (
        <FlowDesigner
          campaignId={id || ''}
          onSave={(flows, connections) => {
            console.log('Saving flow:', flows, connections);
            // TODO: Save flow configuration to backend
          }}
          onCancel={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'reports' && (
        <div className="bg-surface-container-lowest p-8 whisper-shadow text-center">
          <BarChart3 size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
          <h3 className="text-lg font-bold text-primary mb-2">Detailed Reports</h3>
          <p className="text-sm text-on-surface-variant">Advanced reporting features coming soon.</p>
        </div>
      )}

      {activeTab === 'filters' && (
        <div className="bg-surface-container-lowest p-6 whisper-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-primary">Traffic Filters</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Logic:</span>
              <button
                onClick={toggleFilterLogic}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  campaign.filterLogic === 'AND' 
                    ? "bg-primary text-on-primary" 
                    : "bg-secondary text-on-secondary"
                )}
              >
                {campaign.filterLogic}
              </button>
            </div>
          </div>
          
          {campaign.filters.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <Filter size={48} className="mx-auto mb-4 opacity-30" />
              <p>No filters configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.filters.map((filter, index) => (
                <div key={filter.id} className="flex items-center gap-4 p-4 bg-surface rounded-sm">
                  <span className="text-sm text-on-surface-variant w-8">{index + 1}</span>
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</span>
                      <p className="text-sm font-medium text-on-surface">
                        {FILTER_TYPES.find(t => t.value === filter.type)?.label || filter.type}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Operator</span>
                      <p className="text-sm font-medium text-on-surface">
                        {OPERATORS.find(o => o.value === filter.operator)?.label || filter.operator}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Value</span>
                      <p className="text-sm font-medium text-on-surface">{filter.value}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Condition</span>
                      <p className="text-sm font-medium text-on-surface">
                        {filter.isNot ? 'IS NOT' : 'IS'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={handleEditClick}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-sm mx-auto mt-6"
          >
            <Plus size={18} />
            Add Filter
          </button>
        </div>
      )}

      {activeTab === 'tracking-code' && (
        <div className="space-y-6">
          {/* Tracking Script Section */}
          <div className="bg-surface-container-lowest p-6 whisper-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileCode size={24} className="text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-primary">Tracking Script</h3>
                  <p className="text-sm text-on-surface-variant">For Landing Pages and Offers</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const code = generateTrackingScript(campaign.id);
                  navigator.clipboard.writeText(code);
                  alert('Tracking Script copied to clipboard!');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                <Copy size={16} />
                Copy Code
              </button>
            </div>
            <div className="bg-surface p-4 rounded-sm border border-outline-variant/20">
              <pre className="text-xs text-on-surface-variant overflow-x-auto whitespace-pre-wrap font-mono">
                {generateTrackingScript(campaign.id)}
              </pre>
            </div>
            <div className="mt-4 p-4 bg-secondary-container/30 rounded-sm">
              <h4 className="text-sm font-bold text-secondary mb-2">Usage Instructions</h4>
              <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                <li>Copy the code above</li>
                <li>Paste it between the <code>&lt;head&gt;&lt;/head&gt;</code> tags of your landing page</li>
                <li>The script will automatically track visits and conversions</li>
              </ol>
            </div>
          </div>

          {/* KClient JS Section */}
          <div className="bg-surface-container-lowest p-6 whisper-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Code size={24} className="text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-primary">KClient JS</h3>
                  <p className="text-sm text-on-surface-variant">For Remote Sites and Site Builders</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const code = generateKClientScript(campaign.id, true);
                    navigator.clipboard.writeText(code);
                    alert('KClient JS (Base64) copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
                >
                  <Copy size={16} />
                  Copy Base64
                </button>
                <button
                  onClick={() => {
                    const code = generateKClientScript(campaign.id, false);
                    navigator.clipboard.writeText(code);
                    alert('KClient JS copied to clipboard!');
                  }}
                  className="modal-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm"
                >
                  <Copy size={16} />
                  Copy Code
                </button>
              </div>
            </div>
            <div className="bg-surface p-4 rounded-sm border border-outline-variant/20">
              <pre className="text-xs text-on-surface-variant overflow-x-auto whitespace-pre-wrap font-mono">
                {generateKClientScript(campaign.id, false)}
              </pre>
            </div>
            <div className="mt-4 p-4 bg-secondary-container/30 rounded-sm">
              <h4 className="text-sm font-bold text-secondary mb-2">Supported Platforms</h4>
              <div className="flex flex-wrap gap-2">
                {['Shopify', 'Taplink', 'Tilda', 'Flexbe', 'GitHub Pages', 'WordPress'].map(platform => (
                  <span key={platform} className="px-3 py-1 bg-surface text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Conversion Tracking Examples */}
          <div className="bg-surface-container-lowest p-6 whisper-shadow">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink size={24} className="text-primary" />
              <div>
                <h3 className="text-lg font-bold text-primary">Conversion Tracking Examples</h3>
                <p className="text-sm text-on-surface-variant">How to send conversions from your page</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-surface p-4 rounded-sm border border-outline-variant/20">
                <h4 className="text-sm font-bold text-primary mb-2">Button Click</h4>
                <pre className="text-xs text-on-surface-variant overflow-x-auto font-mono bg-surface-container p-2 rounded">
{`<a onclick="KTracking.reportConversion(10, 'lead')" 
   href="https://offer.com">
   Buy Now
</a>`}
                </pre>
              </div>
              <div className="bg-surface p-4 rounded-sm border border-outline-variant/20">
                <h4 className="text-sm font-bold text-primary mb-2">Thank You Page</h4>
                <pre className="text-xs text-on-surface-variant overflow-x-auto font-mono bg-surface-container p-2 rounded">
{`<script>
  KTracking.reportConversion(25, 'sale', {
    sub_id_1: 'order-123',
    sub_id_2: 'John Doe'
  });
</script>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface-container-lowest p-8 whisper-shadow text-center">
          <Settings size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
          <h3 className="text-lg font-bold text-primary mb-2">Campaign Settings</h3>
          <p className="text-sm text-on-surface-variant">Advanced settings coming soon.</p>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] overflow-y-auto whisper-shadow">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h2 className="text-xl font-display font-bold text-primary">Edit Campaign</h2>
              <button 
                onClick={handleCancel}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Section Tabs */}
              <div className="flex gap-2 border-b border-outline-variant/20 pb-4">
                {editSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveEditSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                        activeEditSection === section.id
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-primary"
                      )}
                    >
                      <Icon size={18} />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {/* Section Content */}
              {activeEditSection === 'basic' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Basic Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Traffic Source
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.source}
                        onChange={(e) => handleInputChange('source', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Campaign Type
                      </label>
                      <select
                        value={editedCampaign.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      >
                        <option value="Redirect">Redirect</option>
                        <option value="Direct">Direct</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Campaign Group
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.group}
                        onChange={(e) => handleInputChange('group', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Flow
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.flow}
                        onChange={(e) => handleInputChange('flow', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeEditSection === 'targeting' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Targeting</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Target Geography (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.targetGeo.join(', ')}
                        onChange={(e) => handleInputChange('targetGeo', e.target.value.split(',').map(s => s.trim()))}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Target Devices (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.devices.join(', ')}
                        onChange={(e) => handleInputChange('devices', e.target.value.split(',').map(s => s.trim()))}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeEditSection === 'filters' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Traffic Filters</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Logic:</span>
                      <button
                        onClick={toggleFilterLogic}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                          editedCampaign.filterLogic === 'AND' 
                            ? "bg-primary text-on-primary" 
                            : "bg-secondary text-on-secondary"
                        )}
                      >
                        {editedCampaign.filterLogic}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {editedCampaign.filters.map((filter, index) => (
                      <div key={filter.id} className="flex items-center gap-3 p-4 bg-surface rounded-sm">
                        <span className="text-sm text-on-surface-variant w-6">{index + 1}</span>
                        <select
                          value={filter.type}
                          onChange={(e) => updateFilter(filter.id, 'type', e.target.value)}
                          className="flex-1 px-3 py-2 bg-surface-container text-sm border border-outline-variant focus:border-primary outline-none"
                        >
                          {FILTER_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <select
                          value={filter.isNot ? 'not' : 'is'}
                          onChange={(e) => updateFilter(filter.id, 'isNot', e.target.value === 'not')}
                          className="px-3 py-2 bg-surface-container text-sm border border-outline-variant focus:border-primary outline-none"
                        >
                          <option value="is">IS</option>
                          <option value="not">IS NOT</option>
                        </select>
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                          className="flex-1 px-3 py-2 bg-surface-container text-sm border border-outline-variant focus:border-primary outline-none"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-surface-container text-sm border border-outline-variant focus:border-primary outline-none"
                        />
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="p-2 text-error hover:bg-error/10 rounded-sm transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addFilter}
                    className="flex items-center gap-2 px-4 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors w-full justify-center"
                  >
                    <Plus size={16} />
                    Add Filter
                  </button>
                </div>
              )}

              {activeEditSection === 'tracking' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Tracking Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Tracking URL
                      </label>
                      <input
                        type="text"
                        value={editedCampaign.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="p-4 bg-surface-container rounded-sm">
                      <h4 className="text-sm font-bold text-primary mb-2">URL Parameters</h4>
                      <div className="space-y-2 text-sm text-on-surface-variant">
                        <p><code className="bg-surface px-2 py-1">sub_id_1</code> - Custom parameter 1</p>
                        <p><code className="bg-surface px-2 py-1">sub_id_2</code> - Custom parameter 2</p>
                        <p><code className="bg-surface px-2 py-1">sub_id_3</code> - Custom parameter 3</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-variant/20">
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="modal-btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-sm"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetail;
