const RESERVED_SINGLE_SEGMENT_PATHS = new Set([
  'login',
  'dashboard',
  'campaigns',
  'rules',
  'platforms',
  'landings',
  'l',
  'offers',
  'traffic-sources',
  'affiliate-networks',
  'domains',
  'trends',
  'reports',
  'exported-reports',
  'custom-metrics',
  'traffic-filter',
  'audit',
  'conversions',
  'blacklist',
  'whitelist',
  'target',
  'settings',
  'help',
  'auto-optimization',
]);

const STATIC_RESOURCE_PATTERN = /\.(?:html?|svg|png|ico|jpg|jpeg|gif|css|js|woff2|ttf|eot|otf|webmanifest)$/i;

export function resolvePublicTrackingAlias(pathname: string): string | null {
  if (!pathname || pathname.length <= 1 || pathname.startsWith('/__')) {
    return null;
  }

  if (STATIC_RESOURCE_PATTERN.test(pathname)) {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) {
    return null;
  }

  const candidate = segments[0] || '';
  if (!candidate || RESERVED_SINGLE_SEGMENT_PATHS.has(candidate.toLowerCase())) {
    return null;
  }

  return candidate;
}
