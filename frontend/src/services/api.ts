/**
 * @fileoverview API 服务
 * @description 统一封装后端 API 调用
 * @module services/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 简单的内存缓存 - 用于减少重复请求
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
export async function fetchCampaignStats(
  id: string | number,
  params: { startDate?: string; endDate?: string } = {}
) {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  const query = queryParams.toString();

  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}/stats${query ? `?${query}` : ''}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function regenerateCampaignToken(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}/regenerate-token`, {
    method: 'POST',
  });
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

// ==================== Domains API ====================

export async function fetchDomains(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/domains?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
}

export async function fetchDomain(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/domains/${id}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function createDomain(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateDomain(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/domains/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteDomain(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/domains/${id}`, {
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
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/schema`);
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchFlowRules(flowId: string): Promise<FlowRuleDocument[]> {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/rules`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function createFlowRule(flowId: string, data: CreateFlowRuleDTO): Promise<FlowRuleDocument> {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateFlowRule(ruleId: string, data: UpdateFlowRuleDTO): Promise<FlowRuleDocument> {
  const response = await fetch(`${API_BASE_URL}/api/flows/rules/${ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteFlowRule(ruleId: string) {
  const response = await fetch(`${API_BASE_URL}/api/flows/rules/${ruleId}`, {
    method: 'DELETE',
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function testFlow(
  flowId: string,
  visitData: FlowValidationVisitData
): Promise<FlowValidationResult> {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitData }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchFlowFilterOperators(): Promise<FlowFilterOption[]> {
  const response = await fetch(`${API_BASE_URL}/api/flows/filters/operators`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function fetchFlowFilterTargets(): Promise<FlowTargetOption[]> {
  const response = await fetch(`${API_BASE_URL}/api/flows/filters/targets`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function equalizeCampaignFlows(campaignId: string) {
  const response = await fetch(`${API_BASE_URL}/api/flows/equalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId }),
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function cloneFlow(flowId: string) {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/clone`, {
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
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  const query = queryParams.toString();

  const response = await fetch(`${API_BASE_URL}/api/flows/campaign/${campaignId}/stats${query ? `?${query}` : ''}`);
  const result = await handleResponse(response);
  return result.data || [];
}

export async function fetchFlowLogs(
  flowId: string,
  params: { limit?: number; offset?: number; startDate?: string; endDate?: string } = {}
): Promise<FlowLogListResult> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.offset) queryParams.set('offset', String(params.offset));
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/logs?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data || { logs: [], total: 0, hasMore: false };
}

// ==================== Landings API ====================

export async function fetchLandings(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/landing-pages?withStats=${withStats}`);
  const result = await handleResponse(response);
  return result.data?.list || result.data || [];
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
  const result = unwrapPayload<any>(await handleResponse(response));
  setCache(cacheKey, result);
  return result;
}

// 获取最近点击数据
export async function fetchRecentClicks(limit: number = 10, timeRange: string = 'today') {
  const cacheKey = createCacheKey('/api/analytics/recent-clicks', { limit, range: timeRange });
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  
  const response = await fetch(`${API_BASE_URL}/api/analytics/recent-clicks?limit=${limit}&range=${timeRange}`);
  const result = unwrapPayload<any>(await handleResponse(response));
  const data = result?.list || result || [];
  setCache(cacheKey, data);
  return data;
}

// 获取实体统计数据
export async function fetchEntityStats(entityType: string, timeRange: string = 'today') {
  const cacheKey = createCacheKey('/api/analytics/entity-stats', { type: entityType, range: timeRange });
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE_URL}/api/analytics/entity-stats?type=${entityType}&range=${timeRange}`);
  const result = unwrapPayload<any[]>(await handleResponse(response));
  setCache(cacheKey, result);
  return result;
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
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  if (params.groupBy) queryParams.set('groupBy', params.groupBy.join(','));
  if (params.metrics) queryParams.set('metrics', params.metrics.join(','));
  if (params.filters?.length) queryParams.set('filters', JSON.stringify(params.filters));
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const response = await fetch(`${API_BASE_URL}/api/analytics/reports/${type}?${queryParams}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function queryReport(params: ReportParams) {
  const response = await fetch(`${API_BASE_URL}/api/analytics/reports/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const result = await handleResponse(response);
  return result.data?.data || result.data || [];
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
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.campaignId) queryParams.set('campaignId', params.campaignId);
  if (params.offerId) queryParams.set('offerId', params.offerId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.status) queryParams.set('status', params.status);
  if (params.country) queryParams.set('country', params.country);
  if (params.device) queryParams.set('device', params.device);
  if (params.search) queryParams.set('search', params.search);

  const response = await fetch(`${API_BASE_URL}/api/conversions?${queryParams.toString()}`);
  const result = await handleResponse(response);

  return {
    list: result.data || [],
    total: result.meta?.total || 0,
    page: result.meta?.page || 1,
    pageSize: result.meta?.pageSize || 20,
    totalPages: result.meta?.totalPages || 0,
  };
}

export async function fetchConversionStats(
  startDate: string,
  endDate: string,
  campaignId?: string
): Promise<ConversionStats> {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', startDate);
  queryParams.set('endDate', endDate);
  if (campaignId) queryParams.set('campaignId', campaignId);

  const response = await fetch(`${API_BASE_URL}/api/conversions/stats?${queryParams.toString()}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchConversionById(conversionId: string): Promise<ConversionLogItem> {
  const response = await fetch(`${API_BASE_URL}/api/conversions/${conversionId}`);
  const result = await handleResponse(response);
  return result.data;
}

export async function updateConversionStatus(
  conversionId: string,
  status: 'approved' | 'pending' | 'rejected'
): Promise<{ updated: boolean; conversionId: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/conversions/${conversionId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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

export async function fetchUserPreferences(userId: string): Promise<UserPreferenceDocument> {
  const response = await fetch(`${API_BASE_URL}/api/user-preferences/preferences/${userId}`, {
    headers: {
      'X-Device-ID': getDeviceId(),
    },
  });

  return handleRawJsonResponse<UserPreferenceDocument>(response);
}

export async function saveUserPreferences(
  userId: string,
  payload: SaveUserPreferencesPayload
): Promise<UserPreferenceDocument> {
  const response = await fetch(`${API_BASE_URL}/api/user-preferences/preferences/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
