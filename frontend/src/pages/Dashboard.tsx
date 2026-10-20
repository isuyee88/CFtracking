/**
 * File: Dashboard.tsx
 * Purpose: Dashboard涓婚〉闈紝鍙傝€僈eitaro瀹炵幇瀹屾暣鐨勫竷灞€鑷畾涔夊姛鑳?
 * Input/Output: 鏄剧ず瀹炴椂缁熻鏁版嵁銆佸浘琛ㄣ€佹渶杩戠偣鍑绘祦锛屾敮鎸佸畬鏁磋嚜瀹氫箟
 * Logic: 浣跨敤useDashboardURLState绠＄悊URL鐘舵€侊紝鏀寔Metrics/Entities/Columns/Recent Clicks閰嶇疆
 * 鏍峰紡浼樺寲锛氱粺涓€涓昏壊璋冦€佺幓鐠冩嫙鎬佹晥鏋溿€佽嚜鍔ㄦ樇澶滄ā寮?
 */

import React, { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
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
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import {
  ChartWrapper,
  LazyAreaChart, LazyArea, LazyXAxis, LazyYAxis, LazyCartesianGrid, LazyTooltip, LazyResponsiveContainer
} from '../components/ChartWrapper';
import { useDashboardURLState } from '../hooks/useURLState';
import { useTableScroll } from '../hooks/useTableScroll';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { DataSourceBadge, DataSourceWarning } from '../components/DataSourceBadge';
import { useDataCache } from '../context/DataCacheContext';
const QuickDateRangePicker = lazy(() => import('@/components/DateRangePicker').then(m => ({ default: m.QuickDateRangePicker })));
type DateRangeValue = { interval: string; from?: string; to?: string };
import { fetchCampaigns, fetchOffers, fetchLandings, fetchTrafficSources, fetchDashboardStats, fetchRecentClicks, fetchEntityStats } from '../services/api';
import { BrowserIcon, OSIcon } from '../components/BrandIcon';
import { useTheme } from '../context/ThemeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== 閰嶇疆瀹氫箟 ====================

// 鍥捐〃瀛楁鏄犲皠 - 灏唌etrics key鏄犲皠鍒癆PI杩斿洖鐨勫瓧娈靛悕绉?
const CHART_DATA_KEY_MAPPING: Record<string, string> = {
  'clicks': 'clicks',
  'unique_clicks_campaign': 'uniqueVisitors',
  'unique_clicks_flow': 'uniqueVisitors',
  'unique_clicks_global': 'uniqueVisitors',
  'conversions': 'conversions',
  'cost': 'cost',
  'revenue_confirmed': 'revenue',
  'revenue_pending': 'revenue',
  'profit_confirmed': 'profit',
  'profit_pending': 'profit',
  'roi_confirmed': 'roi',
  'roi_pending': 'roi',
  'epc': 'epc',
  'cr': 'cr',
};

// 鎵€鏈夊彲鐢ㄧ殑Metrics
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
  // 鍏煎鏃х増鏈殑key鏄犲皠
  { key: 'campaign_unique_clicks', label: 'UC (campaign)', format: 'number', category: 'basic' },
  { key: 'sale_revenue', label: 'Revenue', format: 'currency', category: 'financial' },
];

// Entities閰嶇疆 - 鎵╁睍涓哄畬鏁寸殑Top Blocks
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

