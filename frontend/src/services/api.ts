/**
 * @fileoverview API 服务 - 前端 API 调用封装
 * @description 统一封装后端 API 调用，提供类型安全的接口
 * @module services/api
 *
 * 数据存储架构 (ADR-001):
 *   - D1 数据库: 主存储，持久化所有数据
 *   - DO (Durable Objects): 实时计数、唯一性检查、缓存
 *   - KV: 会话缓存、临时数据
 *
 * 数据流:
 *   前端请求 → API 路由 → D1/DO 查询 → 返回数据
 *
 * 注意: Analytics Engine (AE) 已废弃，所有数据查询走 D1 + DO
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const DEFAULT_TIMEOUT = 15000; // 15秒超时

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5秒缓存

function getCached<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  apiCache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

function createCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params) return endpoint;
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface ApiErrorResponse {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface BackendResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

async function handleResponse<T>(response: Response): Promise<{ data: T; meta?: BackendResponse['meta']; status: number }> {  const status = response.status;
  
  let responseData: BackendResponse<T>;
  try {
    responseData = await response.json();
  } catch {
    if (response.status === 204) {
      return { data: {} as T, status };
    }
    if (!response.ok) {
      throw new Error(`HTTP ${status}: ${response.statusText || 'Request failed'}`);
    }
    return { data: {} as T, status };
  }
  
  if (status === 200 || status === 201) {
    if (responseData.success === false) {
      throw new Error(responseData.error?.message || 'API request failed');
    }
    // Unwrap backend { success, data, meta } → { data, meta }
    return {
      data: responseData.data as T,
      meta: responseData.meta,
      status,
    };
  }
  
  const errorMessage = responseData.error?.message || `HTTP ${status}: ${response.statusText || 'Request failed'}`;
  const error = new Error(errorMessage);
  (error as any).status = status;
  (error as any).response = responseData;
  throw error;
}

async function fetchAllPages<T>(buildUrl: (page: number, pageSize: number) => string, pageSize = 100): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetch(buildUrl(page, pageSize));
    const result = await handleResponse<{ list?: T[] } | T[]>(response);
    const list = Array.isArray(result.data) ? result.data : (result.data?.list || []);
    all.push(...list);
    const total = Number(result.meta?.total) || all.length;
    if (!list.length || all.length >= total) break;
  }
  return all;
}

// 获取 Campaign 列表（前端做搜索/分页，需完整集合）
export async function fetchCampaigns() {
  return fetchAllPages<any>((page, pageSize) => `${API_BASE_URL}/api/campaigns?page=${page}&pageSize=${pageSize}`);
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

export async function fetchOffers(withStats = false) {
  // The Offers page paginates locally, so it needs the complete collection.
  return fetchAllPages<any>((page, pageSize) => `${API_BASE_URL}/api/offers?withStats=${withStats}&page=${page}&pageSize=${pageSize}`);
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
  return fetchAllPages<any>((page, pageSize) => `${API_BASE_URL}/api/traffic-sources?withStats=${withStats}&page=${page}&pageSize=${pageSize}`);
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

// ==================== Blacklist API ====================

export async function fetchBlacklist(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: string;
  synced?: string;
  type?: string;
}) {
  const build = (page: number, pageSize: number) => {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));
    if (params?.search) queryParams.set('search', params.search);
    if (params?.source) queryParams.set('source', params.source);
    if (params?.synced) queryParams.set('synced', params.synced);
    if (params?.type) queryParams.set('type', params.type);
    return `${API_BASE_URL}/api/blacklist?${queryParams.toString()}`;
  };
  return fetchAllPages<any>(build);
}

export async function createBlacklistEntry(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/blacklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateBlacklistEntry(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/blacklist/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteBlacklistEntry(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/blacklist/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function syncBlacklistEntry(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/blacklist/${id}/sync`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Whitelist API ====================

export async function fetchWhitelist(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: string;
  synced?: string;
  type?: string;
}) {
  const build = (page: number, pageSize: number) => {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));
    if (params?.search) queryParams.set('search', params.search);
    if (params?.source) queryParams.set('source', params.source);
    if (params?.synced) queryParams.set('synced', params.synced);
    if (params?.type) queryParams.set('type', params.type);
    return `${API_BASE_URL}/api/whitelist?${queryParams.toString()}`;
  };
  return fetchAllPages<any>(build);
}

export async function createWhitelistEntry(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/whitelist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateWhitelistEntry(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/whitelist/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteWhitelistEntry(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/whitelist/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function syncWhitelistEntry(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/whitelist/${id}/sync`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Reports API ====================

export interface ReportRecord {
  id: number;
  datetime: string;
  campaign: string;
  landing: string;
  offer: string;
  clicks: number;
  unique_clicks: number;
  conversions: number;
  revenue: string;
  cost: string;
  profit: string;
  roi: string;
  cr: string;
  epc: string;
  country: string;
  region: string;
  city: string;
  device_type: string;
  os: string;
  browser: string;
  source: string;
  referrer: string;
  sub1: string;
  sub2: string;
  sub3: string;
}

export interface ReportsResult {
  list: ReportRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchReports(params: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  filters?: Array<{ field: string; operator: string; value: string }>;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.sortField) queryParams.set('sortField', params.sortField);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.filters) {
    queryParams.set('filters', JSON.stringify(params.filters));
  }

  const response = await fetch(`${API_BASE_URL}/api/reports?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return {
    list: result.data?.list || result.data || [],
    meta: result.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function fetchReportStats(params: {
  startDate?: string;
  endDate?: string;
  filters?: Array<{ field: string; operator: string; value: string }>;
}) {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.filters) {
    queryParams.set('filters', JSON.stringify(params.filters));
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/stats?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Traffic Sources API ====================

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
  return fetchAllPages<any>((page, pageSize) => `${API_BASE_URL}/api/affiliate-networks?withStats=${withStats}&page=${page}&pageSize=${pageSize}`);
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

// ==================== Flow API ====================

export async function fetchFlows(campaignId: string) {
  const response = await fetch(`${API_BASE_URL}/api/flows/campaign/${campaignId}`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function createFlow(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/flows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateFlow(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/flows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteFlow(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/flows/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function addLandingPageToFlow(flowId: string, landingPageId: string, weight?: number) {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/landing-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landingPageId, weight }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function addOfferToFlow(flowId: string, offerId: string, weight?: number) {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offerId, weight }),
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Landings API ====================

export async function fetchLandings(withStats = true) {
  return fetchAllPages<any>((page, pageSize) => `${API_BASE_URL}/api/landing-pages?withStats=${withStats}&page=${page}&pageSize=${pageSize}`);
}

export async function fetchLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landing-pages/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createLanding(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landing-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateLanding(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landing-pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landing-pages/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Analytics API ====================

// 获取仪表板统计数据
export async function fetchDashboardStats(timeRange: string = 'today') {
  const cacheKey = createCacheKey('/api/analytics/dashboard', { range: timeRange });
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard?range=${timeRange}`);
  const result = await handleResponse(response);
  setCache(cacheKey, result.data);
  return result.data;
}

// 获取最近点击数据
export async function fetchRecentClicks(limit: number = 10) {
  const cacheKey = createCacheKey('/api/analytics/recent-clicks', { limit });
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/recent-clicks?limit=${limit}`);
    const result = await handleResponse(response);
    let data = result.data?.list || [];

    // 防御性检查：确保返回数组
    if (!Array.isArray(data)) {
      console.warn('[fetchRecentClicks] result.list is not an array, returning empty array');
      data = [];
    }

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('[fetchRecentClicks] Error:', error);
    return [];
  }
}

// 获取实体统计数据
export async function fetchEntityStats(entityType: string, timeRange: string = 'today') {
  const cacheKey = createCacheKey('/api/analytics/entity-stats', { type: entityType, range: timeRange });
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE_URL}/api/analytics/entity-stats?type=${entityType}&range=${timeRange}`);
  const result = await handleResponse(response);
  setCache(cacheKey, result.data);
  return result.data;
}

// ==================== Reports API ====================

export type ReportType = 'traffic' | 'conversion' | 'financial' | 'roi';
export type ExportFormat = 'csv' | 'excel';

export interface ReportParams {
  startDate: string;
  endDate: string;
  groupBy?: string[];
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportExportParams extends ReportParams {
  type: ReportType;
  format: ExportFormat;
  columns?: string[];
}

export async function fetchReport(type: ReportType, params: ReportParams) {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  if (params.groupBy) queryParams.set('groupBy', params.groupBy.join(','));
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const response = await fetch(`${API_BASE_URL}/api/analytics/reports/${type}?${queryParams}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function exportReport(params: ReportExportParams): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/analytics/reports/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  return await response.blob();
}

export function downloadReport(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
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

/**
 * 获取规则列表。
 *
 * 规则页在客户端做搜索/筛选/排序，需要完整集合；因此显式分页参数以外的调用
 * 必须翻完所有页，否则规则超过一页时表格会静默截断。
 */
