import { describe, expect, it, vi } from 'vitest';
import { AiDecisionProvider } from './ai-decision.provider';

describe('AiDecisionProvider', () => {
  it('routes Workers AI calls through AI Gateway when configured', async () => {
    const run = vi.fn().mockResolvedValue({
      response:
        '{"actionType":"ADJUST_BID","confidence":0.82,"reason":"Stable negative ROI","evidence":[{"label":"ROI","value":"-45%"}],"expectedImpact":{"spendDeltaPercent":-15},"rollbackHint":"restore previous bid"}',
    });
    const provider = new AiDecisionProvider({
      AI: { run },
      AI_OPTIMIZATION_MODEL: '@cf/meta/llama-3.1-8b-instruct',
      AI_OPTIMIZATION_GATEWAY_ID: 'gw-prod-01',
    } as any);

    const analysis = await provider.analyzeDecision({
      candidate: { campaignId: 'camp-1', scopeType: 'campaign', scopeId: 'camp-1' } as any,
      prompt: '{"campaignId":"camp-1"}',
      model: '@cf/meta/llama-3.1-8b-instruct',
      fallback: {
        actionType: 'OBSERVE',
        confidence: 0.5,
        reason: 'fallback',
        evidence: [],
        expectedImpact: { riskLevel: 'low' },
      },
      parseResponse: (rawResponse) => JSON.parse(rawResponse),
    });

    expect(run).toHaveBeenCalledWith(
      '@cf/meta/llama-3.1-8b-instruct',
      expect.any(Object),
      expect.objectContaining({
        gateway: {
          id: 'gw-prod-01',
        },
      }),
    );
    expect(analysis.provider).toBe('workers-ai-gateway');
    expect(analysis.gatewayId).toBe('gw-prod-01');
    expect(analysis.fallbackUsed).toBe(false);
  });

  it('falls back to heuristics when the AI Gateway call fails', async () => {
    const provider = new AiDecisionProvider({
      AI: {
        run: vi.fn().mockRejectedValue(new Error('gateway timeout')),
      },
    } as any);

    const analysis = await provider.analyzeDecision({
      candidate: { campaignId: 'camp-1', scopeType: 'zone', scopeId: 'zone-1' } as any,
      prompt: '{}',
      model: '@cf/meta/llama-3.1-8b-instruct',
      fallback: {
        actionType: 'BLOCK_ZONE',
        confidence: 0.91,
        reason: 'heuristic block',
        evidence: [],
        expectedImpact: { riskLevel: 'high' },
      },
      parseResponse: () => {
        throw new Error('should not parse');
      },
    });

    expect(analysis.provider).toBe('heuristic-fallback');
    expect(analysis.fallbackUsed).toBe(true);
    expect(analysis.fallbackReason).toContain('gateway timeout');
    expect(analysis.actionType).toBe('BLOCK_ZONE');
  });

  it('falls back when the AI output violates the structured contract', async () => {
    const provider = new AiDecisionProvider({
      AI: {
        run: vi.fn().mockResolvedValue({
          response: '{"actionType":"BLOCK_ZONE"}',
        }),
      },
    } as any);

    const analysis = await provider.analyzeDecision({
      candidate: { campaignId: 'camp-1', scopeType: 'campaign', scopeId: 'camp-1' } as any,
      prompt: '{}',
      model: '@cf/meta/llama-3.1-8b-instruct',
      fallback: {
        actionType: 'OBSERVE',
        confidence: 0.58,
        reason: 'fallback observe',
        evidence: [],
        expectedImpact: { riskLevel: 'low' },
      },
      parseResponse: () => {
        throw new Error('AI response reason is missing');
      },
    });

    expect(analysis.provider).toBe('heuristic-fallback');
    expect(analysis.fallbackUsed).toBe(true);
    expect(analysis.fallbackReason).toContain('AI response reason is missing');
    expect(analysis.reason).toBe('fallback observe');
  });
});