// Recent Clicks鍒楅厤缃?- 鍩轰簬RawClick鏁版嵁妯″瀷
const RECENT_CLICKS_COLUMNS = [
  // 鍩虹淇℃伅 (Basic)
  { key: 'event_id', label: 'Event ID', width: '120px', category: 'Basic' },
  { key: 'datetime', label: 'Date and Time', width: '150px', category: 'Basic' },
  { key: 'visitor_code', label: 'Visitor Code', width: '120px', category: 'Basic' },

  // Campaign & Traffic
  { key: 'campaign', label: 'Campaign', width: '180px', category: 'Campaign' },
  { key: 'stream', label: 'Stream', width: '120px', category: 'Campaign' },
  { key: 'landing', label: 'Landing Page', width: '150px', category: 'Campaign' },
  { key: 'offer', label: 'Offer', width: '150px', category: 'Campaign' },
  { key: 'source', label: 'Traffic Source', width: '150px', category: 'Campaign' },

  // Geo 淇℃伅
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

// 杈呭姪鍑芥暟锛氫负 Recent Clicks 鍒楃敓鎴?sorter 鍑芥暟
function getRecentClicksSorter(key: string) {
  switch(key) {
    case 'event_id': return (a: any, b: any) => a.event_id.localeCompare(b.event_id);
    case 'datetime': return (a: any, b: any) => new Date(a.datetime || 0).getTime() - new Date(b.datetime || 0).getTime();
    case 'visitor_code': return (a: any, b: any) => a.visitor_code.localeCompare(b.visitor_code);
    case 'campaign': return (a: any, b: any) => a.campaign.localeCompare(b.campaign);
    case 'stream': return (a: any, b: any) => a.stream.localeCompare(b.stream);
    case 'landing': return (a: any, b: any) => a.landing.localeCompare(b.landing);
    case 'offer': return (a: any, b: any) => a.offer.localeCompare(b.offer);
    case 'source': return (a: any, b: any) => a.source.localeCompare(b.source);
    case 'country': return (a: any, b: any) => a.country.localeCompare(b.country);
    case 'region': return (a: any, b: any) => a.region.localeCompare(b.region);
    case 'city': return (a: any, b: any) => a.city.localeCompare(b.city);
    case 'language': return (a: any, b: any) => a.language.localeCompare(b.language);
    case 'isp': return (a: any, b: any) => a.isp.localeCompare(b.isp);
    case 'operator': return (a: any, b: any) => a.operator.localeCompare(b.operator);
    case 'device_type': return (a: any, b: any) => a.device_type.localeCompare(b.device_type);
    case 'device_model': return (a: any, b: any) => a.device_model.localeCompare(b.device_model);
    case 'os': return (a: any, b: any) => a.os.localeCompare(b.os);
    case 'os_version': return (a: any, b: any) => a.os_version.localeCompare(b.os_version);
    case 'browser': return (a: any, b: any) => a.browser.localeCompare(b.browser);
    case 'browser_version': return (a: any, b: any) => a.browser_version.localeCompare(b.browser_version);
    case 'ip': return (a: any, b: any) => a.ip.localeCompare(b.ip);
    case 'connection_type': return (a: any, b: any) => a.connection_type.localeCompare(b.connection_type);
    case 'proxy': return (a: any, b: any) => a.proxy.localeCompare(b.proxy);
    case 'creative_id': return (a: any, b: any) => a.creative_id.localeCompare(b.creative_id);
    case 'external_id': return (a: any, b: any) => a.external_id.localeCompare(b.external_id);
    case 'ad_campaign_id': return (a: any, b: any) => a.ad_campaign_id.localeCompare(b.ad_campaign_id);
    case 'sub_id': return (a: any, b: any) => a.sub_id.localeCompare(b.sub_id);
    case 'sub1': return (a: any, b: any) => (a.sub1 || '').localeCompare(b.sub1 || '');
    case 'sub2': return (a: any, b: any) => (a.sub2 || '').localeCompare(b.sub2 || '');
    case 'sub3': return (a: any, b: any) => (a.sub3 || '').localeCompare(b.sub3 || '');
    case 'sub4': return (a: any, b: any) => (a.sub4 || '').localeCompare(b.sub4 || '');
    case 'sub5': return (a: any, b: any) => (a.sub5 || '').localeCompare(b.sub5 || '');
    case 'referrer': return (a: any, b: any) => (a.referrer || '').localeCompare(b.referrer || '');
    case 'referrer_domain': return (a: any, b: any) => (a.referrer_domain || '').localeCompare(b.referrer_domain || '');
    case 'search_engine': return (a: any, b: any) => (a.search_engine || '').localeCompare(b.search_engine || '');
    case 'keyword': return (a: any, b: any) => (a.keyword || '').localeCompare(b.keyword || '');
    case 'destination': return (a: any, b: any) => (a.destination || '').localeCompare(b.destination || '');
    case 'cost': return (a: any, b: any) => parseFloat(a.cost || 0) - parseFloat(b.cost || 0);
    case 'bot': return (a: any, b: any) => a.bot.localeCompare(b.bot);
    case 'unique_stream': return (a: any, b: any) => a.unique_stream.localeCompare(b.unique_stream);
    case 'unique_campaign': return (a: any, b: any) => a.unique_campaign.localeCompare(b.unique_campaign);
    case 'user_agent': return (a: any, b: any) => (a.user_agent || '').localeCompare(b.user_agent || '');
    default: return null;
  }
}

// 鏃堕棿鑼冨洿閫夐」 - 浣跨敤鏂扮殑鏃ユ湡閫夋嫨鍣ㄧ粍浠?
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

// ==================== 鏁版嵁鐢熸垚鍑芥暟 ====================

// 鍔犺浇鐘舵€佺粍浠?
const LoadingSpinner = ({ size = 24 }: { size?: number }) => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-{size} w-{size} border-t-2 border-b-2 border-primary"></div>
  </div>
);

