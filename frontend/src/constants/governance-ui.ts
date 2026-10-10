export type GovernanceActionValue = 'allow' | 'block' | 'challenge' | 'redirect' | string;

export type GovernanceLayerValue =
  | 'flow'
  | 'campaign'
  | 'traffic_source'
  | 'global'
  | 'whitelist'
  | 'blacklist'
  | 'allow_exact'
  | 'allow_verified_bot'
  | 'block_exact'
  | 'block_category_aggressive'
  | 'allow_bias'
  | 'suspicious_queue'
  | string;

export interface ConditionFieldMeta {
  label: string;
  placeholder?: string;
  listPlaceholder?: string;
  helpText?: string;
}

export const LIST_CONDITION_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ip', label: 'IP' },
  { value: 'asn', label: 'ASN' },
  { value: 'visitorId', label: 'Visitor ID' },
  { value: 'userAgent', label: 'User Agent' },
  { value: 'zoneId', label: 'Zone ID' },
  { value: 'country', label: 'Country' },
  { value: 'device', label: 'Device' },
  { value: 'isp', label: 'ISP' },
  { value: 'ispType', label: 'ISP Type' },
  { value: 'orgName', label: 'Org Name' },
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'verifiedBot', label: 'Verified Bot' },
  { value: 'botScore', label: 'Bot Score' },
  { value: 'ja3', label: 'JA3' },
  { value: 'ja4', label: 'JA4' },
  { value: 'jsDetectionPassed', label: 'JS Detection' },
  { value: 'challengeState', label: 'Challenge State' },
  { value: 'tokenReplayState', label: 'Token Replay State' },
  { value: 'campaignCount7d', label: 'Campaign Count (7d)' },
  { value: 'visitorRepeat7d', label: 'Visitor Repeat (7d)' },
  { value: 'ipRepeat7d', label: 'IP Repeat (7d)' },
  { value: 'suspiciousSignal', label: 'Suspicious Signal' },
  { value: 'utmSource', label: 'UTM Source' },
  { value: 'utmCampaign', label: 'UTM Campaign' },
  { value: 'browser', label: 'Browser' },
  { value: 'subId1', label: 'SubID 1' },
  { value: 'subId2', label: 'SubID 2' },
  { value: 'subId3', label: 'SubID 3' },
  { value: 'subId4', label: 'SubID 4' },
  { value: 'subId5', label: 'SubID 5' },
];

export const RULE_BUILDER_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'campaignId', label: 'Campaign ID' },
  { value: 'trafficSourceId', label: 'Traffic Source ID' },
  { value: 'ip', label: 'IP' },
  { value: 'asn', label: 'ASN' },
  { value: 'visitorId', label: 'Visitor ID' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'device', label: 'Device' },
  { value: 'browser', label: 'Browser' },
  { value: 'isp', label: 'ISP' },
  { value: 'ispType', label: 'ISP Type' },
  { value: 'orgName', label: 'Org Name' },
  { value: 'zoneId', label: 'Zone ID' },
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'verifiedBot', label: 'Verified Bot' },
  { value: 'botScore', label: 'Bot Score' },
  { value: 'ja3', label: 'JA3' },
  { value: 'ja4', label: 'JA4' },
  { value: 'jsDetectionPassed', label: 'JS Detection' },
  { value: 'challengeState', label: 'Challenge State' },
  { value: 'tokenReplayState', label: 'Token Replay State' },
  { value: 'campaignCount7d', label: 'Campaign Count (7d)' },
  { value: 'visitorRepeat7d', label: 'Visitor Repeat (7d)' },
  { value: 'ipRepeat7d', label: 'IP Repeat (7d)' },
  { value: 'utmSource', label: 'UTM Source' },
  { value: 'utmCampaign', label: 'UTM Campaign' },
  { value: 'subIds', label: 'Sub IDs' },
  { value: 'suspiciousSignals', label: 'Suspicious Signals' },
];

