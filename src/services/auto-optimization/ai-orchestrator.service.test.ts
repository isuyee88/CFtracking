import { describe, expect, it, vi } from 'vitest';
import { AiOptimizationOrchestratorService } from './ai-orchestrator.service';

function createService() {
  const service = new AiOptimizationOrchestratorService({
    DB: {} as any,
  } as any);

  (service as any).repo = {
    getAiDecisionByIdempotencyKey: vi.fn().mockResolvedValue(null),
    createAiDecision: vi.fn().mockImplementation(async (input: any) => ({
      id: 'ai-dec-1',
      displayId: 1,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
      ...input,
    })),
    updateAiDecision: vi.fn().mockResolvedValue(undefined),
    createOperation: vi.fn().mockResolvedValue({ id: 'op-1' }),
    updateOperationStatus: vi.fn().mockResolvedValue(undefined),
    getAiDecision: vi.fn(),
    getOperation: vi.fn(),
    createRollback: vi.fn().mockResolvedValue({ id: 'rollback-1' }),
    getRecentAiDecisions: vi.fn().mockResolvedValue([]),
    getAiDecisionStats: vi.fn().mockResolvedValue({
      total: 0,
      executed: 0,
      failed: 0,
      blockedBySafety: 0,
      noAction: 0,
      rollbackAvailable: 0,
      rollbackSuccess: 0,
      rollbackFailed: 0,
    }),
  };
  (service as any).safetyValve = {
    checkAll: vi.fn().mockResolvedValue({ passed: true, results: [] }),
  };
  (service as any).executor = {
    executeOperation: vi.fn().mockResolvedValue({
      operationId: 'op-1',
      actionType: 'ADJUST_BID',
      platform: 'propellerads',
      executed: true,
      success: true,
      message: 'ok',
      details: { previousBid: 0.5, newBid: 0.4 },
    }),
  };
  (service as any).generateOptimizationCandidates = vi.fn();
  (service as any).analyzeCandidateWithAI = vi.fn();

  return service as any;
}

