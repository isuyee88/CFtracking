import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLandingPageRouter } from './lp.routes';
import { LandingPageVersionService } from './landingPageVersion.service';
import type { LandingPageVersion } from '@/types/landingPageVersion';

const env = { DB: {} } as any;

const version = (overrides: Partial<LandingPageVersion> = {}): LandingPageVersion => ({
  id: 'lpv_1',
  landingPageId: 'lp_1',
  versionNumber: 1,
  assetId: 'asset_1',
  manifestSnapshot: { title: 'Version 1' },
  status: 'draft',
  publishedAt: null,
  publishedBy: null,
  rollbackFromVersion: null,
  contentHash: 'sha256:v1',
  etag: '"v1"',
  createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: '2026-10-07T00:00:00.000Z',
  ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe('Landing Page version API routes', () => {
  it('lists versions under a landing page', async () => {
    vi.spyOn(LandingPageVersionService.prototype, 'list')
      .mockResolvedValue([version()]);

    const response = await createLandingPageRouter().request(
      'https://tracker.example/lp_1/versions',
      {},
      env,
    );
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].versionNumber).toBe(1);
  });

  it('creates a draft version without publishing it', async () => {
    const create = vi.spyOn(LandingPageVersionService.prototype, 'create')
      .mockResolvedValue(version());

    const response = await createLandingPageRouter().request(
      'https://tracker.example/lp_1/versions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: 'asset_1',
          manifestSnapshot: { title: 'Version 1' },
          status: 'draft',
        }),
      },
      env,
    );

    expect(response.status).toBe(201);
    expect((await response.json() as any).data.status).toBe('draft');
    expect(create).toHaveBeenCalledWith({
      landingPageId: 'lp_1',
      assetId: 'asset_1',
      manifestSnapshot: { title: 'Version 1' },
      status: 'draft',
      publishedBy: null,
      rollbackFromVersion: null,
      contentHash: null,
      etag: null,
    });
  });

  it('rejects direct published creation so editing cannot auto-publish', async () => {
    const create = vi.spyOn(LandingPageVersionService.prototype, 'create');

    const response = await createLandingPageRouter().request(
      'https://tracker.example/lp_1/versions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      },
      env,
    );
    const body = await response.json() as any;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(create).not.toHaveBeenCalled();
  });

  it('publishes a selected version and passes the operator identity', async () => {
    const publish = vi.spyOn(LandingPageVersionService.prototype, 'publish')
      .mockResolvedValue(version({ status: 'published', publishedBy: 'operator_1' }));

    const response = await createLandingPageRouter().request(
      'https://tracker.example/lp_1/versions/lpv_1/publish',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedBy: 'operator_1' }),
      },
      env,
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data.status).toBe('published');
    expect(publish).toHaveBeenCalledWith('lp_1', 'lpv_1', 'operator_1');
  });

  it('pauses a version and rolls back by version number', async () => {
    const pause = vi.spyOn(LandingPageVersionService.prototype, 'pause')
      .mockResolvedValue(version({ status: 'paused' }));
    const rollback = vi.spyOn(LandingPageVersionService.prototype, 'rollback')
      .mockResolvedValue(version({ versionNumber: 1, status: 'published', rollbackFromVersion: 2 }));
    const router = createLandingPageRouter();

    const pauseResponse = await router.request(
      'https://tracker.example/lp_1/versions/lpv_1/pause',
      { method: 'POST' },
      env,
    );
    const rollbackResponse = await router.request(
      'https://tracker.example/lp_1/versions/1/rollback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedBy: 'operator_2' }),
      },
      env,
    );

    expect(pauseResponse.status).toBe(200);
    expect((await pauseResponse.json() as any).data.status).toBe('paused');
    expect(rollbackResponse.status).toBe(200);
    expect((await rollbackResponse.json() as any).data.rollbackFromVersion).toBe(2);
    expect(pause).toHaveBeenCalledWith('lpv_1');
    expect(rollback).toHaveBeenCalledWith('lp_1', 1, 'operator_2');
  });

  it('returns validation error for a non-positive rollback version', async () => {
    const response = await createLandingPageRouter().request(
      'https://tracker.example/lp_1/versions/0/rollback',
      { method: 'POST' },
      env,
    );
    const body = await response.json() as any;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