const CONDITION_FIELD_META: Record<string, ConditionFieldMeta> = {
  ip: { label: 'IP', placeholder: '203.0.113.7', listPlaceholder: '203.0.113.7,198.51.100.12', helpText: 'Use exact IPs or combine with the list type for CIDR-aware governance.' },
  asn: { label: 'ASN', placeholder: '13335', listPlaceholder: '13335,16509,14618', helpText: 'Enter the ASN number with or without the AS prefix.' },
  visitorId: { label: 'Visitor ID', placeholder: 'vst_abc123', listPlaceholder: 'vst_abc123,vst_def456', helpText: 'Targets the persisted visitor identifier used across repeat-visit checks.' },
  userAgent: { label: 'User Agent', placeholder: 'Mozilla/5.0', listPlaceholder: 'Googlebot,Mozilla/5.0', helpText: 'Useful for exact browser signatures or crawler fragments.' },
  zoneId: { label: 'Zone ID', placeholder: 'zone-7', listPlaceholder: 'zone-7,zone-12', helpText: 'Matches the resolved zone signature from sub IDs.' },
  country: { label: 'Country', placeholder: 'US', listPlaceholder: 'US,CA,DE', helpText: 'Use ISO 3166-1 alpha-2 country codes.' },
  device: { label: 'Device', placeholder: 'mobile', listPlaceholder: 'mobile,desktop,tablet', helpText: 'Matches the normalized device family.' },
  isp: { label: 'ISP', placeholder: 'Comcast Cable', listPlaceholder: 'Comcast Cable,AT&T Internet', helpText: 'Use for exact or partial carrier matching when ISP type is not enough.' },
  ispType: { label: 'ISP Type', placeholder: 'Fixed Line ISP', listPlaceholder: 'Fixed Line ISP,Mobile ISP', helpText: 'Normalized network class such as Mobile ISP or Data Center/Web Hosting/Transit.' },
  orgName: { label: 'Org Name', placeholder: 'Google Fiber', listPlaceholder: 'Google Fiber,Comcast Cable', helpText: 'Normalized autonomous-system organization emitted by the detection pipeline.' },
  fingerprint: { label: 'Fingerprint', placeholder: 'fp_8d31...', listPlaceholder: 'fp_8d31,fp_19ab', helpText: 'Browser or device fingerprint value captured at click time.' },
  verifiedBot: { label: 'Verified Bot', placeholder: 'true or false', listPlaceholder: 'true,false', helpText: 'Boolean Cloudflare bot verification flag.' },
  botScore: { label: 'Bot Score', placeholder: '30', listPlaceholder: '1,30,99', helpText: 'Numeric Cloudflare bot score. Lower usually means riskier.' },
  ja3: { label: 'JA3', placeholder: 'd4e5f6...', listPlaceholder: 'hash_a,hash_b', helpText: 'TLS JA3 fingerprint hash from Cloudflare Bot Management.' },
  ja4: { label: 'JA4', placeholder: 't13d15...', listPlaceholder: 'hash_a,hash_b', helpText: 'JA4 client fingerprint reported by Cloudflare.' },
  jsDetectionPassed: { label: 'JS Detection', placeholder: 'true or false', listPlaceholder: 'true,false', helpText: 'Whether Cloudflare JavaScript detection completed successfully.' },
  challengeState: { label: 'Challenge State', placeholder: 'passed', listPlaceholder: 'pending,passed,failed', helpText: 'Turnstile or challenge workflow state captured on the request.' },
  tokenReplayState: { label: 'Token Replay State', placeholder: 'clean', listPlaceholder: 'clean,replayed,missing', helpText: 'Replay detection outcome for anti-bot or anti-fraud tokens.' },
  campaignCount7d: { label: 'Campaign Count (7d)', placeholder: '3', listPlaceholder: '3,8,20', helpText: 'Examples: 3, 8, 20. Number of distinct campaigns touched in the last 7 days.' },
  visitorRepeat7d: { label: 'Visitor Repeat (7d)', placeholder: '12', listPlaceholder: '3,8,20', helpText: 'Examples: 3, 8, 20. Number of recent visits from the same visitor ID over the last 7 days.' },
  ipRepeat7d: { label: 'IP Repeat (7d)', placeholder: '12', listPlaceholder: '3,8,20', helpText: 'Examples: 3, 8, 20. Number of recent visits from the same IP over the last 7 days.' },
  suspiciousSignal: { label: 'Suspicious Signal', placeholder: 'no_js_data', listPlaceholder: 'no_js_data,tz_discrepancy', helpText: 'Use pipeline tags such as no_js_data, uncommon_isp, or tz_discrepancy.' },
  utmSource: { label: 'UTM Source', placeholder: 'facebook', listPlaceholder: 'facebook,google,tiktok', helpText: 'Raw utm_source value captured from the click URL.' },
  utmCampaign: { label: 'UTM Campaign', placeholder: 'spring-sale', listPlaceholder: 'spring-sale,q2-retargeting', helpText: 'Raw utm_campaign value captured from the click URL.' },
  browser: { label: 'Browser', placeholder: 'Chrome', listPlaceholder: 'Chrome,Safari,Firefox', helpText: 'Normalized browser family from the tracking request.' },
  subId1: { label: 'SubID 1', placeholder: 'zone-7', listPlaceholder: 'zone-7,zone-12', helpText: 'First incoming sub ID value.' },
  subId2: { label: 'SubID 2', placeholder: 'creative-1', listPlaceholder: 'creative-1,creative-8', helpText: 'Second incoming sub ID value.' },
  subId3: { label: 'SubID 3', placeholder: 'publisher-1', listPlaceholder: 'publisher-1,publisher-9', helpText: 'Third incoming sub ID value.' },
  subId4: { label: 'SubID 4', placeholder: 'sub4_value', listPlaceholder: 'sub4_value,sub4_alt', helpText: 'Fourth incoming sub ID value.' },
  subId5: { label: 'SubID 5', placeholder: 'sub5_value', listPlaceholder: 'sub5_value,sub5_alt', helpText: 'Fifth incoming sub ID value.' },
  campaignId: { label: 'Campaign ID', placeholder: 'camp-1', helpText: 'Matches the internal campaign identifier.' },
  trafficSourceId: { label: 'Traffic Source ID', placeholder: 'ts-1', helpText: 'Matches the stored traffic source identifier or binding.' },
  city: { label: 'City', placeholder: 'Toronto', helpText: 'Matches the resolved city from the request.' },
  subIds: { label: 'Sub IDs', placeholder: 'zone-7', helpText: 'Stringifies the collected sub ID array for contains-style matching.' },
  suspiciousSignals: { label: 'Suspicious Signals', placeholder: 'no_js_data', helpText: 'Stringifies the suspicious signal array for contains-style rule checks.' },
};