export async function fetchRules(params: { page?: number; pageSize?: number; type?: string; status?: string } = {}) {
  const buildUrl = (page: number, pageSize: number) => {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));
    if (params.type) queryParams.set('type', params.type);
    if (params.status) queryParams.set('status', params.status);
    return `${API_BASE_URL}/api/rules?${queryParams.toString()}`;
  };

  if (params.page || params.pageSize) {
    const response = await fetch(buildUrl(params.page || 1, params.pageSize || 20));
    const result = await handleResponse<Rule[]>(response);
    return {
      list: result.data || [],
      meta: result.meta || { page: params.page || 1, pageSize: params.pageSize || 20, total: (result.data || []).length },
    };
  }

  const list = await fetchAllPages<Rule>(buildUrl);
  return {
    list,
    meta: { page: 1, pageSize: list.length || 20, total: list.length },
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

// ==================== Conversions API ====================

export interface Conversion {
  id: string;
  time: string;
  campaignId: string;
  campaign: string;
  streamId: string;
  stream: string;
  landingId: string;
  offerId: string;
  offer: string;
  affiliateNetwork: string;
  source: string;
  payout: string;
  revenue: string;
  currency: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  type: 'Sale' | 'Lead' | 'Signup' | 'Deposit';
  clickId: string;
  ip: string;
  userAgent: string;
  country: string;
  region: string;
  city: string;
  language: string;
  deviceType: string;
  deviceModel: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  isp: string;
  operator: string;
  connectionType: string;
  isUsingProxy: boolean;
  isBot: boolean;
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
  postbackUrl: string;
  postbackStatus: string;
  postbackTime: string;
  transactionId: string;
}

export interface ConversionListParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

export interface ConversionListResult {
  list: Conversion[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchConversions(params: ConversionListParams = {}): Promise<ConversionListResult> {
  const all: Conversion[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('pageSize', '100');
    if (params.startDate) queryParams.set('startDate', params.startDate);
    if (params.endDate) queryParams.set('endDate', params.endDate);
    if (params.status) queryParams.set('status', params.status);
    if (params.search) queryParams.set('search', params.search);

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/conversions?${queryParams.toString()}`);
    const result = await handleResponse<{ list?: Conversion[] } | Conversion[]>(response);
    const list = Array.isArray(result.data) ? result.data : (result.data?.list || []);
    all.push(...list);
    const total = Number(result.meta?.total) || all.length;
    if (!list.length || all.length >= total) break;
  }
  return {
    list: all,
    meta: { page: 1, pageSize: all.length || 20, total: all.length, totalPages: 1 },
  };
}

export async function fetchConversionStats(startDate: string, endDate: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/conversions/stats?startDate=${startDate}&endDate=${endDate}`);
  const result = await handleResponse(response);
  return result.data || {
    totalConversions: 0,
    approvedConversions: 0,
    pendingConversions: 0,
    rejectedConversions: 0,
    totalRevenue: 0,
    totalPayout: 0,
  };
}

// ==================== Settings API ====================

export interface UserSettings {
  timezone: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  twoFactorAuth: boolean;
}

export async function fetchSettings(): Promise<UserSettings> {
  const response = await fetch(`${API_BASE_URL}/api/settings`);
  const result = await handleResponse(response);
  return result.data;
}

export async function updateSettings(settings: Partial<UserSettings>) {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Target API ====================

export interface Target {
  id: string;
  name: string;
  type: 'country' | 'device' | 'browser' | 'os' | 'isp' | 'ip';
  values: string[];
  status: 'active' | 'paused';
  createdAt: string;
}

export interface CreateTargetDTO {
  name: string;
  type: Target['type'];
  values: string[];
}

export interface UpdateTargetDTO {
  name?: string;
  type?: Target['type'];
  values?: string[];
  status?: Target['status'];
}

export async function fetchTargets(): Promise<Target[]> {
  const response = await fetch(`${API_BASE_URL}/api/targets`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function fetchTargetById(id: string): Promise<Target> {
  const response = await fetch(`${API_BASE_URL}/api/targets/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createTarget(data: CreateTargetDTO): Promise<Target> {
  const response = await fetch(`${API_BASE_URL}/api/targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateTarget(id: string, data: UpdateTargetDTO): Promise<Target> {
  const response = await fetch(`${API_BASE_URL}/api/targets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteTarget(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/targets/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

export async function toggleTargetStatus(id: string, status: Target['status']): Promise<Target> {
  const response = await fetch(`${API_BASE_URL}/api/targets/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const result = await handleResponse(response);
  return result.data;
}

// Export tasks are user-triggered; no background polling in the UI.
export async function fetchExportTasks(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks`);
  const result = await handleResponse<any>(response);
  return Array.isArray(result.data) ? result.data : (result.data as any)?.list || [];
}

export async function fetchExportTaskStats(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks/stats`);
  const result = await handleResponse<any>(response);
  return result.data;
}

export async function createExportTask(data: Record<string, any>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse<any>(response);
  return result.data;
}

export async function deleteExportTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

export async function cancelExportTask(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
  const result = await handleResponse<any>(response);
  return result.data;
}

export async function retryExportTask(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/export-tasks/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
  });
  const result = await handleResponse<any>(response);
  return result.data;
}
