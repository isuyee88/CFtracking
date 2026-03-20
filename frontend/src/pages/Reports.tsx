import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Filter, 
  Calendar, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Plus,
  Search,
  X,
  Check,
  MoreHorizontal,
  FileText,
  Eye,
  RefreshCw,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Report types
const REPORT_TYPES = [
  { id: 'custom', name: 'Custom Report', icon: BarChart3 },
  { id: 'clicks', name: 'Click Log', icon: FileText },
  { id: 'conversions', name: 'Conversions', icon: Check },
  { id: 'campaigns', name: 'Campaign Report', icon: BarChart3 },
  { id: 'geo', name: 'Geo Report', icon: Globe },
  { id: 'device', name: 'Device Report', icon: Monitor },
];

// Grouping options based on RawClick fields
const GROUPING_OPTIONS = [
  // Campaign & Traffic (RawClick: getCampaignId, getStreamId, getLandingId, getOfferId, getSource)
  { value: 'campaign', label: 'Campaign', category: 'Campaign' },
  { value: 'stream', label: 'Stream', category: 'Campaign' },
  { value: 'landing', label: 'Landing Page', category: 'Campaign' },
  { value: 'offer', label: 'Offer', category: 'Campaign' },
  { value: 'source', label: 'Traffic Source', category: 'Campaign' },
  
  // Geo (RawClick: getCountry, getRegion, getCity, getIsp, getOperator)
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'language', label: 'Language', category: 'Geo' },
  { value: 'isp', label: 'ISP', category: 'Geo' },
  { value: 'operator', label: 'Mobile Operator', category: 'Geo' },
  
  // Device & System (RawClick: getDeviceType, getDeviceModel, getOs, getOsVersion, getBrowser, getBrowserVersion)
  { value: 'device_type', label: 'Device Type', category: 'Device' },
  { value: 'device_model', label: 'Device Model', category: 'Device' },
  { value: 'os', label: 'Operating System', category: 'Device' },
  { value: 'os_version', label: 'OS Version', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
  { value: 'browser_version', label: 'Browser Version', category: 'Device' },
  
  // Network (RawClick: getIpString, getConnectionType, isUsingProxy)
  { value: 'ip', label: 'IP Address', category: 'Network' },
  { value: 'connection_type', label: 'Connection Type', category: 'Network' },
  { value: 'proxy', label: 'Proxy Status', category: 'Network' },
  
  // Tracking IDs (RawClick: getVisitorCode, getCreativeId, getExternalId, getAdCampaignId)
  { value: 'visitor_code', label: 'Visitor Code', category: 'Tracking' },
  { value: 'creative_id', label: 'Creative ID', category: 'Tracking' },
  { value: 'external_id', label: 'External ID', category: 'Tracking' },
  { value: 'ad_campaign_id', label: 'Ad Campaign ID', category: 'Tracking' },
  
  // Sub IDs (RawClick: getSubId, getSubIdN)
  { value: 'sub_id', label: 'Sub ID', category: 'Sub IDs' },
  { value: 'sub1', label: 'Sub ID 1', category: 'Sub IDs' },
  { value: 'sub2', label: 'Sub ID 2', category: 'Sub IDs' },
  { value: 'sub3', label: 'Sub ID 3', category: 'Sub IDs' },
  { value: 'sub4', label: 'Sub ID 4', category: 'Sub IDs' },
  { value: 'sub5', label: 'Sub ID 5', category: 'Sub IDs' },
  { value: 'sub6', label: 'Sub ID 6', category: 'Sub IDs' },
  { value: 'sub7', label: 'Sub ID 7', category: 'Sub IDs' },
  { value: 'sub8', label: 'Sub ID 8', category: 'Sub IDs' },
  { value: 'sub9', label: 'Sub ID 9', category: 'Sub IDs' },
  { value: 'sub10', label: 'Sub ID 10', category: 'Sub IDs' },
  
  // Time
  { value: 'day_of_week', label: 'Day of Week', category: 'Time' },
  { value: 'hour', label: 'Hour of Day', category: 'Time' },
  { value: 'date', label: 'Date', category: 'Time' },
  { value: 'month', label: 'Month', category: 'Time' },
  { value: 'week', label: 'Week', category: 'Time' },
  
  // Referrer (RawClick: getReferrer, getSe, getKeyword)
  { value: 'referrer', label: 'Referrer', category: 'Referrer' },
  { value: 'referrer_domain', label: 'Referrer Domain', category: 'Referrer' },
  { value: 'search_engine', label: 'Search Engine', category: 'Referrer' },
  { value: 'keyword', label: 'Keyword', category: 'Referrer' },
  
  // User Agent (RawClick: getUserAgent)
  { value: 'user_agent', label: 'User Agent', category: 'User Agent' },
  
  // Bot Detection (RawClick: isBot)
  { value: 'bot', label: 'Bot Status', category: 'Detection' },
  
  // Cost (RawClick: getCost)
  { value: 'cost', label: 'Click Cost', category: 'Cost' },
  
  // Uniqueness (RawClick: isUniqueStream, isUniqueCampaign)
  { value: 'unique_stream', label: 'Unique per Stream', category: 'Uniqueness' },
  { value: 'unique_campaign', label: 'Unique per Campaign', category: 'Uniqueness' },
];

