import type { ParameterTemplate } from '@/types/trafficSource';

const MACRO_PATTERN = /\{\{[^{}]+\}\}|\{[^{}]+\}|__[A-Za-z0-9_.-]+__/g;

const DEFAULT_MACRO_CONTEXT: Record<string, string> = {
  click_id: 'clk_demo_1001',
  clickid: 'clk_demo_1001',
  token: 'tok_demo_1001',
  source: 'facebook',
  geo: 'US',
  country: 'US',
  city: 'Los Angeles',
  state: 'CA',
  device: 'mobile',
  campaign_id: 'cmp_101',
  campaignid: 'cmp_101',
  campaignname: 'spring_sale',
  campaign: 'spring_sale',
  creative_id: 'crt_09',
  creativeid: 'crt_09',
  adset_id: 'adset_02',
  adsetid: 'adset_02',
  bid: '1.25',
  payout: '2.50',
  revenue: '3.20',
  amount: '3.20',
  currency: 'USD',
  status: 'sale',
  clickstatus: 'sale',
  timestamp: '1712620800',
};

function normalizeMacroToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed.slice(2, -2).trim().toLowerCase();
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1).trim().toLowerCase();
  }
  if (trimmed.startsWith('__') && trimmed.endsWith('__')) {
    return trimmed.slice(2, -2).trim().toLowerCase();
  }
  return trimmed.toLowerCase();
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function extractMacros(input: string): string[] {
  if (!input) {
    return [];
  }

  const matches = input.match(MACRO_PATTERN) || [];
  const unique = new Set<string>();
  for (const macro of matches) {
    unique.add(macro);
  }

  return Array.from(unique);
}

function parseParameters(raw: unknown): ParameterTemplate[] {
  if (!raw) {
    return [];
  }

  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      return {
        alias: typeof candidate.alias === 'string' ? candidate.alias : '',
        paramName: typeof candidate.paramName === 'string' ? candidate.paramName : '',
        macro: typeof candidate.macro === 'string' ? candidate.macro : '',
      } satisfies ParameterTemplate;
    });
}

function resolveTokenValue(
  token: string,
  contextLookup: Map<string, string>
): { value: string; unresolved: boolean } {
  const key = normalizeMacroToken(token);
  const fromContext = contextLookup.get(key);
  if (fromContext !== undefined) {
    return { value: fromContext, unresolved: false };
  }

  const fromDefault = DEFAULT_MACRO_CONTEXT[key];
  if (fromDefault !== undefined) {
    return { value: fromDefault, unresolved: false };
  }

  return { value: token, unresolved: true };
}

function replaceTemplateTokens(
  template: string,
  contextLookup: Map<string, string>
): { rendered: string; unresolvedMacros: string[] } {
  if (!template) {
    return { rendered: '', unresolvedMacros: [] };
  }

  const unresolved = new Set<string>();
  const rendered = template.replace(MACRO_PATTERN, (token) => {
    const resolved = resolveTokenValue(token, contextLookup);
    if (resolved.unresolved) {
      unresolved.add(token);
    }
    return resolved.value;
  });

  return {
    rendered,
    unresolvedMacros: Array.from(unresolved),
  };
}

export interface TrafficSourceMacroPreviewInput {
  parameters?: ParameterTemplate[] | string;
  postbackUrl?: string;
  context?: Record<string, unknown>;
}

export interface TrafficSourceMacroPreviewResult {
  generatedAt: string;
  sampleContext: Record<string, string>;
  trackingQuery: string;
  parameterPreview: Array<{
    alias: string;
    paramName: string;
    macro: string;
    resolvedValue: string;
    queryPair: string;
    unresolved: boolean;
  }>;
  postbackTemplate: string;
  postbackPreview: string;
  detectedMacros: string[];
  unresolvedMacros: string[];
}

export function buildTrafficSourceMacroPreview(
  input: TrafficSourceMacroPreviewInput
): TrafficSourceMacroPreviewResult {
  const parameters = parseParameters(input.parameters);
  const postbackTemplate = typeof input.postbackUrl === 'string' ? input.postbackUrl : '';
  const context = input.context && typeof input.context === 'object' ? input.context : {};

  const contextLookup = new Map<string, string>();
  const mergedContext: Record<string, string> = {};
  Object.entries(context).forEach(([key, value]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      return;
    }
    const stringValue = toStringValue(value);
    contextLookup.set(normalizedKey, stringValue);
    mergedContext[normalizedKey] = stringValue;
  });

  const allDetected = new Set<string>();
  const allUnresolved = new Set<string>();

  const parameterPreview = parameters.map((param) => {
    const macroTemplate = typeof param.macro === 'string' ? param.macro : '';
    extractMacros(macroTemplate).forEach((macro) => allDetected.add(macro));
    const macroResult = replaceTemplateTokens(macroTemplate, contextLookup);
    macroResult.unresolvedMacros.forEach((macro) => allUnresolved.add(macro));

    const queryPair = `${encodeURIComponent(param.paramName || '')}=${encodeURIComponent(
      macroResult.rendered
    )}`;

    return {
      alias: param.alias,
      paramName: param.paramName,
      macro: macroTemplate,
      resolvedValue: macroResult.rendered,
      queryPair,
      unresolved: macroResult.unresolvedMacros.length > 0,
    };
  });

  const postbackDetected = extractMacros(postbackTemplate);
  postbackDetected.forEach((macro) => allDetected.add(macro));
  const postbackResult = replaceTemplateTokens(postbackTemplate, contextLookup);
  postbackResult.unresolvedMacros.forEach((macro) => allUnresolved.add(macro));

  const trackingQuery = parameterPreview.map((entry) => entry.queryPair).join('&');

  return {
    generatedAt: new Date().toISOString(),
    sampleContext: mergedContext,
    trackingQuery,
    parameterPreview,
    postbackTemplate,
    postbackPreview: postbackResult.rendered,
    detectedMacros: Array.from(allDetected),
    unresolvedMacros: Array.from(allUnresolved),
  };
}
