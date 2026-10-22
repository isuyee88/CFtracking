/**
 * @fileoverview Regression tests for the control-plane → click-config link.
 *
 * `onDataChanged` is the only bridge between admin writes and the alias-scoped
 * click config; these tests pin which entities publish and which do not.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env';
import { CacheUpdateService } from './cache-update-service';
import { ConfigSnapshotPublisher } from './config-snapshot.service';
import { UnifiedCacheManager } from './unified-cache-manager';
import { FakeKV, asKVNamespace } from './test-support/fake-kv';

function createService(): CacheUpdateService {
  return new CacheUpdateService({
    UNIQUENESS_KV: asKVNamespace(new FakeKV()),
    DB: {},
  } as unknown as Env);
}

describe('CacheUpdateService.onDataChanged', () => {
  beforeEach(() => {
    // UnifiedCacheManager invalidates through the edge Cache API.
    (globalThis as any).caches = {
      default: {
        delete: async () => true,
        match: async () => undefined,
        put: async () => undefined,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).caches;
  });

  it('publishes click config on an offer update', async () => {
    const publishForOffer = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishForOffer')
      .mockResolvedValue(1);

    await createService().onDataChanged('offer', 'o1', 'update');

    expect(publishForOffer).toHaveBeenCalledTimes(1);
    expect(publishForOffer).toHaveBeenCalledWith('o1');
  });

  it('publishes the campaign after a campaign update', async () => {
    const publishCampaign = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishCampaign')
      .mockResolvedValue(null);

    await createService().onDataChanged('campaign', 'c1', 'update', undefined, {
      previousAlias: 'pb-old',
    });

    expect(publishCampaign).toHaveBeenCalledWith('c1', 'pb-old');
  });

  it('does not publish click config for click events', async () => {
    const publishCampaign = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishCampaign');
    const publishForOffer = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishForOffer');
    const publishForFlow = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishForFlow');
    const publishForLandingPage = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishForLandingPage');
    const publishAliases = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishAliases');

    await createService().onDataChanged('click', 'clk_1', 'create');

    expect(publishCampaign).not.toHaveBeenCalled();
    expect(publishForOffer).not.toHaveBeenCalled();
    expect(publishForFlow).not.toHaveBeenCalled();
    expect(publishForLandingPage).not.toHaveBeenCalled();
    expect(publishAliases).not.toHaveBeenCalled();
  });

  it('does not publish click config for conversion events', async () => {
    const publishCampaign = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishCampaign');
    const publishForOffer = vi.spyOn(ConfigSnapshotPublisher.prototype, 'publishForOffer');

    await createService().onDataChanged('conversion', 'conv_1', 'create');

    expect(publishCampaign).not.toHaveBeenCalled();
    expect(publishForOffer).not.toHaveBeenCalled();
  });

  it('republishes aliases captured before an offer delete', async () => {
    const publishAliases = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishAliases')
      .mockResolvedValue(2);

    await createService().onDataChanged('offer', 'o1', 'delete', undefined, {
      affectedAliases: ['alias-a', 'alias-b'],
    });

    expect(publishAliases).toHaveBeenCalledWith(['alias-a', 'alias-b']);
  });

  it('publishes the owning campaign after a flow delete', async () => {
    const publishCampaign = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishCampaign')
      .mockResolvedValue(null);

    await createService().onDataChanged('flow', 'f1', 'delete', undefined, {
      campaignId: 'c1',
    });

    expect(publishCampaign).toHaveBeenCalledWith('c1');
  });

  it('deletes the alias key for a hard-deleted campaign', async () => {
    const publishAliases = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishAliases')
      .mockResolvedValue(0);

    await createService().onDataChanged('campaign', 'c1', 'delete', undefined, {
      previousAlias: 'pb-alias',
    });

    // The campaign row is already gone, so only the pre-delete alias is usable.
    expect(publishAliases).toHaveBeenCalledWith(['pb-alias']);
  });

  it('looks up affected aliases when an offer delete has no captured context', async () => {
    const aliasesForOffer = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'aliasesForOffer')
      .mockResolvedValue(['alias-a']);
    const publishAliases = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishAliases')
      .mockResolvedValue(0);

    await createService().onDataChanged('offer', 'o1', 'delete');

    expect(aliasesForOffer).toHaveBeenCalledWith('o1');
    expect(publishAliases).toHaveBeenCalledWith(['alias-a']);
  });

  it('still republishes click config when page-cache invalidation fails', async () => {
    vi.spyOn(UnifiedCacheManager.prototype, 'invalidateBatch')
      .mockRejectedValue(new Error('cache api down'));
    const publishForOffer = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishForOffer')
      .mockResolvedValue(0);

    // A recoverable page-cache failure must not skip the click-config sync.
    await createService().onDataChanged('offer', 'o1', 'update');

    expect(publishForOffer).toHaveBeenCalledWith('o1');
  });
});
