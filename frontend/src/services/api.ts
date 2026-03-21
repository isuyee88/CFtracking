/**
 * @fileoverview API 服务
 * @description 统一封装后端 API 调用
 * @module services/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 通用响应处理函数
async function handleResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data;
}

// 获取 Campaign 列表
export async function fetchCampaigns() {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

// 获取单个 Campaign
export async function fetchCampaign(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

// 创建 Campaign
export async function createCampaign(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// 更新 Campaign
export async function updateCampaign(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// 删除 Campaign
export async function deleteCampaign(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// 获取 Campaign 统计
export async function fetchCampaignStats(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}/stats`);
  const result = await handleResponse(response);
  return result.data;
}

// 获取 Tracking Script 代码
export async function fetchTrackingScript(campaignId: string, type: 'tracking' | 'kclient' = 'tracking') {
  const response = await fetch(`${API_BASE_URL}/api/tracking/script/code?campaignId=${campaignId}&type=${type}`);
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Offers API ====================

export async function fetchOffers(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/offers?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

export async function fetchOffer(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createOffer(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateOffer(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteOffer(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Traffic Sources API ====================

export async function fetchTrafficSources(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

export async function fetchTrafficSource(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createTrafficSource(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateTrafficSource(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteTrafficSource(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function testTrafficSourceConnection(data: {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
  platformType?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Affiliate Networks API ====================

export async function fetchAffiliateNetworks(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

export async function fetchAffiliateNetwork(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createAffiliateNetwork(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateAffiliateNetwork(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteAffiliateNetwork(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Landings API ====================

export async function fetchLandings(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/landings?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

export async function fetchLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createLanding(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateLanding(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Analytics API ====================

// 获取仪表板统计数据
export async function fetchDashboardStats(timeRange: string = 'today') {
  const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard?range=${timeRange}`);
  const result = await handleResponse(response);
  return result.data;
}

// 获取最近点击数据
export async function fetchRecentClicks(limit: number = 10) {
  const response = await fetch(`${API_BASE_URL}/api/analytics/recent-clicks?limit=${limit}`);
  const result = await handleResponse(response);
  return result.data?.list || [];
}

// 获取实体统计数据
export async function fetchEntityStats(entityType: string, timeRange: string = 'today') {
  const response = await fetch(`${API_BASE_URL}/api/analytics/entity-stats?type=${entityType}&range=${timeRange}`);
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Clicks Log API ====================

export interface ClickLogParams {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  visitorId?: string;
  offerId?: string;
  flowId?: string;
  isUnique?: boolean;
  search?: string;
}

export interface ClickLogListResult {
  list: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClickStats {
  totalClicks: number;
  uniqueClicks: number;
  countries: number;
  deviceTypes: number;
}

export async function fetchClicks(params: ClickLogParams = {}): Promise<ClickLogListResult> {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.campaignId) queryParams.set('campaignId', params.campaignId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.country) queryParams.set('country', params.country);
  if (params.device) queryParams.set('device', params.device);
  if (params.browser) queryParams.set('browser', params.browser);
  if (params.os) queryParams.set('os', params.os);
  if (params.ip) queryParams.set('ip', params.ip);
  if (params.visitorId) queryParams.set('visitorId', params.visitorId);
  if (params.offerId) queryParams.set('offerId', params.offerId);
  if (params.flowId) queryParams.set('flowId', params.flowId);
  if (params.isUnique !== undefined) queryParams.set('isUnique', params.isUnique.toString());
  if (params.search) queryParams.set('search', params.search);

  const response = await fetch(`${API_BASE_URL}/api/clicks?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return {
    list: result.data || [],
    total: result.meta?.total || 0,
    page: result.meta?.page || 1,
    pageSize: result.meta?.pageSize || 20,
    totalPages: result.meta?.totalPages || 0,
  };
}

export async function fetchClickStats(startDate: string, endDate: string, campaignId?: string): Promise<ClickStats> {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', startDate);
  queryParams.set('endDate', endDate);
  if (campaignId) queryParams.set('campaignId', campaignId);

  const response = await fetch(`${API_BASE_URL}/api/clicks/stats?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchClickById(clickId: string) {
  const response = await fetch(`${API_BASE_URL}/api/clicks/${clickId}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchClicksByVisitor(visitorId: string, limit: number = 100) {
  const response = await fetch(`${API_BASE_URL}/api/clicks/visitor/${visitorId}?limit=${limit}`);
  const result = await handleResponse(response);
  return result.data || [];
}

// ==================== Trends API ====================

export interface TrendsFilter {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  flowId?: string;
  landingPageId?: string;
  offerId?: string;
  trafficSourceId?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export interface TrendsReport {
  filter: {
    startDate: string;
    endDate: string;
    interval: string;
  };
  summary: {
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
  };
  data: Array<{
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
  }>;
  breakdowns?: {
    country: Array<{ value: string; clicks: number; conversions: number; revenue: number; profit: number; roi: number }>;
    device: Array<{ value: string; clicks: number; conversions: number; revenue: number; profit: number; roi: number }>;
    browser: Array<{ value: string; clicks: number; conversions: number; revenue: number; profit: number; roi: number }>;
  };
}

export async function fetchTrendsReport(filter: TrendsFilter = {}): Promise<TrendsReport> {
  const queryParams = new URLSearchParams();
  
  if (filter.startDate) queryParams.set('startDate', filter.startDate);
  if (filter.endDate) queryParams.set('endDate', filter.endDate);
  if (filter.campaignId) queryParams.set('campaignId', filter.campaignId);
  if (filter.flowId) queryParams.set('flowId', filter.flowId);
  if (filter.landingPageId) queryParams.set('landingPageId', filter.landingPageId);
  if (filter.offerId) queryParams.set('offerId', filter.offerId);
  if (filter.trafficSourceId) queryParams.set('trafficSourceId', filter.trafficSourceId);
  if (filter.country) queryParams.set('country', filter.country);
  if (filter.device) queryParams.set('device', filter.device);
  if (filter.browser) queryParams.set('browser', filter.browser);
  if (filter.os) queryParams.set('os', filter.os);
  if (filter.interval) queryParams.set('interval', filter.interval);

  const response = await fetch(`${API_BASE_URL}/api/trends/report?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchTrendsCompare(params: {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  campaignId?: string;
}) {
  const queryParams = new URLSearchParams();
  queryParams.set('currentStart', params.currentStart);
  queryParams.set('currentEnd', params.currentEnd);
  queryParams.set('previousStart', params.previousStart);
  queryParams.set('previousEnd', params.previousEnd);
  if (params.campaignId) queryParams.set('campaignId', params.campaignId);

  const response = await fetch(`${API_BASE_URL}/api/trends/compare?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Reports API ====================

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  groupBy?: string[];
  metrics?: string[];
  campaignId?: string;
}

export async function fetchReportData(filter: ReportFilter = {}) {
  const queryParams = new URLSearchParams();
  
  if (filter.startDate) queryParams.set('startDate', filter.startDate);
  if (filter.endDate) queryParams.set('endDate', filter.endDate);
  if (filter.groupBy?.length) queryParams.set('groupBy', filter.groupBy.join(','));
  if (filter.metrics?.length) queryParams.set('metrics', filter.metrics.join(','));
  if (filter.campaignId) queryParams.set('campaignId', filter.campaignId);

  const response = await fetch(`${API_BASE_URL}/api/reports/data?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Rules API ====================

export interface Rule {
  id: string;
  displayId?: string;
  name: string;
  description?: string;
  type: 'campaign' | 'platform' | 'flow';
  priority: number;
  enabled: boolean;
  status: 'active' | 'paused' | 'deleted';
  conditions: Array<{
    metric: string;
    operator: string;
    value: number | string;
    duration?: string;
  }>;
  actions: Array<{
    type: string;
    platform?: string;
    parameters: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDTO {
  name: string;
  description?: string;
  type: 'campaign' | 'platform' | 'flow';
  priority?: number;
  enabled?: boolean;
  conditions: Rule['conditions'];
  actions: Rule['actions'];
}

export interface UpdateRuleDTO {
  name?: string;
  description?: string;
  type?: 'campaign' | 'platform' | 'flow';
  priority?: number;
  enabled?: boolean;
  status?: 'active' | 'paused' | 'deleted';
  conditions?: Rule['conditions'];
  actions?: Rule['actions'];
}

export async function fetchRules(params: { page?: number; pageSize?: number; type?: string; status?: string } = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.type) queryParams.set('type', params.type);
  if (params.status) queryParams.set('status', params.status);

  const response = await fetch(`${API_BASE_URL}/api/rules?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return {
    list: result.data || [],
    meta: result.meta || { page: 1, pageSize: 20, total: 0 },
  };
}

export async function fetchRuleById(id: string): Promise<Rule> {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createRule(data: CreateRuleDTO): Promise<Rule> {
  const response = await fetch(`${API_BASE_URL}/api/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateRule(id: string, data: UpdateRuleDTO): Promise<Rule> {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteRule(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

export async function enableRule(id: string): Promise<Rule> {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}/enable`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function disableRule(id: string): Promise<Rule> {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}/disable`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function getRuleExecutionHistory(id: string, limit: number = 50) {
  const response = await fetch(`${API_BASE_URL}/api/rules/${id}/history?limit=${limit}`);
  const result = await handleResponse(response);
  return result.data || [];
}

// ==================== Platforms API ====================

export interface Platform {
  id: string;
  name: string;
  type: 'soap' | 'rest';
  version: string;
  description?: string;
  actions: string[];
  configured: boolean;
  status: 'active' | 'inactive';
  config?: {
    apiKey?: string;
    wsdlUrl?: string;
    apiUrl?: string;
  };
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const response = await fetch(`${API_BASE_URL}/api/platforms`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function fetchConfiguredPlatforms(): Promise<Platform[]> {
  const response = await fetch(`${API_BASE_URL}/api/platforms/configured`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function fetchPlatformById(platformId: string): Promise<Platform> {
  const response = await fetch(`${API_BASE_URL}/api/platforms/${platformId}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function configurePlatform(platformId: string, config: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/platforms/${platformId}/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse(response);
}

export async function testPlatformConnection(platformId: string): Promise<{ platformId: string; connected: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/platforms/${platformId}/test`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function executePlatformAction(platformId: string, action: string, parameters: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/platforms/${platformId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, parameters }),
  });
  const result = await handleResponse(response);
  return result.data;
}