// 閿欒鎻愮ず缁勪欢
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">
    {message}
  </div>
);

// ==================== 缁勪欢 ====================

// Preferences寮圭獥缁勪欢
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
                {/* 鎸夊垎绫诲垎缁勬樉绀?*/}
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
                {/* 鎸夊垎绫诲垎缁勬樉绀?*/}
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

// ==================== 涓荤粍浠?====================

export const Dashboard = () => {
  // URL鐘舵€佺鐞?
  const { state, setState } = useDashboardURLState();
  const navigate = useNavigate();

  // SSR鏁版嵁缂撳瓨
  const { cache: ssrCache, isHydrated } = useDataCache();

  // 鍏ㄥ眬涓婚锛坙ight / dark / system锛?
  const { isDark: isDarkMode } = useTheme();

  // 鏈湴鐘舵€?
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [entityData, setEntityData] = useState<Record<string, any[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [dataSource, setDataSource] = useState<'AE' | 'D1' | 'MIXED'>('AE');
  const [queryTime, setQueryTime] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    stats: true,
    recentClicks: true,
    entities: true
  });
  const [errors, setErrors] = useState({
    stats: '',
    recentClicks: '',
    entities: ''
  });

  // Key鏄犲皠琛?- 鍏煎鏃х増鏈?
  const keyMapping: Record<string, string> = {
    'campaign_unique_clicks': 'unique_clicks_campaign',
    'sale_revenue': 'revenue_confirmed'
  };

  // 娓呯悊metrics锛岃浆鎹㈡棫key
  const cleanMetrics = (metrics: string[] | undefined): string[] => {
    if (!metrics || metrics.length === 0) {
      return ['clicks', 'unique_clicks_campaign', 'conversions', 'cost', 'revenue_confirmed', 'profit_confirmed', 'roi_confirmed'];
    }
    return metrics.map(m => keyMapping[m] || m).filter(m => ALL_METRICS.some(am => am.key === m));
  };

  // 閰嶇疆鐘舵€?
  const [config, setConfig] = useState({
    metrics: cleanMetrics(state.enabledMetrics),
    entities: state.enabledEntities || ['campaigns', 'landings', 'offers', 'sources'],
    recentClicksColumns: state.lastClicksColumns || ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination']
  });

  // 浣跨敤 useMemo 绋冲畾渚濊禆鍊硷紝閬垮厤鏃犻檺寰幆
  const metricsKey = useMemo(() => config.metrics.join(','), [config.metrics]);
  const entitiesKey = useMemo(() => config.entities.join(','), [config.entities]);
  const timeRangeKey = useMemo(() => state.range?.interval || 'today', [state.range?.interval]);

  // 鍒锋柊缁熻鏁版嵁鍜屽疄浣撴暟鎹?- 浠呭湪閰嶇疆鎴栨椂闂磋寖鍥村彉鍖栨椂
  const refreshStatsAndEntities = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(prev => ({ ...prev, stats: true, entities: true }));
    setErrors(prev => ({ ...prev, stats: '', entities: '' }));

    try {
      const statsData = await fetchDashboardStats(timeRangeKey);

      if (statsData) {
        setStats(statsData.metrics || []);
        // 杞崲chartData涓殑瀛楃涓插€间负鏁板瓧
        const processedChartData = (statsData.chartData || []).map((item: any) => ({
          ...item,
          clicks: parseInt(item.clicks) || 0,
          uniqueVisitors: parseInt(item.uniqueVisitors) || 0,
          conversions: parseInt(item.conversions) || 0,
          cost: parseFloat(item.cost) || 0,
          revenue: parseFloat(item.revenue) || 0,
          profit: parseFloat(item.profit) || 0,
          roi: parseFloat(item.roi) || 0,
        }));
        setChartData(processedChartData);
        // 鏇存柊鏁版嵁婧愪俊鎭?
        setDataSource(statsData.dataSource || 'AE');
        setQueryTime(statsData.queryTime || new Date().toISOString());
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
  // 浣跨敤绋冲畾鐨勫瓧绗︿覆渚濊禆鑰岄潪鏁扮粍寮曠敤
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitiesKey, timeRangeKey]);

  // 鍗曠嫭鍒锋柊 Recent Clicks 鏁版嵁
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

  // 鍒濆鍔犺浇鏍囪 - 閬垮厤閲嶅璇锋眰
  const isInitialMount = useRef(true);

  // 鏁版嵁鍔犺浇 - 缁熶竴绠＄悊锛岄伩鍏嶉噸澶嶈姹?
  useEffect(() => {
    // 棣栨鍔犺浇鏃舵墽琛?
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // 浼樺厛浣跨敤SSR棰勫姞杞芥暟鎹?
      if (ssrCache.dashboard && isHydrated) {
        console.log('[Dashboard] Using SSR preloaded data');
        const dashboardData = ssrCache.dashboard;

        // 绔嬪嵆浣跨敤SSR鏁版嵁
        if (dashboardData.metrics) {
          setStats(dashboardData.metrics);
        }
        if (dashboardData.chartData) {
          const processedChartData = dashboardData.chartData.map((item: any) => ({
            ...item,
            clicks: parseInt(item.clicks) || 0,
            uniqueVisitors: parseInt(item.uniqueVisitors) || 0,
            conversions: parseInt(item.conversions) || 0,
            cost: parseFloat(item.cost) || 0,
            revenue: parseFloat(item.revenue) || 0,
            profit: parseFloat(item.profit) || 0,
            roi: parseFloat(item.roi) || 0,
          }));
          setChartData(processedChartData);
        }
        if (dashboardData.dataSource) {
          setDataSource(dashboardData.dataSource);
        }
        if (dashboardData.queryTime) {
          setQueryTime(dashboardData.queryTime);
        }

        // 璁剧疆loading涓篺alse锛岀珛鍗虫樉绀烘暟鎹?
        setLoading(prev => ({ ...prev, stats: false }));

        // 浠呭埛鏂癛ecent Clicks鍜孍ntity鏁版嵁
        refreshRecentClicks();

        // 濡傛灉鏈夊疄浣撴暟鎹紝涔熶娇鐢⊿SR鏁版嵁
        if (ssrCache.campaigns || ssrCache.landings || ssrCache.offers || ssrCache.trafficSources) {
          const newEntityData: Record<string, any[]> = {};
          if (ssrCache.campaigns) newEntityData.campaigns = ssrCache.campaigns;
          if (ssrCache.landings) newEntityData.landings = ssrCache.landings;
          if (ssrCache.offers) newEntityData.offers = ssrCache.offers;
          if (ssrCache.trafficSources) newEntityData.sources = ssrCache.trafficSources;
          setEntityData(newEntityData);
          setLoading(prev => ({ ...prev, entities: false }));
        } else {
          // 娌℃湁瀹炰綋鏁版嵁锛屾墠鍙戣捣璇锋眰
          refreshStatsAndEntities();
        }
      } else {
        // 娌℃湁SSR鏁版嵁锛屾甯稿姞杞?
        console.log('[Dashboard] No SSR data, fetching from API');
        refreshStatsAndEntities();
        refreshRecentClicks();
      }
      return;
    }

    // 閰嶇疆鎴栨椂闂磋寖鍥村彉鍖栨椂鍒锋柊 - 浠呭埛鏂扮粺璁℃暟鎹?
    // Recent Clicks 鏈夌嫭绔嬬殑瀹氭椂鍒锋柊鏈哄埗
    refreshStatsAndEntities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey, entitiesKey, timeRangeKey, isHydrated]);

  // Recent Clicks 鎵嬪姩鍒锋柊鍔熻兘 - 绉婚櫎鑷姩鍒锋柊锛岀敱鐢ㄦ埛鎵嬪姩鎺у埗
  const refreshRecentClicksRef = useRef<() => Promise<void>>(refreshRecentClicks);
  refreshRecentClicksRef.current = refreshRecentClicks;

  // 澶勭悊閰嶇疆鍙樺寲
  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    setState({
      enabledMetrics: newConfig.metrics,
      enabledEntities: newConfig.entities,
      lastClicksColumns: newConfig.recentClicksColumns
    });
  };

  // 澶勭悊鏃堕棿鑼冨洿鍒囨崲
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

  // 鏍煎紡鍖栨椂闂?
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 鑾峰彇鎸囨爣鏍峰紡 - 缁熶竴浣跨敤涓昏壊璋冩笎鍙?
  const getMetricStyle = (index: number) => {
    // 浣跨敤涓ょ涓昏壊璋冩笎鍙樹氦鏇匡紝淇濇寔瑙嗚缁熶竴
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-on-surface">Dashboard</h1>
              {/* 鏄煎妯″紡鎸囩ず鍣?*/}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors",
                isDarkMode
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/10 text-secondary"
              )}>
                {isDarkMode ? <Moon size={12} /> : <Sun size={12} />}
                {isDarkMode ? 'Night Mode' : 'Day Mode'}
              </div>
              {/* 鏁版嵁婧愭寚绀哄櫒 */}
              <DataSourceBadge dataSource={dataSource} size="sm" showLabel={false} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant mt-1">
              <span className="whitespace-nowrap">Real-time tracking overview</span>
              {queryTime && (
                <span className="text-xs text-on-surface-variant/70">
                  鏌ヨ鏃堕棿: {new Date(queryTime).toLocaleTimeString()}
                </span>
              )}
            </div>
            <DataSourceWarning dataSource={dataSource} className="mt-1" />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {/* Campaign 閫夋嫨 */}
            <select className="w-full px-3 py-2 border border-outline-variant/20 rounded-sm text-sm bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors sm:w-auto sm:flex-none">
              <option>Campaigns</option>
              <option>All Campaigns</option>
            </select>

            {/* 鏃堕棿鑼冨洿 - 浣跨敤鏂扮殑鏃ユ湡閫夋嫨鍣ㄧ粍浠?*/}
            <div className="w-full sm:w-[320px] sm:flex-none">
              <Suspense fallback={<div className="h-10 w-full bg-surface-container rounded animate-pulse" />}>
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
              </Suspense>
            </div>

            {/* 鍒锋柊鎸夐挳 */}
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

            {/* 璁剧疆鎸夐挳 */}
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
        {/* Metrics Cards - 缁熶竴涓昏壊璋冩牱寮?*/}
        {config.metrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {loading.stats ? (
              Array(config.metrics.length).fill(0).map((_, index) => {
                const style = getMetricStyle(index);
                return (
                  <div
                    key={index}
                    className={cn("metric-card metric-card-hover", style.gradient)}
                  >
                    <div className={cn("metric-card-accent", style.accent)} />
                    <p className="metric-label">Loading...</p>
                    <h3 className="metric-value">
                      <LoadingSpinner size={20} />
                    </h3>
                    <p className="metric-trend">--</p>
                  </div>
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
                  <div
                    key={stat?.key || index}
                    className={cn("metric-card metric-card-hover", style.gradient)}
                  >
                    {/* 瑁呴グ鎬ф笎鍙樺厜鏅?*/}
                    <div className={cn("metric-card-accent", style.accent)} />

                    <p className="metric-label">{stat?.label || 'Unknown'}</p>
                    <h3 className="metric-value">{stat?.value || '-'}</h3>
                    <p className={cn(
                      "metric-trend",
                      stat?.isPositive ? "metric-trend-up" : "metric-trend-down"
                    )}>
                      {stat?.isPositive ? '鈫? : '鈫?} {stat?.trend || ''}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Chart - 鐜荤拑鎷熸€佹晥鏋?*/}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title">Clicks & Conversions</h3>
            <div className="flex gap-4 text-sm flex-wrap">
              {config.metrics.slice(0, 7).map((metric, idx) => {
                const m = ALL_METRICS.find(am => am.key === metric);
                if (!m) return null;
                // Stitch 瑙勮寖锛氫寒鑹?鏆楄壊妯″紡鍥捐〃棰滆壊
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
          <ChartWrapper height={300}>
              <LazyResponsiveContainer width="100%" height="100%">
                <LazyAreaChart data={chartData}>
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
                <LazyCartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDarkMode ? 'rgba(66, 71, 84, 0.3)' : 'rgba(196, 198, 205, 0.3)'}
                />
                <LazyXAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: isDarkMode ? '#c2c6d6' : '#44474c' }}
                />
                <LazyYAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: isDarkMode ? '#c2c6d6' : '#44474c' }}
                />
                <LazyTooltip
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
                  const chartDataKey = CHART_DATA_KEY_MAPPING[metric] || metric;
                  return (
                    <LazyArea
                      key={metric}
                      type="monotone"
                      dataKey={chartDataKey}
                      stroke={colors[idx]}
                      fill={`url(#color${idx})`}
                      strokeWidth={2}
                    />
                  );
                })}
              </LazyAreaChart>
              </LazyResponsiveContainer>
            </ChartWrapper>
        </div>

        {/* Entity Tables - 浣跨敤铏氭嫙婊氬姩 */}
        {config.entities.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {config.entities.map(entityKey => {
              const entityConfig = ENTITY_CONFIGS[entityKey as keyof typeof ENTITY_CONFIGS];
              const data = entityData[entityKey] || [];

              // Skip if entity config not found
              if (!entityConfig) return null;

              // 杞崲涓?VirtualTable 鍒楅厤缃?
              const virtualColumns: VirtualTableColumn[] = entityConfig.columns.map(col => {
                // 涓烘暟鍊煎垪娣诲姞鎺掑簭鍔熻兘
                const isNumeric = ['clicks', 'unique_clicks', 'conversions', 'cost', 'revenue', 'profit', 'roi', 'cr', 'epc'].includes(col.key);
                const sorter = isNumeric
                  ? (a: any, b: any) => (a[col.key] || 0) - (b[col.key] || 0)
                  : (a: any, b: any) => (a[col.key] || '').localeCompare(b[col.key] || '');

                return {
                  key: col.key,
                  label: col.label,
                  width: col.width,
                  align: col.align || 'left',
                  sorter: sorter,
                  showSorter: true,
                  render: (value: any, row: any) => {
                    if (col.key === 'name') {
                      return (
                        <Link
                          to={`/${entityKey}/${row.id}`}
                          className="font-semibold text-high-contrast hover:text-secondary transition-colors cursor-pointer link-primary"
                        >
                          {value}
                        </Link>
                      );
                    }
                    return <span className="text-medium-contrast">{value?.toLocaleString() || '-'}</span>;
                  },
                };
              });

              return (
                <div key={entityKey} className="section-card overflow-hidden">
                  <div className="section-header">
                    <h3 className="font-display font-semibold text-on-surface">{entityConfig?.label || entityKey}</h3>
                  </div>
                  <VirtualTableEnhanced
                    tableId={`dashboard-${entityKey}`}
                    columns={virtualColumns}
                    data={data}
                    rowHeight={48}
                    height={300}
                    overscan={5}
                    emptyMessage={`No ${entityConfig?.label || entityKey} found`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Clicks - 鏂版牱寮?*/}
        {config.recentClicksColumns.length > 0 && (
          <div className="section-card overflow-hidden">
            <div className="section-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-on-surface">Recent Clicks</h3>
              <button
                onClick={() => refreshRecentClicksRef.current()?.catch(console.error)}
                disabled={loading.recentClicks}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all",
                  loading.recentClicks
                    ? "bg-surface-container text-fg-muted cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                )}
                title="Refresh recent clicks data"
              >
                <RefreshCw
                  size={14}
                  className={cn(loading.recentClicks && "animate-spin")}
                />
                <span>Refresh</span>
              </button>
            </div>
            {loading.recentClicks ? (
              <div className="p-8 flex items-center justify-center">
                <LoadingSpinner size={40} />
              </div>
            ) : errors.recentClicks ? (
              <div className="p-4">
                <ErrorMessage message={errors.recentClicks} />
              </div>
            ) : (
              <VirtualTableEnhanced
                tableId="dashboard-recent-clicks"
                columns={config.recentClicksColumns.map(key => {
                  const col = RECENT_CLICKS_COLUMNS.find(c => c.key === key);
                  // 鍔ㄦ€佹坊鍔?sorter 鍑芥暟
                  const sorter = getRecentClicksSorter(key);
                  return {
                    key: key,
                    label: col?.label || key,
                    width: col?.width,
                    align: 'left',
                    sorter: sorter,
                    showSorter: !!sorter,
                    render: (value: any, row: any) => {
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
                      if (key === 'cost') {
                        return <span className="text-medium-contrast font-medium">{value || '-'}</span>;
                      }
                      if (key === 'os_icon') {
                        const osValue = row.os || row.os_icon || '';
                        return <OSIcon name={osValue} size="sm" />;
                      }
                      if (key === 'browser_icon') {
                        const browserValue = row.browser || row.browser_icon || '';
                        return <BrowserIcon name={browserValue} size="sm" />;
                      }
                      return <span className="text-medium-contrast">{value || '-'}</span>;
                    },
                  };
                })}
                data={recentClicks}
                rowHeight={48}
                height={400}
                overscan={5}
                emptyMessage="No recent clicks found"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
