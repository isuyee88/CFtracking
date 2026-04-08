/**
 * @fileoverview API 服务
 * @description 统一封装后端 API 调用
 * @module services/api
 */

import { getRawBootstrapData, loadBootstrapForLocation, normalizeRangeParam, readBootstrapPage } from './bootstrap';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 获取认证请求头（包含 JWT Token）
 * @returns 包含 Authorization header 的对象
 */
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * 带认证的 fetch 封装
 * 自动附加 JWT Token 到请求头
 */
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders();

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });
}

// 简单的内存缓存 - 用于减少重复请求
interface ApiCacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

type CacheMatcher = string | RegExp | ((key: string) => boolean);

const apiCache = new Map<string, ApiCacheEntry<unknown>>();
const CACHE_TTL = 5000; // 5秒缓存

function getCacheEntry<T>(key: string): ApiCacheEntry<T> | null {
  return (apiCache.get(key) as ApiCacheEntry<T> | undefined) || null;
}

function storeEdgeCache<T>(key: string, data: T, etag?: string) {
  const current = getCacheEntry<T>(key);
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    etag: etag ?? current?.etag,
  });
}

export function invalidateApiCache(matcher?: CacheMatcher) {
  if (!matcher) {
    apiCache.clear();
    return;
  }

  const matches = (key: string) => {
    if (typeof matcher === 'string') {
      return key.startsWith(matcher);
    }

    if (matcher instanceof RegExp) {
      return matcher.test(key);
    }

    return matcher(key);
  };

  for (const key of Array.from(apiCache.keys())) {
    if (matches(key)) {
      apiCache.delete(key);
    }
  }
}

function createCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params) return endpoint;
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
}

function matchesBootstrapScope(
  actual: Record<string, unknown> | undefined,
  expected: Record<string, unknown>
): boolean {
  if (!actual) {
    return false;
  }

  const normalizeScopeValue = (key: string, value: unknown) => {
    if (key === 'range') {
      return normalizeRangeParam(typeof value === 'string' ? value : undefined);
    }

    if ((key === 'startDate' || key === 'endDate') && typeof value === 'string') {
      return value.split('T')[0] || value;
    }

    return value;
  };

  return Object.entries(expected).every(([key, value]) => {
    const current = normalizeScopeValue(key, actual[key]);
    const expectedValue = normalizeScopeValue(key, value);
    if (expectedValue === undefined || expectedValue === null || expectedValue === '') {
      return current === undefined || current === null || current === '';
    }
    return current === expectedValue;
  });
}

function createEmptyTrendsReport(filter: TrendsFilter = {}): TrendsReport {
  return {
    filter: {
      startDate: filter.startDate || '',
      endDate: filter.endDate || '',
      interval: filter.interval || 'day',
    },
    summary: {
      totalClicks: 0,
      totalUniqueClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      avgRoi: 0,
      avgEpc: 0,
      avgCpa: 0,
      avgCtr: 0,
      avgCr: 0,
      trend: 'stable',
      changePercent: 0,
    },
    data: [],
  };
}

