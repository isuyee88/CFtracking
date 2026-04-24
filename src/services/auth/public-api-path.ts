const PUBLIC_API_PREFIXES = [
  '/api/tracking/script',
  '/api/tracking/kclient',
  '/api/tracking/click',
  '/api/tracking/conversion',
  '/api/auth/login',
  '/api/auth/status',
  '/api/webhook',
  '/api/proxy-detection/challenge-html',
  '/api/proxy-detection/verify-challenge',
] as const;

export function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PREFIXES.some((publicPath) => path.startsWith(publicPath));
}

export { PUBLIC_API_PREFIXES };
