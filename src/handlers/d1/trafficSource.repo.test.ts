import { describe, expect, it } from 'vitest';
import { TrafficSourceRepository } from './trafficSource.repo';

function createDb(row: Record<string, unknown> | null) {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => row,
      }),
    }),
  } as unknown as D1Database;
}

describe('TrafficSourceRepository', () => {
  it('resolves canonical storage id for a display id lookup', async () => {
    const repo = new TrafficSourceRepository(
      createDb({
        id: 'traffic-source-internal-id',
        displayId: 'ts3',
        name: 'PropellerAds',
        type: 'push',
        status: 'active',
        costModel: 'cpc',
        costValue: 0,
        currency: 'USD',
        createdAt: '2026-04-05T00:00:00.000Z',
        updatedAt: '2026-04-05T00:00:00.000Z',
      })
    );

    await expect(repo.resolveStorageId('ts3')).resolves.toBe('traffic-source-internal-id');
  });

  it('returns the transformed traffic source and canonical storage id together', async () => {
    const repo = new TrafficSourceRepository(
      createDb({
        id: 'traffic-source-internal-id',
        displayId: 'ts3',
        name: 'PropellerAds',
        type: 'push',
        status: 'active',
        costModel: 'cpc',
        costValue: 0,
        currency: 'USD',
        createdAt: '2026-04-05T00:00:00.000Z',
        updatedAt: '2026-04-05T00:00:00.000Z',
      })
    );

    const resolved = await repo.findByIdentifierWithStorageId('ts3');

    expect(resolved).toMatchObject({
      storageId: 'traffic-source-internal-id',
      trafficSource: {
        id: 'ts3',
        displayId: 'ts3',
        name: 'PropellerAds',
      },
    });
  });
});
