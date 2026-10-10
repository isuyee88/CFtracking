import { describe, expect, it, vi } from 'vitest';
import { LandingPageVersionRepository } from '@/handlers/d1/landingPageVersion.repo';
import { LandingPageVersionService } from './landingPageVersion.service';
import type { LandingPageVersion } from '@/types/landingPageVersion';

const version = (overrides: Partial<LandingPageVersion> = {}): LandingPageVersion => ({
  id: 'lpv_1',
  landingPageId: 'lp_1',
  versionNumber: 1,
  assetId: null,
  manifestSnapshot: null,
  status: 'archived',
  publishedAt: null,
  publishedBy: null,
  rollbackFromVersion: null,
  contentHash: null,
  etag: null,
  createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: '2026-10-07T00:00:00.000Z',
  ...overrides,
});

describe('LandingPageVersionService', () => {
  it('rolls back by publishing the requested historical version and records its source', async () => {
    const target = version({ id: 'lpv_2', versionNumber: 2 });
    const publish = vi.spyOn(LandingPageVersionRepository.prototype, 'publish')
      .mockResolvedValue({ ...target, status: 'published', rollbackFromVersion: 3 });
    vi.spyOn(LandingPageVersionRepository.prototype, 'findByVersionNumber')
      .mockResolvedValue(target);
    vi.spyOn(LandingPageVersionRepository.prototype, 'findPublished')
      .mockResolvedValue(version({ id: 'lpv_3', versionNumber: 3, status: 'published' }));

    const service = new LandingPageVersionService({ DB: {} } as never);
    const result = await service.rollback('lp_1', 2, 'operator_1');

    expect(publish).toHaveBeenCalledWith('lp_1', 'lpv_2', 'operator_1', 3);
    expect(result.status).toBe('published');
  });

  it('rejects rollback when the requested version does not exist', async () => {
    vi.spyOn(LandingPageVersionRepository.prototype, 'findByVersionNumber')
      .mockResolvedValue(null);

    const service = new LandingPageVersionService({ DB: {} } as never);
    await expect(service.rollback('lp_1', 99, 'operator_1'))
      .rejects.toThrow('Landing Page version not found');
  });
});
