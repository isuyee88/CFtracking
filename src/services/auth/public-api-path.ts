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
  // 为什么公开：S2S 端点有自己的 X-S2S-Key 鉴权（middleware/auth.ts s2sMiddleware），
  // 调用方是 affiliate-landing Worker（服务端无 JWT），跳过 JWT 层
  '/api/s2s/',
] as const;

export function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PREFIXES.some((publicPath) => path.startsWith(publicPath));
}

export { PUBLIC_API_PREFIXES };
