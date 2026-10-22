/**
 * @fileoverview Regression tests for alias-scoped click config publishing.
 *
 * These cover the P0-4 failure mode: an offer edit must overwrite
 * `clickcfg:{alias}`, and a rename/pause/delete must remove the old key so the
 * click fast path cannot keep redirecting to the pre-write offer URL.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env';
import { ConfigSnapshotPublisher } from './config-snapshot.service';
import { FakeKV, asKVNamespace } from './test-support/fake-kv';

type Row = Record<string, any>;

interface FixtureData {
  campaigns: Row[];
  flows: Row[];
  offers: Row[];
  flowOffers: Row[];
  flowLandingPages: Row[];
}

/**
 * Fake D1 at the repository boundary. Each repository issues a small set of
 * prepared statements; matching them by shape keeps the test independent of a
 * full Worker/D1 runtime.
 */
function createFakeDB(data: FixtureData) {
  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  const first = (sql: string, params: any[]): Row | null => {
    if (sql.includes('FROM campaigns')) {
      if (sql.includes('WHERE alias = ?')) {
        return data.campaigns.find((campaign) => campaign.alias === params[0]) ?? null;
      }
      if (sql.includes('WHERE id = ? OR displayId = ?')) {
        return data.campaigns.find((campaign) => campaign.id === params[0] || campaign.displayId === params[1]) ?? null;
      }
    }
    if (sql.includes('FROM offers') && sql.includes('WHERE id = ? OR displayId = ?')) {
      return data.offers.find((offer) => offer.id === params[0] || offer.displayId === params[1]) ?? null;
    }
    return null;
  };

  const all = (sql: string, params: any[]): Row[] => {
    if (sql.includes('JOIN flowOffers')) {
      const flowIds = new Set(
        data.flowOffers.filter((link) => link.offerId === params[0]).map((link) => link.flowId),
      );
      const campaignIds = new Set(
        data.flows.filter((flow) => flowIds.has(flow.id)).map((flow) => flow.campaignId),
      );
      return data.campaigns.filter(
        (campaign) => campaignIds.has(campaign.id) || campaignIds.has(campaign.displayId),
      );
    }
    if (sql.includes('JOIN flowLandingPages')) {
      const flowIds = new Set(
        data.flowLandingPages.filter((link) => link.landingPageId === params[0]).map((link) => link.flowId),
      );
      const campaignIds = new Set(
        data.flows.filter((flow) => flowIds.has(flow.id)).map((flow) => flow.campaignId),
      );
      return data.campaigns.filter(
        (campaign) => campaignIds.has(campaign.id) || campaignIds.has(campaign.displayId),
      );
    }
    if (sql.includes('FROM flows')) {
      return data.flows.filter(
        (flow) =>
          (flow.campaignId === params[0] || flow.campaignId === params[1]) &&
          flow.status === params[2],
      );
    }
    if (sql.includes('FROM flowOffers')) {
      return data.flowOffers.filter((link) => link.flowId === params[0]);
    }
    if (sql.includes('FROM flowLandingPages')) {
      return data.flowLandingPages.filter((link) => link.flowId === params[0]);
    }
    return [];
  };

  return {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          const statement = normalize(sql);
          return {
            first: async () => first(statement, params),
            all: async () => ({ results: all(statement, params) }),
            run: async () => ({ success: true }),
          };
        },
      };
    },
  };
}

function seed(): FixtureData {
  return {
    campaigns: [
      { id: 'c1', displayId: 'c1', alias: 'pb-alias', status: 'active', parameters: '{}' },
    ],
    flows: [
      {
        id: 'f1',
        campaignId: 'c1',
        status: 'active',
        weight: 100,
        type: 'regular',
        actionType: 'redirect',
        actionConfig: '{}',
        filters: '[]',
      },
    ],
    offers: [
      { id: 'o1', displayId: 'o1', status: 'active', url: 'https://old.example/offer' },
    ],
    flowOffers: [{ id: 'fo1', flowId: 'f1', offerId: 'o1', weight: 100 }],
    flowLandingPages: [],
  };
}

function createEnv(data: FixtureData, kv: FakeKV): Env {
  return {
    UNIQUENESS_KV: asKVNamespace(kv),
    DB: createFakeDB(data),
  } as unknown as Env;
}

