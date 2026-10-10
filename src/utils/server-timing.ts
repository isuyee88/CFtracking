export interface ServerTimingMetric {
  name: string;
  dur?: number;
  desc?: string;
}

function normalizeMetricName(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9!#$%&'*+.^_`|~-]/g, '_');
  return normalized || 'metric';
}

function normalizeDuration(value: number): number {
  return Number(Math.max(0, value).toFixed(1));
}

function serializeMetric(metric: ServerTimingMetric): string | null {
  const name = normalizeMetricName(metric.name);
  const parts = [name];

  if (typeof metric.dur === 'number' && Number.isFinite(metric.dur)) {
    parts.push(`dur=${normalizeDuration(metric.dur)}`);
  }

  if (metric.desc) {
    const escaped = metric.desc.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    parts.push(`desc="${escaped}"`);
  }

  return parts.join(';');
}

export function serializeServerTiming(metrics: ServerTimingMetric[]): string {
  return metrics
    .map(serializeMetric)
    .filter((metric): metric is string => Boolean(metric))
    .join(', ');
}

export function appendServerTiming(headers: Headers, metrics: ServerTimingMetric[]) {
  const serialized = serializeServerTiming(metrics);
  if (!serialized) {
    return;
  }

  headers.set('Server-Timing', serialized);
}

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function durationMs(startedAt: number, endedAt = nowMs()): number {
  return normalizeDuration(endedAt - startedAt);
}