describe('AiOptimizationOrchestratorService', () => {
  it('records blocked-by-safety AI decisions without creating platform operations', async () => {
    const service = createService();
    service.generateOptimizationCandidates.mockResolvedValue([
      {
        campaignId: 'camp-1',
        scopeType: 'zone',
        scopeId: 'zone-7',
        platform: 'propellerads',
        metrics: {
          roi: -0.9,
          revenue: 5,
          cost: 20,
          profit: -15,
          clicks: 60,
          conversions: 1,
          ctr: 0,
          cr: 1.6,
          cpc: 0.33,
          epc: 0.08,
          cpa: 20,
        },
        evidence: [],
        windowStart: '2026-04-27T00:00:00.000Z',
        windowEnd: '2026-04-28T00:00:00.000Z',
        recentOperations: [],
      },
    ]);
    service.analyzeCandidateWithAI.mockResolvedValue({
      actionType: 'BLOCK_ZONE',
      confidence: 0.95,
      reason: 'roi collapsed',
      evidence: [{ label: 'ROI', value: '-90%' }],
      expectedImpact: { riskLevel: 'high' },
      rollbackHint: 'include zone if ROI recovers',
      model: 'heuristic-fallback',
      rawResponse: '{"actionType":"BLOCK_ZONE"}',
    });
    service.safetyValve.checkAll.mockResolvedValue({
      passed: false,
      blockedReason: '[hard_limits] Zone too new',
      results: [{ passed: false, category: 'hard_limits', reason: 'Zone too new' }],
    });

    const result = await service.runOptimizationCycle({ campaignId: 'camp-1' });

    expect(result.blocked).toBe(1);
    expect(service.repo.createOperation).not.toHaveBeenCalled();
    expect(service.repo.updateAiDecision).toHaveBeenCalledWith(
      'ai-dec-1',
      expect.objectContaining({
        status: 'blocked_by_safety',
        executionStatus: 'skipped',
        executionError: '[hard_limits] Zone too new',
      }),
    );
  });

  it('creates and executes operations for auto-approved AI decisions', async () => {
    const service = createService();
    service.generateOptimizationCandidates.mockResolvedValue([
      {
        campaignId: 'camp-1',
        scopeType: 'campaign',
        scopeId: 'camp-1',
        platform: 'propellerads',
        metrics: {
          roi: -0.45,
          revenue: 55,
          cost: 100,
          profit: -45,
          clicks: 180,
          conversions: 3,
          ctr: 0,
          cr: 1.6,
          cpc: 0.55,
          epc: 0.30,
          cpa: 33,
        },
        evidence: [],
        windowStart: '2026-04-27T00:00:00.000Z',
        windowEnd: '2026-04-28T00:00:00.000Z',
        recentOperations: [],
      },
    ]);
    service.analyzeCandidateWithAI.mockResolvedValue({
      actionType: 'ADJUST_BID',
      confidence: 0.82,
      reason: 'negative roi with enough volume',
      evidence: [{ label: 'ROI', value: '-45%' }],
      expectedImpact: { spendDeltaPercent: -20, riskLevel: 'medium' },
      rollbackHint: 'restore previous bid if ROI worsens',
      actionParameters: { bidMultiplier: 0.8 },
      model: 'heuristic-fallback',
      rawResponse: '{"actionType":"ADJUST_BID"}',
    });

    const result = await service.runOptimizationCycle({ campaignId: 'camp-1' });

    expect(result.executed).toBe(1);
    expect(service.repo.createOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'camp-1',
        actionType: 'ADJUST_BID',
        platform: 'propellerads',
      }),
    );
    expect(service.repo.updateOperationStatus).toHaveBeenCalledWith('op-1', { approvalStatus: 'auto_approved' });
    expect(service.executor.executeOperation).toHaveBeenCalledWith('op-1');
    expect(service.repo.updateAiDecision).toHaveBeenCalledWith(
      'ai-dec-1',
      expect.objectContaining({
        status: 'executed',
        executionStatus: 'executed',
        rollbackStatus: 'available',
        operationId: 'op-1',
      }),
    );
  });

  it('creates reverse operations for rollbackable AI decisions', async () => {
    const service = createService();
    service.repo.getAiDecision.mockResolvedValue({
      id: 'ai-dec-1',
      campaignId: 'camp-1',
      scopeType: 'campaign',
      scopeId: 'camp-1',
      platform: 'propellerads',
      actionType: 'ADJUST_BID',
      operationId: 'op-1',
      rollbackStatus: 'available',
    });
    service.repo.getOperation.mockResolvedValue({
      id: 'op-1',
      campaignId: 'camp-1',
      actionType: 'ADJUST_BID',
      platform: 'propellerads',
      parameters: { bidMultiplier: 0.8 },
      executionResult: JSON.stringify({ previousBid: 0.5, newBid: 0.4 }),
      decisionContext: {
        roi: -0.45,
        clicks: 180,
        conversions: 3,
        cost: 100,
        revenue: 55,
        confidence: 0.82,
        triggerReason: 'negative roi with enough volume',
      },
    });
    service.repo.createOperation.mockResolvedValueOnce({ id: 'rollback-op-1' });
    service.executor.executeOperation.mockResolvedValue({
      operationId: 'rollback-op-1',
      actionType: 'ADJUST_BID',
      platform: 'propellerads',
      executed: true,
      success: true,
      message: 'rollback-ok',
    });

    const result = await service.rollbackDecision('ai-dec-1');

    expect(result.success).toBe(true);
    expect(service.repo.createOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'camp-1',
        actionType: 'ADJUST_BID',
        parameters: expect.objectContaining({ bid: 0.5 }),
      }),
    );
    expect(service.repo.updateAiDecision).toHaveBeenCalledWith(
      'ai-dec-1',
      expect.objectContaining({
        rollbackStatus: 'rollback_success',
        rollbackOperationId: 'rollback-op-1',
      }),
    );
  });
});
