import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Database } from './index';
import { IdService } from '@/services/id.service';
import { LandingPageRepository } from './landingPage.repo';

describe('LandingPageRepository hosted landing metadata', () => {
  beforeEach(() => {
    vi.spyOn(IdService.prototype, 'generateId').mockResolvedValue('lp1');
  });

  it('persists the hosted asset binding and manifest metadata when creating a landing', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const row = {
      id: 'lp1',
      displayId: 'lp1',
      name: 'Battery landing',
      url: 'https://tracker.test/hosted-assets/ha_1/content?mode=local',
      status: 'active',
      group: 'battery',
      hostingMode: 'local',
      assetId: 'ha_1',
      manifestJson: '{"name":"battery"}',
      notes: 'Imported from workers-landing',
      sourceSlug: null,
    };
    const db = {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => {
          calls.push({ sql, values });
          return {
            run: async () => ({}),
            first: async () => row,
          };
        },
      }),
    } as unknown as D1Database;

    const repo = new LandingPageRepository(db);
    const landing = await repo.create({
      name: row.name,
      url: row.url,
      group: row.group,
      hostingMode: 'local',
      assetId: row.assetId,
      manifestJson: row.manifestJson,
      notes: row.notes,
    });

    const insert = calls.find((call) => call.sql.includes('INSERT INTO landingPages'));
    expect(insert?.sql).toContain('hostingMode');
    expect(insert?.sql).toContain('assetId');
    expect(insert?.sql).toContain('manifestJson');
    expect(insert?.sql).toContain('notes');
    expect(insert?.values).toEqual([
      'lp1',
      'lp1',
      row.name,
      row.url,
      'active',
      row.group,
      'local',
      'ha_1',
      '{"name":"battery"}',
      row.notes,
      null,
      expect.any(String),
      expect.any(String),
    ]);
    expect(landing.assetId).toBe('ha_1');
    expect(landing.hostingMode).toBe('local');
    expect(landing.manifestJson).toBe('{"name":"battery"}');
  });
});
