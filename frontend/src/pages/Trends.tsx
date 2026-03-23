/**
 * File: Trends.tsx
 * Purpose: Trends 趋势分析页面
 * Input/Output: 展示流量趋势数据、统计图表
 * Logic: 从 API 获取趋势数据，展示时间序列图表和多维度分析
 * 前后端交互: 调用 /api/trends/report 接口
 */

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { 
  ChartWrapper,
  LazyLineChart, LazyLine, LazyXAxis, LazyYAxis, LazyCartesianGrid, LazyTooltip, LazyLegend, LazyResponsiveContainer, 
  LazyAreaChart, LazyArea, LazyPieChart, LazyPie, LazyCell, LazyBarChart, LazyBar 
} from '../components/ChartWrapper';
import { Calendar, TrendingUp, TrendingDown, Minus, Filter, Download, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchTrendsReport, fetchCampaigns, type TrendsReport } from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This month', days: 'month' },
  { label: 'Last month', days: 'lastMonth' },
  { label: 'Custom', days: 'custom' },
] as const;

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getPresetDates = (preset: typeof DATE_PRESETS[number]['days']) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (preset === 0) {
    return { startDate: formatDate(today), endDate: formatDate(today) };
  } else if (preset === 1) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
  } else if (preset === 7 || preset === 30) {
    const start = new Date(today);
    start.setDate(start.getDate() - preset + 1);
    return { startDate: formatDate(start), endDate: formatDate(today) };
  } else if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatDate(start), endDate: formatDate(today) };
  } else if (preset === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  return null;
};

const StatCard = ({ title, value, trend, changePercent, prefix = '' }: { 
  title: string; 
  value: number; 
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  prefix?: string;
}) => (
  <div className="bg-surface p-4 rounded-lg border border-border-default">
    <p className="text-xs text-fg-subtle uppercase tracking-wider">{title}</p>
    <div className="flex items-end justify-between mt-2">
      <p className="text-2xl font-display font-bold text-fg-default">
        {prefix}{value.toLocaleString()}
      </p>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          trend === 'up' ? "text-success" : trend === 'down' ? "text-danger" : "text-fg-subtle"
        )}>
          {trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
          {changePercent !== undefined && `${Math.abs(changePercent).toFixed(1)}%`}
        </div>
      )}
    </div>
  </div>
);

const PieChartCard = React.memo(({ title, data, dataKey, nameKey }: { 
  title: string; 
  data: Array<{ name: string; value: number; clicks?: number; conversions?: number; revenue?: number }>; 
  dataKey: string;
  nameKey: string;
}) => {
  // Memoize cell elements to prevent re-creation on every render
  const cells = useMemo(() => 
    data.map((entry, index) => (
      <LazyCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    )),
    [data]
  );

  return (
    <div className="bg-surface p-6 rounded-lg border border-border-default">
      <h3 className="text-lg font-semibold text-fg-default mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ChartWrapper height={250}>
          <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyPieChart>
                <LazyPie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={dataKey}
                  nameKey={nameKey}
                >
                  {cells}
                </LazyPie>
                <LazyTooltip />
              </LazyPieChart>
            </LazyResponsiveContainer>
          </Suspense>
        </ChartWrapper>
      ) : (
        <div className="h-[250px] flex items-center justify-center text-fg-muted">
          No data available
        </div>
      )}
    </div>
  );
});

PieChartCard.displayName = 'PieChartCard';

const BarChartCard = React.memo(({ title, data, dataKey }: { 
  title: string; 
  data: Array<{ name: string; value: number; clicks?: number; conversions?: number; revenue?: number }>; 
  dataKey: string;
}) => {
  // Memoize chart configuration
  const chartConfig = useMemo(() => ({
    grid: { strokeDasharray: '3 3', stroke: '#e5e7eb' },
    xAxis: { type: 'number' as const, tick: { fontSize: 12 } },
    yAxis: { dataKey: 'name' as const, type: 'category' as const, width: 100, tick: { fontSize: 11 } },
    bar: { dataKey, fill: '#6366f1', radius: [0, 4, 4, 0] as const }
  }), [dataKey]);

  return (
    <div className="bg-surface p-6 rounded-lg border border-border-default">
      <h3 className="text-lg font-semibold text-fg-default mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ChartWrapper height={250}>
          <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyBarChart data={data} layout="vertical">
                <LazyCartesianGrid {...chartConfig.grid} />
                <LazyXAxis {...chartConfig.xAxis} />
                <LazyYAxis {...chartConfig.yAxis} />
                <LazyTooltip />
                <LazyBar {...chartConfig.bar} />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </Suspense>
        </ChartWrapper>
      ) : (
        <div className="h-[250px] flex items-center justify-center text-fg-muted">
          No data available
        </div>
      )}
    </div>
  );
});

