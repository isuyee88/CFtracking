import { describe, expect, it } from 'vitest';
import { importLandingManifest } from './manifest-import';

describe('importLandingManifest', () => {
  it('creates a remote landing on first import and stores the manifest slug', async () => {
    const created: Record<string, unknown>[] = [];
    const store: any = {
      findBySourceSlug: async () => null,
      create: async (data: Record<string, unknown>) => {
        created.push(data);
        return { id: 'lp1', ...data };
      },
      update: async () => null,
    };

    const result = await importLandingManifest(store, {
      runtimeUrl: 'https://landing.example/top10-battery',
      manifest: {
        name: 'top10-battery',
        page: { title: 'Top 10 Battery Picks' },
        compliance: { disclosure: 'We may earn a commission.' },
        offers: [{ click: { url: 'https://merchant.example/deal' } }],
      },
    });

    expect(result.created).toBe(true);
    expect(created[0]).toMatchObject({
      name: 'Top 10 Battery Picks',
      url: 'https://landing.example/top10-battery',
      hostingMode: 'remote',
      sourceSlug: 'top10-battery',
    });
    expect(JSON.parse(String(created[0]!.manifestJson)).name).toBe('top10-battery');
  });

  it('updates the existing slug instead of creating duplicate landing rows', async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const store = {
      findBySourceSlug: async () => ({ id: 'lp-existing' }),
      create: async () => { throw new Error('must not create'); },
      update: async (id: string, data: Record<string, unknown>) => {
        updates.push({ id, data });
        return { id, ...data };
      },
    } as any;

    const result = await importLandingManifest(store, {
      runtimeUrl: 'https://landing.example/top10-battery-v2',
      manifest: {
        name: 'top10-battery',
        page: { title: 'Updated Battery Picks' },
        compliance: { disclosure: 'We may earn a commission.' },
        offers: [],
      },
    });

    expect(result.created).toBe(false);
    expect(updates[0]).toEqual({
      id: 'lp-existing',
      data: expect.objectContaining({
        name: 'Updated Battery Picks',
        url: 'https://landing.example/top10-battery-v2',
        sourceSlug: 'top10-battery',
      }),
    });
  });
});