export function getConditionFieldMeta(field: string): ConditionFieldMeta {
  return CONDITION_FIELD_META[field] || { label: field, placeholder: 'Enter value', listPlaceholder: 'a,b,c' };
}

export function formatGovernanceActionLabel(action: GovernanceActionValue | null | undefined): string {
  switch (String(action || '').toLowerCase()) {
    case 'allow':
      return 'Allow';
    case 'block':
      return 'Block';
    case 'challenge':
      return 'Challenge';
    case 'redirect':
      return 'Redirect';
    default:
      return action ? String(action) : '-';
  }
}

export function formatMatchedRuleLayerLabel(layer: GovernanceLayerValue | null | undefined): string {
  switch (String(layer || '').toLowerCase()) {
    case 'flow':
      return 'Flow Rule';
    case 'campaign':
      return 'Campaign Rule';
    case 'traffic_source':
      return 'Traffic Source Rule';
    case 'global':
      return 'Global Rule';
    case 'whitelist':
      return 'Whitelist';
    case 'blacklist':
      return 'Blacklist';
    case 'allow_exact':
      return 'Whitelist: Exact Match';
    case 'allow_verified_bot':
      return 'Whitelist: Verified Bot';
    case 'block_exact':
      return 'Blacklist: Exact Match';
    case 'block_category_aggressive':
      return 'Blacklist: Aggressive Category';
    case 'allow_bias':
      return 'Whitelist: Allow Bias';
    case 'suspicious_queue':
      return 'Observation Queue';
    default:
      return layer ? String(layer) : '-';
  }
}

export function formatGovernanceSummary(input: {
  action?: GovernanceActionValue | null;
  layer?: GovernanceLayerValue | null;
  reason?: string | null;
}): string {
  const parts = [
    formatGovernanceActionLabel(input.action),
    formatMatchedRuleLayerLabel(input.layer),
    formatMatchedRuleReasonLabel(input.reason),
  ].filter((value) => value && value !== '-');

  return parts.length > 0 ? parts.join(' | ') : '-';
}

const LIST_REASON_LABELS: Record<string, string> = {
  ip: 'IP',
  fingerprint: 'Fingerprint',
  visitor_id: 'Visitor ID',
  asn: 'ASN',
  country: 'Country',
  isp: 'ISP',
  user_agent: 'User Agent',
  zone: 'Zone ID',
  sub_id: 'Sub ID',
  device: 'Device',
  org_exact: 'Exact Organization',
  org_keyword: 'Organization Keyword',
  isp_type: 'ISP Type',
  network_tag: 'Network Tag',
  suspicious_reason: 'Suspicious Reason',
  allow_bias_org: 'Allow Bias Organization',
  allow_bias_isp_type: 'Allow Bias ISP Type',
};