BarChartCard.displayName = 'BarChartCard';

// Optimized chart components with React.memo to prevent unnecessary re-renders
const MemoizedAreaChart = React.memo(({ data, dataKeys, colors, gradients, title }: {
  data: any[];
  dataKeys: string[];
  colors: string[];
  gradients: { id: string; color: string }[];
  title: string;
}) => {
  return (
    <div className="bg-surface p-6 rounded-lg border border-border-default">
      <h3 className="text-lg font-semibold text-fg-default mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ChartWrapper height={300}>
          <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyAreaChart data={data}>
                <defs>
                  {gradients.map((grad, i) => (
                    <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={grad.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={grad.color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <LazyXAxis dataKey="date" tick={{ fontSize: 12 }} />
                <LazyYAxis tick={{ fontSize: 12 }} />
                <LazyTooltip />
                <LazyLegend />
                {dataKeys.map((key, i) => (
                  <LazyArea 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[i]} 
                    fillOpacity={1} 
                    fill={`url(#${gradients[i].id})`} 
                  />
                ))}
              </LazyAreaChart>
            </LazyResponsiveContainer>
          </Suspense>
        </ChartWrapper>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-fg-muted">
          No trend data available
        </div>
      )}
    </div>
  );
});

MemoizedAreaChart.displayName = 'MemoizedAreaChart';

export const Trends = () => {
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [interval, setInterval] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [selectedPreset, setSelectedPreset] = useState<string>('Last 7 days');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [activeChart, setActiveChart] = useState<'clicks' | 'revenue' | 'roi' | 'epc'>('clicks');
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['country', 'device', 'os', 'browser']);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load campaigns for filter
  useEffect(() => {
    fetchCampaigns()
      .then(data => {
        const list = Array.isArray(data) ? data : data?.list || [];
        setCampaigns(list.map((c: any) => ({ id: c.id || c.campaignId, name: c.name || c.campaignName })));
      })
      .catch(err => console.error('Failed to load campaigns:', err));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
        setShowCustomDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = useCallback((preset: typeof DATE_PRESETS[number]) => {
    setSelectedPreset(preset.label);
    setShowDateDropdown(false);
    
    if (preset.days === 'custom') {
      setShowCustomDatePicker(true);
      setTempDateRange(dateRange);
    } else {
      const dates = getPresetDates(preset.days);
      if (dates) {
        setDateRange(dates);
      }
    }
  }, [dateRange]);

  const handleCustomDateApply = useCallback(() => {
    setDateRange(tempDateRange);
    setShowCustomDatePicker(false);
    setSelectedPreset('Custom');
  }, [tempDateRange]);

  const toggleFilterPanel = useCallback(() => {
    setShowFilterPanel(prev => !prev);
  }, []);

  const toggleDimension = useCallback((dimension: string) => {
    setSelectedDimensions(prev => {
      if (prev.includes(dimension)) {
        // Don't allow removing last dimension
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dimension);
      } else {
        return [...prev, dimension];
      }
    });
  }, []);

  // Fetch data when dateRange or interval changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetchTrendsReport({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      interval,
      campaignId: selectedCampaignId || undefined,
    })
      .then(data => {
        setReport(data);
      })
      .catch(err => {
        console.error('Failed to fetch trends:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trends data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateRange, interval, selectedCampaignId]);

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

  if (!report) {
    return (
      <div className="flex items-center justify-center h-96 text-fg-muted">
        No data available
      </div>
    );
  }

  // Memoize data transformations to prevent re-calculation on every render
  const countryData = useMemo(() => 
    report.breakdowns?.country?.map(item => ({
      name: item.value || 'Unknown',
      value: item.clicks || 0,
      clicks: item.clicks || 0,
      conversions: item.conversions || 0,
      revenue: item.revenue || 0,
    })) || [],
    [report.breakdowns?.country]
  );

  const deviceData = useMemo(() => 
    report.breakdowns?.device?.map(item => ({
      name: item.value || 'Unknown',
      value: item.clicks || 0,
      clicks: item.clicks || 0,
      conversions: item.conversions || 0,
      revenue: item.revenue || 0,
    })) || [],
    [report.breakdowns?.device]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-fg-default">Trends</h1>
          <p className="text-sm text-fg-subtle mt-1">Analyze traffic trends and performance over time</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFilterPanel}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-surface border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container transition-colors",
              showFilterPanel && "bg-accent-fg/10 border-accent-fg text-accent-fg"
            )}
          >
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="mb-6 bg-surface p-6 rounded-lg border border-border-default animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-fg-default">Filter Dimensions</h3>
            <button
              onClick={toggleFilterPanel}
              className="text-fg-muted hover:text-fg-default transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {['country', 'device', 'os', 'browser', 'affiliate_network', 'offer', 'campaign'].map(dimension => (
              <button
                key={dimension}
                onClick={() => toggleDimension(dimension)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors border",
                  selectedDimensions.includes(dimension)
                    ? "bg-accent-fg/10 border-accent-fg text-accent-fg"
                    : "bg-surface-container border-border-default text-fg-muted hover:border-accent-fg/50"
                )}
              >
                {dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default">
            <p className="text-xs text-fg-subtle">
              Showing {selectedDimensions.length} dimension{selectedDimensions.length !== 1 ? 's' : ''}: {selectedDimensions.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Date Range & Interval Selector */}
      <div className="flex items-center gap-4 bg-surface p-4 rounded-lg border border-border-default">
        {/* Date Range Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container-high transition-colors min-w-[160px]"
          >
            <Calendar size={16} className="text-fg-subtle" />
            <span className="flex-1 text-left">{selectedPreset}</span>
            <ChevronDown size={16} className={cn("text-fg-subtle transition-transform", showDateDropdown && "rotate-180")} />
          </button>
          
          {/* Dropdown Menu */}
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border-default rounded-md shadow-lg z-50">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "w-full px-4 py-2 text-sm text-left hover:bg-surface-container transition-colors first:rounded-t-md last:rounded-b-md",
                    selectedPreset === preset.label && "bg-accent-fg/10 text-accent-fg"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Custom Date Picker Popup */}
          {showCustomDatePicker && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-surface border border-border-default rounded-md shadow-lg z-50 p-4">
              <p className="text-sm font-medium text-fg-default mb-3">Custom Date Range</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-fg-subtle block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={tempDateRange.startDate}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-surface-container border border-border-default rounded px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-subtle block mb-1">End Date</label>
                  <input
                    type="date"
                    value={tempDateRange.endDate}
                    onChange={(e) => setTempDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-surface-container border border-border-default rounded px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowCustomDatePicker(false)}
                    className="flex-1 px-3 py-2 text-sm text-fg-subtle hover:bg-surface-container rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomDateApply}
                    className="flex-1 px-3 py-2 text-sm bg-accent-fg text-on-primary rounded hover:bg-accent-fg/90 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Display selected date range */}
        <div className="flex items-center gap-2 text-sm text-fg-subtle">
          <span>{dateRange.startDate}</span>
          <span>→</span>
          <span>{dateRange.endDate}</span>
        </div>
        
        <div className="h-6 w-px bg-border-default" />
        
        {/* Campaign Filter */}
        <select
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          className="px-3 py-2 bg-surface-container border border-border-default rounded-md text-sm text-fg-default focus:outline-none focus:border-accent-fg"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        
        <div className="h-6 w-px bg-border-default" />
        
        {/* Interval Selector */}
        <div className="flex items-center gap-1 bg-surface-container rounded-md p-1">
          {(['hour', 'day', 'week', 'month'] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors capitalize",
                interval === i
                  ? "bg-surface text-fg-default shadow-sm"
                  : "text-fg-muted hover:text-fg-default"
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Clicks" value={report.summary.totalClicks} trend={report.summary.trend} changePercent={report.summary.changePercent} />
        <StatCard title="Conversions" value={report.summary.totalConversions} />
        <StatCard title="Revenue" value={report.summary.totalRevenue} prefix="$" />
        <StatCard title="Cost" value={report.summary.totalCost} prefix="$" />
        <StatCard title="Profit" value={report.summary.totalProfit} prefix="$" />
        <StatCard title="ROI" value={report.summary.avgRoi} prefix="%" />
      </div>

      {/* Mobile Chart Tabs */}
      {isMobile && (
        <div className="mobile-chart-tabs">
          <button
            onClick={() => setActiveChart('clicks')}
            className={cn("tab-btn", activeChart === 'clicks' && 'active')}
          >
            Clicks
          </button>
          <button
            onClick={() => setActiveChart('revenue')}
            className={cn("tab-btn", activeChart === 'revenue' && 'active')}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveChart('roi')}
            className={cn("tab-btn", activeChart === 'roi' && 'active')}
          >
            ROI
          </button>
          <button
            onClick={() => setActiveChart('epc')}
            className={cn("tab-btn", activeChart === 'epc' && 'active')}
          >
            EPC
          </button>
        </div>
      )}

      {/* Time Series Charts */}
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        {/* Clicks & Conversions Chart */}
        {( !isMobile || activeChart === 'clicks') && (
          <div className="bg-surface p-6 rounded-lg border border-border-default">
            <h3 className="text-lg font-semibold text-fg-default mb-4">Clicks & Conversions</h3>
            {report.data && report.data.length > 0 ? (
              <ChartWrapper height={300}>
                <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyAreaChart data={report.data}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <LazyXAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <LazyYAxis tick={{ fontSize: 12 }} />
                      <LazyTooltip />
                      <LazyLegend />
                      <LazyArea type="monotone" dataKey="clicks" stroke="#6366f1" fillOpacity={1} fill="url(#colorClicks)" />
                      <LazyArea type="monotone" dataKey="conversions" stroke="#22c55e" fillOpacity={1} fill="url(#colorConversions)" />
                    </LazyAreaChart>
                  </LazyResponsiveContainer>
                </Suspense>
              </ChartWrapper>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-fg-muted">
                No trend data available. Select a campaign to view trends.
              </div>
            )}
          </div>
        )}

        {/* Revenue & Cost Chart */}
        {( !isMobile || activeChart === 'revenue') && (
          <div className="bg-surface p-6 rounded-lg border border-border-default">
            <h3 className="text-lg font-semibold text-fg-default mb-4">Revenue & Cost</h3>
            {report.data && report.data.length > 0 ? (
              <ChartWrapper height={300}>
                <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyAreaChart data={report.data}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <LazyXAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <LazyYAxis tick={{ fontSize: 12 }} />
                      <LazyTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                      <LazyLegend />
                      <LazyArea type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                      <LazyArea type="monotone" dataKey="cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" />
                    </LazyAreaChart>
                  </LazyResponsiveContainer>
                </Suspense>
              </ChartWrapper>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-fg-muted">
                No trend data available. Select a campaign to view trends.
              </div>
            )}
          </div>
        )}

        {/* ROI Chart */}
        {( !isMobile || activeChart === 'roi') && (
          <div className="bg-surface p-6 rounded-lg border border-border-default">
            <h3 className="text-lg font-semibold text-fg-default mb-4">ROI Trend</h3>
            {report.data && report.data.length > 0 ? (
              <ChartWrapper height={300}>
                <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyLineChart data={report.data}>
                      <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <LazyXAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <LazyYAxis tick={{ fontSize: 12 }} />
                      <LazyTooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <LazyLegend />
                      <LazyLine type="monotone" dataKey="roi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LazyLineChart>
                  </LazyResponsiveContainer>
                </Suspense>
              </ChartWrapper>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-fg-muted">
                No trend data available
              </div>
            )}
          </div>
        )}

        {/* EPC & CPA Chart */}
        {( !isMobile || activeChart === 'epc') && (
          <div className="bg-surface p-6 rounded-lg border border-border-default">
            <h3 className="text-lg font-semibold text-fg-default mb-4">EPC & CPA</h3>
            {report.data && report.data.length > 0 ? (
              <ChartWrapper height={300}>
                <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyLineChart data={report.data}>
                      <LazyCartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <LazyXAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <LazyYAxis tick={{ fontSize: 12 }} />
                      <LazyTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <LazyLegend />
                      <LazyLine type="monotone" dataKey="epc" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      <LazyLine type="monotone" dataKey="cpa" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LazyLineChart>
                  </LazyResponsiveContainer>
                </Suspense>
              </ChartWrapper>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-fg-muted">
                No trend data available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dimension Breakdown Charts */}
      {selectedCampaignId && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-fg-default">Dimension Breakdown</h2>
          
          {/* Device Types & Countries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard 
              title="Device Types Distribution" 
              data={deviceData} 
              dataKey="value" 
              nameKey="name" 
            />
            <BarChartCard 
              title="Top Countries by Clicks" 
              data={countryData} 
              dataKey="clicks" 
            />
          </div>
        </div>
      )}

      {/* No Campaign Selected Message */}
      {!selectedCampaignId && (
        <div className="bg-surface p-8 rounded-lg border border-border-default text-center">
          <p className="text-fg-muted">
            Select a campaign from the dropdown above to view detailed trends and breakdowns.
          </p>
        </div>
      )}
    </div>
  );
};

export default Trends;
