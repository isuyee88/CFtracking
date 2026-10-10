import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import { ClickRepository } from '@/handlers/d1/click.repo';
import type { ClickData } from '@/types/tracking';

function createClickData(): ClickData {
  return {
    clickId: 'clk-1',
    campaignId: 'camp-1',
    flowId: 'flow-1',
    landingPageId: 'landing-1',
    offerId: 'offer-1',
    timestamp: '2026-04-24T00:00:00.000Z',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    referer: null,
    country: 'US',
    city: 'San Jose',
    region: null,
    device: 'desktop',
    browser: 'Chrome',
    os: 'macOS',
    isp: 'Test ISP',
    connectionType: 'wifi',
    visitorId: 'visitor-1',
    subId1: 'z1',
    subId2: 'z2',
    subId3: 'z3',
    subId4: null,
    subId5: null,
    cost: 0.2,
    isUnique: true,
    redirectUrl: 'https://example.com',
    utmSource: 'fb',
    utmMedium: 'cpc',
    utmCampaign: 'spring',
    utmTerm: 'term',
    utmContent: 'content',
    fingerprint: 'fp-1',
    riskScore: 10,
    isBot: false,
    isSuspicious: true,
    riskReasons: ['bot_signal'],
    ruleMatched: 1,
    ruleBlocked: 1,
    governanceAction: 'block',
    matchedRuleId: 'rule-1',
    matchedRuleLayer: 'blacklist',
    matchedRuleReason: 'blocked by qa',
  };
}

function createDb(columnNames: string[], bindSpy: ReturnType<typeof vi.fn>) {
  const prepare = vi.fn((sql: string) => {
    if (sql.includes('PRAGMA table_info(clicks)')) {
      return {
        all: vi.fn().mockResolvedValue({
          results: columnNames.map((name) => ({ name })),
        }),
      };
    }

    return {
      bind: bindSpy,
    };
  });

  return {
    db: {
      prepare,
    } as unknown as D1Database,
    prepare,
  };
}

function createQueryDb(columnNames: string[]) {
  const bindCalls: Array<unknown[]> = [];
  const prepare = vi.fn((sql: string) => {
    if (sql.includes('PRAGMA table_info(clicks)')) {
      return {
        all: vi.fn().mockResolvedValue({
          results: columnNames.map((name) => ({ name })),
        }),
      };
    }

    if (sql.includes('COUNT(*) as total')) {
      return {
        bind: vi.fn((...args: unknown[]) => {
          bindCalls.push(args);
          return {
          first: vi.fn().mockResolvedValue({ total: 0 }),
          };
        }),
        first: vi.fn().mockResolvedValue({ total: 0 }),
      };
    }

    return {
      bind: vi.fn((...args: unknown[]) => {
        bindCalls.push(args);
        return {
          all: vi.fn().mockResolvedValue({ results: [] }),
        };
      }),
    };
  });

  return {
    db: {
      prepare,
    } as unknown as D1Database,
    prepare,
    bindCalls,
  };
}

