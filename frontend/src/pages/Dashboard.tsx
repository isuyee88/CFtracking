/**
 * File: Dashboard.tsx
 * Purpose: Dashboard主页面，参考Keitaro实现完整的布局自定义功能
 * Input/Output: 显示实时统计数据、图表、最近点击流，支持完整自定义
 * Logic: 使用useDashboardURLState管理URL状态，支持Metrics/Entities/Columns/Recent Clicks配置
 * 样式优化：统一主色调、玻璃拟态效果、自动昼夜模式
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ChevronRight,
  MoreHorizontal,
  Calendar,
  RefreshCw,
  Settings,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboardURLState } from '../hooks/useURLState';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';
import { fetchCampaigns, fetchOffers, fetchLandings, fetchTrafficSources, fetchDashboardStats, fetchRecentClicks, fetchEntityStats } from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 自动检测昼夜模式的 Hook
function useAutoDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      // 晚上6点到早上6点为暗色模式
      const shouldBeDark = hour >= 18 || hour < 6;
      setIsDarkMode(shouldBeDark);
      setCurrentTime(now);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, []);

  return { isDarkMode, currentTime };
}

// ==================== 配置定义 ====================

// 所有可用的Metrics
const ALL_METRICS = [
  { key: 'clicks', label: 'Clicks', format: 'number', category: 'basic' },
  { key: 'unique_clicks_campaign', label: 'Unique clicks (campaign)', format: 'number', category: 'basic' },
  { key: 'unique_clicks_flow', label: 'Unique clicks (flow)', format: 'number', category: 'basic' },
  { key: 'unique_clicks_global', label: 'Unique clicks (global)', format: 'number', category: 'basic' },
  { key: 'conversions', label: 'Conversions', format: 'number', category: 'basic' },
  { key: 'cost', label: 'Cost', format: 'currency', category: 'financial' },
  { key: 'revenue_confirmed', label: 'Revenue (confirmed)', format: 'currency', category: 'financial' },
  { key: 'revenue_pending', label: 'Revenue (pending)', format: 'currency', category: 'financial' },
  { key: 'profit_confirmed', label: 'Profit/Loss (confirmed)', format: 'currency', category: 'financial' },
  { key: 'profit_pending', label: 'Profit/Loss (pending)', format: 'currency', category: 'financial' },
  { key: 'roi_confirmed', label: 'ROI (confirmed)', format: 'percentage', category: 'financial' },
  { key: 'roi_pending', label: 'ROI (pending)', format: 'percentage', category: 'financial' },
  { key: 'epc', label: 'EPC', format: 'currency', category: 'performance' },
  { key: 'cr', label: 'CR', format: 'percentage', category: 'performance' },
  { key: 'cvr', label: 'CVR', format: 'percentage', category: 'performance' },
  { key: 'deposits', label: 'Deposits', format: 'number', category: 'financial' },
  { key: 'visitors', label: 'Visitors', format: 'number', category: 'basic' },
  // 兼容旧版本的key映射
  { key: 'campaign_unique_clicks', label: 'UC (campaign)', format: 'number', category: 'basic' },
  { key: 'sale_revenue', label: 'Revenue', format: 'currency', category: 'financial' },
];

// Entities配置 - 扩展为完整的Top Blocks
const ENTITY_CONFIGS = {
  // Campaign & Traffic
  campaigns: {
    key: 'campaigns',
    label: 'Campaigns',
    icon: 'Target',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Campaign', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
      { key: 'cost', label: 'Cost', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
      { key: 'profit', label: 'Profit', align: 'right' },
      { key: 'roi', label: 'ROI', align: 'right' },
    ]
  },
  streams: {
    key: 'streams',
    label: 'Streams',
    icon: 'GitBranch',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Stream', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
      { key: 'cost', label: 'Cost', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
    ]
  },
  landings: {
    key: 'landings',
    label: 'Landing Pages',
    icon: 'FileText',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Landing page', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  offers: {
    key: 'offers',
    label: 'Offers',
    icon: 'Gift',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Offer', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  sources: {
    key: 'sources',
    label: 'Traffic Sources',
    icon: 'Globe',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Source', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  affiliates: {
    key: 'affiliates',
    label: 'Affiliate Networks',
    icon: 'Network',
    category: 'Campaign',
    columns: [
      { key: 'name', label: 'Network', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
    ]
  },

  // Geo
  countries: {
    key: 'countries',
    label: 'Countries',
    icon: 'MapPin',
    category: 'Geo',
    columns: [
      { key: 'name', label: 'Country', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
      { key: 'conversion_rate', label: 'CR', align: 'right' },
    ]
  },
  regions: {
    key: 'regions',
    label: 'Regions/States',
    icon: 'Map',
    category: 'Geo',
    columns: [
      { key: 'name', label: 'Region', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  cities: {
    key: 'cities',
    label: 'Cities',
    icon: 'Building',
    category: 'Geo',
    columns: [
      { key: 'name', label: 'City', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  isps: {
    key: 'isps',
    label: 'ISPs',
    icon: 'Wifi',
    category: 'Geo',
    columns: [
      { key: 'name', label: 'ISP', width: '180px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },

  // Device
  device_types: {
    key: 'device_types',
    label: 'Device Types',
    icon: 'Smartphone',
    category: 'Device',
    columns: [
      { key: 'name', label: 'Device Type', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  os: {
    key: 'os',
    label: 'Operating Systems',
    icon: 'Monitor',
    category: 'Device',
    columns: [
      { key: 'name', label: 'OS', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  browsers: {
    key: 'browsers',
    label: 'Browsers',
    icon: 'Layout',
    category: 'Device',
    columns: [
      { key: 'name', label: 'Browser', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },

  // Connection
  connection_types: {
    key: 'connection_types',
    label: 'Connection Types',
    icon: 'Radio',
    category: 'Network',
    columns: [
      { key: 'name', label: 'Connection', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },

  // Time
  hours: {
    key: 'hours',
    label: 'Hours of Day',
    icon: 'Clock',
    category: 'Time',
    columns: [
      { key: 'name', label: 'Hour', width: '100px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  days_of_week: {
    key: 'days_of_week',
    label: 'Days of Week',
    icon: 'Calendar',
    category: 'Time',
    columns: [
      { key: 'name', label: 'Day', width: '120px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },

  // Referrer
  referrers: {
    key: 'referrers',
    label: 'Referrers',
    icon: 'Link',
    category: 'Referrer',
    columns: [
      { key: 'name', label: 'Referrer', width: '250px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  referrer_domains: {
    key: 'referrer_domains',
    label: 'Referrer Domains',
    icon: 'Globe2',
    category: 'Referrer',
    columns: [
      { key: 'name', label: 'Domain', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  search_engines: {
    key: 'search_engines',
    label: 'Search Engines',
    icon: 'Search',
    category: 'Referrer',
    columns: [
      { key: 'name', label: 'Search Engine', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },

  // Sub IDs
  sub1: {
    key: 'sub1',
    label: 'Sub ID 1',
    icon: 'Tag',
    category: 'Sub IDs',
    columns: [
      { key: 'name', label: 'Sub ID 1', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  sub2: {
    key: 'sub2',
    label: 'Sub ID 2',
    icon: 'Tag',
    category: 'Sub IDs',
    columns: [
      { key: 'name', label: 'Sub ID 2', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  sub3: {
    key: 'sub3',
    label: 'Sub ID 3',
    icon: 'Tag',
    category: 'Sub IDs',
    columns: [
      { key: 'name', label: 'Sub ID 3', width: '150px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
};

// Recent Clicks列配置 - 基于RawClick数据模型
const RECENT_CLICKS_COLUMNS = [
  // 基础信息 (Basic)
  { key: 'event_id', label: 'Event ID', width: '120px', category: 'Basic' },
  { key: 'datetime', label: 'Date and Time', width: '150px', category: 'Basic' },
  { key: 'visitor_code', label: 'Visitor Code', width: '120px', category: 'Basic' },

  // Campaign & Traffic
  { key: 'campaign', label: 'Campaign', width: '180px', category: 'Campaign' },
  { key: 'stream', label: 'Stream', width: '120px', category: 'Campaign' },
  { key: 'landing', label: 'Landing Page', width: '150px', category: 'Campaign' },
  { key: 'offer', label: 'Offer', width: '150px', category: 'Campaign' },
  { key: 'source', label: 'Traffic Source', width: '150px', category: 'Campaign' },

  // Geo 信息
  { key: 'country', label: 'Country', width: '100px', category: 'Geo' },
  { key: 'region', label: 'Region/State', width: '120px', category: 'Geo' },
  { key: 'city', label: 'City', width: '120px', category: 'Geo' },
  { key: 'language', label: 'Language', width: '80px', category: 'Geo' },
  { key: 'isp', label: 'ISP', width: '150px', category: 'Geo' },
  { key: 'operator', label: 'Mobile Operator', width: '150px', category: 'Geo' },

  // Device & System
  { key: 'device_type', label: 'Device Type', width: '100px', category: 'Device' },
  { key: 'device_model', label: 'Device Model', width: '150px', category: 'Device' },
  { key: 'os', label: 'OS', width: '100px', category: 'Device' },
  { key: 'os_version', label: 'OS Version', width: '100px', category: 'Device' },
  { key: 'browser', label: 'Browser', width: '100px', category: 'Device' },
  { key: 'browser_version', label: 'Browser Version', width: '120px', category: 'Device' },
  { key: 'os_icon', label: 'OS Logo', width: '60px', category: 'Device' },
  { key: 'browser_icon', label: 'Browser Logo', width: '80px', category: 'Device' },

  // Network
  { key: 'ip', label: 'IP Address', width: '120px', category: 'Network' },
  { key: 'connection_type', label: 'Connection Type', width: '120px', category: 'Network' },
  { key: 'proxy', label: 'Proxy Status', width: '100px', category: 'Network' },

  // Tracking IDs
  { key: 'creative_id', label: 'Creative ID', width: '120px', category: 'Tracking' },
  { key: 'external_id', label: 'External ID', width: '120px', category: 'Tracking' },
  { key: 'ad_campaign_id', label: 'Ad Campaign ID', width: '150px', category: 'Tracking' },

  // Sub IDs
  { key: 'sub_id', label: 'Sub ID', width: '120px', category: 'Sub IDs' },
  { key: 'sub1', label: 'Sub ID 1', width: '100px', category: 'Sub IDs' },
  { key: 'sub2', label: 'Sub ID 2', width: '100px', category: 'Sub IDs' },
  { key: 'sub3', label: 'Sub ID 3', width: '100px', category: 'Sub IDs' },
  { key: 'sub4', label: 'Sub ID 4', width: '100px', category: 'Sub IDs' },
  { key: 'sub5', label: 'Sub ID 5', width: '100px', category: 'Sub IDs' },

  // Referrer
  { key: 'referrer', label: 'Referrer', width: '200px', category: 'Referrer' },
  { key: 'referrer_domain', label: 'Referrer Domain', width: '150px', category: 'Referrer' },
  { key: 'search_engine', label: 'Search Engine', width: '120px', category: 'Referrer' },
  { key: 'keyword', label: 'Keyword', width: '150px', category: 'Referrer' },

  // Destination & Cost
  { key: 'destination', label: 'Destination', width: '200px', category: 'Destination' },
  { key: 'cost', label: 'Click Cost', width: '100px', category: 'Cost' },

  // Status & Detection
  { key: 'bot', label: 'Bot Status', width: '100px', category: 'Status' },
  { key: 'unique_stream', label: 'Unique per Stream', width: '130px', category: 'Status' },
  { key: 'unique_campaign', label: 'Unique per Campaign', width: '150px', category: 'Status' },

  // User Agent
  { key: 'user_agent', label: 'User Agent', width: '300px', category: 'User Agent' },
];

// 时间范围选项 - 使用新的日期选择器组件
const TIME_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'lastyear', label: 'Last Year' },
];

// ==================== 数据生成函数 ====================

// 加载状态组件
const LoadingSpinner = ({ size = 24 }: { size?: number }) => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-{size} w-{size} border-t-2 border-b-2 border-primary"></div>
  </div>
);

// 错误提示组件
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">
    {message}
  </div>
);

// ==================== 组件 ====================

// Preferences弹窗组件
const PreferencesModal = ({ 
  isOpen, 
  onClose, 
  config, 
  onConfigChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  config: any; 
  onConfigChange: (newConfig: any) => void;
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);
  
  if (!isOpen) return null;
  
  const toggleMetric = (key: string) => {
    const current = localConfig.metrics || [];
    const newMetrics = current.includes(key)
      ? current.filter((m: string) => m !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, metrics: newMetrics });
  };
  
  const toggleEntity = (key: string) => {
    const current = localConfig.entities || [];
    const newEntities = current.includes(key)
      ? current.filter((e: string) => e !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, entities: newEntities });
  };
  
  const toggleRecentClickColumn = (key: string) => {
    const current = localConfig.recentClicksColumns || [];
    const newColumns = current.includes(key)
      ? current.filter((c: string) => c !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, recentClicksColumns: newColumns });
  };
  
  const handleApply = () => {
    onConfigChange(localConfig);
    onClose();
  };
  
  const handleRestoreDefault = () => {
    setLocalConfig({
      metrics: ['clicks', 'unique_clicks_campaign', 'conversions', 'cost', 'revenue_confirmed', 'profit_confirmed', 'roi_confirmed'],
      entities: ['campaigns', 'landings', 'offers', 'sources'],
      recentClicksColumns: ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination']
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border-default rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-display font-semibold text-fg-default">Preferences</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
            <X size={20} className="text-fg-muted" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] bg-surface">
          {/* Metrics Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Metrics</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.metrics || []).map((key: string) => {
                const metric = ALL_METRICS.find(m => m.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent-muted text-accent-fg text-xs rounded-lg"
                  >
                    {metric?.label || key}
                    <button onClick={() => toggleMetric(key)} className="hover:opacity-70 transition-opacity">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 relative">
              <select
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(e) => { if (e.target.value) { toggleMetric(e.target.value); e.target.value = ''; }}}
                value=""
              >
                <option value="">Add metric...</option>
                {ALL_METRICS.filter(m => !(localConfig.metrics || []).includes(m.key)).map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Entities Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Top Blocks (Entities)</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.entities || []).map((key: string) => {
                const entity = ENTITY_CONFIGS[key as keyof typeof ENTITY_CONFIGS];
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container text-fg-default text-xs rounded-lg border border-border-default"
                  >
                    {entity?.label || key}
                    <button onClick={() => toggleEntity(key)} className="hover:text-fg-muted transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(e) => { if (e.target.value) { toggleEntity(e.target.value); e.target.value = ''; }}}
                value=""
              >
                <option value="">Add entity...</option>
                {/* 按分类分组显示 */}
                {(() => {
                  const categories = [...new Set(Object.values(ENTITY_CONFIGS).map(e => e.category))];
                  return categories.map(category => {
                    const entitiesInCategory = Object.entries(ENTITY_CONFIGS).filter(
                      ([key, config]) => config.category === category && !(localConfig.entities || []).includes(key)
                    );
                    if (entitiesInCategory.length === 0) return null;
                    return (
                      <optgroup key={category} label={category}>
                        {entitiesInCategory.map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </optgroup>
                    );
                  });
                })()}
              </select>
            </div>
          </div>

          {/* Recent Clicks Columns Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Recent Clicks Columns</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.recentClicksColumns || []).map((key: string) => {
                const col = RECENT_CLICKS_COLUMNS.find(c => c.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-low text-fg-default text-xs rounded-lg border border-border-default"
                  >
                    {col?.label || key}
                    <button onClick={() => toggleRecentClickColumn(key)} className="hover:text-fg-muted transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(e) => { if (e.target.value) { toggleRecentClickColumn(e.target.value); e.target.value = ''; }}}
                value=""
              >
                <option value="">Add column...</option>
                {/* 按分类分组显示 */}
                {(() => {
                  const categories = [...new Set(RECENT_CLICKS_COLUMNS.map(c => c.category))];
                  return categories.map(category => {
                    const colsInCategory = RECENT_CLICKS_COLUMNS.filter(
                      c => c.category === category && !(localConfig.recentClicksColumns || []).includes(c.key)
                    );
                    if (colsInCategory.length === 0) return null;
                    return (
                      <optgroup key={category} label={category}>
                        {colsInCategory.map(c => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </optgroup>
                    );
                  });
                })()}
              </select>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-default bg-surface-container">
          <button
            onClick={handleRestoreDefault}
            className="text-sm text-fg-muted hover:text-fg-default transition-colors"
          >
            Restore to default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-container-high transition-colors text-fg-default"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-fg-default text-canvas rounded-lg hover:opacity-85 transition-opacity"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const Dashboard = () => {
  // URL状态管理
  const { state, setState } = useDashboardURLState();
  const navigate = useNavigate();
  
  // 自动昼夜模式
  const { isDarkMode, currentTime } = useAutoDarkMode();
  
  // 本地状态
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [entityData, setEntityData] = useState<Record<string, any[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState({
    stats: false,
    recentClicks: false,
    entities: false
  });
  const [errors, setErrors] = useState({
    stats: '',
    recentClicks: '',
    entities: ''
  });
  
  // 应用暗色模式类
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);
  
  // Key映射表 - 兼容旧版本
  const keyMapping: Record<string, string> = {
    'campaign_unique_clicks': 'unique_clicks_campaign',
    'sale_revenue': 'revenue_confirmed'
  };
  
  // 清理metrics，转换旧key
  const cleanMetrics = (metrics: string[] | undefined): string[] => {
    if (!metrics || metrics.length === 0) {
      return ['clicks', 'unique_clicks_campaign', 'conversions', 'cost', 'revenue_confirmed', 'profit_confirmed', 'roi_confirmed'];
    }
    return metrics.map(m => keyMapping[m] || m).filter(m => ALL_METRICS.some(am => am.key === m));
  };
  
  // 配置状态
  const [config, setConfig] = useState({
    metrics: cleanMetrics(state.enabledMetrics),
    entities: state.enabledEntities || ['campaigns', 'landings', 'offers', 'sources'],
    recentClicksColumns: state.lastClicksColumns || ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination']
  });
  
  // 使用 useMemo 稳定依赖值，避免无限循环
  const metricsKey = useMemo(() => config.metrics.join(','), [config.metrics]);
  const entitiesKey = useMemo(() => config.entities.join(','), [config.entities]);
  const timeRangeKey = useMemo(() => state.range?.interval || 'today', [state.range?.interval]);
  
  // 刷新统计数据和实体数据 - 仅在配置或时间范围变化时
  const refreshStatsAndEntities = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(prev => ({ ...prev, stats: true, entities: true }));
    setErrors(prev => ({ ...prev, stats: '', entities: '' }));

    try {
      const statsData = await fetchDashboardStats(timeRangeKey);

      if (statsData) {
        setStats(statsData.metrics || []);
        setChartData(statsData.chartData || []);
      }

      const currentEntities = config.entities;
      const entityPromises = currentEntities.map(entityKey =>
        fetchEntityStats(entityKey, timeRangeKey)
      );

      const entityResults = await Promise.all(entityPromises);
      const newEntityData: Record<string, any[]> = {};

      currentEntities.forEach((entityKey, index) => {
        newEntityData[entityKey] = entityResults[index] || [];
      });

      setEntityData(newEntityData);

    } catch (error) {
      console.error('Error refreshing stats:', error);
      setErrors(prev => ({
        ...prev,
        stats: 'Failed to fetch stats',
        entities: 'Failed to fetch entity data'
      }));
    } finally {
      setLoading(prev => ({ ...prev, stats: false, entities: false }));
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }
  // 使用稳定的字符串依赖而非数组引用
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitiesKey, timeRangeKey]);

  // 单独刷新 Recent Clicks 数据
  const refreshRecentClicks = useCallback(async () => {
    setLoading(prev => ({ ...prev, recentClicks: true }));
    setErrors(prev => ({ ...prev, recentClicks: '' }));

    try {
      const clicksData = await fetchRecentClicks(10);
      setRecentClicks(clicksData || []);
    } catch (error) {
      console.error('Error refreshing recent clicks:', error);
      setErrors(prev => ({ ...prev, recentClicks: 'Failed to fetch recent clicks' }));
    } finally {
      setLoading(prev => ({ ...prev, recentClicks: false }));
    }
  }, []);

  // 初始加载 - 仅执行一次
  useEffect(() => {
    refreshStatsAndEntities();
    refreshRecentClicks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 配置或时间范围变化时刷新统计数据 - 使用稳定的依赖
  useEffect(() => {
    refreshStatsAndEntities();
    refreshRecentClicks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey, entitiesKey, timeRangeKey]);

  // Recent Clicks 定时刷新 - 唯一需要定时刷新的模块
  useEffect(() => {
    const recentClicksIntervalRef = setInterval(() => {
      refreshRecentClicks();
    }, 30000);

    return () => {
      clearInterval(recentClicksIntervalRef);
    };
  }, [refreshRecentClicks]);

  // 处理配置变化
  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    setState({
      enabledMetrics: newConfig.metrics,
      enabledEntities: newConfig.entities,
      lastClicksColumns: newConfig.recentClicksColumns
    });
  };
  
  // 处理时间范围切换
  const handleTimeRangeChange = (range: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => ({
      range: {
        ...prev.range,
        interval: range as any,
        from: today,
        to: today
      }
    }));
  };
  
  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // 获取指标样式 - 统一使用主色调渐变
  const getMetricStyle = (index: number) => {
    // 使用两种主色调渐变交替，保持视觉统一
    const styles = [
      { gradient: 'metric-gradient', accent: 'from-secondary-fixed-dim/20' },
      { gradient: 'metric-gradient-alt', accent: 'from-secondary/20' },
    ];
    return styles[index % styles.length];
  };
  
  return (
    <div className="min-h-screen bg-canvas-inset dark:bg-surface">
      {/* Preferences Modal */}
      <PreferencesModal 
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />
      
      {/* Header */}
      <div className="bg-surface-container-lowest dark:bg-surface-container px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-on-surface">Dashboard</h1>
              {/* 昼夜模式指示器 */}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors",
                isDarkMode 
                  ? "bg-primary/10 text-primary" 
                  : "bg-secondary/10 text-secondary"
              )}>
                {isDarkMode ? <Moon size={12} /> : <Sun size={12} />}
                {isDarkMode ? 'Night Mode' : 'Day Mode'}
              </div>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Real-time tracking overview • Last updated: {formatTime(lastUpdated)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Campaign 选择 */}
            <select className="px-3 py-2 border border-outline-variant/20 rounded-sm text-sm bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors">
              <option>Campaigns</option>
              <option>All Campaigns</option>
            </select>
            
            {/* 时间范围 - 使用新的日期选择器组件 */}
            <div className="w-[320px]">
              <QuickDateRangePicker
                value={state.range?.interval || 'today'}
                onChange={(preset, range) => {
                  if (range) {
                    setState(prev => ({
                      range: {
                        interval: preset as any,
                        from: range.startDate.split('T')[0],
                        to: range.endDate.split('T')[0]
                      }
                    }));
                  }
                }}
                showTime={false}
                maxRangeDays={365}
              />
            </div>
            
            {/* 刷新按钮 */}
            <button
              onClick={() => { refreshStatsAndEntities(); refreshRecentClicks(); }}
              disabled={isRefreshing}
              className={cn(
                "p-2 border border-outline-variant/20 rounded-sm hover:bg-surface-container transition-colors",
                isRefreshing && "animate-spin"
              )}
            >
              <RefreshCw size={18} className="text-on-surface-variant" />
            </button>
            
            {/* 设置按钮 */}
            <button 
              onClick={() => setShowPreferences(true)}
              className="p-2 border border-outline-variant/20 rounded-sm hover:bg-surface-container transition-colors"
            >
              <Settings size={18} className="text-on-surface-variant" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Metrics Cards - 统一主色调样式 */}
        {config.metrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {loading.stats ? (
              Array(config.metrics.length).fill(0).map((_, index) => {
                const style = getMetricStyle(index);
                return (
                  <motion.div 
                    key={index} 
                    className={cn("metric-card", style.gradient)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={cn("metric-card-accent", style.accent)} />
                    <p className="metric-label">Loading...</p>
                    <h3 className="metric-value">
                      <LoadingSpinner size={20} />
                    </h3>
                    <p className="metric-trend">--</p>
                  </motion.div>
                );
              })
            ) : errors.stats ? (
              <div className="col-span-full">
                <ErrorMessage message={errors.stats} />
              </div>
            ) : (
              stats.filter(Boolean).map((stat: any, index: number) => {
                const style = getMetricStyle(index);
                return (
                  <motion.div 
                    key={stat?.key || index} 
                    className={cn("metric-card", style.gradient)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* 装饰性渐变光晕 */}
                    <div className={cn("metric-card-accent", style.accent)} />
                    
                    <p className="metric-label">{stat?.label || 'Unknown'}</p>
                    <h3 className="metric-value">{stat?.value || '-'}</h3>
                    <p className={cn(
                      "metric-trend",
                      stat?.isPositive ? "metric-trend-up" : "metric-trend-down"
                    )}>
                      {stat?.isPositive ? '↑' : '↓'} {stat?.trend || ''}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
        
        {/* Chart - 玻璃拟态效果 */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title">Clicks & Conversions</h3>
            <div className="flex gap-4 text-sm flex-wrap">
              {config.metrics.slice(0, 7).map((metric, idx) => {
                const m = ALL_METRICS.find(am => am.key === metric);
                if (!m) return null;
                // Stitch 规范：亮色/暗色模式图表颜色
                const lightColors = [
                  '#041627', '#1a2b3c', '#006b5c', '#0d2137', 
                  '#38485a', '#005145', '#44ddc1'
                ];
                const darkColors = [
                  '#aec6ff', '#53dcbc', '#c0c1ff', '#ff7eb3', 
                  '#7dd3fc', '#fbbf24', '#a78bfa'
                ];
                const colors = isDarkMode ? darkColors : lightColors;
                return (
                  <div key={metric} className="flex items-center gap-1.5">
                    <span 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: colors[idx % colors.length] }}
                    />
                    <span className="text-on-surface-variant text-xs">{m.label}</span>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {config.metrics.slice(0, 7).map((metric, idx) => {
                    const lightColors = [
                      '#041627', '#1a2b3c', '#006b5c', '#0d2137', 
                      '#38485a', '#005145', '#44ddc1'
                    ];
                    const darkColors = [
                      '#aec6ff', '#53dcbc', '#c0c1ff', '#ff7eb3', 
                      '#7dd3fc', '#fbbf24', '#a78bfa'
                    ];
                    const colors = isDarkMode ? darkColors : lightColors;
                    return (
                      <linearGradient key={metric} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop 
                          offset="5%" 
                          stopColor={colors[idx]}
                          stopOpacity={0.2}
                        />
                        <stop 
                          offset="95%" 
                          stopColor={colors[idx]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={isDarkMode ? 'rgba(66, 71, 84, 0.3)' : 'rgba(196, 198, 205, 0.3)'} 
                />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDarkMode ? '#c2c6d6' : '#44474c' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDarkMode ? '#c2c6d6' : '#44474c' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? 'rgba(40, 42, 44, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: isDarkMode 
                      ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
                      : '0 8px 24px rgba(25, 28, 30, 0.06)',
                    backdropFilter: 'blur(12px)',
                    color: isDarkMode ? '#e2e2e5' : '#111111'
                  }}
                />
                {config.metrics.slice(0, 7).map((metric, idx) => {
                  const lightColors = [
                    '#041627', '#1a2b3c', '#006b5c', '#0d2137', 
                    '#38485a', '#005145', '#44ddc1'
                  ];
                  const darkColors = [
                    '#aec6ff', '#53dcbc', '#c0c1ff', '#ff7eb3', 
                    '#7dd3fc', '#fbbf24', '#a78bfa'
                  ];
                  const colors = isDarkMode ? darkColors : lightColors;
                  return (
                    <Area 
                      key={metric}
                      type="monotone" 
                      dataKey={metric} 
                      stroke={colors[idx]}
                      fill={`url(#color${idx})`}
                      strokeWidth={2}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Entity Tables - 新样式 */}
        {config.entities.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {config.entities.map(entityKey => {
              const entityConfig = ENTITY_CONFIGS[entityKey as keyof typeof ENTITY_CONFIGS];
              const data = entityData[entityKey] || [];
              
              // Skip if entity config not found
              if (!entityConfig) return null;
              
              return (
                <div key={entityKey} className="section-card overflow-hidden">
                  <div className="section-header">
                    <h3 className="font-display font-semibold text-on-surface">{entityConfig?.label || entityKey}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {entityConfig.columns.map(col => (
                            <th 
                              key={col.key} 
                              className={cn(
                                col.align === 'right' ? "text-right" : "text-left"
                              )}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, idx) => (
                          <tr key={idx}>
                            {entityConfig.columns.map(col => (
                              <td 
                                key={col.key}
                                className={cn(
                                  col.align === 'right' ? "text-right" : "text-left"
                                )}
                              >
                                {col.key === 'name' ? (
                                  <Link 
                                    to={`/${entityKey}/${row.id}`}
                                    className="font-semibold text-high-contrast hover:text-secondary transition-colors cursor-pointer link-primary"
                                  >
                                    {row[col.key]}
                                  </Link>
                                ) : (
                                  <span className="text-medium-contrast">{row[col.key]?.toLocaleString() || '-'}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Recent Clicks - 新样式 */}
        {config.recentClicksColumns.length > 0 && (
          <div className="section-card overflow-hidden">
            <div className="section-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-on-surface">Recent Clicks</h3>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span className="font-medium">Live</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading.recentClicks ? (
                <div className="p-8 flex items-center justify-center">
                  <LoadingSpinner size={40} />
                </div>
              ) : errors.recentClicks ? (
                <div className="p-4">
                  <ErrorMessage message={errors.recentClicks} />
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      {config.recentClicksColumns.map(key => {
                        const col = RECENT_CLICKS_COLUMNS.find(c => c.key === key);
                        return (
                          <th key={key} className="text-left">
                            {col?.label || key}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {recentClicks.length > 0 ? (
                      recentClicks.map((click, idx) => (
                        <tr key={idx}>
                          {config.recentClicksColumns.map(key => {
                            const value = click[key];
                            const col = RECENT_CLICKS_COLUMNS.find(c => c.key === key);

                            // 根据字段类型渲染不同样式
                            const renderCell = () => {
                              if (key === 'datetime') {
                                return <span className="text-medium-contrast">{value ? new Date(value).toLocaleString() : '-'}</span>;
                              }
                              if (key === 'destination' || key === 'referrer') {
                                return (
                                  <span className="text-high-contrast hover:text-secondary transition-colors truncate max-w-[150px] block cursor-pointer link-primary" title={value}>
                                    {value || '-'}
                                  </span>
                                );
                              }
                              if (key === 'user_agent') {
                                return (
                                  <span className="text-medium-contrast truncate max-w-[200px] block" title={value}>
                                    {value || '-'}
                                  </span>
                                );
                              }
                              // Yes/No 状态字段
                              if (['bot', 'proxy', 'unique_stream', 'unique_campaign'].includes(key)) {
                                const isYes = value === 'Yes';
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    isYes
                                      ? key === 'bot' ? 'bg-danger-fg/10 text-danger-fg' : 'bg-success-fg/10 text-success-fg'
                                      : 'bg-surface-container text-fg-muted'
                                  }`}>
                                    {value || 'No'}
                                  </span>
                                );
                              }
                              // 成本字段
                              if (key === 'cost') {
                                return <span className="text-medium-contrast font-medium">{value || '-'}</span>;
                              }
                              // 图标字段
                              if (key === 'os_icon' || key === 'browser_icon') {
                                return (
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-surface-container rounded">
                                    {value || '-'}
                                  </span>
                                );
                              }
                              // 默认渲染
                              return <span className="text-medium-contrast">{value || '-'}</span>;
                            };

                            return (
                              <td key={key} style={{ width: col?.width, minWidth: col?.width }}>
                                {renderCell()}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={config.recentClicksColumns.length} className="text-center py-8 text-fg-muted">
                          No recent clicks found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
