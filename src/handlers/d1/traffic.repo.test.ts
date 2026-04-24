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
  it('derives blacklist and rule metrics from click governance fields', () => {
    const repo = new TrafficRepository(createDb());
    const getClickMetricSql = (repo as unknown as { getClickMetricSql: (metric: string) => string | null }).getClickMetricSql.bind(repo);

    expect(getClickMetricSql('blacklist_hits')).toContain("c.matchedRuleLayer");
    expect(getClickMetricSql('blacklist_hits')).toContain("'blacklist'");
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
    expect(getClickMetricSql('blacklist_hits', clickColumns)).not.toContain('matchedRuleLayer');
    expect(getClickMetricSql('rule_hits', clickColumns)).toContain('c.ruleMatched');
  });
});