const STATIC_REASON_LABELS: Record<string, string> = {
  verified_bot_observe: 'Verified bot observed',
  scope_inherit_without_effective_config: 'Scoped config exists but no effective rules were resolved',
  scope_schema_unavailable: 'Autorule scope schema unavailable',
  scope_off: 'Autorule scope is turned off',
  whitelist_gate_unmatched: 'Whitelist gate left the request unmatched',
  no_bound_rule_matched: 'No bound rule matched the request',
  bound_rule_unavailable: 'A bound rule reference was unavailable',
  matched_rule_set_entry: 'Matched a rule-set entry',
  rule_set_default: 'Rule-set default action applied',
  legacy_conditions_not_matched: 'Legacy rule conditions did not match',
  legacy_conditions_matched: 'Legacy rule conditions matched',
  expression_not_matched: 'Rule expression did not match',
  expression_matched: 'Rule expression matched',
  invalid_rule_payload: 'Rule payload was invalid',
  trusted_bypass: 'Trusted challenge bypass applied',
};

function formatListMatchReason(reason: string): string | null {
  const match = /^(allow_exact|block_exact|block_category_aggressive|allow_bias|suspicious_queue)_(.+)_matched$/.exec(reason);
  if (!match) {
    return null;
  }

  const [, layer, rawType] = match;
  const typeLabel = LIST_REASON_LABELS[rawType] || rawType;

  switch (layer) {
    case 'allow_exact':
      return `Whitelist exact match on ${typeLabel}`;
    case 'block_exact':
      return `Blacklist exact match on ${typeLabel}`;
    case 'block_category_aggressive':
      return `Aggressive category block matched ${typeLabel}`;
    case 'allow_bias':
      return `Allow-bias match on ${typeLabel}`;
    case 'suspicious_queue':
      return `Observation queue match on ${typeLabel}`;
    default:
      return null;
  }
}

function formatStructuredReasonParts(reason: string): string | null {
  const parts = String(reason || '').split(':').filter(Boolean);
  if (parts.length <= 1) {
    return null;
  }

  const result: string[] = [];
  let index = 0;

  while (index < parts.length) {
    const token = parts[index] || '';
    const next = parts[index + 1];

    switch (token) {
      case 'blocked_user_agent':
        result.push(`Blocked user agent matched "${next || ''}"`);
        index += 2;
        break;
      case 'blocked_network_tag':
        result.push(`Blocked network tag matched "${next || ''}"`);
        index += 2;
        break;
      case 'blocked_isp_type':
        result.push(`Blocked ISP type matched "${next || ''}"`);
        index += 2;
        break;
      case 'blocked_org_exact':
        result.push(`Blocked exact organization matched "${next || ''}"`);
        index += 2;
        break;
      case 'blocked_org_keyword':
        result.push(`Blocked organization keyword matched "${next || ''}"`);
        index += 2;
        break;
      case 'allow_bias_isp_type':
        result.push(`Allow bias matched ISP type "${next || ''}"`);
        index += 2;
        break;
      case 'allow_bias_org':
        result.push(`Allow bias matched organization "${next || ''}"`);
        index += 2;
        break;
      case 'suspicious_signal':
        result.push(`Suspicious signal observed "${next || ''}"`);
        index += 2;
        break;
      default: {
        const staticLabel = STATIC_REASON_LABELS[token];
        if (staticLabel) {
          result.push(staticLabel);
          index += 1;
          break;
        }

        const listMatchLabel = formatListMatchReason(token);
        if (listMatchLabel) {
          result.push(listMatchLabel);
          index += 1;
          break;
        }

        result.push(token);
        index += 1;
        break;
      }
    }
  }

  return result.length > 0 ? result.join(' | ') : null;
}

export function formatMatchedRuleReasonLabel(reason: string | null | undefined): string {
  const normalized = String(reason || '').trim();
  if (!normalized) {
    return '-';
  }

  const structured = formatStructuredReasonParts(normalized);
  if (structured) {
    return structured;
  }

  const listMatch = formatListMatchReason(normalized);
  if (listMatch) {
    return listMatch;
  }

  const staticLabel = STATIC_REASON_LABELS[normalized];
  if (staticLabel) {
    return staticLabel;
  }

  return normalized.replace(/_/g, ' ');
}