// Metrics options
const METRICS_OPTIONS = [
  { value: 'clicks', label: 'Clicks', default: true },
  { value: 'conversions', label: 'Conversions', default: true },
  { value: 'revenue', label: 'Revenue', default: true },
  { value: 'cost', label: 'Cost', default: true },
  { value: 'profit', label: 'Profit', default: true },
  { value: 'roi', label: 'ROI', default: true },
  { value: 'cr', label: 'CR', default: true },
  { value: 'epc', label: 'EPC', default: false },
  { value: 'cpc', label: 'CPC', default: false },
  { value: 'cpa', label: 'CPA', default: false },
  { value: 'lp_ctr', label: 'LP CTR', default: false },
  { value: 'unique_clicks', label: 'Unique Clicks', default: false },
];

// Mock data for reports
const MOCK_REPORT_DATA = [
  { 
      id: 1, 
      campaign: 'FB_US_Lookalike_V1', 
      source: 'Facebook Ads',
      country: 'US', 
      device: 'Mobile',
      clicks: 45200, 
      conversions: 1240, 
      revenue: 12400, 
      cost: 7200,
      profit: 5200,
      roi: 72.2,
      cr: 2.74,
      epc: 0.27,
      cpc: 0.16,
      children: [
        { id: 101, campaign: 'FB_US_Lookalike_V1', source: 'Facebook Ads', country: 'US', device: 'iOS', clicks: 28000, conversions: 850, revenue: 8500, cost: 4800, profit: 3700, roi: 77.1, cr: 3.04, epc: 0.30, cpc: 0.17 },
        { id: 102, campaign: 'FB_US_Lookalike_V1', source: 'Facebook Ads', country: 'US', device: 'Android', clicks: 17200, conversions: 390, revenue: 3900, cost: 2400, profit: 1500, roi: 62.5, cr: 2.27, epc: 0.23, cpc: 0.14 },
      ]
    },
    { 
      id: 2, 
      campaign: 'Google_Search_Brand', 
      source: 'Google Ads',
      country: 'US', 
      device: 'Desktop',
      clicks: 12000, 
      conversions: 850, 
      revenue: 8500, 
      cost: 2400,
      profit: 6100,
      roi: 254.2,
      cr: 7.08,
      epc: 0.71,
      cpc: 0.20,
      children: [
        { id: 201, campaign: 'Google_Search_Brand', source: 'Google Ads', country: 'US', device: 'Windows', clicks: 8000, conversions: 620, revenue: 6200, cost: 1600, profit: 4600, roi: 287.5, cr: 7.75, epc: 0.78, cpc: 0.20 },
        { id: 202, campaign: 'Google_Search_Brand', source: 'Google Ads', country: 'US', device: 'Mac', clicks: 4000, conversions: 230, revenue: 2300, cost: 800, profit: 1500, roi: 187.5, cr: 5.75, epc: 0.58, cpc: 0.20 },
      ]
    },
  { 
    id: 3, 
    campaign: 'TikTok_Global_UGC', 
    source: 'TikTok Ads',
    country: 'UK', 
    device: 'Mobile',
    clicks: 32000, 
    conversions: 420, 
    revenue: 4200, 
    cost: 2900,
    profit: 1300,
    roi: 44.8,
    cr: 1.31,
    epc: 0.13,
    cpc: 0.09,
  },
  { 
    id: 4, 
    campaign: 'Native_Taboola_US', 
    source: 'Taboola',
    country: 'US', 
    device: 'Mobile',
    clicks: 15000, 
    conversions: 180, 
    revenue: 1800, 
    cost: 2020,
    profit: -220,
    roi: -10.9,
    cr: 1.20,
    epc: 0.12,
    cpc: 0.13,
  },
];

