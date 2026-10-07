import { describe, expect, it } from 'vitest';
import { normalizeLandingManifest } from './manifest';

describe('normalizeLandingManifest', () => {
  it('normalizes a workers-landing manifest and preserves affiliate compliance metadata', () => {
    const result = normalizeLandingManifest({
      name: 'top10-battery',
      updatedAt: 'Oct 2026',
      page: {
        title: 'Top 10 Battery Picks',
        subtitle: 'Merchant feed comparison',
      },
      compliance: {
        disclosure: 'We may earn a commission when you buy through our links.',
      },
      platformPreset: 'pop',
      cardStyle: 'top10',
      offers: [
        {
          slot: 1,
          name: 'Battery Charger',
          click: { url: 'https://pboost.me/example', params: { campaign_id: 'top10-battery' } },
        },
      ],
    });

    expect(result.sourceSlug).toBe('top10-battery');
    expect(result.name).toBe('Top 10 Battery Picks');
    expect(result.hostingMode).toBe('remote');
    expect(result.offerCount).toBe(1);
    expect(result.disclosure).toContain('commission');
    expect(JSON.parse(result.manifestJson)).toMatchObject({
      platformPreset: 'pop',
      cardStyle: 'top10',
    });
  });

  it('rejects a manifest without disclosure or valid offer URLs', () => {
    expect(() => normalizeLandingManifest({
      name: 'unsafe',
      compliance: { disclosure: '' },
      offers: [{ name: 'Bad', click: { url: 'javascript:alert(1)' } }],
    })).toThrow(/disclosure|offer URL/i);
  });
});
