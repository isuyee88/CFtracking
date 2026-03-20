/**
 * File: Dashboard.tsx
 * Purpose: Dashboard主页面，参考Keitaro实现完整的布局自定义功能
 * Input/Output: 显示实时统计数据、图表、最近点击流，支持完整自定义
 * Logic: 使用useDashboardURLState管理URL状态，支持Metrics/Entities/Columns/Recent Clicks配置
 * 样式优化：统一主色调、玻璃拟态效果、自动昼夜模式
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { fetchCampaigns, fetchOffers, fetchLandings, fetchTrafficSources } from '../services/api';

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

// Entities配置
const ENTITY_CONFIGS = {
  campaigns: {
    key: 'campaigns',
    label: 'Campaigns',
    icon: 'Target',
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
  landings: {
    key: 'landings',
    label: 'Landing Pages',
    icon: 'FileText',
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
    columns: [
      { key: 'name', label: 'Offer', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  },
  sources: {
    key: 'sources',
    label: 'Sources',
    icon: 'Globe',
    columns: [
      { key: 'name', label: 'Source', width: '200px' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'unique_clicks', label: 'UC (campaign)', align: 'right' },
      { key: 'conversions', label: 'Conv.', align: 'right' },
    ]
  }
};

// Recent Clicks列配置
const RECENT_CLICKS_COLUMNS = [
  { key: 'event_id', label: 'Event id', width: '120px' },
  { key: 'datetime', label: 'Date and time', width: '150px' },
  { key: 'campaign', label: 'Campaign', width: '180px' },
  { key: 'os_icon', label: 'OS Logo', width: '60px' },
  { key: 'browser_icon', label: 'Browser logo', width: '80px' },
  { key: 'ip', label: 'IP', width: '120px' },
  { key: 'destination', label: 'Destination', width: '200px' },
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

// 基于key生成固定随机数
const getFixedValue = (key: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash = hash & hash;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
};

// 生成统计数据
const generateStats = (enabledMetrics: string[], timeRange: string = 'today') => {
  return enabledMetrics.map(key => {
    const config = ALL_METRICS.find(m => m.key === key);
    if (!config) return null;
    
    const seed = key + timeRange;
    const baseValue = getFixedValue(seed, 10000, 100000);
    const trend = getFixedValue(seed + 'trend', -15, 15);
    
    let value: string;
    switch (config.format) {
      case 'currency':
        value = `$${baseValue.toFixed(2)}`;
        break;
      case 'percentage':
        value = `${baseValue.toFixed(2)}%`;
        break;
      default:
        value = Math.floor(baseValue).toLocaleString();
    }
    
    return {
      key,
      label: config.label,
      value,
      trend: `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`,
      isPositive: trend > 0,
      format: config.format
    };
  }).filter(Boolean);
};

// 生成图表数据
const generateChartData = (metrics: string[]) => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  return hours.map(hour => {
    const data: any = { name: hour };
    metrics.forEach(metric => {
      data[metric] = Math.floor(getFixedValue(hour + metric, 100, 4000));
    });
    return data;
  });
};

// 生成实体数据
const generateEntityData = (type: string, columns: string[]) => {
  const names: Record<string, string[]> = {
    campaigns: ['Google Ads Fitness App', 'Meta Ads Food Delivery', 'TikTok Gaming Promo', 'Native News Feed'],
    landings: ['Papa Johns Landing', 'Little Caesars Page', 'Fitness Pro LP', 'Food Delivery LP'],
    offers: ['Apple Fitness+', 'Google Fitness App', 'DoorDash Promo', 'UberEats Deal'],
    sources: ['GoogleAds', 'Facebook.com', 'TikTok.com', 'Taboola']
  };
  
  return names[type]?.map((name, idx) => {
    const row: any = { name, id: idx + 1 };
    columns.forEach(col => {
      if (col !== 'name' && col !== 'id') {
        row[col] = Math.floor(getFixedValue(name + col, 1000, 50000));
      }
    });
    return row;
  }) || [];
};

// 生成最近点击数据
const generateRecentClicks = (columns: string[]) => {
  const campaigns = ['Google Ads Fitness', 'Meta Ads Food', 'TikTok Gaming', 'Native News'];
  const osList = ['Windows', 'iOS', 'Android', 'MacOS'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  
  return Array.from({ length: 10 }, (_, i) => {
    const click: any = {
      id: `evt_${Date.now()}_${i}`,
    };
    
    if (columns.includes('event_id')) click.event_id = `evt_${10000 + i}`;
    if (columns.includes('datetime')) {
      click.datetime = new Date(Date.now() - i * 60000).toISOString();
    }
    if (columns.includes('campaign')) {
      click.campaign = campaigns[Math.floor(getFixedValue(`click${i}`, 0, 4))];
    }
    if (columns.includes('os_icon')) click.os_icon = osList[Math.floor(getFixedValue(`os${i}`, 0, 4))];
    if (columns.includes('browser_icon')) click.browser_icon = browsers[Math.floor(getFixedValue(`browser${i}`, 0, 4))];
    if (columns.includes('ip')) {
      click.ip = `192.168.${Math.floor(getFixedValue(`ip${i}`, 1, 255))}.${Math.floor(getFixedValue(`ip2${i}`, 1, 255))}`;
    }
    if (columns.includes('destination')) click.destination = 'https://example.com/offer';
    
    return click;
  });
};

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
      <div className="glass-card rounded-sm w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
          <h2 className="text-lg font-display font-semibold text-on-surface">Preferences</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-sm transition-colors">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Metrics Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-on-surface-variant mb-3 uppercase tracking-wider">Metrics</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.metrics || []).map((key: string) => {
                const metric = ALL_METRICS.find(m => m.key === key);
                return (
                  <span 
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-sm"
                  >
                    {metric?.label || key}
                    <button onClick={() => toggleMetric(key)} className="hover:text-primary/70 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 relative">
              <select 
                className="w-full p-2 border border-outline-variant/20 rounded-sm text-sm bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
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
            <h3 className="text-sm font-medium text-on-surface-variant mb-3 uppercase tracking-wider">Top Blocks (Entities)</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.entities || []).map((key: string) => {
                const entity = ENTITY_CONFIGS[key as keyof typeof ENTITY_CONFIGS];
                return (
                  <span 
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-sm"
                  >
                    {entity?.label || key}
                    <button onClick={() => toggleEntity(key)} className="hover:text-secondary/70 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select 
                className="w-full p-2 border border-outline-variant/20 rounded-sm text-sm bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
                onChange={(e) => { if (e.target.value) { toggleEntity(e.target.value); e.target.value = ''; }}}
                value=""
              >
                <option value="">Add entity...</option>
                {Object.keys(ENTITY_CONFIGS).filter(k => !(localConfig.entities || []).includes(k)).map(k => (
                  <option key={k} value={k}>{ENTITY_CONFIGS[k as keyof typeof ENTITY_CONFIGS].label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Recent Clicks Columns Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-on-surface-variant mb-3 uppercase tracking-wider">Recent Clicks Columns</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.recentClicksColumns || []).map((key: string) => {
                const col = RECENT_CLICKS_COLUMNS.find(c => c.key === key);
                return (
                  <span 
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-container/30 text-primary text-xs rounded-sm"
                  >
                    {col?.label || key}
                    <button onClick={() => toggleRecentClickColumn(key)} className="hover:text-primary/70 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select 
                className="w-full p-2 border border-outline-variant/20 rounded-sm text-sm bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
                onChange={(e) => { if (e.target.value) { toggleRecentClickColumn(e.target.value); e.target.value = ''; }}}
                value=""
              >
                <option value="">Add column...</option>
                {RECENT_CLICKS_COLUMNS.filter(c => !(localConfig.recentClicksColumns || []).includes(c.key)).map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant/10 bg-surface-container">
          <button 
            onClick={handleRestoreDefault}
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Restore to default
          </button>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm border border-outline-variant/20 rounded-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-primary text-on-primary rounded-sm hover:bg-primary-container transition-colors"
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
  
  // 自动刷新定时器
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 刷新数据函数 - 使用 ref 避免依赖循环
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setRecentClicks(generateRecentClicks(config.recentClicksColumns));
    setLastUpdated(new Date());
    
    setIsRefreshing(false);
  }, []);
  
  // 处理统计数据更新
  useEffect(() => {
    const metrics = config.metrics;
    setStats(generateStats(metrics, state.range?.interval || 'today'));
    setChartData(generateChartData(metrics.slice(0, 7)));
    
    // 从真实API获取实体数据
    const fetchEntityData = async () => {
      const entities: Record<string, any[]> = {};
      
      for (const entityKey of config.entities) {
        try {
          let data: any[] = [];
          
          switch (entityKey) {
            case 'campaigns':
              const campaigns = await fetchCampaigns();
              data = campaigns.map((c: any) => ({
                id: c.id,
                name: c.name,
                clicks: c.clicks || 0,
                unique_clicks: c.uniqueClicks || 0,
                conversions: c.conversions || 0,
                cost: c.cost || 0,
                revenue: c.revenue || 0,
                profit: c.profit || 0,
                roi: c.roi || 0
              }));
              break;
            case 'offers':
              const offers = await fetchOffers();
              data = offers.map((o: any) => ({
                id: o.id,
                name: o.name,
                clicks: o.clicks || 0,
                unique_clicks: o.uniqueClicks || 0,
                conversions: o.conversions || 0
              }));
              break;
            case 'landings':
              const landings = await fetchLandings();
              data = landings.map((l: any) => ({
                id: l.id,
                name: l.name,
                clicks: l.clicks || 0,
                unique_clicks: l.uniqueClicks || 0,
                conversions: l.conversions || 0
              }));
              break;
            case 'sources':
              const sources = await fetchTrafficSources();
              data = sources.map((s: any) => ({
                id: s.id,
                name: s.name,
                clicks: s.clicks || 0,
                unique_clicks: s.uniqueClicks || 0,
                conversions: s.conversions || 0
              }));
              break;
          }
          
          entities[entityKey] = data;
        } catch (error) {
          console.error(`Failed to fetch ${entityKey}:`, error);
          entities[entityKey] = [];
        }
      }
      
      setEntityData(entities);
    };
    
    fetchEntityData();
    setRecentClicks(generateRecentClicks(config.recentClicksColumns));
  }, [config, state.range?.interval]);
  
  // 初始加载和自动刷新
  useEffect(() => {
    refreshData();
    
    refreshIntervalRef.current = setInterval(() => {
      refreshData();
    }, 30000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshData]);
  
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
    <div className="min-h-screen bg-gray-50">
      {/* Preferences Modal */}
      <PreferencesModal 
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />
      
      {/* Header */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/10 px-6 py-4">
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
              onClick={refreshData}
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
            {stats.filter(Boolean).map((stat: any, index: number) => {
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
            })}
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
                // 统一使用主色调和辅助色的变体
                const colors = [
                  '#041627', '#1a2b3c', '#006b5c', '#0d2137', 
                  '#38485a', '#005145', '#44ddc1'
                ];
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
                  {config.metrics.slice(0, 7).map((metric, idx) => (
                    <linearGradient key={metric} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={['#041627', '#1a2b3c', '#006b5c', '#0d2137', '#38485a', '#005145', '#44ddc1'][idx]}
                        stopOpacity={0.2}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={['#041627', '#1a2b3c', '#006b5c', '#0d2137', '#38485a', '#005145', '#44ddc1'][idx]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(196, 198, 205, 0.3)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#44474c' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#44474c' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(196, 198, 205, 0.3)',
                    borderRadius: '4px',
                    boxShadow: '0 8px 24px rgba(25, 28, 30, 0.06)'
                  }}
                />
                {config.metrics.slice(0, 7).map((metric, idx) => (
                  <Area 
                    key={metric}
                    type="monotone" 
                    dataKey={metric} 
                    stroke={['#041627', '#1a2b3c', '#006b5c', '#0d2137', '#38485a', '#005145', '#44ddc1'][idx]}
                    fill={`url(#color${idx})`}
                    strokeWidth={2}
                  />
                ))}
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
                  {recentClicks.map((click, idx) => (
                    <tr key={idx}>
                      {config.recentClicksColumns.map(key => (
                        <td key={key}>
                          {key === 'datetime' ? (
                            <span className="text-medium-contrast">{new Date(click[key]).toLocaleString()}</span>
                          ) : key === 'destination' ? (
                            <span className="text-high-contrast hover:text-secondary transition-colors truncate max-w-[150px] block cursor-pointer link-primary">{click[key]}</span>
                          ) : (
                            <span className="text-medium-contrast">{click[key] || '-'}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
