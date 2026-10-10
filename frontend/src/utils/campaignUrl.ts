import type { ParameterTemplate, TrafficSource } from '../types/trafficSource';

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

export function buildCampaignTrackingUrl(
  domain: string,
  alias: string,
  parameters?: TrafficSource['parameters']
): string {
  if (!domain || !alias) {
    return '';
  }

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const url = new URL(`/${alias}`, baseUrl.replace(/\/$/, ''));

  for (const parameter of parseTrafficSourceParameters(parameters)) {
    if (parameter?.paramName && parameter?.macro) {
      url.searchParams.set(parameter.paramName, parameter.macro);
    }
  }

  return url.toString();
}
