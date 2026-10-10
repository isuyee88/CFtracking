import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import { TrafficRepository } from '@/handlers/d1/traffic.repo';

function createDb(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
      })),
    })),
  } as unknown as D1Database;
}

describe('TrafficRepository click-report governance metrics', () => {
  it('maps source dimension to campaign-bound traffic source instead of raw utmSource', () => {
    const repo = new TrafficRepository(createDb());
    const resolveClickDimensionExpression = (repo as unknown as {
      resolveClickDimensionExpression: (dimension: string) => string | null;
    }).resolveClickDimensionExpression.bind(repo);

    expect(resolveClickDimensionExpression('source')).toContain('ts.name');
    expect(resolveClickDimensionExpression('source')).toContain('cmp.trafficSource');
    expect(resolveClickDimensionExpression('utm_source')).toBe('c.utmSource');
  });

  it('derives blacklist and rule metrics from click governance fields', () => {
    const repo = new TrafficRepository(createDb());
    const getClickMetricSql = (repo as unknown as { getClickMetricSql: (metric: string) => string | null }).getClickMetricSql.bind(repo);

    expect(getClickMetricSql('unique_clicks')).toContain('c.isUnique');
    expect(getClickMetricSql('blacklist_hits')).toContain("c.matchedRuleLayer");
    expect(getClickMetricSql('blacklist_hits')).toContain("'blacklist'");
    expect(getClickMetricSql('blacklist_hits')).toContain("'block_exact'");
    expect(getClickMetricSql('blacklist_hits')).toContain("'block_category_aggressive'");
    expect(getClickMetricSql('blacklist_rate')).toContain("c.matchedRuleLayer");
    expect(getClickMetricSql('rule_hits')).toContain("c.matchedRuleLayer");
    expect(getClickMetricSql('rule_hits')).toContain("'campaign'");
    expect(getClickMetricSql('rule_hits')).toContain("'flow'");
  });

  it('falls back to riskReasons tags when governance layer columns are unavailable', () => {
    const repo = new TrafficRepository(createDb());
    const getClickMetricSql = (repo as unknown as {
      getClickMetricSql: (metric: string, clickColumns?: Set<string>) => string | null;
    }).getClickMetricSql.bind(repo);
    const clickColumns = new Set(['clickId', 'riskReasons', 'ruleMatched', 'ruleBlocked']);

    expect(getClickMetricSql('blacklist_hits', clickColumns)).toContain('governance_layer:blacklist');
    expect(getClickMetricSql('blacklist_hits', clickColumns)).toContain('governance_layer:block_exact');
    expect(getClickMetricSql('blacklist_hits', clickColumns)).toContain('governance_layer:block_category_aggressive');
    expect(getClickMetricSql('blacklist_hits', clickColumns)).not.toContain('matchedRuleLayer');
    expect(getClickMetricSql('rule_hits', clickColumns)).toContain('c.ruleMatched');
  });

  it('routes unique click metrics through click-level aggregation', async () => {
    const repo = new TrafficRepository(createDb());
    const getCustomReportFromClicks = vi
      .spyOn(repo as unknown as { getCustomReportFromClicks: (options: Record<string, unknown>) => Promise<any[]> }, 'getCustomReportFromClicks')
      .mockResolvedValue([{ campaign: 'c16', unique_clicks: 1 }]);

    const result = await repo.getCustomReport({
      startDate: '2026-04-24',
      endDate: '2026-04-24',
      groupBy: ['campaign'],
      metrics: ['unique_clicks'],
      filters: [],
      limit: 10,
      sortBy: 'unique_clicks',
      sortOrder: 'desc',
    });

    expect(getCustomReportFromClicks).toHaveBeenCalledOnce();
    expect(result).toEqual([{ campaign: 'c16', unique_clicks: 1 }]);
  });
});
