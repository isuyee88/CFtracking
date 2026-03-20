/**
 * File: Trends.tsx
 * Purpose: Trends 趋势分析页面
 * Input/Output: 展示流量趋势数据、统计图表
 * Logic: 从 API 获取趋势数据，展示时间序列图表和多维度分析
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, Filter, Download, RefreshCw, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TrendDataPoint {
  timestamp: string;
  date: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  epc: number;
  cpa: number;
  ctr: number;
  cr: number;
}

interface TrendSummary {
  totalClicks: number;
  totalUniqueClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgRoi: number;
  avgEpc: number;
  avgCpa: number;
  avgCtr: number;
  avgCr: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface DimensionData {
  name: string;
  value: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface TrendsReport {
  filter: {
    startDate: string;
    endDate: string;
    interval: string;
  };
  summary: TrendSummary;
  data: TrendDataPoint[];
  trafficSources: DimensionData[];
  affiliateNetworks: DimensionData[];
  deviceTypes: DimensionData[];
  countries: DimensionData[];
  offers: DimensionData[];
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

const PieChartCard = ({ title, data, dataKey, nameKey }: { 
  title: string; 
  data: DimensionData[]; 
  dataKey: keyof DimensionData;
  nameKey: keyof DimensionData;
}) => (
  <div className="bg-surface p-6 rounded-lg border border-border-default">
    <h3 className="text-lg font-semibold text-fg-default mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey as string}
          nameKey={nameKey as string}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const BarChartCard = ({ title, data, dataKey }: { 
  title: string; 
  data: DimensionData[]; 
  dataKey: keyof DimensionData;
}) => (
  <div className="bg-surface p-6 rounded-lg border border-border-default">
    <h3 className="text-lg font-semibold text-fg-default mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey as string} fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const Trends = () => {
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [interval, setInterval] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [selectedPreset, setSelectedPreset] = useState<string>('Last 7 days');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch data when dateRange or interval changes
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      const days = Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (24 * 60 * 60 * 1000)));
      
      const mockData: TrendDataPoint[] = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const end = new Date(dateRange.endDate);
        const date = new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        return {
        timestamp: date.toISOString(),
        date: date.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 1000) + 500,
        uniqueClicks: Math.floor(Math.random() * 800) + 400,
        conversions: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 5000) + 1000,
        cost: Math.floor(Math.random() * 2000) + 500,
        profit: Math.floor(Math.random() * 3000) + 500,
        roi: Math.random() * 100 + 20,
        epc: Math.random() * 5 + 1,
        cpa: Math.random() * 50 + 10,
        ctr: Math.random() * 5 + 1,
        cr: Math.random() * 3 + 0.5,
      };
    });

    // Mock dimension data
    const mockTrafficSources: DimensionData[] = [
      { name: 'Facebook Ads', value: 35, clicks: 4500, conversions: 180, revenue: 12500 },
      { name: 'Google Ads', value: 28, clicks: 3600, conversions: 145, revenue: 9800 },
      { name: 'Native Ads', value: 18, clicks: 2300, conversions: 92, revenue: 6200 },
      { name: 'TikTok', value: 12, clicks: 1500, conversions: 60, revenue: 4100 },
      { name: 'Organic', value: 7, clicks: 900, conversions: 36, revenue: 2500 },
    ];

    const mockAffiliateNetworks: DimensionData[] = [
      { name: 'MaxBounty', value: 32, clicks: 4100, conversions: 164, revenue: 11400 },
      { name: 'ClickBank', value: 25, clicks: 3200, conversions: 128, revenue: 8900 },
      { name: 'CJ Affiliate', value: 20, clicks: 2600, conversions: 104, revenue: 7200 },
      { name: 'ShareASale', value: 15, clicks: 1900, conversions: 76, revenue: 5300 },
      { name: 'Others', value: 8, clicks: 1000, conversions: 40, revenue: 2800 },
    ];

    const mockDeviceTypes: DimensionData[] = [
      { name: 'Mobile', value: 55, clicks: 7100, conversions: 284, revenue: 19800 },
      { name: 'Desktop', value: 35, clicks: 4500, conversions: 180, revenue: 12500 },
      { name: 'Tablet', value: 10, clicks: 1300, conversions: 52, revenue: 3600 },
    ];

    const mockCountries: DimensionData[] = [
      { name: 'United States', value: 42, clicks: 5400, conversions: 216, revenue: 15100 },
      { name: 'United Kingdom', value: 18, clicks: 2300, conversions: 92, revenue: 6400 },
      { name: 'Canada', value: 12, clicks: 1500, conversions: 60, revenue: 4200 },
      { name: 'Australia', value: 10, clicks: 1300, conversions: 52, revenue: 3600 },
      { name: 'Germany', value: 8, clicks: 1000, conversions: 40, revenue: 2800 },
      { name: 'Others', value: 10, clicks: 1300, conversions: 52, revenue: 3600 },
    ];

    const mockOffers: DimensionData[] = [
      { name: 'Weight Loss Pro', value: 28, clicks: 3600, conversions: 144, revenue: 10000 },
      { name: 'Crypto Trader', value: 22, clicks: 2800, conversions: 112, revenue: 7800 },
      { name: 'Casino VIP', value: 18, clicks: 2300, conversions: 92, revenue: 6400 },
      { name: 'Insurance Plus', value: 15, clicks: 1900, conversions: 76, revenue: 5300 },
      { name: 'Loan Express', value: 12, clicks: 1500, conversions: 60, revenue: 4200 },
      { name: 'Others', value: 5, clicks: 600, conversions: 24, revenue: 1700 },
    ];

    const mockReport: TrendsReport = {
      filter: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval,
      },
      summary: {
        totalClicks: mockData.reduce((sum, d) => sum + d.clicks, 0),
        totalUniqueClicks: mockData.reduce((sum, d) => sum + d.uniqueClicks, 0),
        totalConversions: mockData.reduce((sum, d) => sum + d.conversions, 0),
        totalRevenue: mockData.reduce((sum, d) => sum + d.revenue, 0),
        totalCost: mockData.reduce((sum, d) => sum + d.cost, 0),
        totalProfit: mockData.reduce((sum, d) => sum + d.profit, 0),
        avgRoi: 45.2,
        avgEpc: 2.5,
        avgCpa: 35.8,
        avgCtr: 2.1,
        avgCr: 1.8,
        trend: 'up',
        changePercent: 12.5,
      },
      data: mockData,
      trafficSources: mockTrafficSources,
      affiliateNetworks: mockAffiliateNetworks,
      deviceTypes: mockDeviceTypes,
      countries: mockCountries,
      offers: mockOffers,
    };

      setReport(mockReport);
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [dateRange, interval]);

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-accent-fg" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-fg-default">Trends</h1>
          <p className="text-sm text-fg-subtle mt-1">Analyze traffic trends and performance over time</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-default rounded-md text-sm text-fg-default hover:bg-surface-container transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

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

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clicks & Conversions Chart */}
        <div className="bg-surface p-6 rounded-lg border border-border-default">
          <h3 className="text-lg font-semibold text-fg-default mb-4">Clicks & Conversions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={report.data}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="clicks" stroke="#6366f1" fillOpacity={1} fill="url(#colorClicks)" />
              <Area type="monotone" dataKey="conversions" stroke="#22c55e" fillOpacity={1} fill="url(#colorConversions)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue & Cost Chart */}
        <div className="bg-surface p-6 rounded-lg border border-border-default">
          <h3 className="text-lg font-semibold text-fg-default mb-4">Revenue & Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={report.data}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Chart */}
        <div className="bg-surface p-6 rounded-lg border border-border-default">
          <h3 className="text-lg font-semibold text-fg-default mb-4">ROI Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              <Legend />
              <Line type="monotone" dataKey="roi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* EPC & CPA Chart */}
        <div className="bg-surface p-6 rounded-lg border border-border-default">
          <h3 className="text-lg font-semibold text-fg-default mb-4">EPC & CPA</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="epc" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cpa" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dimension Breakdown Charts */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-fg-default">Dimension Breakdown</h2>
        
        {/* Traffic Sources & Affiliate Networks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard 
            title="Traffic Sources Distribution" 
            data={report.trafficSources} 
            dataKey="value" 
            nameKey="name" 
          />
          <PieChartCard 
            title="Affiliate Networks Distribution" 
            data={report.affiliateNetworks} 
            dataKey="value" 
            nameKey="name" 
          />
        </div>

        {/* Device Types & Countries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard 
            title="Device Types Distribution" 
            data={report.deviceTypes} 
            dataKey="value" 
            nameKey="name" 
          />
          <BarChartCard 
            title="Top Countries by Clicks" 
            data={report.countries} 
            dataKey="clicks" 
          />
        </div>

        {/* Top Offers */}
        <div className="bg-surface p-6 rounded-lg border border-border-default">
          <h3 className="text-lg font-semibold text-fg-default mb-4">Top Offers Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.offers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number, name: string) => {
                if (name === 'revenue') return `$${value.toLocaleString()}`;
                return value.toLocaleString();
              }} />
              <Legend />
              <Bar dataKey="clicks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