function readBootstrapValue<T>(
  pages: string[],
  selector: (bundle: { scope?: Record<string, unknown>; data?: Record<string, unknown> }) => T | undefined
): T | undefined {
  for (const page of pages) {
    const bundle = readBootstrapPage(page);
    if (!bundle) {
      continue;
    }

    const value = selector(bundle);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function readDashboardBootstrap(): Record<string, any> | null {
  const bundle = getRawBootstrapData<Record<string, any>>();
  if (bundle && typeof bundle === 'object' && bundle.scope?.page === 'dashboard') {
    return bundle;
  }

  return null;
}

function readSettingsBootstrapPreference(userId: string): UserPreferenceDocument | null {
  const settingsBundle = readBootstrapPage('settings');
  if (
    settingsBundle &&
    matchesBootstrapScope(settingsBundle.scope, {
      userId,
    }) &&
    settingsBundle.data?.preferenceDocument
  ) {
    return settingsBundle.data.preferenceDocument as UserPreferenceDocument;
  }

  return null;
}

function readCampaignDetailFlowSchema(flowId: string): FlowSchemaDocument | null {
  const campaignDetailBundle = readBootstrapPage('campaign-detail');
  if (!campaignDetailBundle) {
    return null;
  }

  const schemas = campaignDetailBundle.data?.flowSchemasById;
  if (!schemas || typeof schemas !== 'object') {
    return null;
  }

  const schema = (schemas as Record<string, unknown>)[flowId];
  return schema && typeof schema === 'object' ? (schema as FlowSchemaDocument) : null;
}

function readCampaignDetailFlowRules(flowId: string): FlowRuleDocument[] | null {
  const campaignDetailBundle = readBootstrapPage('campaign-detail');
  if (!campaignDetailBundle) {
    return null;
  }

  const rulesById = campaignDetailBundle.data?.flowRulesById;
  if (rulesById && typeof rulesById === 'object') {
    const rules = (rulesById as Record<string, unknown>)[flowId];
    if (Array.isArray(rules)) {
      return rules as FlowRuleDocument[];
    }
  }

  const schema = readCampaignDetailFlowSchema(flowId);
  return schema ? schema.rules : null;
}

function readCampaignDetailFlowLogs(
  flowId: string,
  params: { limit?: number; offset?: number; startDate?: string; endDate?: string } = {}
): FlowLogListResult | null {
  const isBootstrapScope =
    (params.limit === undefined || params.limit === 8) &&
    (params.offset === undefined || params.offset === 0) &&
    !params.startDate &&
    !params.endDate;

  if (!isBootstrapScope) {
    return null;
  }

  const campaignDetailBundle = readBootstrapPage('campaign-detail');
  if (!campaignDetailBundle) {
    return null;
  }

  const logsById = campaignDetailBundle.data?.flowLogsById;
  if (!logsById || typeof logsById !== 'object') {
    return null;
  }

  const logs = (logsById as Record<string, unknown>)[flowId];
  return logs && typeof logs === 'object' ? (logs as FlowLogListResult) : null;
}

function matchesCampaignDetailBundle(
  campaignId: string | number,
  params: { startDate?: string; endDate?: string } = {}
) {
  const campaignDetailBundle = readBootstrapPage<Record<string, unknown>>('campaign-detail');
  if (!campaignDetailBundle) {
    return null;
  }

  const bundleCampaign =
    campaignDetailBundle.data?.campaign && typeof campaignDetailBundle.data.campaign === 'object'
      ? (campaignDetailBundle.data.campaign as Record<string, unknown>)
      : null;

  const knownIds = new Set(
    [
      typeof campaignDetailBundle.scope?.id === 'string' ? campaignDetailBundle.scope.id : '',
      typeof bundleCampaign?.id === 'string' ? bundleCampaign.id : '',
      typeof bundleCampaign?.displayId === 'string' ? bundleCampaign.displayId : '',
    ].filter(Boolean)
  );

  if (!knownIds.has(String(campaignId))) {
    return null;
  }

  if (params.startDate || params.endDate) {
    if (
      !matchesBootstrapScope(campaignDetailBundle.scope, {
        startDate: params.startDate || '',
        endDate: params.endDate || '',
      })
    ) {
      return null;
    }
  }

  return campaignDetailBundle;
}

function findBootstrapEntityById<T extends Record<string, unknown>>(
  pages: string[],
  collectionKey: string,
  id: string | number
): T | null {
  const targetId = String(id);
  const entities = readBootstrapValue<T[]>(pages, (bundle) => {
    const collection = bundle.data?.[collectionKey];
    return Array.isArray(collection) ? (collection as T[]) : undefined;
  });

  if (!Array.isArray(entities)) {
    return null;
  }

  return (
    entities.find((entity) => {
      const entityId = typeof entity.id === 'string' ? entity.id : '';
      const displayId = typeof entity.displayId === 'string' ? entity.displayId : '';
      const conversionId = typeof entity.conversionId === 'string' ? entity.conversionId : '';
      return entityId === targetId || displayId === targetId || conversionId === targetId;
    }) || null
  );
}

function matchesDashboardScope(
  actual: Record<string, unknown> | undefined,
  expected: {
    range?: string;
    campaignId?: string | null;
  }
): boolean {
  if (!actual) {
    return false;
  }

  const actualCampaignId = typeof actual.campaignId === 'string' ? actual.campaignId : '';
  const expectedCampaignId = expected.campaignId || '';
  const actualRange = normalizeRangeParam(typeof actual.range === 'string' ? actual.range : undefined);
  const expectedRange = normalizeRangeParam(expected.range);

  if (actualRange !== expectedRange) {
    return false;
  }

  return actualCampaignId === expectedCampaignId;
}

async function ensureDashboardBootstrap(
  expected: {
    range?: string;
    campaignId?: string | null;
  }
): Promise<Record<string, any> | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  if (!['/', '/dashboard'].includes(currentUrl.pathname)) {
    return null;
  }

  await loadBootstrapForLocation().catch(() => null);

  const bundle = readDashboardBootstrap();
  if (
    bundle &&
    matchesDashboardScope(bundle.scope, {
      range: expected.range,
      campaignId: expected.campaignId,
    })
  ) {
    return bundle;
  }

  return null;
}

const FLOW_FILTER_OPERATORS: FlowFilterOption[] = [
  { value: 'equals', label: 'Equals', description: 'Exact match' },
  { value: 'notEquals', label: 'Not Equals', description: 'Not equal to value' },
  { value: 'contains', label: 'Contains', description: 'String contains substring' },
  { value: 'notContains', label: 'Not Contains', description: 'String does not contain substring' },
  { value: 'startsWith', label: 'Starts With', description: 'String starts with value' },
  { value: 'endsWith', label: 'Ends With', description: 'String ends with value' },
  { value: 'regex', label: 'Regex', description: 'Matches regular expression' },
  { value: 'in', label: 'In List', description: 'Value is in the list' },
  { value: 'notIn', label: 'Not In List', description: 'Value is not in the list' },
  { value: 'greaterThan', label: 'Greater Than', description: 'Number greater than value' },
  { value: 'lessThan', label: 'Less Than', description: 'Number less than value' },
  { value: 'greaterOrEquals', label: 'Greater Or Equals', description: 'Number greater or equal' },
  { value: 'lessOrEquals', label: 'Less Or Equals', description: 'Number less or equal' },
  { value: 'between', label: 'Between', description: 'Number in range [min, max]' },
  { value: 'exists', label: 'Exists', description: 'Value exists and is not empty' },
  { value: 'notExists', label: 'Not Exists', description: 'Value does not exist or is empty' },
];

const FLOW_FILTER_TARGETS: FlowTargetOption[] = [
  { value: 'visitor.ip', label: 'IP Address', category: 'Visitor', type: 'string' },
  { value: 'visitor.country', label: 'Country', category: 'Visitor', type: 'string' },
  { value: 'visitor.region', label: 'Region', category: 'Visitor', type: 'string' },
  { value: 'visitor.city', label: 'City', category: 'Visitor', type: 'string' },
  { value: 'visitor.isp', label: 'ISP', category: 'Visitor', type: 'string' },
  { value: 'visitor.connectionType', label: 'Connection Type', category: 'Visitor', type: 'string' },
  { value: 'visitor.deviceType', label: 'Device Type', category: 'Visitor', type: 'string' },
  { value: 'visitor.os', label: 'Operating System', category: 'Visitor', type: 'string' },
  { value: 'visitor.browser', label: 'Browser', category: 'Visitor', type: 'string' },
  { value: 'visitor.language', label: 'Language', category: 'Visitor', type: 'string' },
  { value: 'visitor.userAgent', label: 'User Agent', category: 'Visitor', type: 'string' },
  { value: 'visitor.isProxy', label: 'Is Proxy', category: 'Visitor', type: 'boolean' },
  { value: 'visitor.isVpn', label: 'Is VPN', category: 'Visitor', type: 'boolean' },
  { value: 'visitor.isDatacenter', label: 'Is Datacenter', category: 'Visitor', type: 'boolean' },
  { value: 'visit.referrer', label: 'Referrer', category: 'Visit', type: 'string' },
  { value: 'visit.source', label: 'Source', category: 'Visit', type: 'string' },
  { value: 'visit.medium', label: 'Medium', category: 'Visit', type: 'string' },
  { value: 'visit.campaign', label: 'Campaign', category: 'Visit', type: 'string' },
  { value: 'visit.subId', label: 'Sub ID', category: 'Visit', type: 'string' },
  { value: 'visit.clickId', label: 'Click ID', category: 'Visit', type: 'string' },
  { value: 'visit.timestamp', label: 'Timestamp', category: 'Visit', type: 'number' },
  { value: 'visit.hourOfDay', label: 'Hour of Day', category: 'Visit', type: 'number' },
  { value: 'visit.dayOfWeek', label: 'Day of Week', category: 'Visit', type: 'number' },
  { value: 'visit.landingPage', label: 'Landing Page', category: 'Visit', type: 'string' },
  { value: 'visit.offer', label: 'Offer', category: 'Visit', type: 'string' },
  { value: 'visit.conversion', label: 'Has Conversion', category: 'Visit', type: 'boolean' },
  { value: 'visit.revenue', label: 'Revenue', category: 'Visit', type: 'number' },
  { value: 'visit.visitsCount', label: 'Visits Count', category: 'Visit', type: 'number' },
  { value: 'visit.firstVisit', label: 'First Visit', category: 'Visit', type: 'boolean' },
  { value: 'visit.returning', label: 'Returning Visitor', category: 'Visit', type: 'boolean' },
];




// 通用响应处理函数
async function handleResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data;
}

