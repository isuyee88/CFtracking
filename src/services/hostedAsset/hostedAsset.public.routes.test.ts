import { describe, expect, it, vi } from 'vitest';
import { createHostedAssetPublicRouter } from './hostedAsset.public.routes';

interface AssetFixture {
  id: string;
  entityType: 'landing' | 'offer';
  mode: 'local' | 'zip' | 'image';
  name: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  contentBase64: string;
  storageBackend: 'd1' | 'r2';
  r2Key: string | null;
  createdAt: string;
  updatedAt: string;
}

function createDb(asset: AssetFixture | null) {
  return {
    prepare: (sql: string) => ({
      run: async () => ({}),
      bind: (..._values: unknown[]) => ({
        first: async () => (sql.includes('SELECT') ? asset : null),
        run: async () => ({}),
      }),
    }),
  };
}

function createEnv(asset: AssetFixture | null, bucket: R2Bucket) {
  return { DB: createDb(asset), HOSTED_ASSETS_BUCKET: bucket } as any;
}

const baseAsset: AssetFixture = {
  id: 'ha_route',
  entityType: 'landing',
  mode: 'local',
  name: 'Route HTML',
  fileName: 'index.html',
  mimeType: 'text/html; charset=utf-8',
  byteSize: 17,
  contentBase64: '',
  storageBackend: 'r2',
  r2Key: 'landing/ha_route/index.html',
  createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: '2026-10-07T00:00:00.000Z',
};

describe('Hosted Asset public Hono routes', () => {
  it('serves R2 HTML through the content route with security and cache headers', async () => {
    const bucket = {
      get: vi.fn(async () => ({
        body: new TextEncoder().encode('<h1>Route HTML</h1>'),
        httpEtag: '"route-etag"',
        httpMetadata: { contentType: 'text/html; charset=utf-8' },
      })),
    } as any as R2Bucket;
    const router = createHostedAssetPublicRouter();

    const response = await router.request(
      'https://tracker.example/ha_route/content',
      {},
      createEnv(baseAsset, bucket),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>Route HTML</h1>');
    expect(response.headers.get('ETag')).toBe('"route-etag"');
    expect(response.headers.get('Content-Security-Policy')).toContain('sandbox');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(bucket.get).toHaveBeenCalledWith('landing/ha_route/index.html');
  });

  it('serves a ZIP through the archive route with download metadata', async () => {
    const bucket = {
      get: vi.fn(async () => ({
        body: new Uint8Array([80, 75, 3, 4]),
        httpEtag: '"zip-etag"',
        httpMetadata: { contentType: 'application/zip' },
      })),
    } as any as R2Bucket;
    const asset: AssetFixture = {
      ...baseAsset,
      id: 'ha_zip_route',
      mode: 'zip',
      name: 'Route ZIP',
      fileName: 'route.zip',
      mimeType: 'application/zip',
      byteSize: 4,
      r2Key: 'landing/ha_zip_route/route.zip',
    };
    const router = createHostedAssetPublicRouter();

    const response = await router.request(
      'https://tracker.example/ha_zip_route/archive',
      {},
      createEnv(asset, bucket),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toContain('route.zip');
    expect(response.headers.get('ETag')).toBe('"zip-etag"');
    expect(await response.arrayBuffer()).toEqual(new Uint8Array([80, 75, 3, 4]).buffer);
  });

  it('returns 404 for an unknown asset and 503 for a missing new R2 object', async () => {
    const bucket = { get: vi.fn(async () => null) } as any as R2Bucket;
    const router = createHostedAssetPublicRouter();

    const notFound = await router.request(
      'https://tracker.example/unknown/content',
      {},
      createEnv(null, bucket),
    );
    expect(notFound.status).toBe(404);

    const missingObject = await router.request(
      'https://tracker.example/ha_route/content',
      {},
      createEnv(baseAsset, bucket),
    );
    expect(missingObject.status).toBe(503);
    expect(missingObject.headers.get('Cache-Control')).toBe('no-store');
  });
});
