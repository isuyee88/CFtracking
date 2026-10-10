import type { Env } from '@/config/env';
import { CacheStrategy, UnifiedCacheManager } from './unified-cache-manager';

export enum CacheType {
  STATIC = 'static',
  HISTORICAL = 'historical',
  RECENT = 'recent',
  REALTIME = 'realtime',
}

interface CacheHeaderPolicy {
  browserMaxAge: number;
  edgeMaxAge: number;
  swr: number;
  immutable: boolean;
  description: string;
}

export const CACHE_CONFIGS: Record<CacheType, CacheHeaderPolicy> = {
  [CacheType.STATIC]: {
    browserMaxAge: 2_592_000,
    edgeMaxAge: 2_592_000,
    swr: 2_592_000,
    immutable: true,
    description: 'Static assets and content that should not change once deployed',
  },
  [CacheType.HISTORICAL]: {
    browserMaxAge: 0,
    edgeMaxAge: 43_200,
    swr: 43_200,
    immutable: false,
    description: 'Non-today analytical windows cached at the edge for 12 hours with browser revalidation',
  },
  [CacheType.RECENT]: {
    browserMaxAge: 0,
    edgeMaxAge: 43_200,
    swr: 43_200,
    immutable: false,
    description: 'Near-stable analytical windows cached at the edge for 12 hours with browser revalidation',
  },
  [CacheType.REALTIME]: {
    browserMaxAge: 0,
    edgeMaxAge: 300,
    swr: 300,
    immutable: false,
    description: 'Today and other actively changing views cached at the edge for 5 minutes',
  },
};

export class ETagGenerator {
  static generate(data: unknown, version = 'content'): string {
    return `W/"${version}-${this.hashData(this.stripVolatileFields(data))}"`;
  }

  static matches(requestETag: string | null, currentETag: string): boolean {
    if (!requestETag) {
      return false;
    }

    const normalize = (value: string) => value.trim().replace(/^W\//, '');
    const normalizedCurrent = normalize(currentETag);

    return requestETag
      .split(',')
      .map(normalize)
      .some((candidate) => candidate === '*' || candidate === normalizedCurrent);
  }

  private static stripVolatileFields(data: unknown): unknown {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const {
      timestamp,
      queryTime,
      generatedAt,
      staleAt,
      etag,
      contentVersion,
      ...rest
    } = data as Record<string, unknown>;
    return rest;
  }

  private static hashData(data: unknown): string {
    const serialized = JSON.stringify(data);
    let hash = 0;

    for (let index = 0; index < serialized.length; index++) {
      hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
  }
}

export class ETagCacheManager {
  private readonly cacheManager: UnifiedCacheManager;

  constructor(env: Env) {
    this.cacheManager = new UnifiedCacheManager(env);
  }

  async fetch<T>(
    request: Request,
    fetcher: () => Promise<T>,
    options: {
      cacheType: CacheType;
      cacheKey?: string;
      version?: string;
    }
  ): Promise<Response> {
    const { cacheType, cacheKey, version } = options;
    const policy = CACHE_CONFIGS[cacheType];
    const key = cacheKey || this.buildCacheKey(request);
    const clientETag = request.headers.get('If-None-Match');

    const cachedResult = await this.cacheManager.fetch(request, fetcher, {
      strategy: CacheStrategy.CACHE_FIRST,
      cacheKey: key,
      edgeTTL: policy.edgeMaxAge,
      workersTTL: Math.max(30, Math.floor(policy.edgeMaxAge / 10)),
    });

    const currentETag = cachedResult.etag || ETagGenerator.generate(cachedResult.data, version);
    const headers = this.buildCacheHeaders(policy, currentETag);

    if (clientETag && ETagGenerator.matches(clientETag, currentETag)) {
      return new Response(null, {
        status: 304,
        headers,
      });
    }

    return Response.json(cachedResult.data, { headers });
  }

  static inferCacheType(pathname: string, dateRange?: string): CacheType {
    if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2|ttf|webp)$/i.test(pathname)) {
      return CacheType.STATIC;
    }

    const normalizedRange = (dateRange || '').toLowerCase();

    if (normalizedRange === 'today') {
      return CacheType.REALTIME;
    }

    if (
      ['last7days', 'last30days', 'thismonth', 'month_to_date', 'mtd'].includes(normalizedRange)
    ) {
      return CacheType.RECENT;
    }

    if (
      ['yesterday', 'lastmonth', 'previousmonth', 'custom', 'all'].includes(normalizedRange)
    ) {
      return CacheType.HISTORICAL;
    }

    if (pathname.includes('/dashboard') || pathname.includes('/analytics') || pathname.includes('/stats')) {
      return CacheType.RECENT;
    }

    if (pathname.match(/\/(campaigns|offers|flows|landings|traffic-sources|conversions|clicks)/)) {
      return CacheType.RECENT;
    }

    return CacheType.RECENT;
  }

  private buildCacheHeaders(policy: CacheHeaderPolicy, etag: string): Headers {
    const headers = new Headers();
    const browserDirectives = ['public', `max-age=${policy.browserMaxAge}`];

    if (policy.browserMaxAge === 0) {
      browserDirectives.push('must-revalidate');
    }

    if (policy.immutable) {
      browserDirectives.push('immutable');
    }

    headers.set('Cache-Control', browserDirectives.join(', '));
    headers.set(
      'CDN-Cache-Control',
      `public, s-maxage=${policy.edgeMaxAge}, stale-while-revalidate=${policy.swr}`
    );
    headers.set(
      'Cloudflare-CDN-Cache-Control',
      `public, s-maxage=${policy.edgeMaxAge}, stale-while-revalidate=${policy.swr}`
    );
    headers.set('ETag', etag);
    headers.set('Vary', 'Accept-Encoding');

    return headers;
  }

  private buildCacheKey(request: Request): string {
    const url = new URL(request.url);
    const params = Array.from(url.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    });

    const queryString = new URLSearchParams(params).toString();
    return queryString ? `${url.pathname}?${queryString}` : url.pathname;
  }
}

export function createETagCacheMiddleware(env: Env) {
  const manager = new ETagCacheManager(env);

  return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return next();
    }

    const excludePaths = ['/api/auth', '/api/webhook', '/api/cache'];
    if (excludePaths.some((path) => url.pathname.startsWith(path))) {
      return next();
    }

    const cacheType = ETagCacheManager.inferCacheType(url.pathname, url.searchParams.get('range') || undefined);

    return manager.fetch(
      request,
      async () => {
        const response = await next();
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json();
      },
      { cacheType }
    );
  };
}
