import { describe, expect, it } from 'vitest';
import {
  formatGovernanceSummary,
  RULE_BUILDER_FIELD_OPTIONS,
  formatGovernanceActionLabel,
  formatMatchedRuleLayerLabel,
  formatMatchedRuleReasonLabel,
} from '../../frontend/src/constants/governance-ui';

describe('governance UI metadata', () => {
  it('exposes the new runtime governance fields in the rule builder', () => {
    const values = RULE_BUILDER_FIELD_OPTIONS.map((item) => item.value);

    expect(values).toContain('visitorId');
    expect(values).toContain('ispType');
    expect(values).toContain('orgName');
    expect(values).toContain('verifiedBot');
    expect(values).toContain('botScore');
    expect(values).toContain('challengeState');
    expect(values).toContain('tokenReplayState');
    expect(values).toContain('campaignCount7d');
    expect(values).toContain('visitorRepeat7d');
    expect(values).toContain('ipRepeat7d');
  });

  it('formats governance actions and layers into readable labels', () => {
    expect(formatGovernanceActionLabel('allow')).toBe('Allow');
    expect(formatGovernanceActionLabel('challenge')).toBe('Challenge');
    expect(formatMatchedRuleLayerLabel('block_exact')).toBe('Blacklist: Exact Match');
    expect(formatMatchedRuleLayerLabel('block_category_aggressive')).toBe('Blacklist: Aggressive Category');
    expect(formatMatchedRuleLayerLabel('allow_bias')).toBe('Whitelist: Allow Bias');
    expect(formatMatchedRuleLayerLabel('suspicious_queue')).toBe('Observation Queue');
  });

  it('formats governance reasons into readable explanations', () => {
    expect(formatMatchedRuleReasonLabel('blocked_user_agent:playwright')).toBe('Blocked user agent matched "playwright"');
    expect(formatMatchedRuleReasonLabel('allow_bias_org:comcast cable:suspicious_signal:no_js_data')).toBe(
      'Allow bias matched organization "comcast cable" | Suspicious signal observed "no_js_data"'
    );
    expect(formatMatchedRuleReasonLabel('allow_exact_zone_matched')).toBe('Whitelist exact match on Zone ID');
    expect(formatMatchedRuleReasonLabel('scope_schema_unavailable')).toBe('Autorule scope schema unavailable');
    expect(formatMatchedRuleReasonLabel('whitelist_gate_unmatched:trusted_bypass')).toBe(
      'Whitelist gate left the request unmatched | Trusted challenge bypass applied'
    );
  });

  it('combines governance action, layer, and reason into a readable summary', () => {
    expect(
      formatGovernanceSummary({
        action: 'block',
        layer: 'block_exact',
        reason: 'blocked_user_agent:playwright',
      })
    ).toBe('Block | Blacklist: Exact Match | Blocked user agent matched "playwright"');
  });
});
