/**
 * @fileoverview Workers 入口文件
 * @description Cloudflare Workers 主入口，处理所有 HTTP 请求和定时任务
 * @module index
 * 
 * SSR 动态渲染：
 * - 页面请求时从 Durable Objects 获取初始数据
 * - 注入数据到 HTML，实现首屏即时渲染
 * - 客户端 Hydration 恢复交互
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

// 定义 Hono 应用的变量类型
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

// 导出 Durable Objects（Cloudflare Workers 要求）
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

// 调试：打印 Cloudflare cf 对象的所有字段，用于研究日志中的 fingerprint 字段
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
    // 打印所有嵌套对象
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

// CORS 配置 - 限制允许的域名
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
      // 允许无 origin 的请求（如移动应用、Postman 等）
      if (!origin) return '*';
      // 检查是否在允许列表中
      if (ALLOWED_ORIGINS.includes(origin)) {
        return origin;
      }
      // 生产环境检查主域名
      if (origin.endsWith('.suyee88.workers.dev') || origin.endsWith('.pages.dev')) {
        return origin;
      }
      // 拒绝其他来源
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
    credentials: true,
    maxAge: 86400,
  })
);

// 添加版本和部署信息到响应头
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

// API 认证保护 - 排除公开端点
// 注意：跟踪链接和转化 postback 必须公开，否则联盟营销无法正常工作
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
  
  // 检查是否是公开路径
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

  // ⚠️ 安全增强：移除 BYPASS_AUTH 绕过逻辑
  // 生产环境强制要求所有 API 必须通过认证
  // 开发环境可通过 wrangler dev 的本地环境变量临时启用（不推荐）
  // const bypassAuth = c.env.BYPASS_AUTH === 'true' || c.env.BYPASS_AUTH === true;
  // if (bypassAuth) {
  //   console.warn('⚠️ [SECURITY] BYPASS_AUTH 已启用 - 生产环境禁止使用此模式');
  //   c.set('user', { userId: 'test-user', email: 'test@example.com', exp: Date.now() / 1000 + 3600 });
  //   return next();
  // }

  // 强制应用认证中间件（不可绕过）
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.status(401);
    return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
  
  const token = authHeader.substring(7);
  const secret = c.env.JWT_SECRET;
  
  // 验证 JWT
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      c.status(401);
      return c.json({ success: false, error: 'Invalid token format', code: 'UNAUTHORIZED' });
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 确保 JWT 部分存在
    if (!payloadB64 || !signatureB64) {
      c.status(401);
      return c.json({ success: false, error: 'Invalid token structure', code: 'UNAUTHORIZED' });
    }
    
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // 检查过期时间
    if (payload.exp && payload.exp < Date.now() / 1000) {
      c.status(401);
      return c.json({ success: false, error: 'Token expired', code: 'UNAUTHORIZED' });
    }
    
    // 验证签名 (使用 Web Crypto API)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const signingKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Base64URL 解码签名
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
    
    // 设置用户信息到上下文
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
import { createAffiliateNetworkRouter } from '@/services/affiliateNetwork/affiliateNetwork.routes';
import { createRuleRouter } from '@/services/rule/rule.routes';
import { createPlatformRouter } from '@/services/platform/platform.routes';
import { createTrackingRouter } from '@/services/tracking/tracking.routes';
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
// Phase 1: 自动化优化系统路由
import roiRoutes from '@/services/auto-optimization/roi.routes';
import autoRulesRoutes from '@/services/auto-optimization/rules.routes';
import operationsRoutes from '@/services/auto-optimization/operations.routes';
import approvalRoutes from '@/services/auto-optimization/approval.routes';
import authRoutes from '@/routes/auth.routes';
import postbackRoutes from '@/routes/postback.routes';
import postbackInboundRoutes from '@/routes/postback-inbound.routes';
import proxyDetectionRoutes from '@/routes/proxyDetection.routes';
import trafficFilterRoutes from '@/routes/trafficFilter.routes';
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
app.route('/api/traffic-filter', trafficFilterRoutes);

// Phase 1: 自动化优化系统API路由
app.route('/api/auto-optimization', roiRoutes);
app.route('/api/auto-optimization', autoRulesRoutes);
app.route('/api/auto-optimization', operationsRoutes);
app.route('/api/auto-optimization', approvalRoutes);

// 认证路由（必须在认证中间件之前注册，因为登录接口不需要认证）
app.route('/api/auth', authRoutes);

// Postback管理路由 (历史查询、统计、重试等)
app.route('/api/postbacks', postbackRoutes);

// S2S Inbound Postback接收路由 (外部平台回传)
app.route('/api/webhook', postbackInboundRoutes);

// 缓存更新API (延迟初始化)
app.get('/api/cache-update', async (c) => {
  const cacheUpdateRoutes = createCacheUpdateRoutes(c.env);
  return cacheUpdateRoutes.handle(c.req.raw);
});

// SSE缓存更新通知端点
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

// 导出 app 供 SSR Worker 使用
export { app }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 记录部署版本信息
    if (env.CF_VERSION_METADATA) {
      console.log('[Deployment] Version info:', {
        versionId: env.CF_VERSION_METADATA.id,
        versionTag: env.CF_VERSION_METADATA.tag,
        versionTimestamp: env.CF_VERSION_METADATA.timestamp,
      });
    }
    
    // 处理 API 请求（包括 /api/* 和 /health）
    if (isAppControlRequest(url.pathname)) {
      return app.fetch(request, env, ctx);
    }

    if (isPrecompressedAssetRequest(request, url.pathname)) {
      return servePrecompressedAsset(request, env);
    }

    if (url.pathname.startsWith('/__compression-demo/')) {
      return serveCompressionDemo(request, env);
    }

    if (isHtmlPageRequest(request, url.pathname)) {
      return serveSpaShellHtml(request, env);
    }
    
    // 处理直接通过域名访问的追踪请求
    // 格式：http://custom-domain.com/:campaignAlias
    // 注意：排除静态资源文件（.html, .svg, .png, .ico, .css, .js, .woff2 等）
    if (url.pathname.length > 1 && !url.pathname.startsWith('/__')) {
      const isStaticResource = /\.(html?|svg|png|ico|jpg|jpeg|gif|css|js|woff2|ttf|eot|otf|webmanifest)$/i.test(url.pathname);
      
      if (!isStaticResource) {
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length === 1) {
          const campaignAlias = pathParts[0];
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
      }
    }
    
    // 所有其他请求（静态资源）直接交给 ASSETS 处理
    return env.ASSETS.fetch(request);
  },
  async queue(batch: MessageBatch<CacheRefreshMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    await CacheRefreshConsumer.handle(batch, env, ctx);
  },

  /**
   * 定时任务处理器 - Cron Trigger
   * - 每5分钟: 刷新实时缓存数据 + 平台规则评估
   * - 每小时: 刷新小时缓存数据
   * - 每天0点: 刷新每日缓存数据
   * - 每天凌晨2点: 执行数据聚合
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Starting scheduled task at ${new Date().toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, cron: ${event.cron}`);

    const cronExpression = event.cron;
    const cacheUpdate = createCacheUpdateRoutes(env);

    // 每5分钟: 刷新实时数据 + 平台规则评估
    if (cronExpression === '*/5 * * * *') {
      // 刷新实时缓存
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Cache refresh failed:`, err)
        )
      );
      
      // 平台规则评估
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

    // 每小时: 刷新小时缓存数据
    if (cronExpression === '0 * * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Hourly cache refresh failed:`, err)
        )
      );
    }

    // 每天0点: 刷新每日缓存数据
    if (cronExpression === '0 0 * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Daily cache refresh failed:`, err)
        )
      );
    }

    // 每天凌晨2点: 执行数据聚合
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


