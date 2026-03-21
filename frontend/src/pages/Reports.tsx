/**
 * File: Reports.tsx
 * Purpose: Reports 报表页面
 * Input/Output: 展示聚合数据报表、支持分组和筛选
 * Logic: 从 API 获取聚合数据，展示多维度报表
 * 前后端交互: 调用 /api/analytics/entity-stats 和 /api/trends/report 接口
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Filter, Calendar, Download, ChevronDown, ChevronRight,
  Settings, Plus, Search, X, Check, MoreHorizontal, FileText, Eye,
  RefreshCw, Shield, ThumbsUp, ThumbsDown, AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  fetchEntityStats, fetchTrendsReport, fetchTrafficSources, fetchCampaigns,
  type TrendsReport
} from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];

const REPORT_TYPES = [
  { id: 'custom', name: 'Custom Report', icon: BarChart3 },
  { id: 'clicks', name: 'Click Log', icon: FileText },
  { id: 'campaigns', name: 'Campaign Report', icon: BarChart3 },
];

const GROUPING_OPTIONS = [
  { value: 'campaign', label: 'Campaign', category: 'Campaign' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'device', label: 'Device', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
  { value: 'os', label: 'Operating System', category: 'Device' },
];

const METRICS_OPTIONS = [
  { value: 'clicks', label: 'Clicks', default: true },
  { value: 'conversions', label: 'Conversions', default: true },
  { value: 'revenue', label: 'Revenue', default: true },
  { value: 'cost', label: 'Cost', default: true },
  { value: 'profit', label: 'Profit', default: true },
  { value: 'roi', label: 'ROI', default: true },
];

interface ReportRow {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  cr: number;
  epc: number;
  cpc: number;
}

export const Reports = () => {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('custom');
  const [dateRange, setDateRange] = useState('last7days');
  const [grouping, setGrouping] = useState(['campaign']);
  const [selectedMetrics, setSelectedMetrics] = useState(
    METRICS_OPTIONS.filter(m => m.default).map(m => m.value)
  );
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [savedReports, setSavedReports] = useState<string[]>(['Default Campaign Report']);
  
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [trendData, setTrendData] = useState<TrendsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [trafficSources, setTrafficSources] = useState<Array<{id: string, name: string}>>([]);
  const [selectedTrafficSource, setSelectedTrafficSource] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Array<{id: string, name: string}>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const getDateRangeFromPreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preset) {
      case 'today':
        return { startDate: today.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday.toISOString().split('T')[0], endDate: yesterday.toISOString().split('T')[0] };
      }
      case 'last7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
      }
      case 'last30days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
      }
      case 'thismonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
      }
      case 'lastmonth': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
      }
      default:
        return { startDate: today.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
  };

  useEffect(() => {
    fetchTrafficSources()
      .then(data => {
        const list = Array.isArray(data) ? data : data?.list || [];
        setTrafficSources(list.map((ts: any) => ({ id: ts.id || ts.trafficSourceId, name: ts.name })));
        if (list.length > 0) {
          setSelectedTrafficSource(list[0].id || list[0].trafficSourceId);
        }
      })
      .catch(err => console.error('Failed to fetch traffic sources:', err));

    fetchCampaigns()
      .then(data => {
        const list = Array.isArray(data) ? data : data?.list || [];
        setCampaigns(list.map((c: any) => ({ id: c.id || c.campaignId, name: c.name || c.campaignName })));
      })
      .catch(err => console.error('Failed to fetch campaigns:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const { startDate, endDate } = getDateRangeFromPreset(dateRange);
    const rangeMap: Record<string, string> = {
      'today': 'today',
      'yesterday': 'yesterday',
      'last7days': '7days',
      'last30days': '30days',
      'thismonth': 'month',
      'lastmonth': 'lastMonth',
    };

    const entityType = grouping[0] === 'campaign' ? 'campaigns' : 
                       grouping[0] === 'country' ? 'countries' :
                       grouping[0] === 'device' ? 'devices' :
                       grouping[0] === 'browser' ? 'browsers' : 'campaigns';

    Promise.all([
      fetchEntityStats(entityType, rangeMap[dateRange] || 'today'),
      fetchTrendsReport({
        startDate,
        endDate,
        interval: 'day',
        campaignId: selectedCampaignId || undefined,
      }).catch(() => null),
    ])
      .then(([entityStats, trends]) => {
        const rows: ReportRow[] = (entityStats || []).map((item: any, index: number) => {
          const clicks = item.clicks || item.totalClicks || 0;
          const conversions = item.conversions || item.totalConversions || 0;
          const revenue = item.revenue || item.totalRevenue || 0;
          const cost = item.cost || item.spend || item.totalCost || 0;
          const profit = revenue - cost;
          const roi = cost > 0 ? (profit / cost) * 100 : 0;
          const cr = clicks > 0 ? (conversions / clicks) * 100 : 0;
          const epc = clicks > 0 ? revenue / clicks : 0;
          const cpc = clicks > 0 ? cost / clicks : 0;

          return {
            id: item.id || item.campaignId || item.name || `row-${index}`,
            name: item.name || item.campaignName || item.country || item.device || item.browser || 'Unknown',
            clicks,
            conversions,
            revenue,
            cost,
            profit,
            roi,
            cr,
            epc,
            cpc,
          };
        });

        setReportData(rows);
        setTrendData(trends);
      })
      .catch(err => {
        console.error('Failed to fetch report data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateRange, grouping, selectedCampaignId]);

  const handleReportTypeChange = (reportType: string) => {
    setActiveReport(reportType);
    if (reportType === 'clicks') {
      navigate('/audit');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleRowSelection = (id: string) => {
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

  const toggleSelectAll = () => {
    if (selectedRows.size === reportData.length) {
      setSelectedRows(new Set());
      setShowBatchActions(false);
    } else {
      setSelectedRows(new Set(reportData.map(row => row.id)));
      setShowBatchActions(true);
    }
  };

  const toggleMetric = (value: string) => {
    setSelectedMetrics(prev => 
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    );
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
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    if (format === 'csv') {
      const headers = ['Name', 'Clicks', 'Conversions', 'Revenue', 'Cost', 'Profit', 'ROI', 'CR', 'EPC', 'CPC'];
      const rows = reportData.map(row => [
        row.name,
        row.clicks,
        row.conversions,
        row.revenue.toFixed(2),
        row.cost.toFixed(2),
        row.profit.toFixed(2),
        row.roi.toFixed(2),
        row.cr.toFixed(2),
        row.epc.toFixed(2),
        row.cpc.toFixed(2),
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (num: number) => `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (num: number) => `${num.toFixed(2)}%`;

  const chartData = trendData?.data?.map(d => ({
    date: d.date,
    clicks: d.clicks,
    conversions: d.conversions,
    revenue: d.revenue,
  })) || [];

  const geoData = trendData?.breakdowns?.country?.slice(0, 5).map(item => ({
    name: item.value || 'Unknown',
    value: item.clicks || 0,
    color: COLORS[trendData.breakdowns!.country!.indexOf(item) % COLORS.length],
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-accent-fg" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-danger">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

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
          <button 
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <Download size={16} />
            Export
          </button>
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
              </select>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Group By
            </label>
            <select
              value={grouping[0]}
              onChange={(e) => setGrouping([e.target.value])}
              className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            >
              {GROUPING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Campaign Filter
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
          {chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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
          ) : (
            <div className="h-[300px] flex items-center justify-center text-fg-muted">
              No trend data available. Select a campaign to view trends.
            </div>
          )}
        </div>

        {/* Geo Distribution */}
        <div className="bg-surface-container-lowest p-6 whisper-shadow">
          <h3 className="text-sm font-bold text-primary mb-6">Geo Distribution</h3>
          {geoData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={geoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {geoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {geoData.map((geo) => (
                  <div key={geo.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: geo.color }} />
                      <span>{geo.name}</span>
                    </div>
                    <span className="font-bold">{geo.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-fg-muted">
              No geo data available
            </div>
          )}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-on-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors"
                  title="Add to Whitelist"
                >
                  <ThumbsUp size={14} />
                  Whitelist
                </button>
                <button
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
              Total: {reportData.length} rows
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
          {reportData.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === reportData.length && reportData.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast">
                    {GROUPING_OPTIONS.find(o => o.value === grouping[0])?.label || 'Name'}
                  </th>
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
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-high-contrast text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {reportData.map((row) => (
                  <tr key={row.id} className={cn(
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
                      <span className="text-sm font-bold text-high-contrast link-primary">
                        {row.name}
                      </span>
                    </td>
                    {selectedMetrics.includes('clicks') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{row.clicks.toLocaleString()}</td>
                    )}
                    {selectedMetrics.includes('conversions') && (
                      <td className="px-4 py-4 text-sm font-mono text-high-contrast">{row.conversions.toLocaleString()}</td>
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
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/campaigns/${row.id}`)}
                          className="p-1.5 text-medium-contrast hover:text-primary transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <BarChart3 size={48} className="mb-4" />
              <p>No data available for the selected criteria</p>
              <p className="text-sm mt-2">Try adjusting your filters or date range</p>
            </div>
          )}
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
