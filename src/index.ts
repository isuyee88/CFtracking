/**
 * @fileoverview Workers 鍏ュ彛鏂囦欢
 * @description Cloudflare Workers 涓诲叆鍙ｏ紝澶勭悊鎵€鏈?HTTP 璇锋眰鍜屽畾鏃朵换鍔?
 * @module index
 * 
 * SSR 鍔ㄦ€佹覆鏌擄細
 * - 椤甸潰璇锋眰鏃朵粠 Durable Objects 鑾峰彇鍒濆鏁版嵁
 * - 娉ㄥ叆鏁版嵁鍒?HTML锛屽疄鐜伴灞忓嵆鏃舵覆鏌?
 * - 瀹㈡埛绔?Hydration 鎭㈠浜や簰
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { AppError } from '@/middleware/error';

// 瀹氫箟 Hono 搴旂敤鐨勫彉閲忕被鍨?
type Variables = {
  user?: {
    userId: string;
    email: string;
    exp: number;
  };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
import {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  CacheEventBrokerDurableObject,
  TrackingStatsDO,
} from '@/handlers/do';
import { CacheDurableObject } from '@/ssr/cache-do';
import { EventActor, StatsActor } from '@/handlers/do/deprecated-do';
import { createAggregationService } from '@/services/analytics/aggregation.service';
import { handlePlatformCron } from '@/services/platform';
import { CACHE_CONFIGS, ETagCacheManager, ETagGenerator } from '@/services/cache/etag-cache-manager';
import { CacheRefreshConsumer, type CacheRefreshMessage } from '@/services/cache/cache-refresh-consumer';
import { matchAdminPage } from '@/services/page/admin-page-bundle';
import { getWorkerVersionInfo } from '@/services/cache/version-utils';
import { appendServerTiming, durationMs, nowMs } from '@/utils/server-timing';

// 瀵煎嚭 Durable Objects锛圕loudflare Workers 瑕佹眰锛?
export {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  CacheEventBrokerDurableObject,
  TrackingStatsDO,
  CacheDurableObject,
  EventActor,
  StatsActor,
};

const LEGACY_SW_CLEANUP_SCRIPT = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});

self.addEventListener('fetch', () => {});
`.trim();
const HTML_BROWSER_MAX_AGE = 0;

interface HtmlCachePolicy {
  browserMaxAge: number;
  edgeMaxAge: number;
  staleWhileRevalidate: number;
}

function resolveHtmlCachePolicy(pathname: string, range?: string | null): HtmlCachePolicy {
  const cacheType = ETagCacheManager.inferCacheType(pathname, range || undefined);
  const cachePolicy = CACHE_CONFIGS[cacheType];

  return {
    browserMaxAge: HTML_BROWSER_MAX_AGE,
    edgeMaxAge: cachePolicy.edgeMaxAge,
    staleWhileRevalidate: cachePolicy.swr,
  };
}

function applyHtmlCacheHeaders(headers: Headers, policy: HtmlCachePolicy) {
  headers.set('Cache-Control', `public, max-age=${policy.browserMaxAge}, must-revalidate`);
  headers.set(
    'CDN-Cache-Control',
    `public, s-maxage=${policy.edgeMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`
  );
  headers.set(
    'Cloudflare-CDN-Cache-Control',
    `public, s-maxage=${policy.edgeMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`
  );
}

function toStrongETag(weakEtag: string): string {
  return `"${weakEtag.replace(/^W\/"/, '').replace(/"$/, '')}"`;
}

const PRECOMPRESSED_RESPONSE_TYPES = new Map<string, string>([
  ['.js', 'text/javascript; charset=UTF-8'],
  ['.css', 'text/css; charset=UTF-8'],
  ['.html', 'text/html; charset=UTF-8'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=UTF-8'],
  ['.txt', 'text/plain; charset=UTF-8'],
]);

const COMPRESSION_DEMO_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Compression Runtime Demo</title>
    <style>
      :root { font-family: Inter, system-ui, sans-serif; color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 40px 20px 64px;
        background: linear-gradient(180deg, #f8fbff 0%, #edf3fb 100%);
        color: #132238;
      }
      main {
        width: min(960px, 100%);
        margin: 0 auto;
        padding: 30px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      }
      h1 { margin: 0; font-size: clamp(2.2rem, 4vw, 3.2rem); letter-spacing: -0.05em; line-height: 0.98; }
      p { line-height: 1.72; color: #44546d; }
      .badge {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: #e9f0ff;
        color: #2a4682;
        font-size: 0.82rem;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">Worker runtime response</span>
      <h1>Compression runtime demo</h1>
      <p>
        This response is generated directly inside the Worker so it can be compared against native static
        assets and manual precompressed variants under the same Cloudflare zone and cache settings.
      </p>
      <p>
        If this runtime document compresses while the direct static document does not, the problem is likely
        tied to asset delivery or single page application fallback behavior rather than Cloudflare compression
        being disabled globally.
      </p>
      <p>
        If this runtime document also fails to compress, the issue likely sits higher in the request path such
        as response headers, zone rules, or another transformation that prevents document compression.
      </p>
      <p>
        Repeating the same diagnostic narrative keeps the payload text-heavy enough for compression checks while
        remaining human-readable during debugging. Repeating the same diagnostic narrative keeps the payload
        text-heavy enough for compression checks while remaining human-readable during debugging.
      </p>
      <p>
        Repeating the same diagnostic narrative keeps the payload text-heavy enough for compression checks while
        remaining human-readable during debugging. Repeating the same diagnostic narrative keeps the payload
        text-heavy enough for compression checks while remaining human-readable during debugging.
      </p>
    </main>
  </body>
</html>`;

function getPreferredAssetEncoding(acceptEncodingHeader: string | null) {
  const value = (acceptEncodingHeader || '').toLowerCase();

  if (value.includes('br')) {
    return {
      extension: 'br',
      contentEncoding: 'br',
    };
  }

  if (value.includes('gzip')) {
    return {
      extension: 'gz',
      contentEncoding: 'gzip',
    };
  }

  return null;
}

function getPrecompressedAssetContentType(pathname: string) {
  for (const [extension, contentType] of PRECOMPRESSED_RESPONSE_TYPES.entries()) {
    if (pathname.endsWith(extension)) {
      return contentType;
    }
  }

  return null;
}

function isPrecompressedAssetRequest(request: Request, pathname: string) {
  if (!pathname.startsWith('/assets/')) {
    return false;
  }

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    return false;
  }

  if (request.headers.has('Range')) {
    return false;
  }

  return getPrecompressedAssetContentType(pathname) !== null;
}

async function servePrecompressedAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const contentType = getPrecompressedAssetContentType(url.pathname);

  if (!contentType) {
    return env.ASSETS.fetch(request);
  }

  return servePrecompressedStaticAsset(request, env, url.pathname, contentType);
}

async function servePrecompressedStaticAsset(
  request: Request,
  env: Env,
  assetPath: string,
  contentType: string,
): Promise<Response> {
  const preferredEncoding = getPreferredAssetEncoding(request.headers.get('Accept-Encoding'));
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;

  if (!preferredEncoding) {
    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  }

  const variantUrl = new URL(assetUrl.toString());
  variantUrl.pathname = `${assetPath}.${preferredEncoding.extension}`;

  const variantResponse = await env.ASSETS.fetch(new Request(variantUrl.toString(), request));
  if (!variantResponse.ok) {
    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  }

  const headers = new Headers(variantResponse.headers);
  const existingCacheControl = headers.get('Cache-Control');
  headers.set('Content-Type', contentType);
  headers.set('Content-Encoding', preferredEncoding.contentEncoding);
  headers.set('Vary', 'Accept-Encoding');
  if (existingCacheControl && !existingCacheControl.includes('no-transform')) {
    headers.set('Cache-Control', `${existingCacheControl}, no-transform`);
  }
  headers.delete('Content-Length');

  return new Response(variantResponse.body, {
    encodeBody: 'manual',
    status: variantResponse.status,
    headers,
  });
}

async function serveCompressionDemo(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/__compression-demo/proxy-document') {
    const targetUrl = new URL('/__compression-control/document.html', url.origin);
    return env.ASSETS.fetch(new Request(targetUrl.toString(), request));
  }

  if (url.pathname === '/__compression-demo/precompressed-document') {
    return servePrecompressedStaticAsset(
      request,
      env,
      '/__compression-control/document.html',
      'text/html; charset=UTF-8',
    );
  }

  if (url.pathname === '/__compression-demo/precompressed-svg') {
    return servePrecompressedStaticAsset(request, env, '/__compression-control/vector.svg', 'image/svg+xml');
  }

  if (url.pathname === '/__compression-demo/runtime-document') {
    return new Response(COMPRESSION_DEMO_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        'Cloudflare-CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      routes: {
        controlDocument: '/__compression-control/document.html',
        controlSvg: '/__compression-control/vector.svg',
        proxyDocument: '/__compression-demo/proxy-document',
        precompressedDocument: '/__compression-demo/precompressed-document',
        precompressedSvg: '/__compression-demo/precompressed-svg',
        runtimeDocument: '/__compression-demo/runtime-document',
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}

app.use('*', logger());

// 璋冭瘯锛氭墦鍗?Cloudflare cf 瀵硅薄鐨勬墍鏈夊瓧娈碉紝鐢ㄤ簬鐮旂┒鏃ュ織涓殑 fingerprint 瀛楁
app.use('/api/tracking/*', async (c, next) => {
  const cf = c.req.raw.cf;
  if (cf) {
    console.log('[DEBUG CF OBJECT] ====================');
    console.log('[DEBUG] Full cf object keys:', Object.keys(cf));
    console.log('[DEBUG] cf.botManagement:', JSON.stringify(cf.botManagement || null));
    console.log('[DEBUG] cf.tlsClientCiphersSha1:', cf.tlsClientCiphersSha1);
    console.log('[DEBUG] cf.tlsClientExtensionsSha1:', cf.tlsClientExtensionsSha1);
    console.log('[DEBUG] cf.tlsVersion:', cf.tlsVersion);
    console.log('[DEBUG] cf.tlsCipher:', cf.tlsCipher);
    console.log('[DEBUG] cf.asn:', cf.asn);
    console.log('[DEBUG] cf.asOrganization:', cf.asOrganization);
    console.log('[DEBUG] cf.country:', cf.country);
    console.log('[DEBUG] cf.city:', cf.city);
    console.log('[DEBUG] cf.connectingIP:', cf.connectingIP);
    console.log('[DEBUG] cf.clientTrustScore:', cf.clientTrustScore);
    console.log('[DEBUG] cf.isEUCountry:', cf.isEUCountry);
    // 鎵撳嵃鎵€鏈夊祵濂楀璞?
    for (const key of Object.keys(cf)) {
      const value = (cf as Record<string, unknown>)[key];
      if (typeof value === 'object' && value !== null) {
        console.log(`[DEBUG] cf.${key}:`, JSON.stringify(value));
      }
    }
    console.log('[DEBUG CF OBJECT] ====================');
  }
  await next();
});

// CORS 閰嶇疆 - 闄愬埗鍏佽鐨勫煙鍚?
const ALLOWED_ORIGINS = [
  'https://cf-tracking.suyee88.workers.dev',
  'https://cf-tracking.pages.dev',
  'http://localhost:12342',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      // 鍏佽鏃?origin 鐨勮姹傦紙濡傜Щ鍔ㄥ簲鐢ㄣ€丳ostman 绛夛級
      if (!origin) return '*';
      // 妫€鏌ユ槸鍚﹀湪鍏佽鍒楄〃涓?
      if (ALLOWED_ORIGINS.includes(origin)) {
        return origin;
      }
      // 鐢熶骇鐜妫€鏌ヤ富鍩熷悕
      if (origin.endsWith('.suyee88.workers.dev') || origin.endsWith('.pages.dev')) {
        return origin;
      }
      // 鎷掔粷鍏朵粬鏉ユ簮
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
    credentials: true,
    maxAge: 86400,
  })
);

// 娣诲姞鐗堟湰鍜岄儴缃蹭俊鎭埌鍝嶅簲澶?
app.use('*', async (c, next) => {
  await next();
  
  const env = c.env;
  const exposeDebugInfo = env.ENVIRONMENT !== 'production';
  
  if (exposeDebugInfo && env.CF_VERSION_METADATA) {
    c.header('X-Cloudflare-Worker-Version', env.CF_VERSION_METADATA.id);
    c.header('X-Cloudflare-Worker-Tag', env.CF_VERSION_METADATA.tag || 'latest');
    c.header('X-Cloudflare-Worker-Timestamp', env.CF_VERSION_METADATA.timestamp);
    c.header('X-Deployment-Environment', env.ENVIRONMENT);
  }
});

// API 璁よ瘉淇濇姢 - 鎺掗櫎鍏紑绔偣
// 娉ㄦ剰锛氳窡韪摼鎺ュ拰杞寲 postback 蹇呴』鍏紑锛屽惁鍒欒仈鐩熻惀閿€鏃犳硶姝ｅ父宸ヤ綔
const PUBLIC_PATHS = [
  '/health',
  '/sw.js',
  '/__bootstrap',
  '/__bootstrap-object',
  '/api/tracking/script',
  '/api/tracking/kclient',
  '/api/tracking/click',
  '/api/tracking/conversion',
  '/api/auth/login',
  '/api/auth/status',
  '/api/webhook',
];

type AuthMode = 'on' | 'off';

let authOnLogPrinted = false;
let authOffLogPrinted = false;

function isTruthyEnvValue(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

function resolveAuthMode(env: Env): AuthMode {
  const mode = typeof env.AUTH_MODE === 'string' ? env.AUTH_MODE.trim().toLowerCase() : '';

  if (['off', 'bypass', 'disabled', 'disable', '0', 'false'].includes(mode) || isTruthyEnvValue(env.BYPASS_AUTH)) {
    if (!authOffLogPrinted) {
      console.warn('[Auth] authentication is OFF, all requests bypass auth middleware.');
      authOffLogPrinted = true;
    }
    return 'off';
  }

  if (['on', 'strict', 'enabled', 'enable', '1', 'true', ''].includes(mode)) {
    if (!authOnLogPrinted) {
      console.log('[Auth] authentication is ON, unauthorized API requests will return 401.');
      authOnLogPrinted = true;
    }
    return 'on';
  }

  if (!authOnLogPrinted) {
    console.warn(`[Auth] unknown AUTH_MODE "${mode}", fallback to ON mode.`);
    authOnLogPrinted = true;
  }
  return 'on';
}

app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  
  // 妫€鏌ユ槸鍚︽槸鍏紑璺緞
  const isPublicPath = PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));

  if (isPublicPath) {
    return next();
  }

  const authMode = resolveAuthMode(c.env);
  if (authMode === 'off') {
    c.set('user', {
      userId: 'dev-bypass-user',
      email: 'dev-bypass@example.local',
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });
    return next();
  }

  // 鈿狅笍 瀹夊叏澧炲己锛氱Щ闄?BYPASS_AUTH 缁曡繃閫昏緫
  // 鐢熶骇鐜寮哄埗瑕佹眰鎵€鏈?API 蹇呴』閫氳繃璁よ瘉
  // 寮€鍙戠幆澧冨彲閫氳繃 wrangler dev 鐨勬湰鍦扮幆澧冨彉閲忎复鏃跺惎鐢紙涓嶆帹鑽愶級
  // const bypassAuth = c.env.BYPASS_AUTH === 'true' || c.env.BYPASS_AUTH === true;
  // if (bypassAuth) {
  //   console.warn('鈿狅笍 [SECURITY] BYPASS_AUTH 宸插惎鐢?- 鐢熶骇鐜绂佹浣跨敤姝ゆā寮?);
  //   c.set('user', { userId: 'test-user', email: 'test@example.com', exp: Date.now() / 1000 + 3600 });
  //   return next();
  // }

  // 寮哄埗搴旂敤璁よ瘉涓棿浠讹紙涓嶅彲缁曡繃锛?
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.status(401);
    return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
  
  const token = authHeader.substring(7);
  const secret = c.env.JWT_SECRET;
  
  // 楠岃瘉 JWT
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      c.status(401);
      return c.json({ success: false, error: 'Invalid token format', code: 'UNAUTHORIZED' });
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 纭繚 JWT 閮ㄥ垎瀛樺湪
    if (!payloadB64 || !signatureB64) {
      c.status(401);
      return c.json({ success: false, error: 'Invalid token structure', code: 'UNAUTHORIZED' });
    }
    
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // 妫€鏌ヨ繃鏈熸椂闂?
    if (payload.exp && payload.exp < Date.now() / 1000) {
      c.status(401);
      return c.json({ success: false, error: 'Token expired', code: 'UNAUTHORIZED' });
    }
    
    // 楠岃瘉绛惧悕 (浣跨敤 Web Crypto API)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const signingKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Base64URL 瑙ｇ爜绛惧悕
    const base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(base64 + padding);
    const signature = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      signature[i] = binaryString.charCodeAt(i);
    }
    
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', signingKey, signature, data);
    
    if (!isValid) {
      c.status(401);
      return c.json({ success: false, error: 'Invalid token signature', code: 'UNAUTHORIZED' });
    }
    
    // 璁剧疆鐢ㄦ埛淇℃伅鍒颁笂涓嬫枃
    c.set('user', payload as { userId: string; email: string; exp: number });
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    c.status(401);
    return c.json({ success: false, error: 'Authentication failed', code: 'UNAUTHORIZED' });
  }
});

app.get('/api/auth/status', (c) => {
  const authMode = resolveAuthMode(c.env);
  return c.json(
    success({
      enabled: authMode === 'on',
      mode: authMode,
    })
  );
});

app.get('/health', (c) => {
  return c.json(success({ status: 'healthy', timestamp: new Date().toISOString() }));
});

app.get('/sw.js', () => {
  return new Response(LEGACY_SW_CLEANUP_SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=UTF-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Service-Worker-Allowed': '/',
    },
  });
});

app.get('/__bootstrap/dashboard/*', async (c) => {
  const requestUrl = new URL(c.req.url);
  const pathname = requestUrl.pathname;
  const requestedHash = pathname.split('/').pop()?.replace(/\.json$/i, '') || '';
  const requestedVersion = requestUrl.searchParams.get('__version');

  if (requestUrl.searchParams.get('__mode') === 'object' && requestedVersion) {
    return serveDashboardBootstrapObject(c.req.raw, c.env, requestedHash, requestedVersion);
  }

  return serveDashboardBootstrap(c.req.raw, c.env, requestedHash);
});

app.get('/__bootstrap-object/dashboard/*', async (c) => {
  const pathname = new URL(c.req.url).pathname;
  const segments = pathname.split('/').filter(Boolean);
  const requestedHash = segments[2] || '';
  const requestedVersion = segments[3]?.replace(/\.json$/i, '') || '';

  if (!requestedHash || !requestedVersion) {
    return c.notFound();
  }

  return serveDashboardBootstrapObject(c.req.raw, c.env, requestedHash, requestedVersion);
});

app.get('/__bootstrap/*', async (c) => {
  const requestUrl = new URL(c.req.url);
  const pathname = requestUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const page = segments[1] || '';
  const requestedHash = segments[2]?.replace(/\.json$/i, '') || '';
  const requestedVersion = requestUrl.searchParams.get('__version');

  if (!page || !requestedHash) {
    return c.notFound();
  }

  if (requestUrl.searchParams.get('__mode') === 'object' && requestedVersion) {
    return serveAdminPageBootstrapObject(c.req.raw, c.env, page, requestedHash, requestedVersion);
  }

  return serveAdminPageBootstrap(c.req.raw, c.env, page, requestedHash);
});

app.get('/__bootstrap-object/*', async (c) => {
  const pathname = new URL(c.req.url).pathname;
  const segments = pathname.split('/').filter(Boolean);
  const page = segments[1] || '';
  const requestedHash = segments[2] || '';
  const requestedVersion = segments[3]?.replace(/\.json$/i, '') || '';

  if (!page || !requestedHash || !requestedVersion) {
    return c.notFound();
  }

  return serveAdminPageBootstrapObject(c.req.raw, c.env, page, requestedHash, requestedVersion);
});

app.get('/api/deployment/info', (c) => {
  const env = c.env;
  const exposeDebugInfo = env.ENVIRONMENT !== 'production';

  if (!exposeDebugInfo) {
    return c.json(
      success({
        environment: env.ENVIRONMENT,
        debugInfoExposed: false,
      })
    );
  }

  const deploymentInfo = {
    version: env.CF_VERSION_METADATA ? {
      id: env.CF_VERSION_METADATA.id,
      tag: env.CF_VERSION_METADATA.tag,
      timestamp: env.CF_VERSION_METADATA.timestamp,
    } : null,
    environment: env.ENVIRONMENT,
    realtimeEnabled: env.REALTIME_ENABLED,
    sseEnabled: env.SSE_ENABLED,
    debugInfoExposed: true,
    timestamp: new Date().toISOString(),
  };
  return c.json(success(deploymentInfo));
});

import { createCampaignRouter } from '@/services/campaign/campaign.routes';
import { createFlowRouter } from '@/services/flow/flow.routes';
import { createMultiOfferRouter } from '@/services/flow/multi-offer.routes';
import { createLandingPageRouter } from '@/services/landingPage/lp.routes';
import { createLPPreloadRouter } from '@/services/landingPage/lp.preload.routes';
import { createOfferRouter } from '@/services/offer/offer.routes';
import { createTrafficSourceRouter } from '@/services/trafficSource/trafficSource.routes';
import { createHostedAssetApiRouter } from '@/services/hostedAsset/hostedAsset.api.routes';
import { createHostedAssetPublicRouter } from '@/services/hostedAsset/hostedAsset.public.routes';
import { createAffiliateNetworkRouter } from '@/services/affiliateNetwork/affiliateNetwork.routes';
import { createRuleRouter } from '@/services/rule/rule.routes';
import { createPlatformRouter } from '@/services/platform/platform.routes';
import { createTrackingRouter } from '@/services/tracking/tracking.routes';
import { resolvePublicTrackingAlias } from '@/services/tracking/public-tracking-path';
import { createAggregationRouter } from '@/services/analytics/aggregation.routes';
import { createAnalyticsRouter } from '@/services/analytics/analytics.routes';
import { createClickLogRouter } from '@/services/tracking/clickLog.routes';
import { createConversionLogRouter } from '@/services/tracking/conversionLog.routes';
import { createExportRouter } from '@/services/export/export.routes';
import { createTrendsRouter } from '@/services/trends/trends.routes';
import { createBlacklistRouter } from '@/routes/blacklist.routes';
import { createWhitelistRouter } from '@/routes/whitelist.routes';
import { createDomainRouter } from '@/services/domain/domain.routes';
import { createDomainValidationRouter } from '@/services/domain/domain.validation.routes';
import { createLogExplorerRouter } from '@/services/logExplorer/logExplorer.routes';
import { userPreferenceRoutes } from '@/services/user-preferences/user-preferences.routes';
import { createMigrationRouter } from '@/services/migration/migration.routes';
import exportTaskRoutes from '@/services/exportTask/exportTask.routes';
import customMetricRoutes from '@/services/customMetric/customMetric.routes';
import { registerAntiFraudEnhancedRoutes } from '@/routes/antiFraudEnhanced.routes';
import { registerCampaignGroupRoutes } from '@/services/campaignGroup/campaignGroup.routes';
import { registerOfferPayoutRoutes } from '@/services/offer/offerPayout.routes';
import { registerParamMappingRoutes } from '@/services/trafficSource/paramMapping.routes';
import { registerFlowRuleRoutes } from '@/services/flow/flowRule.routes';
import { registerReportRoutes } from '@/services/analytics/report.routes';
import { createCacheUpdateRoutes } from '@/services/cache/cache-update-service';
import { createSSECacheNotification } from '@/services/cache/sse-cache-notification';
import roiRoutes from '@/services/auto-optimization/roi.routes';
import autoRulesRoutes from '@/services/auto-optimization/rules.routes';
import operationsRoutes from '@/services/auto-optimization/operations.routes';
import approvalRoutes from '@/services/auto-optimization/approval.routes';
import authRoutes from '@/routes/auth.routes';
import postbackRoutes from '@/routes/postback.routes';
import postbackInboundRoutes from '@/routes/postback-inbound.routes';
import proxyDetectionRoutes from '@/routes/proxyDetection.routes';
import {
  serveAdminPageBootstrap,
  serveAdminPageBootstrapObject,
} from '@/services/bootstrap/admin-bootstrap';
import {
  serveDashboardBootstrap,
  serveDashboardBootstrapObject,
} from '@/services/bootstrap/dashboard-bootstrap';

type CacheMutationAction = 'create' | 'update' | 'delete';

interface CacheMutationEvent {
  entity: string;
  entityId: string;
  action: CacheMutationAction;
}

const MUTATION_ENTITY_PREFIXES: Array<{ prefix: string; entity: string }> = [
  { prefix: '/api/flows/rules', entity: 'rule' },
  { prefix: '/api/campaigns', entity: 'campaign' },
  { prefix: '/api/offers', entity: 'offer' },
  { prefix: '/api/landing-pages', entity: 'landing' },
  { prefix: '/api/traffic-sources', entity: 'traffic-source' },
  { prefix: '/api/affiliate-networks', entity: 'affiliate-network' },
  { prefix: '/api/flows', entity: 'flow' },
  { prefix: '/api/conversions', entity: 'conversion' },
  { prefix: '/api/clicks', entity: 'click' },
  { prefix: '/api/domains', entity: 'domain' },
  { prefix: '/api/rules', entity: 'rule' },
  { prefix: '/api/blacklist', entity: 'blacklist' },
  { prefix: '/api/whitelist', entity: 'whitelist' },
  { prefix: '/api/user-preferences', entity: 'user-preferences' },
];

const RESERVED_MUTATION_SEGMENTS = new Set([
  'schema',
  'stats',
  'rules',
  'equalize',
  'test',
  'test-connection',
  'macro-preview',
  'clone',
  'regenerate-token',
  'sync',
]);

function mapMethodToMutationAction(method: string): CacheMutationAction | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return null;
  }
}

function extractEntityIdFromPath(pathname: string, prefix: string): string | null {
  const suffix = pathname.slice(prefix.length).replace(/^\/+/, '');
  if (!suffix) {
    return null;
  }

  const candidate = suffix.split('/')[0];
  if (!candidate || RESERVED_MUTATION_SEGMENTS.has(candidate)) {
    return null;
  }

  return decodeURIComponent(candidate);
}

function extractEntityIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const result =
    'data' in payload && payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : (payload as Record<string, unknown>);

  const candidates = [
    result.id,
    result.displayId,
    result.conversionId,
    result.clickId,
    result.preferenceId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

async function resolveCacheMutationEvent(c: any): Promise<CacheMutationEvent | null> {
  const action = mapMethodToMutationAction(c.req.method);
  if (!action || !c.res.ok) {
    return null;
  }

  const url = new URL(c.req.url);
  const mapping = MUTATION_ENTITY_PREFIXES.find(({ prefix }) => url.pathname.startsWith(prefix));
  if (!mapping) {
    return null;
  }

  const pathEntityId = extractEntityIdFromPath(url.pathname, mapping.prefix);
  let entityId = pathEntityId;
  let normalizedAction = action;

  if (!entityId && action === 'create') {
    try {
      const payload = await c.res.clone().json();
      entityId = extractEntityIdFromPayload(payload);
    } catch {
      entityId = null;
    }
  }

  if (pathEntityId && action === 'create') {
    normalizedAction = 'update';
  }

  if (!entityId) {
    return null;
  }

  return {
    entity: mapping.entity,
    entityId,
    action: normalizedAction,
  };
}

app.use('/api/*', async (c, next) => {
  await next();

  const mutation = await resolveCacheMutationEvent(c);
  if (!mutation) {
    return;
  }

  c.executionCtx.waitUntil(
    createCacheUpdateRoutes(c.env)
      .onDataChanged(mutation.entity, mutation.entityId, mutation.action)
      .catch((error) => {
        console.error('[CacheUpdate] Post-mutation invalidation failed:', error);
      })
  );
});

app.route('/api/campaigns', createCampaignRouter());
app.route('/api/flows', createFlowRouter());
app.route('/api/multi-offers', createMultiOfferRouter());
app.route('/api/landing-pages', createLandingPageRouter());
app.route('/api/lp-preload', createLPPreloadRouter());
app.route('/api/offers', createOfferRouter());
app.route('/api/traffic-sources', createTrafficSourceRouter());
app.route('/api/hosted-assets', createHostedAssetApiRouter());
app.route('/api/affiliate-networks', createAffiliateNetworkRouter());
app.route('/api/rules', createRuleRouter());
app.route('/api/platforms', createPlatformRouter());
app.route('/api/tracking', createTrackingRouter());
app.route('/api/analytics', createAggregationRouter());
app.route('/api/analytics', createAnalyticsRouter());
app.route('/api/clicks', createClickLogRouter());
app.route('/api/conversions', createConversionLogRouter());
app.route('/api/export', createExportRouter());
app.route('/api/trends', createTrendsRouter());
app.route('/api/blacklist', createBlacklistRouter());
app.route('/api/whitelist', createWhitelistRouter());
app.route('/api/domains', createDomainRouter());
app.route('/api/domain-validation', createDomainValidationRouter());
app.route('/api/log-explorer', createLogExplorerRouter());
app.route('/api/user-preferences', userPreferenceRoutes);
app.route('/api/migration', createMigrationRouter());
app.route('/api/export-tasks', exportTaskRoutes);
app.route('/api/custom-metrics', customMetricRoutes);
app.route('/api/anti-fraud', registerAntiFraudEnhancedRoutes());
app.route('/api/campaign-groups', registerCampaignGroupRoutes());
app.route('/api/offer-payout', registerOfferPayoutRoutes());
app.route('/api/param-mapping', registerParamMappingRoutes());
app.route('/api/flow-rules', registerFlowRuleRoutes());
app.route('/api/reports', registerReportRoutes());
app.route('/api/proxy-detection', proxyDetectionRoutes);



// Phase 1: 鑷姩鍖栦紭鍖栫郴缁烝PI璺敱
app.route('/api/auto-optimization', roiRoutes);
app.route('/api/auto-optimization', autoRulesRoutes);
app.route('/api/auto-optimization', operationsRoutes);
app.route('/api/auto-optimization', approvalRoutes);

// 璁よ瘉璺敱锛堝繀椤诲湪璁よ瘉涓棿浠朵箣鍓嶆敞鍐岋紝鍥犱负鐧诲綍鎺ュ彛涓嶉渶瑕佽璇侊級
app.route('/api/auth', authRoutes);

// Postback绠＄悊璺敱 (鍘嗗彶鏌ヨ銆佺粺璁°€侀噸璇曠瓑)
app.route('/api/postbacks', postbackRoutes);

// S2S Inbound Postback鎺ユ敹璺敱 (澶栭儴骞冲彴鍥炰紶)
app.route('/api/webhook', postbackInboundRoutes);
app.route('/hosted-assets', createHostedAssetPublicRouter());

// 缂撳瓨鏇存柊API (寤惰繜鍒濆鍖?
app.get('/api/cache-update', async (c) => {
  const cacheUpdateRoutes = createCacheUpdateRoutes(c.env);
  return cacheUpdateRoutes.handle(c.req.raw);
});

// SSE缂撳瓨鏇存柊閫氱煡绔偣
app.get('/api/cache/events', async (c) => {
  const userId = c.req.query('userId') || 'anonymous';
  const sseService = createSSECacheNotification(c.env);
  return sseService.handleConnection(c.req.raw, userId);
});

app.get('/events/cache', async (c) => {
  const userId = c.req.query('userId') || 'anonymous';
  const sseService = createSSECacheNotification(c.env);
  return sseService.handleConnection(c.req.raw, userId);
});

app.onError((err, c) => {
  console.error('Error:', err);
  if (err instanceof AppError) {
    return c.json(error(err.message, err.code, err.details), err.statusCode as any);
  }

  return c.json(error(err.message, 'INTERNAL_ERROR'), HTTP_STATUS.INTERNAL_ERROR);
});

function isHtmlPageRequest(request: Request, pathname: string) {
  if (request.method !== 'GET') {
    return false;
  }

  return ['/', '/dashboard'].includes(pathname) || Boolean(matchAdminPage(new URL(request.url)));
}

function isAppControlRequest(pathname: string) {
  return (
    pathname === '/health' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/__bootstrap/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/events/')
  );
}

function resolveRequestedRange(pathname: string, url: URL): string | null {
  const queryRange = url.searchParams.get('range');
  if (queryRange) {
    return queryRange;
  }

  if (pathname === '/' || pathname === '/dashboard' || pathname === '/campaigns') {
    return 'today';
  }

  return null;
}

async function serveSpaShellHtml(request: Request, env: Env): Promise<Response> {
  const requestStartedAt = nowMs();
  const url = new URL(request.url);
  const cachePolicy = resolveHtmlCachePolicy(url.pathname, resolveRequestedRange(url.pathname, url));
  const assetRequest = new Request(new URL('/index.html', url.origin).toString(), request);
  const assetFetchStartedAt = nowMs();
  const assetResponse = await env.ASSETS.fetch(assetRequest);
  const assetFetchDuration = durationMs(assetFetchStartedAt);

  if (!assetResponse.ok) {
    return assetResponse;
  }

  const htmlReadStartedAt = nowMs();
  const html = await assetResponse.text();
  const htmlReadDuration = durationMs(htmlReadStartedAt);
  const workerVersion = getWorkerVersionInfo(env);
  const etagStartedAt = nowMs();
  const etag = ETagGenerator.generate(
    {
      html,
      version: workerVersion.namespace,
    },
    `spa-shell-${workerVersion.namespace}`
  );
  const strongEtag = toStrongETag(etag);
  const etagDuration = durationMs(etagStartedAt);
  const headers = new Headers(assetResponse.headers);

  headers.set('Content-Type', 'text/html; charset=UTF-8');
  applyHtmlCacheHeaders(headers, cachePolicy);
  headers.set('ETag', strongEtag);
  headers.set('Last-Modified', new Date(workerVersion.timestamp).toUTCString());
  headers.set('Timing-Allow-Origin', '*');
  headers.set('Vary', 'Accept-Encoding');

  const metrics = [
    { name: 'asset', dur: assetFetchDuration, desc: 'index.html' },
    { name: 'htmlread', dur: htmlReadDuration, desc: 'asset-body' },
    { name: 'etag', dur: etagDuration, desc: 'shell' },
    { name: 'ttl', desc: `edge=${cachePolicy.edgeMaxAge};swr=${cachePolicy.staleWhileRevalidate}` },
  ];

  if (ETagGenerator.matches(request.headers.get('If-None-Match'), strongEtag)) {
    appendServerTiming(headers, [
      ...metrics,
      { name: 'reval', desc: '304' },
      { name: 'total', dur: durationMs(requestStartedAt), desc: 'spa-shell' },
    ]);
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  appendServerTiming(headers, [
    ...metrics,
    { name: 'total', dur: durationMs(requestStartedAt), desc: 'spa-shell' },
  ]);

  return new Response(html, {
    status: assetResponse.status,
    headers,
  });
}

// 瀵煎嚭 app 渚?SSR Worker 浣跨敤
export { app }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/traffic-filter' || url.pathname.startsWith('/traffic-filter/')) {
      return Response.redirect(new URL('/blacklist', url.origin).toString(), 302);
    }
    
    // 璁板綍閮ㄧ讲鐗堟湰淇℃伅
    if (env.CF_VERSION_METADATA) {
      console.log('[Deployment] Version info:', {
        versionId: env.CF_VERSION_METADATA.id,
        versionTag: env.CF_VERSION_METADATA.tag,
        versionTimestamp: env.CF_VERSION_METADATA.timestamp,
      });
    }
    
    // 澶勭悊 API 璇锋眰锛堝寘鎷?/api/* 鍜?/health锛?
    if (isAppControlRequest(url.pathname)) {
      return app.fetch(request, env, ctx);
    }

    if (isPrecompressedAssetRequest(request, url.pathname)) {
      return servePrecompressedAsset(request, env);
    }

    if (url.pathname.startsWith('/__compression-demo/')) {
      return serveCompressionDemo(request, env);
    }

    const campaignAlias = resolvePublicTrackingAlias(url.pathname);
    if (campaignAlias) {
      console.log('[Tracking] Campaign alias:', campaignAlias, 'Original URL:', request.url);
      const trackingUrl = new URL('/api/tracking/click/' + campaignAlias, url.origin);
      trackingUrl.search = url.search;
      console.log('[Tracking] Tracking URL:', trackingUrl.toString());
      const trackingRequest = new Request(trackingUrl.toString(), {
        method: request.method,
        headers: request.headers,
        redirect: 'manual'
      });
      return app.fetch(trackingRequest, env, ctx);
    }

    if (isHtmlPageRequest(request, url.pathname)) {
      return serveSpaShellHtml(request, env);
    }
    
    // 鎵€鏈夊叾浠栬姹傦紙闈欐€佽祫婧愶級鐩存帴浜ょ粰 ASSETS 澶勭悊
    return env.ASSETS.fetch(request);
  },
  async queue(batch: MessageBatch<CacheRefreshMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    await CacheRefreshConsumer.handle(batch, env, ctx);
  },

  /**
   * 瀹氭椂浠诲姟澶勭悊鍣?- Cron Trigger
   * - 姣?鍒嗛挓: 鍒锋柊瀹炴椂缂撳瓨鏁版嵁 + 骞冲彴瑙勫垯璇勪及
   * - 姣忓皬鏃? 鍒锋柊灏忔椂缂撳瓨鏁版嵁
   * - 姣忓ぉ0鐐? 鍒锋柊姣忔棩缂撳瓨鏁版嵁
   * - 姣忓ぉ鍑屾櫒2鐐? 鎵ц鏁版嵁鑱氬悎
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Starting scheduled task at ${new Date().toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, cron: ${event.cron}`);

    const cronExpression = event.cron;
    const cacheUpdate = createCacheUpdateRoutes(env);

    // 姣?鍒嗛挓: 鍒锋柊瀹炴椂鏁版嵁 + 骞冲彴瑙勫垯璇勪及
    if (cronExpression === '*/5 * * * *') {
      // 鍒锋柊瀹炴椂缂撳瓨
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Cache refresh failed:`, err)
        )
      );
      
      // 骞冲彴瑙勫垯璇勪及
      ctx.waitUntil(
        (async () => {
          try {
            await handlePlatformCron(env);
            console.log(`[Cron] Platform cron completed successfully`);
          } catch (err) {
            console.error(`[Cron] Platform cron failed:`, err);
          }
        })()
      );
    }

    // 姣忓皬鏃? 鍒锋柊灏忔椂缂撳瓨鏁版嵁
    if (cronExpression === '0 * * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Hourly cache refresh failed:`, err)
        )
      );
    }

    // 姣忓ぉ0鐐? 鍒锋柊姣忔棩缂撳瓨鏁版嵁
    if (cronExpression === '0 0 * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Daily cache refresh failed:`, err)
        )
      );
    }

    // 姣忓ぉ鍑屾櫒2鐐? 鎵ц鏁版嵁鑱氬悎
    if (cronExpression === '0 2 * * *') {
      ctx.waitUntil(
        (async () => {
          try {
            const aggregationService = createAggregationService(env);
            const result = await aggregationService.aggregateDailyData();

            if (result.success) {
              console.log(`[Cron] Aggregation completed: ${result.message}`);
            } else {
              console.error(`[Cron] Aggregation failed: ${result.message}`);
              console.error(`[Cron] Errors:`, result.errors);
            }
          } catch (err) {
            console.error(`[Cron] Aggregation error:`, err);
          }
        })()
      );
    }
  },
};



