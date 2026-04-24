import { describe, expect, it } from 'vitest';
import { buildTrafficSourceMacroPreview } from '@/services/trafficSource/macro-preview';

describe('buildTrafficSourceMacroPreview', () => {
  it('renders parameter query and postback preview with provided context', () => {
    const result = buildTrafficSourceMacroPreview({
      parameters: [
        { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
        { alias: 'Click', paramName: 'click_id', macro: '{click_id}' },
      ],
      postbackUrl:
        'https://partner.example/postback?click={click_id}&revenue={{revenue}}&currency={{currency}}',
      context: {
        campaign_id: 'cmp_900',
        click_id: 'clk_abc',
        revenue: 12.5,
        currency: 'USD',
      },
    });

    expect(result.trackingQuery).toContain('utm_campaign=cmp_900');
    expect(result.trackingQuery).toContain('click_id=clk_abc');
    expect(result.postbackPreview).toContain('click=clk_abc');
    expect(result.postbackPreview).toContain('revenue=12.5');
    expect(result.unresolvedMacros).toEqual([]);
  });

  it('keeps unknown macros and reports them as unresolved', () => {
    const result = buildTrafficSourceMacroPreview({
      parameters: [{ alias: 'Unknown', paramName: 'x', macro: '{unknown_token}' }],
      postbackUrl: 'https://example.com/pb?x={unknown_token}&status={status}',
      context: {},
    });

    expect(result.parameterPreview[0]?.resolvedValue).toBe('{unknown_token}');
    expect(result.postbackPreview).toContain('x={unknown_token}');
    expect(result.unresolvedMacros).toContain('{unknown_token}');
    expect(result.detectedMacros).toContain('{unknown_token}');
  });

  it('supports double braces and underscore token syntax', () => {
    const result = buildTrafficSourceMacroPreview({
      parameters: [{ alias: 'Placement', paramName: 'p', macro: '__PLACEMENT__' }],
      postbackUrl: 'https://example.com/pb?placement=__PLACEMENT__&city={{city}}',
      context: {
        placement: 'feed_top',
        city: 'Shanghai',
      },
    });

    expect(result.parameterPreview[0]?.resolvedValue).toBe('feed_top');
    expect(result.postbackPreview).toContain('placement=feed_top');
    expect(result.postbackPreview).toContain('city=Shanghai');
  });
});
