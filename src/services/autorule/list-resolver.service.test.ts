import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';
import { ListResolverService } from '@/services/autorule/list-resolver.service';

function createEnvWithRows(rows: Array<Record<string, unknown>>): Env {
  const bind = vi.fn(() => ({
    all: vi.fn(async () => ({
      results: rows,
    })),
  }));

  const db = {
    prepare: vi.fn(() => ({
      bind,
    })),
  } as unknown as D1Database;

  return {
    DB: db,
  } as unknown as Env;
}

describe('ListResolverService country compatibility', () => {
  it('matches country checks against both country and legacy geo list entries', async () => {
    const service = new ListResolverService(
      createEnvWithRows([
        {
          type: 'country',
          value: 'US',
          campaignId: null,
          conditionMode: null,
          conditionsJson: null,
        },
        {
          type: 'geo',
          value: 'CA',
          campaignId: null,
          conditionMode: null,
          conditionsJson: null,
        },
      ])
    );

    await expect(service.inBlacklist('country', { campaignId: 'cmp1', country: 'US' })).resolves.toBe(true);
    await expect(service.inBlacklist('geo', { campaignId: 'cmp1', country: 'CA' })).resolves.toBe(true);
  });

  it('limits list matches to the campaign traffic source plus general entries', async () => {
    const service = new ListResolverService(
      createEnvWithRows([
        {
          trafficSourceId: 'general',
          type: 'isp',
          value: 'Trusted ISP',
          campaignId: null,
          conditionMode: null,
          conditionsJson: null,
        },
        {
          trafficSourceId: 'ts-allowed',
          type: 'isp',
          value: 'Scoped ISP',
          campaignId: null,
          conditionMode: null,
          conditionsJson: null,
        },
      ])
    );

    const serviceAny = service as unknown as {
      trafficSourceRepo: { findByIdentifierWithStorageId: (id: string) => Promise<unknown> };
    };

    Object.defineProperty(serviceAny, 'trafficSourceRepo', {
      value: {
        findByIdentifierWithStorageId: vi.fn(async (id: string) =>
          id === 'source-display'
            ? {
                storageId: 'ts-allowed',
                trafficSource: {
                  id: 'source-display',
                  displayId: 'source-display',
                },
              }
            : null
        ),
      },
      configurable: true,
      writable: true,
    });

    await expect(
      service.inBlacklist('isp', {
        campaignId: 'cmp1',
        trafficSourceId: 'source-display',
        isp: 'Scoped ISP',
      })
    ).resolves.toBe(true);

    await expect(
      service.inBlacklist('isp', {
        campaignId: 'cmp1',
        trafficSourceId: 'source-display',
        isp: 'Trusted ISP',
      })
    ).resolves.toBe(true);
  });
});
