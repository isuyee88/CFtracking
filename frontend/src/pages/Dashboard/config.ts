/**
 * @fileoverview Dashboard 配置文件
 * @description 定义 Dashboard 页面的所有配置项：Metrics、Entities、Recent Clicks 列
 * @module pages/Dashboard/config
 */

export interface MetricConfig {
  key: string;
  label: string;
  format: 'number' | 'currency' | 'percentage';
  category: 'basic' | 'financial' | 'performance';
}

export interface EntityColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

export interface EntityConfig {
  key: string;
  label: string;
  icon: string;
  category: string;
  columns: EntityColumn[];
}

export interface RecentClickColumn {
  key: string;
  label: string;
  width?: string;
  category: string;
}

export const CHART_DATA_KEY_MAPPING: Record<string, string> = {
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

export const ALL_METRICS: MetricConfig[] = [
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
  { key: 'campaign_unique_clicks', label: 'UC (campaign)', format: 'number', category: 'basic' },
  { key: 'sale_revenue', label: 'Revenue', format: 'currency', category: 'financial' },
];

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
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

export const RECENT_CLICKS_COLUMNS: RecentClickColumn[] = [
  { key: 'event_id', label: 'Event ID', width: '120px', category: 'Basic' },
  { key: 'datetime', label: 'Date and Time', width: '150px', category: 'Basic' },
  { key: 'visitor_code', label: 'Visitor Code', width: '120px', category: 'Basic' },
  { key: 'campaign', label: 'Campaign', width: '180px', category: 'Campaign' },
  { key: 'stream', label: 'Stream', width: '120px', category: 'Campaign' },
  { key: 'landing', label: 'Landing Page', width: '150px', category: 'Campaign' },
  { key: 'offer', label: 'Offer', width: '150px', category: 'Campaign' },
  { key: 'source', label: 'Traffic Source', width: '150px', category: 'Campaign' },
  { key: 'country', label: 'Country', width: '100px', category: 'Geo' },
  { key: 'region', label: 'Region/State', width: '120px', category: 'Geo' },
  { key: 'city', label: 'City', width: '120px', category: 'Geo' },
  { key: 'language', label: 'Language', width: '80px', category: 'Geo' },
  { key: 'isp', label: 'ISP', width: '150px', category: 'Geo' },
  { key: 'operator', label: 'Mobile Operator', width: '150px', category: 'Geo' },
  { key: 'device_type', label: 'Device Type', width: '100px', category: 'Device' },
  { key: 'device_model', label: 'Device Model', width: '150px', category: 'Device' },
  { key: 'os', label: 'OS', width: '100px', category: 'Device' },
  { key: 'os_version', label: 'OS Version', width: '100px', category: 'Device' },
  { key: 'browser', label: 'Browser', width: '100px', category: 'Device' },
  { key: 'browser_version', label: 'Browser Version', width: '120px', category: 'Device' },
  { key: 'os_icon', label: 'OS Logo', width: '60px', category: 'Device' },
  { key: 'browser_icon', label: 'Browser Logo', width: '80px', category: 'Device' },
  { key: 'ip', label: 'IP Address', width: '120px', category: 'Network' },
  { key: 'connection_type', label: 'Connection Type', width: '120px', category: 'Network' },
  { key: 'proxy', label: 'Proxy Status', width: '100px', category: 'Network' },
  { key: 'creative_id', label: 'Creative ID', width: '120px', category: 'Tracking' },
  { key: 'external_id', label: 'External ID', width: '120px', category: 'Tracking' },
  { key: 'ad_campaign_id', label: 'Ad Campaign ID', width: '150px', category: 'Tracking' },
  { key: 'sub_id', label: 'Sub ID', width: '120px', category: 'Sub IDs' },
  { key: 'sub1', label: 'Sub ID 1', width: '100px', category: 'Sub IDs' },
  { key: 'sub2', label: 'Sub ID 2', width: '100px', category: 'Sub IDs' },
  { key: 'sub3', label: 'Sub ID 3', width: '100px', category: 'Sub IDs' },
  { key: 'sub4', label: 'Sub ID 4', width: '100px', category: 'Sub IDs' },
  { key: 'sub5', label: 'Sub ID 5', width: '100px', category: 'Sub IDs' },
  { key: 'referrer', label: 'Referrer', width: '200px', category: 'Referrer' },
  { key: 'referrer_domain', label: 'Referrer Domain', width: '150px', category: 'Referrer' },
  { key: 'search_engine', label: 'Search Engine', width: '120px', category: 'Referrer' },
  { key: 'keyword', label: 'Keyword', width: '150px', category: 'Referrer' },
  { key: 'destination', label: 'Destination', width: '200px', category: 'Destination' },
  { key: 'cost', label: 'Click Cost', width: '100px', category: 'Cost' },
  { key: 'bot', label: 'Bot Status', width: '100px', category: 'Status' },
  { key: 'unique_stream', label: 'Unique per Stream', width: '130px', category: 'Status' },
  { key: 'unique_campaign', label: 'Unique per Campaign', width: '150px', category: 'Status' },
  { key: 'user_agent', label: 'User Agent', width: '300px', category: 'User Agent' },
];

export const DEFAULT_CONFIG = {
  metrics: ['clicks', 'unique_clicks_campaign', 'conversions', 'cost', 'revenue_confirmed', 'profit_confirmed', 'roi_confirmed'],
  entities: ['campaigns', 'landings', 'offers', 'sources'],
  recentClicksColumns: ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination']
};

export const TIME_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'lastmonth', label: 'Last Month' },
];