async function handleRawJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof payload.message === 'string' &&
        payload.message) ||
      (payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string' &&
        payload.error) ||
      `API request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

function unwrapPayload<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
}

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

async function fetchListResult<T>(url: string): Promise<T[]> {
  const response = await authenticatedFetch(url);
  const payload = await handleRawJsonResponse<{
    success?: boolean;
    data?: T[];
  }>(response);

  const data = unwrapPayload<T[] | undefined>(payload);
  return Array.isArray(data) ? data : [];
}

async function fetchPaginatedResult<T>(url: string): Promise<{
  list: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const response = await authenticatedFetch(url);
  const payload = await handleRawJsonResponse<{
    success?: boolean;
    data?: T[];
    meta?: {
      page?: number;
      pageSize?: number;
      total?: number;
      totalPages?: number;
    };
  }>(response);

  const list = Array.isArray(payload?.data) ? payload.data : [];
  const page = Number(payload?.meta?.page || 1);
  const pageSize = Number(payload?.meta?.pageSize || list.length || 20);
  const total = Number(payload?.meta?.total || list.length || 0);
  const totalPages = Number(payload?.meta?.totalPages || (pageSize > 0 ? Math.ceil(total / pageSize) : 0));

  return {
    list,
    page,
    pageSize,
    total,
    totalPages,
  };
}

async function mutateJsonData<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(url, options);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<T>(payload);
}

function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device';
  }

  const storageKey = 'cf_device_id';
  const existingId = window.localStorage.getItem(storageKey);
  if (existingId) {
    return existingId;
  }

  const newId =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(storageKey, newId);
  return newId;
}

// 获取 Campaign 列表
export async function fetchCampaigns() {
  const bootstrapCampaigns = readBootstrapValue<any[]>(
    ['campaigns', 'domains', 'trends'],
    (bundle) => {
      const campaigns = bundle.data?.campaigns;
      return Array.isArray(campaigns) ? campaigns : undefined;
    }
  );

  if (bootstrapCampaigns) {
    return bootstrapCampaigns;
  }

  return fetchListResult<any>('/api/campaigns?page=1&pageSize=100');
}

// 获取单个 Campaign
export async function fetchCampaign(id: string | number) {
  const campaignDetailBundle = matchesCampaignDetailBundle(id);
  if (campaignDetailBundle?.data?.campaign) {
    return campaignDetailBundle.data.campaign;
  }

  const bootstrapEntity = findBootstrapEntityById(['campaigns', 'domains', 'trends'], 'campaigns', id);
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/campaigns/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

// 创建 Campaign
export async function createCampaign(data: any) {
  const response = await authenticatedFetch('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// 更新 Campaign
export async function updateCampaign(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// 删除 Campaign
export async function deleteCampaign(id: string | number) {
  const response = await authenticatedFetch(`/api/campaigns/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// 获取 Campaign 统计
