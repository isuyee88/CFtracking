/**
 * File: ClicksLog.tsx
 * Purpose: 点击日志页面，展示所有点击记录
 * Input/Output: 显示点击数据列表，支持搜索、筛选
 * Logic: 展示点击流的详细信息
 */

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  RefreshCw,
  Download,
  MousePointer2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Wifi,
  Bot,
  Shield,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';

// ============================================
// 类型定义
// ============================================

interface ClickLog {
  id: string;
  time: string;
  campaign: string;
  ip: string;
  country: string;
  device: string;
  browser: string;
  source: string;
  sub1: string;
  status: 'Real' | 'Bot' | 'Filtered';
  type: 'Unique' | 'Non-unique';
  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  utmId?: string;
  // Hardware Fingerprint
  deviceFingerprint?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: number;
  cookieEnabled?: boolean;
  // Additional Device Info
  os?: string;
  isp?: string;
  connectionType?: string;
  city?: string;
  region?: string;
}

// ============================================
// 模拟数据
// ============================================

const CLICKS_DATA: ClickLog[] = [
  { 
    id: '1', time: '2024-01-15 14:32:18', campaign: 'Winter Sale 2024', ip: '192.168.1.105', country: 'US', device: 'Desktop', browser: 'Chrome 120', source: 'Facebook Ads', sub1: 'winter_sale_01', status: 'Real', type: 'Unique',
    utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'winter_sale_2024', utmTerm: 'discount', utmContent: 'ad_01',
    deviceFingerprint: 'fp_a1b2c3d4e5f6', screenResolution: '1920x1080', timezone: 'America/New_York', language: 'en-US',
    platform: 'Win32', hardwareConcurrency: 8, deviceMemory: 8, touchSupport: 0, cookieEnabled: true,
    os: 'Windows 11', isp: 'Comcast', connectionType: 'Cable', city: 'New York', region: 'NY'
  },
  { 
    id: '2', time: '2024-01-15 14:30:45', campaign: 'Winter Sale 2024', ip: '203.45.67.89', country: 'UK', device: 'Mobile', browser: 'Safari 17', source: 'Google Ads', sub1: 'winter_sale_02', status: 'Real', type: 'Unique',
    utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale_2024', utmTerm: 'sale', utmContent: 'ad_02',
    deviceFingerprint: 'fp_g7h8i9j0k1l2', screenResolution: '390x844', timezone: 'Europe/London', language: 'en-GB',
    platform: 'iPhone', hardwareConcurrency: 6, deviceMemory: 4, touchSupport: 1, cookieEnabled: true,
    os: 'iOS 17', isp: 'BT Group', connectionType: '4G', city: 'London', region: 'England'
  },
  { 
    id: '3', time: '2024-01-15 14:28:12', campaign: 'Spring Collection', ip: '154.23.45.67', country: 'CA', device: 'Tablet', browser: 'Firefox 121', source: 'Organic', sub1: 'spring_01', status: 'Real', type: 'Non-unique',
    utmSource: 'organic', utmMedium: 'search', utmCampaign: 'spring_collection', utmTerm: 'fashion',
    deviceFingerprint: 'fp_m3n4o5p6q7r8', screenResolution: '768x1024', timezone: 'America/Toronto', language: 'en-CA',
    platform: 'iPad', hardwareConcurrency: 4, deviceMemory: 4, touchSupport: 1, cookieEnabled: true,
    os: 'iPadOS 17', isp: 'Rogers', connectionType: 'WiFi', city: 'Toronto', region: 'ON'
  },
  { 
    id: '4', time: '2024-01-15 14:25:33', campaign: 'Winter Sale 2024', ip: '87.65.43.21', country: 'DE', device: 'Desktop', browser: 'Edge 120', source: 'Direct', sub1: 'winter_sale_03', status: 'Bot', type: 'Unique',
    utmSource: 'direct', utmMedium: 'none',
    deviceFingerprint: 'fp_s9t0u1v2w3x4', screenResolution: '1366x768', timezone: 'Europe/Berlin', language: 'de-DE',
    platform: 'Win32', hardwareConcurrency: 2, deviceMemory: 2, touchSupport: 0, cookieEnabled: false,
    os: 'Windows 10', isp: 'Deutsche Telekom', connectionType: 'DSL', city: 'Berlin', region: 'BE'
  },
  { 
    id: '5', time: '2024-01-15 14:22:08', campaign: 'Holiday Special', ip: '98.76.54.32', country: 'FR', device: 'Mobile', browser: 'Chrome 119', source: 'Email', sub1: 'holiday_01', status: 'Real', type: 'Unique',
    utmSource: 'email', utmMedium: 'email', utmCampaign: 'holiday_special', utmContent: 'newsletter_01',
    deviceFingerprint: 'fp_y5z6a7b8c9d0', screenResolution: '412x915', timezone: 'Europe/Paris', language: 'fr-FR',
    platform: 'Linux armv8l', hardwareConcurrency: 8, deviceMemory: 6, touchSupport: 1, cookieEnabled: true,
    os: 'Android 14', isp: 'Orange', connectionType: '5G', city: 'Paris', region: 'IDF'
  },
  { 
    id: '6', time: '2024-01-15 14:18:55', campaign: 'Spring Collection', ip: '112.34.56.78', country: 'AU', device: 'Desktop', browser: 'Safari 16', source: 'Bing Ads', sub1: 'spring_02', status: 'Filtered', type: 'Unique',
    utmSource: 'bing', utmMedium: 'cpc', utmCampaign: 'spring_collection', utmTerm: 'clothing',
    deviceFingerprint: 'fp_e1f2g3h4i5j6', screenResolution: '2560x1440', timezone: 'Australia/Sydney', language: 'en-AU',
    platform: 'MacIntel', hardwareConcurrency: 10, deviceMemory: 16, touchSupport: 0, cookieEnabled: true,
    os: 'macOS Sonoma', isp: 'Telstra', connectionType: 'Fiber', city: 'Sydney', region: 'NSW'
  },
  { 
    id: '7', time: '2024-01-15 14:15:42', campaign: 'Winter Sale 2024', ip: '223.45.67.89', country: 'JP', device: 'Mobile', browser: 'Chrome 120', source: 'TikTok', sub1: 'winter_sale_04', status: 'Real', type: 'Non-unique',
    utmSource: 'tiktok', utmMedium: 'social', utmCampaign: 'winter_sale_2024', utmContent: 'video_01',
    deviceFingerprint: 'fp_k7l8m9n0o1p2', screenResolution: '375x812', timezone: 'Asia/Tokyo', language: 'ja-JP',
    platform: 'iPhone', hardwareConcurrency: 6, deviceMemory: 4, touchSupport: 1, cookieEnabled: true,
    os: 'iOS 17', isp: 'NTT Docomo', connectionType: '5G', city: 'Tokyo', region: '13'
  },
  { 
    id: '8', time: '2024-01-15 14:12:19', campaign: 'Holiday Special', ip: '134.56.78.90', country: 'BR', device: 'Tablet', browser: 'Firefox 120', source: 'Native', sub1: 'holiday_02', status: 'Real', type: 'Unique',
    utmSource: 'native', utmMedium: 'display', utmCampaign: 'holiday_special', utmTerm: 'gifts',
    deviceFingerprint: 'fp_q3r4s5t6u7v8', screenResolution: '800x1280', timezone: 'America/Sao_Paulo', language: 'pt-BR',
    platform: 'Linux armv7l', hardwareConcurrency: 4, deviceMemory: 3, touchSupport: 1, cookieEnabled: true,
    os: 'Android 13', isp: 'Vivo', connectionType: '4G', city: 'Sao Paulo', region: 'SP'
  },
];

