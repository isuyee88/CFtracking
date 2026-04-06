interface PerformanceDebugApi {
  dumpServerTiming: () => void;
  enabled: boolean;
}

declare global {
  interface Window {
    __CFTRACKING_PERF__?: PerformanceDebugApi;
  }
}

const LOGGED_ENTRY_KEYS = new Set<string>();

function isPerformanceDebugEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get('perf') === '1' || window.localStorage.getItem('cftracking:perf') === '1';
}

function shouldLogEntry(entry: PerformanceEntry & { serverTiming?: PerformanceServerTiming[] }) {
  const name = entry.name || window.location.href;
  return (
    entry.entryType === 'navigation' ||
    name.includes('/__bootstrap/') ||
    name === window.location.href ||
    name.startsWith(`${window.location.origin}/__bootstrap/`)
  );
}

function formatServerTiming(entry: PerformanceEntry & { serverTiming?: PerformanceServerTiming[] }) {
  return (entry.serverTiming || []).map((metric) => ({
    name: metric.name,
    duration: Number(metric.duration.toFixed(1)),
    description: metric.description || '',
  }));
}

function logEntry(entry: PerformanceEntry & { serverTiming?: PerformanceServerTiming[] }) {
  if (!shouldLogEntry(entry)) {
    return;
  }

  const key = `${entry.entryType}:${entry.name}:${entry.startTime}:${entry.duration}`;
  if (LOGGED_ENTRY_KEYS.has(key)) {
    return;
  }
  LOGGED_ENTRY_KEYS.add(key);

  const metrics = formatServerTiming(entry);
  if (metrics.length === 0) {
    return;
  }

  const label = entry.entryType === 'navigation' ? 'document' : entry.name;
  console.groupCollapsed(`[Perf] ${label}`);
  console.table(metrics);
  console.log('transferSize', 'transferSize' in entry ? (entry as PerformanceResourceTiming).transferSize : 'n/a');
  console.log('duration', Number(entry.duration.toFixed(1)));
  console.groupEnd();
}

function dumpServerTiming() {
  performance
    .getEntriesByType('navigation')
    .forEach((entry) => logEntry(entry as PerformanceEntry & { serverTiming?: PerformanceServerTiming[] }));

  performance
    .getEntriesByType('resource')
    .forEach((entry) => logEntry(entry as PerformanceEntry & { serverTiming?: PerformanceServerTiming[] }));
}

export function initPerformanceDebug() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  const enabled = isPerformanceDebugEnabled();
  window.__CFTRACKING_PERF__ = {
    dumpServerTiming,
    enabled,
  };

  if (!enabled) {
    return;
  }

  dumpServerTiming();

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      logEntry(entry as PerformanceEntry & { serverTiming?: PerformanceServerTiming[] });
    });
  });

  observer.observe({
    entryTypes: ['navigation', 'resource'],
    buffered: true,
  });
}
