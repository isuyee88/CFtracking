import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLandingVersion,
  fetchLandingVersions,
  pauseLandingVersion,
  publishLandingVersion,
  rollbackLandingVersion,
} from '../../frontend/src/services/api';

function responseFor(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: status >= 200 && status < 300, data, error: null }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Landing Page version API client', () => {
  it('lists versions and creates a draft through the version endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseFor([{ id: 'lpv_1', versionNumber: 1, status: 'draft' }]))
      .mockResolvedValueOnce(responseFor({ id: 'lpv_2', versionNumber: 2, status: 'draft' }, 201));
    vi.stubGlobal('fetch', fetchMock);

    const versions = await fetchLandingVersions('lp_1');
    const created = await createLandingVersion('lp_1', {
      assetId: 'asset_2',
      manifestSnapshot: { title: 'Draft' },
      status: 'draft',
    });

    expect(versions).toHaveLength(1);
    expect(created.status).toBe('draft');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/landing-pages/lp_1/versions');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/landing-pages/lp_1/versions');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      assetId: 'asset_2',
      manifestSnapshot: { title: 'Draft' },
      status: 'draft',
    });
  });

  it('calls publish, pause, and rollback with explicit action endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseFor({ status: 'published' }))
      .mockResolvedValueOnce(responseFor({ status: 'paused' }))
      .mockResolvedValueOnce(responseFor({ status: 'published', rollbackFromVersion: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    await publishLandingVersion('lp_1', 'lpv_1', 'operator_1');
    await pauseLandingVersion('lp_1', 'lpv_1');
    await rollbackLandingVersion('lp_1', 1, 'operator_1');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/landing-pages/lp_1/versions/lpv_1/publish',
      '/api/landing-pages/lp_1/versions/lpv_1/pause',
      '/api/landing-pages/lp_1/versions/1/rollback',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ publishedBy: 'operator_1' });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ publishedBy: 'operator_1' });
  });
});