// Chart data
const TREND_DATA = [
  { date: '2024-03-01', clicks: 3200, conversions: 89, revenue: 890 },
  { date: '2024-03-02', clicks: 3500, conversions: 98, revenue: 980 },
  { date: '2024-03-03', clicks: 3100, conversions: 87, revenue: 870 },
  { date: '2024-03-04', clicks: 3800, conversions: 106, revenue: 1060 },
  { date: '2024-03-05', clicks: 4200, conversions: 118, revenue: 1180 },
  { date: '2024-03-06', clicks: 3900, conversions: 109, revenue: 1090 },
  { date: '2024-03-07', clicks: 4500, conversions: 126, revenue: 1260 },
];

const GEO_DATA = [
  { name: 'United States', value: 45, color: '#4f46e5' },
  { name: 'United Kingdom', value: 20, color: '#10b981' },
  { name: 'Canada', value: 15, color: '#f59e0b' },
  { name: 'Australia', value: 12, color: '#ef4444' },
  { name: 'Germany', value: 8, color: '#8b5cf6' },
];

// Icons
function Globe(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function Monitor(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

export const Reports = () => {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('custom');

  const handleReportTypeChange = (reportType: string) => {
    setActiveReport(reportType);
    // Navigate to specific pages for certain report types
    if (reportType === 'clicks') {
      navigate('/audit');
    } else if (reportType === 'conversions') {
      navigate('/conversions');
    }
  };
  const [dateRange, setDateRange] = useState('last7days');
  const [grouping, setGrouping] = useState(['campaign']);
  const [selectedMetrics, setSelectedMetrics] = useState(
    METRICS_OPTIONS.filter(m => m.default).map(m => m.value)
  );
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [filters, setFilters] = useState<Array<{field: string, operator: string, value: string}>>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [savedReports, setSavedReports] = useState<string[]>(['Default Campaign Report']);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  
  // Blacklist/Whitelist selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [trafficSources, setTrafficSources] = useState<Array<{id: string, name: string}>>([]);
  const [selectedTrafficSource, setSelectedTrafficSource] = useState<string>('');

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Toggle row selection for blacklist/whitelist
  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    setShowBatchActions(true);
  };

  // Select/deselect all rows
  const toggleSelectAll = () => {
    if (selectedRows.size === MOCK_REPORT_DATA.length) {
      setSelectedRows(new Set());
      setShowBatchActions(false);
    } else {
      setSelectedRows(new Set(MOCK_REPORT_DATA.map(row => row.id)));
      setShowBatchActions(true);
    }
  };

  // Add selected rows to blacklist
  const addToBlacklist = async () => {
    if (!selectedTrafficSource) {
      alert('Please select a traffic source first');
      return;
    }
    
    const selectedData = MOCK_REPORT_DATA.filter(row => selectedRows.has(row.id));
    const candidates = selectedData.map(row => ({
      type: 'zone' as const,
      value: row.campaign,
      name: row.campaign,
      metrics: {
        impressions: 0,
        clicks: row.clicks,
        conversions: row.conversions,
        spend: row.cost,
        revenue: row.revenue,
        roi: row.roi
      },
      campaignId: row.id.toString()
    }));

    try {
      const response = await fetch('/api/blacklist/batch-from-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trafficSourceId: selectedTrafficSource,
          candidates,
          reason: `Added from Reports - ROI: ${selectedData.map(r => r.roi.toFixed(2)).join(', ')}%`
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Added ${data.data.length} items to blacklist`);
        setSelectedRows(new Set());
        setShowBatchActions(false);
      }
    } catch (err) {
      console.error('Failed to add to blacklist:', err);
      alert('Failed to add to blacklist');
    }
  };

  // Add selected rows to whitelist
  const addToWhitelist = async () => {
    if (!selectedTrafficSource) {
      alert('Please select a traffic source first');
      return;
    }
    
    const selectedData = MOCK_REPORT_DATA.filter(row => selectedRows.has(row.id));
    const candidates = selectedData.map(row => ({
      type: 'zone' as const,
      value: row.campaign,
      name: row.campaign,
      metrics: {
        impressions: 0,
        clicks: row.clicks,
        conversions: row.conversions,
        spend: row.cost,
        revenue: row.revenue,
        roi: row.roi
      },
      campaignId: row.id.toString()
    }));

    try {
      const response = await fetch('/api/whitelist/batch-from-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trafficSourceId: selectedTrafficSource,
          candidates,
          reason: `Added from Reports - ROI: ${selectedData.map(r => r.roi.toFixed(2)).join(', ')}%`
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Added ${data.data.length} items to whitelist`);
        setSelectedRows(new Set());
        setShowBatchActions(false);
      }
    } catch (err) {
      console.error('Failed to add to whitelist:', err);
      alert('Failed to add to whitelist');
    }
  };

  // Fetch traffic sources on mount
  React.useEffect(() => {
    fetch('/api/traffic-sources')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTrafficSources(data.data || []);
          if (data.data?.length > 0) {
            setSelectedTrafficSource(data.data[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to fetch traffic sources:', err));
  }, []);

  const toggleMetric = (value: string) => {
    setSelectedMetrics(prev => 
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    );
  };

  const addFilter = () => {
    setFilters([...filters, { field: 'campaign', operator: 'equals', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const saveReport = () => {
    if (reportName) {
      setSavedReports([...savedReports, reportName]);
      setShowSaveDialog(false);
      setReportName('');
      alert('Report saved successfully!');
    }
  };

  const exportReport = (format: 'csv' | 'html') => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return `$${num.toLocaleString()}`;
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Reports</h1>
          <p className="text-sm text-medium-contrast">Advanced analytics and reporting for your campaigns</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <Plus size={16} />
            Save Report
          </button>
          <div className="relative">
            <button 
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              onClick={() => exportReport('csv')}
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} />
            </button>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow">
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleReportTypeChange(type.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm",
                activeReport === type.id 
                  ? "bg-primary text-on-primary" 
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <type.icon size={14} />
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Configuration */}
      <div className="bg-surface-container-lowest p-6 whisper-shadow space-y-6">
        {/* Date Range & Grouping */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Date Range
            </label>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex-1 px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
              <button className="p-2 bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition-all">
                <Calendar size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Group By
            </label>
            <div className="flex gap-2">
              {grouping.map((group, index) => (
                <select
                  key={index}
                  value={group}
                  onChange={(e) => {
                    const newGrouping = [...grouping];
                    newGrouping[index] = e.target.value;
                    setGrouping(newGrouping);
                  }}
                  className="flex-1 px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                >
                  {GROUPING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ))}
              <button 
                onClick={() => setGrouping([...grouping, 'source'])}
                className="px-3 py-2 bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition-all"
                disabled={grouping.length >= 5}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              View Mode
            </label>
            <div className="flex bg-surface-container p-1 rounded-sm">
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  "flex-1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  viewMode === 'tree' ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                Tree
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "flex-1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  viewMode === 'table' ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-t border-outline-variant/20 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-on-surface-variant" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Filters</span>
            </div>
            <button 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-secondary transition-colors"
            >
              {showFilterPanel ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilterPanel && (
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={filter.field}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[index].field = e.target.value;
                      setFilters(newFilters);
                    }}
                    className="px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                  >
                    {GROUPING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[index].operator = e.target.value;
                      setFilters(newFilters);
                    }}
                    className="px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="not_contains">Not Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[index].value = e.target.value;
                      setFilters(newFilters);
                    }}
                    placeholder="Value"
                    className="flex-1 px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                  />
                  <button 
                    onClick={() => removeFilter(index)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button 
                onClick={addFilter}
                className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                <Plus size={14} />
                Add Filter
              </button>
            </div>
          )}
        </div>

        {/* Metrics Selection */}
        <div className="border-t border-outline-variant/20 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-on-surface-variant" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Metrics</span>
              <span className="text-[10px] text-on-surface-variant/60">({selectedMetrics.length} selected)</span>
            </div>
            <button 
              onClick={() => setShowMetricsPanel(!showMetricsPanel)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-secondary transition-colors"
            >
              {showMetricsPanel ? 'Hide Metrics' : 'Show Metrics'}
            </button>
          </div>
          
          {showMetricsPanel && (
            <div className="flex flex-wrap gap-2">
              {METRICS_OPTIONS.map((metric) => (
                <button
                  key={metric.value}
                  onClick={() => toggleMetric(metric.value)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm",
                    selectedMetrics.includes(metric.value)
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                  )}
                >
                  {selectedMetrics.includes(metric.value) && <Check size={12} className="inline mr-1" />}
                  {metric.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 whisper-shadow">
          <h3 className="text-sm font-bold text-primary mb-6">Trend Analysis</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis yAxisId="left" tick={{fontSize: 10}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
                <Tooltip />
                <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#4f46e5" fillOpacity={1} fill="url(#colorClicks)" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geo Distribution */}
        <div className="bg-surface-container-lowest p-6 whisper-shadow">
          <h3 className="text-sm font-bold text-primary mb-6">Geo Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={GEO_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {GEO_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {GEO_DATA.map((geo) => (
              <div key={geo.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: geo.color }} />
                  <span>{geo.name}</span>
                </div>
                <span className="font-bold">{geo.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-display font-bold text-primary">Report Data</h3>
            {showBatchActions && selectedRows.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">
                  {selectedRows.size} selected
                </span>
                <select
                  value={selectedTrafficSource}
                  onChange={(e) => setSelectedTrafficSource(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-outline-variant focus:border-primary outline-none"
                >
                  {trafficSources.map(ts => (
                    <option key={ts.id} value={ts.id}>{ts.name}</option>
                  ))}
                </select>
                <button
                  onClick={addToWhitelist}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-on-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors"
                  title="Add to Whitelist"
                >
                  <ThumbsUp size={14} />
                  Whitelist
                </button>
                <button
                  onClick={addToBlacklist}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-error text-on-error text-xs font-bold uppercase tracking-widest hover:bg-error/90 transition-colors"
                  title="Add to Blacklist"
                >
                  <ThumbsDown size={14} />
                  Blacklist
                </button>
                <button
                  onClick={() => { setSelectedRows(new Set()); setShowBatchActions(false); }}
                  className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Total: {MOCK_REPORT_DATA.length} rows
            </span>
            <button 
              onClick={() => alert('Settings panel coming soon!')}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === MOCK_REPORT_DATA.length && MOCK_REPORT_DATA.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-4 py-4 w-10"></th>
                {grouping.map((group) => (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">
                    {GROUPING_OPTIONS.find(o => o.value === group)?.label}
                  </th>
                ))}
                {selectedMetrics.includes('clicks') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">Clicks</th>
                )}
                {selectedMetrics.includes('conversions') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">Conv.</th>
                )}
                {selectedMetrics.includes('revenue') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">Revenue</th>
                )}
                {selectedMetrics.includes('cost') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">Cost</th>
                )}
                {selectedMetrics.includes('profit') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">Profit</th>
                )}
                {selectedMetrics.includes('roi') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">ROI</th>
                )}
                {selectedMetrics.includes('cr') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">CR</th>
                )}
                {selectedMetrics.includes('epc') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">EPC</th>
                )}
                {selectedMetrics.includes('cpc') && (
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">CPC</th>
                )}
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {MOCK_REPORT_DATA.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className={cn(
                    "group hover:bg-surface-container-low transition-colors",
                    selectedRows.has(row.id) && "bg-primary/5"
                  )}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {row.children && (
                        <button 
                          onClick={() => toggleRow(row.id)}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {expandedRows.includes(row.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      )}
                    </td>
                    {grouping.map((group) => (
                      <td key={group} className="px-4 py-4">
                        <span className="text-sm font-bold text-high-contrast link-primary">
                          {row[group as keyof typeof row] as string}
                        </span>
                      </td>
                    ))}
                    {selectedMetrics.includes('clicks') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{formatNumber(row.clicks)}</td>
                    )}
                    {selectedMetrics.includes('conversions') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{formatNumber(row.conversions)}</td>
                    )}
                    {selectedMetrics.includes('revenue') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{formatCurrency(row.revenue)}</td>
                    )}
                    {selectedMetrics.includes('cost') && (
                      <td className="px-4 py-4 text-sm font-mono text-medium-contrast">{formatCurrency(row.cost)}</td>
                    )}
                    {selectedMetrics.includes('profit') && (
                      <td className={cn(
                        "px-4 py-4 text-sm font-mono font-bold",
                        row.profit >= 0 ? "text-secondary" : "text-error"
                      )}>
                        {formatCurrency(row.profit)}
                      </td>
                    )}
                    {selectedMetrics.includes('roi') && (
                      <td className={cn(
                        "px-4 py-4 text-sm font-mono font-bold",
                        row.roi >= 0 ? "text-secondary" : "text-error"
                      )}>
                        {formatPercent(row.roi)}
                      </td>
                    )}
                    {selectedMetrics.includes('cr') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{formatPercent(row.cr)}</td>
                    )}
                    {selectedMetrics.includes('epc') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">${row.epc}</td>
                    )}
                    {selectedMetrics.includes('cpc') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">${row.cpc}</td>
                    )}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => alert(`View details for ${row.campaign}`)}
                          className="p-1.5 text-medium-contrast hover:text-primary transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (!selectedTrafficSource) {
                              alert('Please select a traffic source first');
                              return;
                            }
                            try {
                              const response = await fetch('/api/whitelist/batch-from-candidates', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  trafficSourceId: selectedTrafficSource,
                                  candidates: [{
                                    type: 'zone',
                                    value: row.campaign,
                                    name: row.campaign,
                                    metrics: {
                                      impressions: 0,
                                      clicks: row.clicks,
                                      conversions: row.conversions,
                                      spend: row.cost,
                                      revenue: row.revenue,
                                      roi: row.roi
                                    },
                                    campaignId: row.id.toString()
                                  }],
                                  reason: `Added from Reports - ROI: ${row.roi.toFixed(2)}%`
                                })
                              });
                              const data = await response.json();
                              if (data.success) {
                                alert('Added to whitelist');
                              }
                            } catch (err) {
                              alert('Failed to add to whitelist');
                            }
                          }}
                          className="p-1.5 text-medium-contrast hover:text-secondary transition-colors"
                          title="Add to Whitelist"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (!selectedTrafficSource) {
                              alert('Please select a traffic source first');
                              return;
                            }
                            try {
                              const response = await fetch('/api/blacklist/batch-from-candidates', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  trafficSourceId: selectedTrafficSource,
                                  candidates: [{
                                    type: 'zone',
                                    value: row.campaign,
                                    name: row.campaign,
                                    metrics: {
                                      impressions: 0,
                                      clicks: row.clicks,
                                      conversions: row.conversions,
                                      spend: row.cost,
                                      revenue: row.revenue,
                                      roi: row.roi
                                    },
                                    campaignId: row.id.toString()
                                  }],
                                  reason: `Added from Reports - ROI: ${row.roi.toFixed(2)}%`
                                })
                              });
                              const data = await response.json();
                              if (data.success) {
                                alert('Added to blacklist');
                              }
                            } catch (err) {
                              alert('Failed to add to blacklist');
                            }
                          }}
                          className="p-1.5 text-medium-contrast hover:text-error transition-colors"
                          title="Add to Blacklist"
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.includes(row.id) && row.children && (
                    row.children.map((child) => (
                      <tr key={child.id} className={cn(
                        "bg-surface-container/50 hover:bg-surface-container-low transition-colors",
                        selectedRows.has(child.id) && "bg-primary/5"
                      )}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(child.id)}
                            onChange={() => toggleRowSelection(child.id)}
                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-3"></td>
                        {grouping.map((group) => (
                          <td key={group} className="px-4 py-3">
                            <span className="text-sm text-medium-contrast">
                              {child[group as keyof typeof child] as string}
                            </span>
                          </td>
                        ))}
                        {selectedMetrics.includes('clicks') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">{formatNumber(child.clicks)}</td>
                        )}
                        {selectedMetrics.includes('conversions') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">{formatNumber(child.conversions)}</td>
                        )}
                        {selectedMetrics.includes('revenue') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">{formatCurrency(child.revenue)}</td>
                        )}
                        {selectedMetrics.includes('cost') && (
                          <td className="px-4 py-3 text-sm font-mono text-low-contrast">{formatCurrency(child.cost)}</td>
                        )}
                        {selectedMetrics.includes('profit') && (
                          <td className={cn(
                            "px-4 py-3 text-sm font-mono",
                            child.profit >= 0 ? "text-secondary" : "text-error"
                          )}>
                            {formatCurrency(child.profit)}
                          </td>
                        )}
                        {selectedMetrics.includes('roi') && (
                          <td className={cn(
                            "px-4 py-3 text-sm font-mono",
                            child.roi >= 0 ? "text-secondary" : "text-error"
                          )}>
                            {formatPercent(child.roi)}
                          </td>
                        )}
                        {selectedMetrics.includes('cr') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">{formatPercent(child.cr)}</td>
                        )}
                        {selectedMetrics.includes('epc') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">${child.epc}</td>
                        )}
                        {selectedMetrics.includes('cpc') && (
                          <td className="px-4 py-3 text-sm font-mono text-medium-contrast">${child.cpc}</td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => alert(`View details for ${child.campaign} - ${child.device || 'item'}`)}
                              className="p-1.5 text-low-contrast hover:text-primary transition-colors"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (!selectedTrafficSource) {
                                  alert('Please select a traffic source first');
                                  return;
                                }
                                try {
                                  const response = await fetch('/api/whitelist/batch-from-candidates', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      trafficSourceId: selectedTrafficSource,
                                      candidates: [{
                                        type: 'zone',
                                        value: child.campaign,
                                        name: `${child.campaign} - ${child.device || 'item'}`,
                                        metrics: {
                                          impressions: 0,
                                          clicks: child.clicks,
                                          conversions: child.conversions,
                                          spend: child.cost,
                                          revenue: child.revenue,
                                          roi: child.roi
                                        },
                                        campaignId: child.id.toString()
                                      }],
                                      reason: `Added from Reports - ROI: ${child.roi.toFixed(2)}%`
                                    })
                                  });
                                  const data = await response.json();
                                  if (data.success) {
                                    alert('Added to whitelist');
                                  }
                                } catch (err) {
                                  alert('Failed to add to whitelist');
                                }
                              }}
                              className="p-1.5 text-low-contrast hover:text-secondary transition-colors"
                              title="Add to Whitelist"
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (!selectedTrafficSource) {
                                  alert('Please select a traffic source first');
                                  return;
                                }
                                try {
                                  const response = await fetch('/api/blacklist/batch-from-candidates', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      trafficSourceId: selectedTrafficSource,
                                      candidates: [{
                                        type: 'zone',
                                        value: child.campaign,
                                        name: `${child.campaign} - ${child.device || 'item'}`,
                                        metrics: {
                                          impressions: 0,
                                          clicks: child.clicks,
                                          conversions: child.conversions,
                                          spend: child.cost,
                                          revenue: child.revenue,
                                          roi: child.roi
                                        },
                                        campaignId: child.id.toString()
                                      }],
                                      reason: `Added from Reports - ROI: ${child.roi.toFixed(2)}%`
                                    })
                                  });
                                  const data = await response.json();
                                  if (data.success) {
                                    alert('Added to blacklist');
                                  }
                                } catch (err) {
                                  alert('Failed to add to blacklist');
                                }
                              }}
                              className="p-1.5 text-low-contrast hover:text-error transition-colors"
                              title="Add to Blacklist"
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Report Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md whisper-shadow">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h2 className="text-xl font-display font-bold text-primary">Save Report</h2>
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                  className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Saved Reports
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedReports.map((report, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-2 bg-surface-container text-sm">
                      <span>{report}</span>
                      <button className="text-on-surface-variant hover:text-primary transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-variant/20">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveReport}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
              >
                <Check size={16} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
