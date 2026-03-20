/**
 * File: ConversionsLog.tsx
 * Purpose: 转化日志页面，展示所有转化记录和完整的转化信息
 * Input/Output: 显示转化数据列表，支持搜索、筛选和详情展开
 * Logic: 展示转化事件的详细信息，包括收益、状态、访客信息等
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Eye,
  Hash,
  Cpu,
  Shield,
  Fingerprint,
  Navigation,
  Wallet,
  CreditCard,
  Calendar,
  User,
  Building2,
  Layers,
  Group
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';

// 完整的 Conversion 数据结构
interface Conversion {
  id: string;
  time: string;
  // Campaign Info
  campaignId: string;
  campaign: string;
  streamId: string;
  stream: string;
  landingId: string;
  offerId: string;
  offer: string;
  affiliateNetwork: string;
  source: string;
  // Financial Info
  payout: string;
  revenue: string;
  currency: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  type: 'Sale' | 'Lead' | 'Signup' | 'Deposit';
  // Visitor Info (from RawClick)
  clickId: string;
  ip: string;
  userAgent: string;
  country: string;
  region: string;
  city: string;
  language: string;
  // Device Info
  deviceType: string;
  deviceModel: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  // Network Info
  isp: string;
  operator: string;
  connectionType: string;
  isUsingProxy: boolean;
  isBot: boolean;
  // Traffic Info
  keyword: string;
  referrer: string;
  subId: string;
  subId2: string;
  subId3: string;
  subId4: string;
  subId5: string;
  visitorCode: string;
  creativeId: string;
  externalId: string;
  adCampaignId: string;
  // Postback Info
  postbackUrl: string;
  postbackStatus: string;
  postbackTime: string;
  transactionId: string;
}

const CONVERSIONS_DATA: Conversion[] = [
  {
    id: 'CVT-001',
    time: "2024-03-19 07:01:46",
    campaignId: 'CMP-001',
    campaign: "FB_US_Lookalike_V1",
    streamId: 'STR-001',
    stream: "Main Flow",
    landingId: 'LND-001',
    offerId: 'OFR-001',
    offer: "Weight Loss Pro",
    affiliateNetwork: "MaxBounty",
    source: "Facebook Ads",
    payout: "24.50",
    revenue: "45.00",
    currency: "USD",
    status: "Approved",
    type: "Sale",
    clickId: '54210',
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    country: "US",
    region: "California",
    city: "Los Angeles",
    language: "en-US",
    deviceType: "Mobile",
    deviceModel: "iPhone 15 Pro",
    browser: "Chrome",
    browserVersion: "122.0.0.0",
    os: "iOS",
    osVersion: "17.0",
    isp: "AT&T",
    operator: "AT&T Mobility",
    connectionType: "4G",
    isUsingProxy: false,
    isBot: false,
    keyword: "weight loss",
    referrer: "https://facebook.com/groups/xyz",
    subId: "sub_12345",
    subId2: "",
    subId3: "",
    subId4: "",
    subId5: "",
    visitorCode: "vst_abc123",
    creativeId: "crt_001",
    externalId: "ext_789",
    adCampaignId: "fb_campaign_001",
    postbackUrl: "https://tracker.com/postback?cid=54210&payout=24.50",
    postbackStatus: "Success",
    postbackTime: "2024-03-19 07:01:47",
    transactionId: "TXN_001"
  },
  {
    id: 'CVT-002',
    time: "2024-03-19 07:00:12",
    campaignId: 'CMP-002',
    campaign: "Google_Search_Brand",
    streamId: 'STR-002',
    stream: "Brand Traffic",
    landingId: 'LND-002',
    offerId: 'OFR-002',
    offer: "Brand Signup",
    affiliateNetwork: "ClickBank",
    source: "Google Ads",
    payout: "45.00",
    revenue: "89.00",
    currency: "USD",
    status: "Approved",
    type: "Lead",
    clickId: '54209',
    ip: "82.45.12.98",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    country: "UK",
    region: "England",
    city: "London",
    language: "en-GB",
    deviceType: "Desktop",
    deviceModel: "MacBook Pro",
    browser: "Safari",
    browserVersion: "17.0",
    os: "macOS",
    osVersion: "14.0",
    isp: "BT Group",
    operator: "",
    connectionType: "WiFi",
    isUsingProxy: false,
    isBot: false,
    keyword: "brand name",
    referrer: "https://google.com/search",
    subId: "sub_67890",
    subId2: "",
    subId3: "",
    subId4: "",
    subId5: "",
    visitorCode: "vst_def456",
    creativeId: "crt_002",
    externalId: "ext_012",
    adCampaignId: "gg_campaign_001",
    postbackUrl: "https://tracker.com/postback?cid=54209&payout=45.00",
    postbackStatus: "Success",
    postbackTime: "2024-03-19 07:00:13",
    transactionId: "TXN_002"
  },
  {
    id: 'CVT-003',
    time: "2024-03-19 06:58:33",
    campaignId: 'CMP-003',
    campaign: "TikTok_Global_UGC",
    streamId: 'STR-003',
    stream: "UGC Flow",
    landingId: 'LND-003',
    offerId: 'OFR-003',
    offer: "Viral Product",
    affiliateNetwork: "CPAlead",
    source: "TikTok Ads",
    payout: "12.00",
    revenue: "25.00",
    currency: "USD",
    status: "Pending",
    type: "Sale",
    clickId: '54208',
    ip: "103.22.45.11",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918B)",
    country: "BR",
    region: "Sao Paulo",
    city: "Sao Paulo",
    language: "pt-BR",
    deviceType: "Mobile",
    deviceModel: "Samsung Galaxy S23",
    browser: "TikTok",
    browserVersion: "30.0.0",
    os: "Android",
    osVersion: "14.0",
    isp: "Vivo",
    operator: "Vivo",
    connectionType: "5G",
    isUsingProxy: false,
    isBot: false,
    keyword: "",
    referrer: "https://tiktok.com/foryou",
    subId: "sub_11111",
    subId2: "",
    subId3: "",
    subId4: "",
    subId5: "",
    visitorCode: "vst_ghi789",
    creativeId: "crt_003",
    externalId: "ext_345",
    adCampaignId: "tt_campaign_001",
    postbackUrl: "https://tracker.com/postback?cid=54208&payout=12.00",
    postbackStatus: "Pending",
    postbackTime: "",
    transactionId: "TXN_003"
  },
  {
    id: 'CVT-004',
    time: "2024-03-19 06:52:11",
    campaignId: 'CMP-004',
    campaign: "Native_Taboola_US",
    streamId: 'STR-004',
    stream: "Native Flow",
    landingId: 'LND-004',
    offerId: 'OFR-004',
    offer: "Newsletter Signup",
    affiliateNetwork: "MaxBounty",
    source: "Taboola",
    payout: "8.50",
    revenue: "15.00",
    currency: "USD",
    status: "Rejected",
    type: "Lead",
    clickId: '54206',
    ip: "45.12.33.22",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    country: "US",
    region: "New York",
    city: "New York",
    language: "en-US",
    deviceType: "Desktop",
    deviceModel: "Dell XPS 15",
    browser: "Edge",
    browserVersion: "122.0.0.0",
    os: "Windows",
    osVersion: "11",
    isp: "Spectrum",
    operator: "",
    connectionType: "WiFi",
    isUsingProxy: true,
    isBot: true,
    keyword: "",
    referrer: "https://cnn.com/article",
    subId: "sub_33333",
    subId2: "",
    subId3: "",
    subId4: "",
    subId5: "",
    visitorCode: "vst_mno345",
    creativeId: "crt_005",
    externalId: "ext_901",
    adCampaignId: "tb_campaign_001",
    postbackUrl: "https://tracker.com/postback?cid=54206&payout=8.50",
    postbackStatus: "Failed",
    postbackTime: "2024-03-19 06:52:12",
    transactionId: "TXN_004"
  },
];

// Group By 选项
const GROUP_BY_OPTIONS = [
  {
    category: 'Campaign & Offer',
    options: [
      { value: 'campaign', label: 'Campaign' },
      { value: 'stream', label: 'Stream' },
      { value: 'offer', label: 'Offer' },
      { value: 'affiliate_network', label: 'Affiliate Network' },
      { value: 'source', label: 'Traffic Source' },
    ]
  },
  {
    category: 'Financial',
    options: [
      { value: 'status', label: 'Status' },
      { value: 'type', label: 'Conversion Type' },
      { value: 'currency', label: 'Currency' },
    ]
  },
  {
    category: 'Geo',
    options: [
      { value: 'country', label: 'Country' },
      { value: 'region', label: 'Region/State' },
      { value: 'city', label: 'City' },
      { value: 'isp', label: 'ISP' },
    ]
  },
  {
    category: 'Device & System',
    options: [
      { value: 'device_type', label: 'Device Type' },
      { value: 'os', label: 'Operating System' },
      { value: 'browser', label: 'Browser' },
    ]
  },
  {
    category: 'Time',
    options: [
      { value: 'hour', label: 'Hour' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
    ]
  }
];

export const ConversionsLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // 日期筛选 - 使用新的日期选择器
  const [dateRange, setDateRange] = useState<string>('last7days');
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(getDateRange('last7days'));
  
  // Group By 筛选
  const [groupBy1, setGroupBy1] = useState('');
  const [groupBy2, setGroupBy2] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 处理日期范围变更
  const handleDateRangeChange = (preset: string, range?: DateRangeValue) => {
    setDateRange(preset);
    if (range) {
      setDateRangeValue(range);
    }
  };

  const filteredConversions = CONVERSIONS_DATA.filter(conv => {
    const matchesSearch = conv.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.ip.includes(searchQuery) ||
                         conv.offer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = filteredConversions
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + parseFloat(c.revenue), 0);

  const totalPayout = filteredConversions
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + parseFloat(c.payout), 0);

  const totalConversions = filteredConversions.length;
  const approvedConversions = filteredConversions.filter(c => c.status === 'Approved').length;
  const pendingConversions = filteredConversions.filter(c => c.status === 'Pending').length;
  const rejectedConversions = filteredConversions.filter(c => c.status === 'Rejected').length;

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // 获取第二级 Group By 选项（排除已选的第一级）
  const getGroupBy2Options = () => {
    if (!groupBy1) return GROUP_BY_OPTIONS;
    return GROUP_BY_OPTIONS.map(category => ({
      ...category,
      options: category.options.filter(opt => opt.value !== groupBy1)
    })).filter(cat => cat.options.length > 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Conversions Log</h1>
          <p className="text-sm text-medium-contrast">Track all your conversion events, revenue, and postback status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => alert('Export functionality coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all rounded-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 text-secondary rounded-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Conversions</p>
              <p className="text-xl font-display font-bold text-primary">{totalConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Approved</p>
              <p className="text-xl font-display font-bold text-secondary">{approvedConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-sm">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Revenue</p>
              <p className="text-xl font-display font-bold text-primary">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-sm">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Payout</p>
              <p className="text-xl font-display font-bold text-secondary">${totalPayout.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-on-surface-variant">Approved: {approvedConversions}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-on-surface-variant">Pending: {pendingConversions}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-error"></span>
          <span className="text-on-surface-variant">Rejected: {rejectedConversions}</span>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10 space-y-4">
        {/* Row 1: Search, Date Range and Status */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search by ID, Campaign, Offer, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Date Range Selector - 使用新的日期选择器组件 */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-on-surface-variant" />
            <div className="w-[320px]">
              <QuickDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                showTime={true}
                maxRangeDays={90}
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container border border-outline-variant/30 text-xs font-bold uppercase tracking-widest focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${
              showFilters
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </button>
        </div>

        {/* Row 2: Group By Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-outline-variant/10 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Group By 1 */}
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group By 1:</span>
                <select
                  value={groupBy1}
                  onChange={(e) => {
                    setGroupBy1(e.target.value);
                    setGroupBy2(''); // Reset second group by when first changes
                  }}
                  className="px-3 py-2 bg-surface-container border border-outline-variant/30 text-xs focus:border-primary outline-none min-w-[150px]"
                >
                  <option value="">None</option>
                  {GROUP_BY_OPTIONS.map(category => (
                    <optgroup key={category.category} label={category.category}>
                      {category.options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Group By 2 */}
              <div className="flex items-center gap-2">
                <Group size={16} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group By 2:</span>
                <select
                  value={groupBy2}
                  onChange={(e) => setGroupBy2(e.target.value)}
                  disabled={!groupBy1}
                  className="px-3 py-2 bg-surface-container border border-outline-variant/30 text-xs focus:border-primary outline-none min-w-[150px] disabled:opacity-50"
                >
                  <option value="">None</option>
                  {getGroupBy2Options().map(category => (
                    <optgroup key={category.category} label={category.category}>
                      {category.options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(groupBy1 || groupBy2) && (
                <button
                  onClick={() => {
                    setGroupBy1('');
                    setGroupBy2('');
                  }}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-error hover:bg-error/10 transition-all"
                >
                  Clear Group By
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {(groupBy1 || groupBy2) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-on-surface-variant/60">Active Grouping:</span>
                {groupBy1 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-sm">
                    {GROUP_BY_OPTIONS.flatMap(c => c.options).find(o => o.value === groupBy1)?.label}
                  </span>
                )}
                {groupBy2 && (
                  <>
                    <span className="text-on-surface-variant">→</span>
                    <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-sm">
                      {GROUP_BY_OPTIONS.flatMap(c => c.options).find(o => o.value === groupBy2)?.label}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Showing {filteredConversions.length} conversions
          </span>
          <span className="text-[10px] text-on-surface-variant/40">
            Date Range: {dateRange === 'custom' ? 'Custom Range' : dateRange.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest"></th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Campaign</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Offer</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Payout</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Postback</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredConversions.map((conv) => (
                <React.Fragment key={conv.id}>
                  <tr className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(conv.id)}
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        {expandedRows.includes(conv.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                        <Clock size={12} />
                        {conv.time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-on-surface-variant">{conv.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-primary hover:underline cursor-pointer">{conv.campaign}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{conv.offer}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {conv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-secondary">${conv.payout}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                        conv.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                        conv.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-error/10 text-error"
                      )}>
                        {conv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                        conv.postbackStatus === 'Success' ? "bg-emerald-100 text-emerald-700" :
                        conv.postbackStatus === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-error/10 text-error"
                      )}>
                        {conv.postbackStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleRow(conv.id)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => alert(`More options for conversion ${conv.id}`)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Details */}
                  {expandedRows.includes(conv.id) && (
                    <tr className="bg-surface-container-low/50">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Financial Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Wallet size={12} /> Financial Info
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Payout:</span>
                                <span className="font-mono font-bold text-secondary">${conv.payout}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Revenue:</span>
                                <span className="font-mono font-bold text-primary">${conv.revenue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Currency:</span>
                                <span>{conv.currency}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Profit:</span>
                                <span className="font-mono font-bold text-emerald-600">
                                  ${(parseFloat(conv.revenue) - parseFloat(conv.payout)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Type:</span>
                                <span>{conv.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Status:</span>
                                <span className={conv.status === 'Approved' ? "text-emerald-600" : conv.status === 'Pending' ? "text-amber-600" : "text-error"}>
                                  {conv.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Campaign & Offer Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Hash size={12} /> Campaign & Offer
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Campaign ID:</span>
                                <span className="font-mono">{conv.campaignId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Campaign:</span>
                                <span>{conv.campaign}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Stream:</span>
                                <span>{conv.stream}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Offer ID:</span>
                                <span className="font-mono">{conv.offerId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Offer:</span>
                                <span>{conv.offer}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Network:</span>
                                <span>{conv.affiliateNetwork}</span>
                              </div>
                            </div>
                          </div>

                          {/* Device & Location */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Cpu size={12} /> Device & Location
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Device:</span>
                                <span>{conv.deviceType} - {conv.deviceModel}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Browser:</span>
                                <span>{conv.browser} {conv.browserVersion}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">OS:</span>
                                <span>{conv.os} {conv.osVersion}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Location:</span>
                                <span>{conv.country}, {conv.city}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">IP:</span>
                                <span className="font-mono">{conv.ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">ISP:</span>
                                <span>{conv.isp}</span>
                              </div>
                            </div>
                          </div>

                          {/* Postback Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <CreditCard size={12} /> Postback Info
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Click ID:</span>
                                <span className="font-mono">{conv.clickId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Transaction ID:</span>
                                <span className="font-mono">{conv.transactionId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Postback Status:</span>
                                <span className={conv.postbackStatus === 'Success' ? "text-emerald-600" : conv.postbackStatus === 'Pending' ? "text-amber-600" : "text-error"}>
                                  {conv.postbackStatus}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Postback Time:</span>
                                <span>{conv.postbackTime || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-on-surface-variant/60">Postback URL:</span>
                                <span className="font-mono text-[10px] truncate max-w-[200px]" title={conv.postbackUrl}>
                                  {conv.postbackUrl}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sub IDs & Traffic Info */}
                        <div className="mt-4 pt-4 border-t border-outline-variant/10">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                            <Fingerprint size={12} /> Sub IDs & Traffic Info
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-xs">
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 1:</span>
                              <span className="font-mono">{conv.subId || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 2:</span>
                              <span className="font-mono">{conv.subId2 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 3:</span>
                              <span className="font-mono">{conv.subId3 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 4:</span>
                              <span className="font-mono">{conv.subId4 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 5:</span>
                              <span className="font-mono">{conv.subId5 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Visitor Code:</span>
                              <span className="font-mono">{conv.visitorCode}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Creative ID:</span>
                              <span className="font-mono">{conv.creativeId}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">External ID:</span>
                              <span className="font-mono">{conv.externalId}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3">
                            <div>
                              <span className="text-on-surface-variant/60">Keyword:</span>
                              <span className="ml-2 font-mono">{conv.keyword || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60">Referrer:</span>
                              <span className="ml-2 font-mono truncate max-w-[300px] inline-block align-bottom" title={conv.referrer}>
                                {conv.referrer}
                              </span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60">Source:</span>
                              <span className="ml-2">{conv.source}</span>
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
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default ConversionsLog;
