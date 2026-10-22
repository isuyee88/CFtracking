import type { Domain } from '../types/domain';
import type { ParameterTemplate, TrafficSource } from '../types/trafficSource';

/** 宏值形如 `{token}` / `{click_id}`，必须原样保留给流量平台替换，不能做 URL 编码。 */
const MACRO_PATTERN = /^\{[A-Za-z0-9_]+\}$/;

export function parseTrafficSourceParameters(parameters?: TrafficSource['parameters']): ParameterTemplate[] {
  if (!parameters) {
    return [];
  }

  if (Array.isArray(parameters)) {
    return parameters;
  }

  if (typeof parameters === 'string') {
    try {
      const parsed = JSON.parse(parameters);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * 只保留可承接点击的域名：`tracking` / `mixed` 用途且状态为 `active`。
 * `sslStatus === 'disabled'` 的域名不可用；其余 SSL 状态（auto/pending/custom）不影响点击路由。
 */
export function isUsableTrackingDomain(domain: Pick<Domain, 'usage' | 'status' | 'sslStatus'>): boolean {
  return (
    (domain.usage === 'tracking' || domain.usage === 'mixed') &&
    domain.status === 'active' &&
    domain.sslStatus !== 'disabled'
  );
}

/** 域名列表的稳定顺序：主域优先，其余按 hostname 字典序。 */
const PREFERRED_TRACKING_HOSTS = ['t.isuyee.com', 'go.chuanfly.com'];

export function sortTrackingDomains<T extends Pick<Domain, 'hostname'>>(domains: T[]): T[] {
  return [...domains].sort((a, b) => {
    const aRank = PREFERRED_TRACKING_HOSTS.indexOf(a.hostname);
    const bRank = PREFERRED_TRACKING_HOSTS.indexOf(b.hostname);
    if (aRank !== bRank) {
      if (aRank === -1) return 1;
      if (bRank === -1) return -1;
      return aRank - bRank;
    }
    return a.hostname.localeCompare(b.hostname);
  });
}

/** 默认选中：campaign.domain 命中可用跟踪域时优先，否则取列表第一个。 */
export function pickDefaultTrackingDomain(
  domains: Array<Pick<Domain, 'hostname'>>,
  campaignDomain?: string | null
): string {
  if (domains.length === 0) {
    return '';
  }
  const matched = campaignDomain
    ? domains.find((domain) => domain.hostname === campaignDomain)
    : undefined;
  return (matched || domains[0]).hostname;
}

function encodeMacroValue(value: string): string {
  return MACRO_PATTERN.test(value) ? value : encodeURIComponent(value);
}

/**
 * 生成带流量平台宏的跟踪链接。
 *
 * 路径固定为 `/c/{alias}`：这是 cf-tracking Worker 的短链入口（内部重写到
 * `/api/tracking/click/{alias}`）。旧 UI 使用的 `/link/{alias}` 在 Worker 里没有路由，
 * 只会落到管理后台 SPA，因此不能再使用。
 *
 * 查询串手工拼接而不是交给 `URLSearchParams`：它会把 `{token}` 编码成 `%7Btoken%7D`，
 * 流量平台无法识别宏，点击归因就会丢失 sub1..sub5。
 */
export function buildCampaignTrackingUrl(
  domain: string,
  alias: string,
  trafficSourceParameters?: TrafficSource['parameters'],
  campaignParameters?: Record<string, unknown> | null
): string {
  const trimmedDomain = (domain || '').trim();
  const trimmedAlias = (alias || '').trim();
  if (!trimmedDomain || !trimmedAlias) {
    return '';
  }

  const baseUrl = /^https?:\/\//i.test(trimmedDomain)
    ? trimmedDomain.replace(/\/+$/, '')
    : `https://${trimmedDomain.replace(/^\/+|\/+$/g, '')}`;
  const url = `${baseUrl}/c/${encodeURIComponent(trimmedAlias)}`;

  const pairs = new Map<string, string>();
  for (const parameter of parseTrafficSourceParameters(trafficSourceParameters)) {
    if (parameter?.paramName && parameter?.macro) {
      pairs.set(parameter.paramName, parameter.macro);
    }
  }
  for (const [name, value] of Object.entries(campaignParameters || {})) {
    if (name && typeof value === 'string' && value.trim()) {
      pairs.set(name, value.trim());
    }
  }

  if (pairs.size === 0) {
    return url;
  }

  const query = Array.from(pairs.entries())
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeMacroValue(value)}`)
    .join('&');
  return `${url}?${query}`;
}
