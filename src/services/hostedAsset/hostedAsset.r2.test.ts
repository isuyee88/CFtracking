import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HostedAssetService } from './hostedAsset.service';

describe('HostedAssetService R2 upload path', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('stores bytes in R2 and keeps only metadata in D1 when R2 is bound', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const bucket: any = { put: vi.fn(async () => ({})) };
    const db = {
      prepare: (sql: string) => ({
        run: async () => ({}),
        bind: (...values: unknown[]) => {
          statements.push({ sql, values });
          return { run: async () => ({}) };
        },
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    const result = await service.upload({
      entityType: 'landing',
      mode: 'local',
      name: 'R2 landing',
      fileName: 'index.html',
      contentBase64: btoa('<h1>Hello R2</h1>'),
    }, 'https://tracker.example');

    expect(bucket.put).toHaveBeenCalledOnce();
    expect(bucket.put.mock.calls[0]?.[0]).toBe(`landing/${result.assetId}/index.html`);
    expect(new TextDecoder().decode(bucket.put.mock.calls[0]?.[1] as Uint8Array)).toBe('<h1>Hello R2</h1>');
    const insert = statements.find(({ sql }) => sql.includes('INSERT INTO hostedAssets'));
    expect(insert?.sql).toContain('r2Key');
    expect(insert?.sql).toContain('storageBackend');
    expect(insert?.values).toContain('r2');
    expect(insert?.values).toContain(`landing/${result.assetId}/index.html`);
    expect(insert?.values).toContain('');
  });

  it('removes the R2 object when D1 metadata insertion fails', async () => {
    const bucket: any = {
      put: vi.fn(async () => ({})),
      delete: vi.fn(async () => undefined),
    };
    const db = {
      prepare: (sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({
          run: async () => {
            if (sql.includes('INSERT INTO hostedAssets')) throw new Error('D1 insert failed');
            return {};
          },
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    await expect(service.upload({
      entityType: 'landing',
      mode: 'local',
      fileName: 'index.html',
      contentBase64: btoa('<h1>Rollback</h1>'),
    }, 'https://tracker.example')).rejects.toThrow('D1 insert failed');

    expect(bucket.put).toHaveBeenCalledOnce();
    expect(bucket.delete).toHaveBeenCalledWith(bucket.put.mock.calls[0]?.[0]);
  });
  it('reads an R2-backed asset and returns its ETag and content metadata', async () => {
    const body = new TextEncoder().encode('<h1>From R2</h1>');
    const bucket: any = {
      get: vi.fn(async () => ({
        body,
        httpEtag: '"etag-1"',
        httpMetadata: { contentType: 'text/html; charset=utf-8' },
      })),
    };
    const db = {
      prepare: (_sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_read', entityType: 'landing', mode: 'local', name: 'Read', fileName: 'index.html',
            mimeType: 'text/html; charset=utf-8', byteSize: body.length, contentBase64: '',
            storageBackend: 'r2', r2Key: 'landing/ha_read/index.html',
            createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    const response = await service.renderPublicContent('ha_read', 'https://tracker.example');

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe('"etag-1"');
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Security-Policy')).toContain('sandbox');
    expect(await response.text()).toBe('<h1>From R2</h1>');
    expect(bucket.get).toHaveBeenCalledWith('landing/ha_read/index.html');
  });

  it('deletes the R2 object after removing its D1 metadata', async () => {
    const bucket: any = { delete: vi.fn(async () => undefined) };
    const calls: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        run: async () => { calls.push(sql); return {}; },
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_delete', entityType: 'landing', mode: 'local', name: 'Delete', fileName: 'index.html',
            mimeType: 'text/html; charset=utf-8', byteSize: 1, contentBase64: '', storageBackend: 'r2',
            r2Key: 'landing/ha_delete/index.html', createdAt: '', updatedAt: '',
          }),
          run: async () => { calls.push(sql); return {}; },
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    await expect(service.remove('ha_delete')).resolves.toBe(true);

    expect(bucket.delete).toHaveBeenCalledWith('landing/ha_delete/index.html');
    expect(calls.at(-1)).toContain('DELETE FROM hostedAssets');
  });

  it('does not write D1 metadata when the R2 upload fails', async () => {
    const bucket: any = {
      put: vi.fn(async () => { throw new Error('R2 put failed'); }),
      delete: vi.fn(async () => undefined),
    };
    const statements: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        run: async () => { statements.push(sql); return {}; },
        bind: (..._values: unknown[]) => ({
          run: async () => { statements.push(sql); return {}; },
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    await expect(service.upload({
      entityType: 'landing',
      mode: 'local',
      fileName: 'index.html',
      contentBase64: btoa('<h1>R2 failure</h1>'),
    }, 'https://tracker.example')).rejects.toThrow('R2 put failed');

    expect(statements.some((sql) => sql.includes('INSERT INTO hostedAssets'))).toBe(false);
  });

  it('does not delete the R2 object when D1 metadata deletion fails', async () => {
    const bucket: any = { delete: vi.fn(async () => undefined) };
    const db = {
      prepare: (sql: string) => ({
        run: async () => {
          if (sql.includes('CREATE TABLE')) return {};
          throw new Error('D1 delete failed');
        },
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_d1_delete_failure', entityType: 'landing', mode: 'local', name: 'Delete failure',
            fileName: 'index.html', mimeType: 'text/html; charset=utf-8', byteSize: 1, contentBase64: '',
            storageBackend: 'r2', r2Key: 'landing/ha_d1_delete_failure/index.html', createdAt: '', updatedAt: '',
          }),
          run: async () => { throw new Error('D1 delete failed'); },
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    await expect(service.remove('ha_d1_delete_failure')).rejects.toThrow('D1 delete failed');
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it('surfaces an observable cleanup failure after D1 metadata is deleted', async () => {
    const bucket: any = { delete: vi.fn(async () => { throw new Error('R2 delete failed'); }) };
    const statements: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        run: async () => { statements.push(sql); return {}; },
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_orphan', entityType: 'landing', mode: 'local', name: 'Orphan', fileName: 'index.html',
            mimeType: 'text/html; charset=utf-8', byteSize: 1, contentBase64: '', storageBackend: 'r2',
            r2Key: 'landing/ha_orphan/index.html', createdAt: '', updatedAt: '',
          }),
          run: async () => { statements.push(sql); return {}; },
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.remove('ha_orphan')).rejects.toThrow('R2 delete failed');

    expect(statements.some((sql) => sql.includes('DELETE FROM hostedAssets'))).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      '[HostedAsset] R2 cleanup failed; asset metadata was removed and the object is orphaned',
      expect.objectContaining({ assetId: 'ha_orphan', r2Key: 'landing/ha_orphan/index.html' }),
    );
  });
  it('falls back to legacy D1 base64 content when the R2 object is missing', async () => {
    const legacyHtml = '<h1>Legacy</h1>';
    const bucket: any = { get: vi.fn(async () => null) };
    const db = {
      prepare: (_sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_legacy', entityType: 'landing', mode: 'local', name: 'Legacy', fileName: 'index.html',
            mimeType: 'text/html; charset=utf-8', byteSize: legacyHtml.length, contentBase64: btoa(legacyHtml),
            storageBackend: 'r2', r2Key: 'landing/ha_legacy/index.html',
            createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    const response = await service.renderPublicContent('ha_legacy', 'https://tracker.example');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>Legacy</h1>');
  });

  it('returns service unavailable instead of an empty success when a new R2 object is missing', async () => {
    const bucket: any = { get: vi.fn(async () => null) };
    const db = {
      prepare: (_sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({
          first: async () => ({
            id: 'ha_missing', entityType: 'landing', mode: 'local', name: 'Missing', fileName: 'index.html',
            mimeType: 'text/html; charset=utf-8', byteSize: 10, contentBase64: '',
            storageBackend: 'r2', r2Key: 'landing/ha_missing/index.html', createdAt: '', updatedAt: '',
          }),
        }),
      }),
    };
    const service = new HostedAssetService({ DB: db, HOSTED_ASSETS_BUCKET: bucket } as any);

    const response = await service.renderPublicContent('ha_missing', 'https://tracker.example');

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('accepts a valid PNG image with an omitted file name by using a PNG default', async () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const binary = String.fromCharCode(...pngHeader);
    const db = {
      prepare: (_sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({ run: async () => ({}) }),
      }),
    };
    const service = new HostedAssetService({ DB: db } as any);

    const result = await service.upload({
      entityType: 'landing', mode: 'image', name: 'Hero', contentBase64: btoa(binary),
    }, 'https://tracker.example');

    expect(result.fileName).toBe('Hero.png');
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects image bytes whose signature does not match the extension', async () => {
    const db = {
      prepare: (_sql: string) => ({
        run: async () => ({}),
        bind: (..._values: unknown[]) => ({ run: async () => ({}) }),
      }),
    };
    const service = new HostedAssetService({ DB: db } as any);

    await expect(service.upload({
      entityType: 'landing', mode: 'image', fileName: 'hero.png', contentBase64: btoa('not-a-png'),
    }, 'https://tracker.example')).rejects.toThrow('signature');
  });
});