describe('ConfigSnapshotPublisher', () => {
  it('overwrites clickcfg:{alias} with the new offer URL after an offer update', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    expect(kv.json<{ offerUrl: string }>('clickcfg:pb-alias')?.offerUrl).toBe('https://old.example/offer');

    data.offers[0]!.url = 'https://new.example/offer?uid={clickid}';
    const published = await publisher.publishForOffer('o1');

    expect(published).toBe(1);
    expect(kv.json<{ offerUrl: string }>('clickcfg:pb-alias')?.offerUrl).toBe(
      'https://new.example/offer?uid={clickid}',
    );
  });

  it('deletes the old clickcfg key when a campaign alias changes', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    expect(kv.store.has('clickcfg:pb-alias')).toBe(true);

    data.campaigns[0]!.alias = 'pb-renamed';
    await publisher.publishCampaign('c1', 'pb-alias');

    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
    expect(kv.store.has('cfg:pointer:pb-alias')).toBe(false);
    expect(kv.json<{ offerUrl: string }>('clickcfg:pb-renamed')?.offerUrl).toBe(
      'https://old.example/offer',
    );
  });

  it('deletes the alias key when the campaign is paused', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    data.campaigns[0]!.status = 'paused';
    const result = await publisher.publishCampaign('c1');

    expect(result).toBeNull();
    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
    expect(kv.store.has('cfg:pointer:pb-alias')).toBe(false);
  });

  it('deletes the alias key when the offer has no publishable replacement', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    data.offers[0]!.status = 'paused';
    await publisher.publishForOffer('o1');

    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
  });

  it('deletes both keys when the campaign row is already gone', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    data.campaigns.length = 0;

    // Hard delete: the route passes the alias captured before `DELETE`.
    expect(await publisher.publishCampaign('pb-alias')).toBeNull();

    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
    expect(kv.store.has('cfg:pointer:pb-alias')).toBe(false);
  });

  it('never publishes a key when the campaign alias is empty', async () => {
    const data = seed();
    const kv = new FakeKV();
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    await publisher.publishCampaign('pb-alias');
    data.campaigns[0]!.alias = '';

    expect(await publisher.publishCampaign('c1', 'pb-alias')).toBeNull();

    // `clickcfg:null`/`clickcfg:` must never exist; the old alias is cleaned up.
    expect([...kv.store.keys()].filter((key) => key.startsWith('clickcfg:'))).toEqual([]);
  });

  it('deletes the alias key when the KV write fails mid-publish', async () => {
    const kv = new FakeKV({ failPuts: ['clickcfg:pb-alias'] });
    kv.store.set('clickcfg:pb-alias', JSON.stringify({ offerUrl: 'https://stale.example/offer' }));
    kv.store.set('cfg:pointer:pb-alias', JSON.stringify({ version: 'stale' }));
    const publisher = new ConfigSnapshotPublisher(createEnv(seed(), kv));

    await expect(publisher.publishCampaign('pb-alias')).rejects.toThrow(/kv put failed/);

    // Fail closed: no key is better than the pre-write offer URL.
    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
    expect(kv.store.has('cfg:pointer:pb-alias')).toBe(false);
  });

  it('deletes the pre-rename alias when the republish fails', async () => {
    const data = seed();
    const kv = new FakeKV({ failPuts: ['clickcfg:pb-renamed'] });
    kv.store.set('clickcfg:pb-alias', JSON.stringify({ offerUrl: 'https://old.example/offer' }));
    const publisher = new ConfigSnapshotPublisher(createEnv(data, kv));

    data.campaigns[0]!.alias = 'pb-renamed';

    await expect(publisher.publishCampaign('c1', 'pb-alias')).rejects.toThrow(/kv put failed/);

    expect(kv.store.has('clickcfg:pb-alias')).toBe(false);
    expect(kv.store.has('clickcfg:pb-renamed')).toBe(false);
  });
});

describe('ConfigSnapshotPublisher.publishAliases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('continues with the remaining aliases after one publish fails', async () => {
    const publisher = new ConfigSnapshotPublisher(createEnv(seed(), new FakeKV()));
    const publishCampaign = vi
      .spyOn(ConfigSnapshotPublisher.prototype, 'publishCampaign')
      .mockImplementation(async (alias: string) => {
        if (alias === 'alias-broken') throw new Error('kv down');
        return null;
      });

    await expect(
      publisher.publishAliases(['alias-broken', ' alias-ok ', 'alias-ok']),
    ).rejects.toThrow('kv down');

    // One failure must not skip the next alias; blanks/duplicates are dropped.
    expect(publishCampaign.mock.calls.map(([alias]) => alias)).toEqual(['alias-broken', 'alias-ok']);
  });
});