describe('ClickRepository governance column compatibility', () => {
  it('stores governance tags in riskReasons when matchedRule columns are missing', async () => {
    const runMock = vi.fn().mockResolvedValue({ success: true });
    const bindSpy = vi.fn(() => ({ run: runMock }));
    const { db, prepare } = createDb([
      'clickId', 'campaignId', 'riskReasons', 'ruleMatched', 'ruleBlocked',
    ], bindSpy);
    const repo = new ClickRepository(db);

    await repo.saveClick(createClickData());

    const [sql] = prepare.mock.calls[1] as [string];
    expect(sql).not.toContain('matchedRuleId');

    const boundValues = (bindSpy.mock.calls[0] || []) as unknown[];
    const riskReasonsJson = boundValues.find((value): value is string => typeof value === 'string' && value.includes('governance_layer:blacklist'));
    expect(riskReasonsJson).toContain('bot_signal');
    expect(riskReasonsJson).toContain('governance_action:block');
    expect(riskReasonsJson).toContain('governance_layer:blacklist');
    expect(riskReasonsJson).toContain('governance_rule:rule-1');
  });

  it('writes dedicated governance columns when schema already supports them', async () => {
    const runMock = vi.fn().mockResolvedValue({ success: true });
    const bindSpy = vi.fn(() => ({ run: runMock }));
    const { db, prepare } = createDb([
      'clickId', 'campaignId', 'riskReasons', 'ruleMatched', 'ruleBlocked',
      'matchedRuleId', 'matchedRuleLayer', 'matchedRuleReason',
    ], bindSpy);
    const repo = new ClickRepository(db);

    await repo.saveClick(createClickData());

    const [sql] = prepare.mock.calls[1] as [string];
    expect(sql).toContain('matchedRuleId');
    expect(sql).toContain('matchedRuleLayer');
    expect(sql).toContain('matchedRuleReason');

    const boundValues = (bindSpy.mock.calls[0] || []) as unknown[];
    expect(boundValues).toContain('rule-1');
    expect(boundValues).toContain('blacklist');
    expect(boundValues).toContain('blocked by qa');
  });

  it('preserves existing governance columns when governanceAction is not available yet', async () => {
    const runMock = vi.fn().mockResolvedValue({ success: true });
    const bindSpy = vi.fn(() => ({ run: runMock }));
    const { db, prepare } = createDb([
      'clickId', 'campaignId', 'riskReasons', 'ruleMatched', 'ruleBlocked',
      'matchedRuleId', 'matchedRuleLayer', 'matchedRuleReason',
    ], bindSpy);
    const repo = new ClickRepository(db);

    await repo.saveClick(createClickData());

    const [sql] = prepare.mock.calls[1] as [string];
    expect(sql).toContain('matchedRuleId');
    expect(sql).toContain('matchedRuleLayer');
    expect(sql).toContain('matchedRuleReason');
    expect(sql).not.toContain('governanceAction');

    const boundValues = (bindSpy.mock.calls[0] || []) as unknown[];
    expect(boundValues).toContain('rule-1');
    expect(boundValues).toContain('blacklist');
    expect(boundValues).toContain('blocked by qa');
  });

  it('joins campaigns and traffic sources for drilldown filters', async () => {
    const { db, prepare } = createQueryDb([
      'clickId',
      'campaignId',
      'utmSource',
      'utmCampaign',
      'subId1',
      'subId2',
      'subId3',
      'fingerprint',
      'riskScore',
      'matchedRuleLayer',
      'matchedRuleReason',
      'governanceAction',
    ]);
    const repo = new ClickRepository(db);

    await repo.findClicks({
      page: 1,
      pageSize: 20,
      campaignId: 'camp-1',
      source: 'Meta',
      zoneId: 'zone-7',
      utmSource: 'fb',
      utmCampaign: 'spring',
      subId1: 's1',
      fingerprint: 'fp-1',
    });

    const sqlStatements = prepare.mock.calls.map(([sql]) => String(sql));
    const countSql = sqlStatements.find((sql) => sql.includes('COUNT(*) as total')) || '';
    const listSql = sqlStatements.find((sql) => sql.includes('ORDER BY c.timestamp DESC')) || '';

    expect(countSql).toContain('LEFT JOIN campaigns cmp ON cmp.id = c.campaignId');
    expect(countSql).toContain('LEFT JOIN trafficSources ts ON ts.id = cmp.trafficSource');
    expect(countSql).toContain("COALESCE(NULLIF(ts.name, ''), NULLIF(cmp.trafficSource, '')) = ?");
    expect(countSql).toContain("COALESCE(NULLIF(c.subId1, ''), NULLIF(c.subId2, ''), NULLIF(c.subId3, '')) = ?");
    expect(listSql).toContain("as source");
    expect(listSql).toContain("as zoneId");
  });

  it('normalizes date-only filters to full-day ISO boundaries for click list and stats queries', async () => {
    const { db, bindCalls } = createQueryDb([
      'clickId',
      'campaignId',
      'timestamp',
      'utmSource',
      'utmCampaign',
      'subId1',
      'subId2',
      'subId3',
      'fingerprint',
      'riskScore',
      'matchedRuleLayer',
      'matchedRuleReason',
      'governanceAction',
    ]);
    const repo = new ClickRepository(db);

    await repo.findClicks({
      page: 1,
      pageSize: 20,
      campaignId: 'camp-1',
      startDate: '2026-04-24',
      endDate: '2026-04-24',
    });

    await repo.getClickStats('2026-04-24', '2026-04-24', { campaignId: 'camp-1' });

    expect(bindCalls.some((args) => args.includes('2026-04-24T00:00:00.000Z'))).toBe(true);
    expect(bindCalls.some((args) => args.includes('2026-04-24T23:59:59.999Z'))).toBe(true);
  });
});
