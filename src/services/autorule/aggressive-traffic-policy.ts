/**
 * @fileoverview Built-in aggressive traffic policy defaults
 * @description High-confidence allow/block/bias helpers used before scoped autorules.
 * @module services/autorule/aggressive-traffic-policy
 */

import type { AutoruleVisitContext } from './list-resolver.service';

export const AGGRESSIVE_VISITOR_REPEAT_THRESHOLD = 20;
export const AGGRESSIVE_CAMPAIGN_SPREAD_THRESHOLD = 3;
const BLOCKED_ISP_TYPES = new Set([
  'data center/web hosting/transit',
  'university/college/school',
  'government',
]);

const BLOCKED_ORG_EXACT = new Set([
  'amazon.com',
  'google cloud',
  'digital ocean',
  'ovhcloud',
  'datacamp',
  'limestone networks',
  'packethub',
  'clouvider',
  'zenlayer',
  'leaseweb',
  'sharktech',
  'nordvpn',
  'zscaler',
  'palo alto networks',
  'cloudflare warp',
]);

const BLOCKED_ORG_KEYWORDS = [
  'host',
  'hosting',
  'cloud',
  'datacenter',
  'vps',
  'server',
  'proxy',
  'vpn',
  'warp',
  'zscaler',
  'palo',
  'camp',
];

const ALLOW_BIAS_ISP_TYPES = new Set([
  'fixed line isp',
  'res. & mobile',
  'mobile isp',
]);

const ALLOW_BIAS_ORGS = [
  'spectrum',
  'comcast cable',
  'at&t internet',
  'at&t wireless',
  'verizon fios',
  'verizon 5g home',
  'cox communications',
  'frontier communications',
  'centurylink',
  'optimum',
  't-mobile usa',
  'google fiber',
  'starlink',
  'windstream communications',
  'shentel communications',
  'tec internet',
];

const BLOCKED_UA_PATTERNS = [
  'headlesschrome',
  'puppeteer',
  'playwright',
  'selenium',
  'phantomjs',
  'python-requests',
  'curl',
  'wget',
  'go-http-client',
  'java/',
  'okhttp',
  'libwww-perl',
];

const HARD_BLOCK_NETWORK_TAGS = new Set([
  'global_db',
  'blacklisted_visitor_id',
  'invalid_click',
  'headless_browser',
  'proxy',
  'botnet_ips',
  'affiliates_spy_tools',
  'client_libraries',
  'detected_bots',
  'datacenter_asn',
]);

const SUSPICIOUS_QUEUE_SIGNALS = new Set([
  'uncommon_isp',
  'edge_caches',
  'no_js_data',
  'switched_browsers',
  'tz_discrepancy',
  'device',
  'no_javascript',
  'country',
  'uncommon_os',
]);

export interface BuiltinAggressiveMatch {
  layer: 'block_exact' | 'block_category_aggressive' | 'allow_bias' | 'suspicious_queue';
  reason: string;
}

export function matchBuiltinExactBlock(ctx: AutoruleVisitContext): BuiltinAggressiveMatch | null {
  const ua = normalize(ctx.userAgent);
  if (ua) {
    const matchedPattern = BLOCKED_UA_PATTERNS.find((pattern) => ua.includes(pattern));
    if (matchedPattern) {
      return {
        layer: 'block_exact',
        reason: `blocked_user_agent:${matchedPattern}`,
      };
    }
  }

  const matchedNetworkTag = (ctx.networkTags || [])
    .map((value) => normalize(value))
    .find((value) => value && HARD_BLOCK_NETWORK_TAGS.has(value));
  if (matchedNetworkTag) {
    return {
      layer: 'block_exact',
      reason: `blocked_network_tag:${matchedNetworkTag}`,
    };
  }

  return null;
}

export function matchBuiltinAggressiveCategoryBlock(ctx: AutoruleVisitContext): BuiltinAggressiveMatch | null {
  const ispType = normalize(ctx.ispType);
  if (ispType && BLOCKED_ISP_TYPES.has(ispType)) {
    return {
      layer: 'block_category_aggressive',
      reason: `blocked_isp_type:${ispType}`,
    };
  }

  const orgName = normalize(ctx.orgName);
  if (orgName && BLOCKED_ORG_EXACT.has(orgName)) {
    return {
      layer: 'block_category_aggressive',
      reason: `blocked_org_exact:${orgName}`,
    };
  }

  if (orgName) {
    const keyword = BLOCKED_ORG_KEYWORDS.find((item) => orgName.includes(item));
    if (keyword) {
      return {
        layer: 'block_category_aggressive',
        reason: `blocked_org_keyword:${keyword}`,
      };
    }
  }

  return null;
}

export function matchBuiltinAllowBias(ctx: AutoruleVisitContext): BuiltinAggressiveMatch | null {
  const ispType = normalize(ctx.ispType);
  if (ispType && ALLOW_BIAS_ISP_TYPES.has(ispType)) {
    return {
      layer: 'allow_bias',
      reason: `allow_bias_isp_type:${ispType}`,
    };
  }

  const orgName = normalize(ctx.orgName);
  if (orgName) {
    const matchedOrg = ALLOW_BIAS_ORGS.find((item) => orgName.includes(item));
    if (matchedOrg) {
      return {
        layer: 'allow_bias',
        reason: `allow_bias_org:${matchedOrg}`,
      };
    }
  }

  return null;
}

export function matchBuiltinSuspiciousSignal(ctx: AutoruleVisitContext): BuiltinAggressiveMatch | null {
  const matchedSignal = (ctx.suspiciousSignals || [])
    .map((value) => normalize(value))
    .find((value) => value && SUSPICIOUS_QUEUE_SIGNALS.has(value));

  if (!matchedSignal) {
    return null;
  }

  return {
    layer: 'suspicious_queue',
    reason: `suspicious_signal:${matchedSignal}`,
  };
}

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}
