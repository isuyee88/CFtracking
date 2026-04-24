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
});