// ============================================
// 辅助函数
// ============================================

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// 主组件
// ============================================

// Group By 配置
const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'country', label: 'Country' },
  { value: 'device', label: 'Device' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
];

export const ClicksLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDateRange(7));
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Group By 状态
  const [groupBy, setGroupBy] = useState<string>('none');
  const [groupValue, setGroupValue] = useState<string>('all');

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // 获取 Group By 后的唯一值列表
  const getGroupValues = () => {
    if (groupBy === 'none') return [];
    const values = new Set(CLICKS_DATA.map(log => log[groupBy as keyof ClickLog] as string));
    return Array.from(values).sort();
  };

  // 当 Group By 改变时，重置 Group Value
  React.useEffect(() => {
    setGroupValue('all');
  }, [groupBy]);

  const filteredData = CLICKS_DATA.filter(log => {
    const matchesSearch = 
      log.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery) ||
      log.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesGroup = groupBy === 'none' || groupValue === 'all' || log[groupBy as keyof ClickLog] === groupValue;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-default">Clicks Log</h1>
          <p className="text-sm text-fg-muted mt-1">Real-time stream of all incoming traffic</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => alert('Export functionality coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 transition-all rounded"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-accent-fg rounded">
              <MousePointer2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Total Clicks</p>
              <p className="text-xl font-bold text-fg-default">12,847</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 text-success rounded">
              <Eye size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Unique Clicks</p>
              <p className="text-xl font-bold text-fg-default">8,234</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 text-warning rounded">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Countries</p>
              <p className="text-xl font-bold text-fg-default">42</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 text-info rounded">
              <Monitor size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Device Types</p>
              <p className="text-xl font-bold text-fg-default">5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg border border-border-default space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <QuickDateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search by campaign, IP, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border-default rounded text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t border-border-default flex-wrap">
          <Filter size={16} className="text-fg-muted" />
          <span className="text-sm text-fg-muted">Status:</span>
          {['all', 'real', 'bot', 'filtered'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-all",
                statusFilter === status
                  ? "bg-accent-fg text-white"
                  : "bg-surface-container text-fg-muted hover:bg-surface-container-hover"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
          
          <div className="w-px h-6 bg-border-default mx-2" />
          
          {/* Group By 一级筛选 */}
          <span className="text-sm text-fg-muted">Group By:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-1 text-xs font-medium rounded bg-surface-container text-fg-default border border-border-default focus:outline-none focus:border-accent-fg"
          >
            {GROUP_BY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          {/* Group By 二级筛选 - 联动显示 */}
          {groupBy !== 'none' && (
            <>
              <span className="text-sm text-fg-muted">Value:</span>
              <select
                value={groupValue}
                onChange={(e) => setGroupValue(e.target.value)}
                className="px-3 py-1 text-xs font-medium rounded bg-surface-container text-fg-default border border-border-default focus:outline-none focus:border-accent-fg"
              >
                <option value="all">All {GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}</option>
                {getGroupValues().map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container border-b border-border-default">
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Device</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Browser</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredData.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className="hover:bg-surface-container cursor-pointer transition-colors"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedRows.includes(log.id) ? (
                        <ChevronDown size={16} className="text-fg-muted" />
                      ) : (
                        <ChevronRight size={16} className="text-fg-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-default">{log.time}</td>
                    <td className="px-4 py-3 text-sm text-fg-default">{log.campaign}</td>
                    <td className="px-4 py-3 text-sm font-mono text-fg-default">{log.ip}</td>
                    <td className="px-4 py-3 text-sm text-fg-default">{log.country}</td>
                    <td className="px-4 py-3 text-sm text-fg-default">
                      <div className="flex items-center gap-1">
                        {log.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                        {log.device}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-default">{log.browser}</td>
                    <td className="px-4 py-3 text-sm text-fg-default">{log.source}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        log.status === 'Real' && "bg-success/10 text-success",
                        log.status === 'Bot' && "bg-danger/10 text-danger",
                        log.status === 'Filtered' && "bg-warning/10 text-warning"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        log.type === 'Unique' ? "bg-accent-fg/10 text-accent-fg" : "bg-fg-muted/10 text-fg-muted"
                      )}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                  {expandedRows.includes(log.id) && (
                    <tr className="bg-surface-container">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* UTM Parameters Section */}
                          {(log.utmSource || log.utmMedium || log.utmCampaign) && (
                            <div>
                              <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">UTM Parameters</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                                {log.utmSource && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Source</p>
                                    <p className="text-fg-default font-mono text-xs">{log.utmSource}</p>
                                  </div>
                                )}
                                {log.utmMedium && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Medium</p>
                                    <p className="text-fg-default font-mono text-xs">{log.utmMedium}</p>
                                  </div>
                                )}
                                {log.utmCampaign && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Campaign</p>
                                    <p className="text-fg-default font-mono text-xs truncate" title={log.utmCampaign}>{log.utmCampaign}</p>
                                  </div>
                                )}
                                {log.utmTerm && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Term</p>
                                    <p className="text-fg-default font-mono text-xs">{log.utmTerm}</p>
                                  </div>
                                )}
                                {log.utmContent && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Content</p>
                                    <p className="text-fg-default font-mono text-xs">{log.utmContent}</p>
                                  </div>
                                )}
                                {log.utmId && (
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">ID</p>
                                    <p className="text-fg-default font-mono text-xs">{log.utmId}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Hardware Fingerprint Section */}
                          <div>
                            <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Hardware Fingerprint</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                              {log.deviceFingerprint && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Fingerprint</p>
                                  <p className="text-fg-default font-mono text-xs truncate" title={log.deviceFingerprint}>{log.deviceFingerprint}</p>
                                </div>
                              )}
                              {log.screenResolution && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Screen</p>
                                  <p className="text-fg-default font-mono text-xs">{log.screenResolution}</p>
                                </div>
                              )}
                              {log.timezone && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Timezone</p>
                                  <p className="text-fg-default font-mono text-xs truncate" title={log.timezone}>{log.timezone}</p>
                                </div>
                              )}
                              {log.language && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Language</p>
                                  <p className="text-fg-default font-mono text-xs">{log.language}</p>
                                </div>
                              )}
                              {log.platform && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Platform</p>
                                  <p className="text-fg-default font-mono text-xs">{log.platform}</p>
                                </div>
                              )}
                              {log.hardwareConcurrency && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">CPU Cores</p>
                                  <p className="text-fg-default font-mono text-xs">{log.hardwareConcurrency}</p>
                                </div>
                              )}
                              {log.deviceMemory && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Memory (GB)</p>
                                  <p className="text-fg-default font-mono text-xs">{log.deviceMemory}</p>
                                </div>
                              )}
                              {log.touchSupport !== undefined && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Touch</p>
                                  <p className="text-fg-default font-mono text-xs">{log.touchSupport ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {log.cookieEnabled !== undefined && (
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-muted text-xs">Cookies</p>
                                  <p className="text-fg-default font-mono text-xs">{log.cookieEnabled ? 'Enabled' : 'Disabled'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Additional Device Info */}
                          <div>
                            <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Device Details</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {log.os && (
                                <div>
                                  <p className="text-fg-muted text-xs">OS</p>
                                  <p className="text-fg-default">{log.os}</p>
                                </div>
                              )}
                              {log.isp && (
                                <div>
                                  <p className="text-fg-muted text-xs">ISP</p>
                                  <p className="text-fg-default">{log.isp}</p>
                                </div>
                              )}
                              {log.connectionType && (
                                <div>
                                  <p className="text-fg-muted text-xs">Connection</p>
                                  <p className="text-fg-default">{log.connectionType}</p>
                                </div>
                              )}
                              {log.city && (
                                <div>
                                  <p className="text-fg-muted text-xs">Location</p>
                                  <p className="text-fg-default">{log.city}{log.region ? `, ${log.region}` : ''}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Sub IDs */}
                          <div className="pt-2 border-t border-border-default">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-1">Sub ID 1</p>
                                <p className="text-fg-default font-mono text-xs">{log.sub1 || '-'}</p>
                              </div>
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-1">Click ID</p>
                                <p className="text-fg-default font-mono text-xs">{log.id}</p>
                              </div>
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-1">IP Address</p>
                                <p className="text-fg-default font-mono text-xs">{log.ip}</p>
                              </div>
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-1">Source</p>
                                <p className="text-fg-default">{log.source}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <History size={48} className="mx-auto text-fg-muted mb-4" />
            <p className="text-fg-muted">No clicks found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClicksLog;