export async function fetchCampaignStats(
  id: string | number,
  params: { startDate?: string; endDate?: string } = {}
) {
  const campaignDetailBundle = matchesCampaignDetailBundle(id, params);
  if (campaignDetailBundle?.data?.stats) {
    return campaignDetailBundle.data.stats;
  }

  const query = buildQueryString(params);
  const response = await authenticatedFetch(`/api/campaigns/${id}/stats${query}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function regenerateCampaignToken(id: string | number) {
  const response = await authenticatedFetch(`/api/campaigns/${id}/regenerate-token`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

// 获取 Tracking Script 代码
export async function fetchTrackingScript(campaignId: string, type: 'tracking' | 'kclient' = 'tracking') {
  const campaignDetailBundle = matchesCampaignDetailBundle(campaignId);
  if (campaignDetailBundle) {
    const value =
      type === 'kclient'
        ? campaignDetailBundle.data?.kclientScript
        : campaignDetailBundle.data?.trackingScript;

    if (value) {
      return value;
    }
  }

  return null;
}

// ==================== Offers API ====================

export async function fetchOffers(withStats = true) {
  const bootstrapOffers = readBootstrapValue<any[]>(
    ['offers', 'campaign-detail', 'campaigns'],
    (bundle) => {
      const offers = bundle.data?.offers;
      return Array.isArray(offers) ? offers : undefined;
    }
  );

  if (bootstrapOffers) {
    return bootstrapOffers;
  }

  return fetchListResult<any>(`/api/offers?page=1&pageSize=100&withStats=${withStats ? 'true' : 'false'}`);
}

export async function fetchOffer(id: string | number) {
  const bootstrapEntity = findBootstrapEntityById(['offers', 'campaign-detail', 'campaigns'], 'offers', id);
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/offers/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function createOffer(data: any) {
  const response = await authenticatedFetch('/api/offers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateOffer(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/offers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteOffer(id: string | number) {
  const response = await authenticatedFetch(`/api/offers/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Traffic Sources API ====================

export async function fetchTrafficSources(withStats = true) {
  const bootstrapTrafficSources = readBootstrapValue<any[]>(
    ['traffic-sources', 'campaign-detail', 'campaigns'],
    (bundle) => {
      const trafficSources = bundle.data?.trafficSources;
      return Array.isArray(trafficSources) ? trafficSources : undefined;
    }
  );

  if (bootstrapTrafficSources) {
    return bootstrapTrafficSources;
  }

  return fetchListResult<any>(
    `/api/traffic-sources?page=1&pageSize=100&withStats=${withStats ? 'true' : 'false'}`
  );
}

export async function fetchTrafficSource(id: string | number) {
  const bootstrapEntity = findBootstrapEntityById(
    ['traffic-sources', 'campaign-detail', 'campaigns'],
    'trafficSources',
    id
  );
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/traffic-sources/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function createTrafficSource(data: any) {
  const response = await authenticatedFetch('/api/traffic-sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateTrafficSource(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/traffic-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteTrafficSource(id: string | number) {
  const response = await authenticatedFetch(`/api/traffic-sources/${id}`, {
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
  const response = await authenticatedFetch('/api/traffic-sources/test-connection', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Affiliate Networks API ====================

export async function fetchAffiliateNetworks(withStats = true) {
  const bootstrapNetworks = readBootstrapValue<any[]>(
    ['affiliate-networks', 'offers'],
    (bundle) => {
      const affiliateNetworks = bundle.data?.affiliateNetworks;
      return Array.isArray(affiliateNetworks) ? affiliateNetworks : undefined;
    }
  );

  if (bootstrapNetworks) {
    return bootstrapNetworks;
  }

  return fetchListResult<any>(
    `/api/affiliate-networks?page=1&pageSize=100&withStats=${withStats ? 'true' : 'false'}`
  );
}

export async function fetchAffiliateNetwork(id: string | number) {
  const bootstrapEntity = findBootstrapEntityById(['affiliate-networks', 'offers'], 'affiliateNetworks', id);
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/affiliate-networks/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function createAffiliateNetwork(data: any) {
  const response = await authenticatedFetch('/api/affiliate-networks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateAffiliateNetwork(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/affiliate-networks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteAffiliateNetwork(id: string | number) {
  const response = await authenticatedFetch(`/api/affiliate-networks/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Domains API ====================

export async function fetchDomains(withStats = true) {
  const domainsBundle = readBootstrapPage('domains');
  if (domainsBundle && Array.isArray(domainsBundle.data?.domains)) {
    return domainsBundle.data.domains;
  }

  return fetchListResult<any>(`/api/domains?page=1&pageSize=100&withStats=${withStats ? 'true' : 'false'}`);
}

export async function fetchDomain(id: string | number) {
  const bootstrapEntity = findBootstrapEntityById(['domains'], 'domains', id);
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/domains/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function createDomain(data: any) {
  const response = await authenticatedFetch('/api/domains', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateDomain(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/domains/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteDomain(id: string | number) {
  const response = await authenticatedFetch(`/api/domains/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Flow API ====================

export async function fetchFlows(campaignId: string) {
  const campaignDetailBundle = matchesCampaignDetailBundle(campaignId);
  if (campaignDetailBundle && Array.isArray(campaignDetailBundle.data?.flows)) {
    return campaignDetailBundle.data.flows;
  }

  return fetchListResult<any>(`/api/flows/campaign/${campaignId}`);
}

export async function createFlow(data: any) {
  const response = await authenticatedFetch('/api/flows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateFlow(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/flows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteFlow(id: string | number) {
  const response = await authenticatedFetch(`/api/flows/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function addLandingPageToFlow(flowId: string, landingPageId: string, weight?: number) {
  const response = await authenticatedFetch(`/api/flows/${flowId}/landing-pages`, {
    method: 'POST',
    body: JSON.stringify({ landingPageId, weight }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function addOfferToFlow(flowId: string, offerId: string, weight?: number) {
  const response = await authenticatedFetch(`/api/flows/${flowId}/offers`, {
    method: 'POST',
    body: JSON.stringify({ offerId, weight }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export type FlowFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'in'
  | 'notIn'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEquals'
  | 'lessOrEquals'
  | 'between'
  | 'exists'
  | 'notExists';

export type FlowFilterTarget = string;
export type FlowLogicalOperator = 'AND' | 'OR';
export type FlowRuleActionType = 'allow' | 'block' | 'redirect' | 'showPage' | 'showOffer';

export interface FlowFilterOption {
  value: FlowFilterOperator;
  label: string;
  description: string;
}

export interface FlowTargetOption {
  value: FlowFilterTarget;
  label: string;
  category: string;
  type: 'string' | 'number' | 'boolean';
}

export interface FlowRuleFilter {
  id: string;
  name?: string;
  target: FlowFilterTarget;
  operator: FlowFilterOperator;
  value?: string | string[] | number | number[] | boolean | null;
  enabled: boolean;
}

export interface FlowRuleGroup {
  id: string;
  name?: string;
  logic: FlowLogicalOperator;
  filters: FlowRuleFilter[];
  groups?: FlowRuleGroup[];
  enabled: boolean;
}

export interface FlowRuleActionConfig {
  type: FlowRuleActionType;
  targetId?: string;
  redirectUrl?: string;
  blockReason?: string;
  weight?: number;
}

export interface FlowRuleDocument {
  id: string;
  name: string;
  description?: string;
  flowId: string;
  priority: number;
  condition: FlowRuleGroup;
  action: FlowRuleActionConfig;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface FlowSchemaDocument {
  flow: {
    id: string;
    campaignId: string;
    name: string;
    type: 'regular' | 'forced' | 'default';
    weight: number;
    status: 'active' | 'paused' | 'deleted';
  };
  rules: FlowRuleDocument[];
  defaultAction: FlowRuleActionConfig;
  version: string;
  updatedAt: string;
}

export interface CreateFlowRuleDTO {
  name: string;
  description?: string;
  priority?: number;
  condition: CreateFlowRuleGroupDTO;
  action: FlowRuleActionConfig;
}

export interface UpdateFlowRuleDTO {
  name?: string;
  description?: string;
  priority?: number;
  condition?: CreateFlowRuleDTO['condition'];
  action?: FlowRuleActionConfig;
  status?: 'active' | 'paused' | 'deleted';
}

export interface CreateFlowRuleFilterDTO {
  id: string;
  target: FlowFilterTarget;
  operator: FlowFilterOperator;
  value?: string | string[] | number | number[] | boolean | null;
  name?: string;
  enabled: boolean;
}

export interface CreateFlowRuleGroupDTO {
  id: string;
  name?: string;
  logic: FlowLogicalOperator;
  filters: CreateFlowRuleFilterDTO[];
  groups?: CreateFlowRuleGroupDTO[];
  enabled: boolean;
}

export interface FlowValidationVisitData {
  source?: string;
  medium?: string;
  campaign?: string;
  subId?: string;
  clickId?: string;
  referrer?: string;
  visitsCount?: number;
  firstVisit?: boolean;
  returning?: boolean;
}

export interface FlowValidationFilterResult {
  valid: boolean;
  matchedFilterId?: string;
  matchedValue?: unknown;
  reason?: string;
}

export interface FlowRuleValidationResult {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  action?: FlowRuleActionConfig;
  matchedFilters?: FlowValidationFilterResult[];
  priority?: number;
}

export interface FlowValidationResult {
  passed: boolean;
  matchedRule?: FlowRuleValidationResult;
  action: FlowRuleActionConfig;
  ruleResults: FlowRuleValidationResult[];
  validatedAt: string;
  durationMs: number;
}

export async function fetchFlowSchema(flowId: string): Promise<FlowSchemaDocument> {
  const bootstrapSchema = readCampaignDetailFlowSchema(flowId);
  if (bootstrapSchema) {
    return bootstrapSchema;
  }

  const response = await authenticatedFetch(`/api/flows/${flowId}/schema`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<FlowSchemaDocument>(payload);
}

export async function fetchFlowRules(flowId: string): Promise<FlowRuleDocument[]> {
  const bootstrapRules = readCampaignDetailFlowRules(flowId);
  if (bootstrapRules) {
    return bootstrapRules;
  }

  return fetchListResult<FlowRuleDocument>(`/api/flows/${flowId}/rules`);
}

export async function createFlowRule(flowId: string, data: CreateFlowRuleDTO): Promise<FlowRuleDocument> {
  const response = await authenticatedFetch(`/api/flows/${flowId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateFlowRule(ruleId: string, data: UpdateFlowRuleDTO): Promise<FlowRuleDocument> {
  const response = await authenticatedFetch(`/api/flows/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteFlowRule(ruleId: string) {
  const response = await authenticatedFetch(`/api/flows/rules/${ruleId}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function testFlow(
  flowId: string,
  visitData: FlowValidationVisitData
): Promise<FlowValidationResult> {
  const response = await authenticatedFetch(`/api/flows/${flowId}/test`, {
    method: 'POST',
    body: JSON.stringify({ visitData }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchFlowFilterOperators(): Promise<FlowFilterOption[]> {
  try {
    return await fetchListResult<FlowFilterOption>('/api/flows/filters/operators');
  } catch {
    return FLOW_FILTER_OPERATORS;
  }
}

export async function fetchFlowFilterTargets(): Promise<FlowTargetOption[]> {
  try {
    return await fetchListResult<FlowTargetOption>('/api/flows/filters/targets');
  } catch {
    return FLOW_FILTER_TARGETS;
  }
}

export async function equalizeCampaignFlows(campaignId: string) {
  const response = await authenticatedFetch('/api/flows/equalize', {
    method: 'POST',
    body: JSON.stringify({ campaignId }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function cloneFlow(flowId: string) {
  const response = await authenticatedFetch(`/api/flows/${flowId}/clone`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export interface FlowStats {
  flowId: string;
  flowName: string;
  flowType: 'regular' | 'forced' | 'default';
  clicks: number;
  uniqueClicks: number;
  bots: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  conversionRate: number;
  epc: number;
  ctr: number;
}

export interface FlowTrafficLog {
  id: string;
  flowId: string;
  campaignId: string;
  visitorId: string;
  clickId: string;
  matchedRule?: string;
  action: string;
  actionTarget?: string;
  executionTimeMs: number;
  timestamp: string;
  ip: string;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  isBot: boolean;
  isUnique: boolean;
}

export interface FlowLogListResult {
  logs: FlowTrafficLog[];
  total: number;
  hasMore: boolean;
}

export async function fetchCampaignFlowStats(
  campaignId: string,
  params: { startDate?: string; endDate?: string } = {}
): Promise<FlowStats[]> {
  const campaignDetailBundle = matchesCampaignDetailBundle(campaignId, params);
  if (campaignDetailBundle && Array.isArray(campaignDetailBundle.data?.flowStats)) {
    return campaignDetailBundle.data.flowStats as FlowStats[];
  }

  const query = buildQueryString({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return fetchListResult<FlowStats>(`/api/flows/campaign/${campaignId}/stats${query}`);
}

export async function fetchFlowLogs(
  flowId: string,
  params: { limit?: number; offset?: number; startDate?: string; endDate?: string } = {}
): Promise<FlowLogListResult> {
  const bootstrapLogs = readCampaignDetailFlowLogs(flowId, params);
  if (bootstrapLogs) {
    return bootstrapLogs;
  }

  const query = buildQueryString({
    limit: params.limit,
    offset: params.offset,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const response = await authenticatedFetch(`/api/flows/${flowId}/logs${query}`);
  const payload = await handleRawJsonResponse(response);
  const result = unwrapPayload<Partial<FlowLogListResult>>(payload);

  return {
    logs: Array.isArray(result?.logs) ? result.logs : [],
    total: Number(result?.total || 0),
    hasMore: Boolean(result?.hasMore),
  };
}

// ==================== Landings API ====================

export async function fetchLandings(withStats = true) {
  const bootstrapLandings = readBootstrapValue<any[]>(
    ['landings', 'campaign-detail', 'domains', 'campaigns'],
    (bundle) => {
      const landings = bundle.data?.landings;
      return Array.isArray(landings) ? landings : undefined;
    }
  );

  if (bootstrapLandings) {
    return bootstrapLandings;
  }

  return fetchListResult<any>(
    `/api/landing-pages?page=1&pageSize=100&withStats=${withStats ? 'true' : 'false'}`
  );
}

export async function fetchLanding(id: string | number) {
  const bootstrapEntity = findBootstrapEntityById(
    ['landings', 'campaign-detail', 'domains', 'campaigns'],
    'landings',
    id
  );
  if (bootstrapEntity) {
    return bootstrapEntity;
  }

  const response = await authenticatedFetch(`/api/landing-pages/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload(payload);
}

export async function createLanding(data: any) {
  const response = await authenticatedFetch('/api/landing-pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateLanding(id: string | number, data: any) {
  const response = await authenticatedFetch(`/api/landing-pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteLanding(id: string | number) {
  const response = await authenticatedFetch(`/api/landing-pages/${id}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== Analytics API ====================

// 获取仪表板统计数据
export async function fetchDashboardStats(timeRange: string = 'today', campaignId?: string | null) {
  const normalizedRange = normalizeRangeParam(timeRange);
  const dashboardBundle = readDashboardBootstrap();
  if (
    dashboardBundle &&
    matchesDashboardScope(dashboardBundle.scope, {
      range: normalizedRange,
      campaignId,
    })
  ) {
    return {
      metrics: dashboardBundle.metrics || [],
      chartData: dashboardBundle.chartData || [],
      dataSource: dashboardBundle.dataSource || 'CACHE',
      queryTime: dashboardBundle.queryTime || new Date().toISOString(),
    };
  }

  const refreshedBundle = await ensureDashboardBootstrap({
    range: normalizedRange,
    campaignId,
  });
  if (refreshedBundle) {
    return {
      metrics: refreshedBundle.metrics || [],
      chartData: refreshedBundle.chartData || [],
      dataSource: refreshedBundle.dataSource || 'CACHE',
      queryTime: refreshedBundle.queryTime || new Date().toISOString(),
    };
  }

  const query = buildQueryString({
    range: normalizedRange,
    campaignId,
  });
  const response = await authenticatedFetch(`/api/analytics/dashboard${query}`);
  const payload = await handleRawJsonResponse(response);
  const result = unwrapPayload<{
    metrics?: any[];
    chartData?: any[];
    dataSource?: 'DO' | 'D1' | 'MIXED' | 'CACHE' | 'DEFAULT';
    queryTime?: string;
  }>(payload);

  return {
    metrics: Array.isArray(result?.metrics) ? result.metrics : [],
    chartData: Array.isArray(result?.chartData) ? result.chartData : [],
    dataSource: result?.dataSource || 'DEFAULT',
    queryTime: result?.queryTime || new Date().toISOString(),
  };
}

// 获取最近点击数据
export async function fetchRecentClicks(
  limit: number = 10,
  timeRange: string = 'today',
  campaignId?: string | null
) {
  const normalizedRange = normalizeRangeParam(timeRange);
  const dashboardBundle = readDashboardBootstrap();
  if (
    dashboardBundle &&
    limit === 10 &&
    matchesDashboardScope(dashboardBundle.scope, {
      range: normalizedRange,
      campaignId,
    })
  ) {
    return Array.isArray(dashboardBundle.recentClicks) ? dashboardBundle.recentClicks : [];
  }

  const refreshedBundle = await ensureDashboardBootstrap({
    range: normalizedRange,
    campaignId,
  });
  if (refreshedBundle && limit === 10) {
    return Array.isArray(refreshedBundle.recentClicks) ? refreshedBundle.recentClicks : [];
  }

  const query = buildQueryString({
    limit,
    range: normalizedRange,
    campaignId,
  });
  const response = await authenticatedFetch(`/api/analytics/recent-clicks${query}`);
  const payload = await handleRawJsonResponse(response);
  const result = unwrapPayload<{
    list?: any[];
  }>(payload);

  return Array.isArray(result?.list) ? result.list : [];
}

// 获取实体统计数据
export async function fetchEntityStats(
  entityType: string,
  timeRange: string = 'today',
  campaignId?: string | null
) {
  const normalizedRange = normalizeRangeParam(timeRange);
  const dashboardBundle = readDashboardBootstrap();
  if (
    dashboardBundle &&
    matchesDashboardScope(dashboardBundle.scope, {
      range: normalizedRange,
      campaignId,
    })
  ) {
    const entityData = dashboardBundle.entityData?.[entityType];
    if (Array.isArray(entityData)) {
      return entityData;
    }
  }

  const refreshedBundle = await ensureDashboardBootstrap({
    range: normalizedRange,
    campaignId,
  });
  if (refreshedBundle) {
    const refreshedEntityData = refreshedBundle.entityData?.[entityType];
    if (Array.isArray(refreshedEntityData)) {
      return refreshedEntityData;
    }
  }

  const bootstrapEntityStats = readBootstrapValue<any[]>(
    ['campaigns'],
    (bundle) => {
      if (!matchesBootstrapScope(bundle.scope, { range: normalizedRange })) {
        return undefined;
      }

      const entityStats = bundle.data?.entityStats;
      return Array.isArray(entityStats) && entityType === 'campaigns' ? entityStats : undefined;
    }
  );

  if (bootstrapEntityStats) {
    return bootstrapEntityStats;
  }

  const query = buildQueryString({
    type: entityType,
    range: normalizedRange,
    campaignId,
  });
  const response = await authenticatedFetch(`/api/analytics/entity-stats${query}`);
  const payload = await handleRawJsonResponse(response);
  const result = unwrapPayload<any[]>(payload);
  return Array.isArray(result) ? result : [];
}

// ==================== Reports API ====================

export type ReportType = 'traffic' | 'conversion' | 'financial' | 'roi';
export type ExportFormat = 'csv' | 'excel';
export type ReportDimension = 'date' | 'campaign' | 'offer' | 'flow' | 'landing' | 'country' | 'device' | 'browser';
export type ReportMetric =
  | 'clicks'
  | 'impressions'
  | 'conversions'
  | 'revenue'
  | 'spend'
  | 'cost'
  | 'profit'
  | 'roi'
  | 'cr'
  | 'margin'
  | 'epc'
  | 'cpc'
  | 'unique_visitors';
export type ReportFilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';

export interface ReportFilterCondition {
  field: ReportDimension | ReportMetric;
  operator: ReportFilterOperator;
  value: string | number;
}

export interface ReportParams {
  startDate: string;
  endDate: string;
  groupBy?: ReportDimension[];
  metrics?: ReportMetric[];
  filters?: ReportFilterCondition[];
  limit?: number;
  sortBy?: ReportDimension | ReportMetric;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportExportParams extends ReportParams {
  type: ReportType;
  format: ExportFormat;
  columns?: string[];
}

export async function fetchReport(type: ReportType, params: ReportParams) {
  void type;
  return queryReport(params);
}

export async function queryReport(params: ReportParams) {
  const response = await authenticatedFetch('/api/analytics/reports/query', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  const result = await handleRawJsonResponse(response);
  const payload = unwrapPayload<{
    data?: any[];
  }>(result);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function exportReport(params: ReportExportParams): Promise<Blob> {
  const response = await authenticatedFetch('/api/analytics/reports/export', {
    method: 'POST',
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
  const auditBundle = readBootstrapPage('audit');
  const status =
    params.isUnique === true ? 'unique' : params.isUnique === false ? 'nonunique' : 'all';
  if (
    auditBundle &&
    matchesBootstrapScope(auditBundle.scope, {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      startDate: params.startDate || '',
      endDate: params.endDate || '',
      search: params.search || '',
      status,
    })
  ) {
    return {
      list: Array.isArray(auditBundle.data?.clicks) ? auditBundle.data.clicks as any[] : [],
      total: Number(auditBundle.data?.pagination?.total || 0),
      page: Number(auditBundle.data?.pagination?.page || 1),
      pageSize: Number(auditBundle.data?.pagination?.pageSize || 20),
      totalPages: Number(auditBundle.data?.pagination?.totalPages || 0),
    };
  }

  const query = buildQueryString({
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    campaignId: params.campaignId,
    startDate: params.startDate,
    endDate: params.endDate,
    country: params.country,
    device: params.device,
    browser: params.browser,
    os: params.os,
    ip: params.ip,
    visitorId: params.visitorId,
    offerId: params.offerId,
    flowId: params.flowId,
    isUnique: params.isUnique,
    search: params.search,
  });

  return fetchPaginatedResult<any>(`/api/clicks${query}`);
}

export async function fetchClickStats(startDate: string, endDate: string, campaignId?: string): Promise<ClickStats> {
  const auditBundle = readBootstrapPage('audit');
  if (
    !campaignId &&
    auditBundle &&
    matchesBootstrapScope(auditBundle.scope, {
      startDate,
      endDate,
    }) &&
    auditBundle.data?.stats
  ) {
    return auditBundle.data.stats as ClickStats;
  }

  const query = buildQueryString({
    startDate,
    endDate,
    campaignId,
  });
  const response = await authenticatedFetch(`/api/clicks/stats${query}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<ClickStats>(payload);
}

export async function fetchClickById(clickId: string) {
  return findBootstrapEntityById(['audit'], 'clicks', clickId);
}

export async function fetchClicksByVisitor(visitorId: string, limit: number = 100) {
  const auditBundle = readBootstrapPage('audit');
  if (!auditBundle || !Array.isArray(auditBundle.data?.clicks)) {
    return [];
  }

  return (auditBundle.data.clicks as any[])
    .filter((item) => String(item.visitorId || '') === String(visitorId))
    .slice(0, limit);
}

// ==================== Conversions API ====================

export interface ConversionLogParams {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  offerId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'approved' | 'pending' | 'rejected';
  country?: string;
  device?: string;
  search?: string;
}

export interface ConversionLogItem {
  conversionId: string;
  clickId: string;
  campaignId: string;
  offerId: string;
  timestamp: string;
  revenue: number;
  payout: number;
  currency: string;
  conversionType: string;
  offerName: string;
  status: 'approved' | 'pending' | 'rejected';
  ip?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  source?: string | null;
  visitorId?: string | null;
  subId1?: string | null;
  subId2?: string | null;
  subId3?: string | null;
}

export interface ConversionLogListResult {
  list: ConversionLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ConversionStats {
  totalConversions: number;
  approvedConversions: number;
  pendingConversions: number;
  rejectedConversions: number;
  totalRevenue: number;
  totalPayout: number;
}

export async function fetchConversions(params: ConversionLogParams = {}): Promise<ConversionLogListResult> {
  const conversionsBundle = readBootstrapPage('conversions');
  if (
    conversionsBundle &&
    matchesBootstrapScope(conversionsBundle.scope, {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      startDate: params.startDate || '',
      endDate: params.endDate || '',
      search: params.search || '',
      status: params.status || 'all',
    })
  ) {
    return {
      list: Array.isArray(conversionsBundle.data?.conversions)
        ? conversionsBundle.data.conversions as ConversionLogItem[]
        : [],
      total: Number(conversionsBundle.data?.pagination?.total || 0),
      page: Number(conversionsBundle.data?.pagination?.page || 1),
      pageSize: Number(conversionsBundle.data?.pagination?.pageSize || 20),
      totalPages: Number(conversionsBundle.data?.pagination?.totalPages || 0),
    };
  }

  const campaignDetailBundle = readBootstrapPage('campaign-detail');
  if (
    campaignDetailBundle &&
    params.pageSize === 6 &&
    matchesBootstrapScope(campaignDetailBundle.scope, {
      id: String(params.campaignId || ''),
      startDate: params.startDate || '',
      endDate: params.endDate || '',
    }) &&
    Array.isArray(campaignDetailBundle.data?.conversions)
  ) {
    const list = campaignDetailBundle.data.conversions as ConversionLogItem[];
    return {
      list,
      total: list.length,
      page: 1,
      pageSize: list.length,
      totalPages: 1,
    };
  }

  const query = buildQueryString({
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    campaignId: params.campaignId,
    offerId: params.offerId,
    startDate: params.startDate,
    endDate: params.endDate,
    status: params.status,
    country: params.country,
    device: params.device,
    search: params.search,
  });

  return fetchPaginatedResult<ConversionLogItem>(`/api/conversions${query}`);
}

export async function fetchConversionStats(
  startDate: string,
  endDate: string,
  campaignId?: string
): Promise<ConversionStats> {
  const conversionsBundle = readBootstrapPage('conversions');
  if (
    !campaignId &&
    conversionsBundle &&
    matchesBootstrapScope(conversionsBundle.scope, {
      startDate,
      endDate,
    }) &&
    conversionsBundle.data?.stats
  ) {
    return conversionsBundle.data.stats as ConversionStats;
  }

  const query = buildQueryString({
    startDate,
    endDate,
    campaignId,
  });
  const response = await authenticatedFetch(`/api/conversions/stats${query}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<ConversionStats>(payload);
}

export async function fetchConversionById(conversionId: string): Promise<ConversionLogItem> {
  const conversion =
    findBootstrapEntityById<ConversionLogItem>(['conversions'], 'conversions', conversionId) ||
    findBootstrapEntityById<ConversionLogItem>(['campaign-detail'], 'conversions', conversionId);

  if (!conversion) {
    throw new Error(`Conversion ${conversionId} is not available in the current bootstrap payload`);
  }

  return conversion;
}

export async function updateConversionStatus(
  conversionId: string,
  status: 'approved' | 'pending' | 'rejected'
): Promise<{ updated: boolean; conversionId: string; status: string }> {
  const response = await authenticatedFetch(`/api/conversions/${conversionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  const result = await handleResponse(response);
  return result.data;
}

// ==================== User Preferences API ====================

export interface UserPreferenceDocument {
  version: string;
  lastUpdated: number;
  lastModifiedBy: string;
  preferences: {
    ui: {
      theme: 'light' | 'dark' | 'auto';
      density: 'compact' | 'standard' | 'comfortable';
      fontSize: 'small' | 'medium' | 'large';
      sidebarCollapsed: boolean;
    };
    tables: Record<string, unknown>;
    views: Record<string, unknown>;
    system: {
      language: string;
      timezone: string;
      refreshInterval: number;
    };
  };
}

export interface SaveUserPreferencesPayload {
  lastKnownVersion?: number;
  preferences: Partial<UserPreferenceDocument['preferences']>;
}

function createDefaultUserPreferenceDocument(userId: string): UserPreferenceDocument {
  return {
    version: '1.0',
    lastUpdated: 0,
    lastModifiedBy: userId,
    preferences: {
      ui: {
        theme: 'auto',
        density: 'standard',
        fontSize: 'medium',
        sidebarCollapsed: false,
      },
      tables: {},
      views: {},
      system: {
        language: 'en',
        timezone: 'UTC',
        refreshInterval: 30000,
      },
    },
  };
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferenceDocument> {
  const bootstrapPreference = readSettingsBootstrapPreference(userId);
  if (bootstrapPreference) {
    return bootstrapPreference;
  }

  try {
    const response = await authenticatedFetch(`/api/user-preferences/preferences/${userId}`);
    const result = await handleRawJsonResponse<{
      success: boolean;
      data?: UserPreferenceDocument;
    }>(response);

    if (result?.data) {
      return result.data;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (!message.includes('404') && !message.includes('not found')) {
      throw err;
    }
  }

  return createDefaultUserPreferenceDocument(userId);
}

export async function saveUserPreferences(
  userId: string,
  payload: SaveUserPreferencesPayload
): Promise<UserPreferenceDocument> {
  const response = await authenticatedFetch(`/api/user-preferences/preferences/${userId}`, {
    method: 'POST',
    headers: {
      'X-Device-ID': getDeviceId(),
    },
    body: JSON.stringify(payload),
  });

  const result = await handleRawJsonResponse<{
    success: boolean;
    data: UserPreferenceDocument;
    version: number;
  }>(response);

  return result.data;
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
  const campaignDetailBundle = readBootstrapPage('campaign-detail');
  if (
    campaignDetailBundle &&
    matchesBootstrapScope(campaignDetailBundle.scope, {
      id: String(filter.campaignId || ''),
      startDate: filter.startDate || '',
      endDate: filter.endDate || '',
      interval: filter.interval || 'day',
    }) &&
    campaignDetailBundle.data &&
    Object.prototype.hasOwnProperty.call(campaignDetailBundle.data, 'trends')
  ) {
    return (campaignDetailBundle.data.trends as TrendsReport | null) || createEmptyTrendsReport(filter);
  }

  const trendsBundle = readBootstrapPage('trends');
  if (
    trendsBundle &&
    matchesBootstrapScope(trendsBundle.scope, {
      startDate: filter.startDate || '',
      endDate: filter.endDate || '',
      interval: filter.interval || 'day',
      campaignId: filter.campaignId || '',
    }) &&
    trendsBundle.data &&
    Object.prototype.hasOwnProperty.call(trendsBundle.data, 'report')
  ) {
    return (trendsBundle.data.report as TrendsReport | null) || createEmptyTrendsReport(filter);
  }

  const query = buildQueryString({
    startDate: filter.startDate,
    endDate: filter.endDate,
    interval: filter.interval || 'day',
    campaignId: filter.campaignId,
  });
  const response = await authenticatedFetch(`/api/analytics/trend-report${query}`);
  const payload = await handleRawJsonResponse(response);
  const result = unwrapPayload<{
    data?: TrendsReport;
  }>(payload);

  return result?.data || createEmptyTrendsReport(filter);
}

export async function fetchTrendsCompare(params: {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  campaignId?: string;
}) {
  return {
    current: createEmptyTrendsReport({
      startDate: params.currentStart,
      endDate: params.currentEnd,
      campaignId: params.campaignId,
    }),
    previous: createEmptyTrendsReport({
      startDate: params.previousStart,
      endDate: params.previousEnd,
      campaignId: params.campaignId,
    }),
  };
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
  void filter;
  return [];
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
  const rulesBundle = readBootstrapPage('rules');
  if (
    rulesBundle &&
    matchesBootstrapScope(rulesBundle.scope, {
      type: params.type || 'all',
      status: params.status || 'all',
    })
  ) {
    return {
      list: Array.isArray(rulesBundle.data?.rules) ? rulesBundle.data.rules : [],
      meta: rulesBundle.data?.meta || { page: 1, pageSize: 200, total: 0 },
    };
  }

  const query = buildQueryString({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 200,
    type: params.type,
    status: params.status,
  });
  const result = await fetchPaginatedResult<Rule>(`/api/rules${query}`);

  return {
    list: result.list,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  };
}

export async function fetchRuleById(id: string): Promise<Rule> {
  const rule = findBootstrapEntityById<Rule>(['rules'], 'rules', id);
  if (rule) {
    return rule;
  }

  const response = await authenticatedFetch(`/api/rules/${id}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<Rule>(payload);
}

export async function createRule(data: CreateRuleDTO): Promise<Rule> {
  const response = await authenticatedFetch('/api/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateRule(id: string, data: UpdateRuleDTO): Promise<Rule> {
  const response = await authenticatedFetch(`/api/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteRule(id: string): Promise<void> {
  const response = await authenticatedFetch(`/api/rules/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

export async function enableRule(id: string): Promise<Rule> {
  const response = await authenticatedFetch(`/api/rules/${id}/enable`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function disableRule(id: string): Promise<Rule> {
  const response = await authenticatedFetch(`/api/rules/${id}/disable`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function getRuleExecutionHistory(id: string, limit: number = 50) {
  void id;
  void limit;
  return [];
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
  const platformsBundle = readBootstrapPage('platforms');
  if (platformsBundle && Array.isArray(platformsBundle.data?.platforms)) {
    return platformsBundle.data.platforms as Platform[];
  }

  return fetchListResult<Platform>('/api/platforms');
}

export async function fetchConfiguredPlatforms(): Promise<Platform[]> {
  return fetchListResult<Platform>('/api/platforms/configured');
}

export async function fetchPlatformById(platformId: string): Promise<Platform> {
  const bootstrapPlatforms = readBootstrapPage<{ platforms?: Platform[] }>('platforms');
  if (bootstrapPlatforms && Array.isArray(bootstrapPlatforms.data?.platforms)) {
    const matched = bootstrapPlatforms.data.platforms.find((platform) => platform.id === platformId);
    if (matched) {
      return matched;
    }
  }

  const response = await authenticatedFetch(`/api/platforms/${platformId}`);
  const payload = await handleRawJsonResponse(response);
  return unwrapPayload<Platform>(payload);
}

export async function configurePlatform(platformId: string, config: Record<string, unknown>): Promise<void> {
  const response = await authenticatedFetch(`/api/platforms/${platformId}/configure`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  await handleResponse(response);
}

export async function testPlatformConnection(platformId: string): Promise<{ platformId: string; connected: boolean }> {
  const response = await authenticatedFetch(`/api/platforms/${platformId}/test`, {
    method: 'POST',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function executePlatformAction(platformId: string, action: string, parameters: Record<string, unknown> = {}): Promise<unknown> {
  const response = await authenticatedFetch(`/api/platforms/${platformId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ action, parameters }),
  });
  const result = await handleResponse(response);
  return result.data;
}
