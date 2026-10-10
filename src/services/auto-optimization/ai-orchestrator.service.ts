/**
 * @fileoverview AI optimization orchestration service
 * @description Builds report-driven optimization candidates, runs AI/heuristic analysis,
 * validates decisions, materializes executable operations, and records audit history.
 * @module services/auto-optimization/ai-orchestrator
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection, type D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  AiOptimizationActionType,
  AiOptimizationDecision,
  AiOptimizationDecisionStatus,
  AiOptimizationEvidenceItem,
  AiOptimizationExpectedImpact,
  AiOptimizationMetricsSnapshot,
  AiOptimizationScopeType,
  DecisionContext,
  TimeWindow,
  TriggerType,
} from '@/types/auto-optimization';
import { SafetyValveService } from './safety-valve.service';
import { AutoOperationExecutorService } from './operation-executor.service';
import { AiDecisionProvider, type AiDecisionProviderRuntimeInfo } from './ai-decision.provider';

export interface AiOptimizationCandidate {
  campaignId: string;
  scopeType: AiOptimizationScopeType;
  scopeId: string;
  platform: string;
  metrics: AiOptimizationMetricsSnapshot;
  evidence: AiOptimizationEvidenceItem[];
  recentOperations: Array<{ actionType: string; executionStatus: string; createdAt: string }>;
  windowStart: string;
  windowEnd: string;
}

export interface AiOptimizationAnalysis {
  actionType: AiOptimizationActionType;
  confidence: number;
  reason: string;
  evidence: AiOptimizationEvidenceItem[];
  expectedImpact: AiOptimizationExpectedImpact;
  rollbackHint?: string;
  actionParameters?: Record<string, unknown>;
  provider?: 'workers-ai-gateway' | 'workers-ai-direct' | 'heuristic-fallback';
  gatewayId?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  model?: string;
  rawResponse?: string;
}

export interface AiOptimizationEngineConfig {
  enabled: boolean;
  platform: 'propellerads';
  primaryTrigger: 'scheduled';
  supplementalTrigger: 'conditional';
  defaultTimeWindow: TimeWindow;
  scheduleCron: string;
  aiEnabled: boolean;
  provider: AiDecisionProviderRuntimeInfo['provider'];
  gatewayEnabled: boolean;
  gatewayId?: string;
  model: string;
  fallbackProvider: AiDecisionProviderRuntimeInfo['fallbackProvider'];
  autoExecute: true;
}

export class AiOptimizationOrchestratorService {
  private repo: AutoOptimizationRepository;
  private safetyValve: SafetyValveService;
  private executor: AutoOperationExecutorService;
  private decisionProvider: AiDecisionProvider;
  private env: Env;

  private readonly QUERY_CONFIG = {
    MIN_CLICKS: {
      campaign: 100,
      zone: 30,
      publisher: 30,
    },
    BLACKLIST_LAYERS: ['blacklist', 'block_exact', 'block_category_aggressive'],
  } as const;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
    this.safetyValve = new SafetyValveService(env);
    this.executor = new AutoOperationExecutorService(env);
    this.decisionProvider = new AiDecisionProvider(env);
  }

  private get envMap(): Record<string, unknown> {
    return this.env as unknown as Record<string, unknown>;
  }

  async getEngineConfig(): Promise<AiOptimizationEngineConfig> {
    const runtimeInfo = this.decisionProvider.getRuntimeInfo();
    return {
      enabled: this.readBooleanFlag(this.envMap.AI_OPTIMIZATION_ENABLED, true),
      platform: 'propellerads',
      primaryTrigger: 'scheduled',
      supplementalTrigger: 'conditional',
      defaultTimeWindow: '24h',
      scheduleCron: '0 * * * *',
      aiEnabled: runtimeInfo.aiBindingAvailable,
      provider: runtimeInfo.provider,
      gatewayEnabled: runtimeInfo.gatewayEnabled,
      gatewayId: runtimeInfo.gatewayId,
      model: runtimeInfo.model,
      fallbackProvider: runtimeInfo.fallbackProvider,
      autoExecute: true,
    };
  }

  async getRecentDecisions(limit: number = 20): Promise<AiOptimizationDecision[]> {
    return this.repo.getRecentAiDecisions(limit);
  }

  async getDecisionStats(days: number = 7) {
    return this.repo.getAiDecisionStats(days);
  }

  async runOptimizationCycle(options?: {
    campaignId?: string;
    timeWindow?: TimeWindow;
    limit?: number;
    triggerType?: TriggerType;
  }): Promise<{
    processed: number;
    executed: number;
    blocked: number;
    failed: number;
    observed: number;
    noAction: number;
    decisions: AiOptimizationDecision[];
  }> {
    const candidates = await this.generateOptimizationCandidates({
      campaignId: options?.campaignId,
      timeWindow: options?.timeWindow || '24h',
      limit: options?.limit || 20,
    });

    const decisions: AiOptimizationDecision[] = [];
    let executed = 0;
    let blocked = 0;
    let failed = 0;
    let observed = 0;
    let noAction = 0;

    for (const candidate of candidates) {
      const analysis = await this.analyzeCandidateWithAI(candidate);
      const decision = await this.persistInitialDecision(
        candidate,
        analysis,
        options?.triggerType || 'scheduled',
      );

      const outcome = await this.materializeDecisionToOperation(decision, analysis, candidate);
      const refreshed = await this.repo.getAiDecision(decision.id);
      if (refreshed) {
        decisions.push(refreshed);
      }

      switch (outcome.status) {
        case 'executed':
          executed += 1;
          break;
        case 'blocked_by_safety':
          blocked += 1;
          break;
        case 'execution_failed':
        case 'unsupported':
          failed += 1;
          break;
        case 'observe':
          observed += 1;
          break;
        case 'no_action':
          noAction += 1;
          break;
      }
    }

    return {
      processed: candidates.length,
      executed,
      blocked,
      failed,
      observed,
      noAction,
      decisions,
    };
  }

  async triggerConditionalOptimization(campaignId: string): Promise<Awaited<ReturnType<AiOptimizationOrchestratorService['runOptimizationCycle']>>> {
    return this.runOptimizationCycle({
      campaignId,
      timeWindow: '24h',
      limit: 12,
      triggerType: 'auto',
    });
  }

  async rollbackDecision(decisionId: string): Promise<{ success: boolean; message: string; rollbackOperationId?: string }> {
    const decision = await this.repo.getAiDecision(decisionId);
    if (!decision) {
      return { success: false, message: 'AI decision not found' };
    }

    if (!decision.operationId || decision.rollbackStatus !== 'available') {
      return { success: false, message: 'Decision is not rollbackable' };
    }

    const operation = await this.repo.getOperation(decision.operationId);
    if (!operation) {
      return { success: false, message: 'Original operation not found' };
    }

    const rollbackSpec = this.buildRollbackOperation(operation);
    if (!rollbackSpec) {
      await this.repo.updateAiDecision(decisionId, {
        rollbackStatus: 'rollback_failed',
      });
      return { success: false, message: 'Rollback is not supported for this action' };
    }

    const rollbackOperation = await this.repo.createOperation(rollbackSpec);
    if (!rollbackOperation) {
      await this.repo.updateAiDecision(decisionId, {
        rollbackStatus: 'rollback_failed',
      });
      return { success: false, message: 'Failed to create rollback operation' };
    }

    await this.repo.updateOperationStatus(rollbackOperation.id, {
      approvalStatus: 'auto_approved',
    });
    const rollbackResult = await this.executor.executeOperation(rollbackOperation.id);
    await this.repo.createRollback({
      originalOperationId: operation.id,
      rollbackAction: rollbackSpec.actionType,
      rollbackParameters: rollbackSpec.parameters,
      preRollbackSnapshot: {
        originalActionType: operation.actionType,
        originalParameters: operation.parameters,
        originalExecutionResult: operation.executionResult,
      },
      triggerType: 'manual',
      triggeredBy: 'ai-optimization',
    });

    await this.repo.updateAiDecision(decisionId, {
      rollbackStatus: rollbackResult.success ? 'rollback_success' : 'rollback_failed',
      rollbackOperationId: rollbackOperation.id,
      rollbackedAt: new Date().toISOString(),
    });

    if (rollbackResult.success) {
      await this.repo.updateOperationStatus(operation.id, {
        approvalStatus: 'rolled_back',
        executionStatus: 'rollback_success',
      });
    }

    return {
      success: rollbackResult.success,
      message: rollbackResult.message,
      rollbackOperationId: rollbackOperation.id,
    };
  }

  async generateOptimizationCandidates(options?: {
    campaignId?: string;
    timeWindow?: TimeWindow;
    limit?: number;
  }): Promise<AiOptimizationCandidate[]> {
    const db = getD1Connection(this.env);
    const timeWindow = options?.timeWindow || '24h';
    const { start, end } = this.parseTimeWindow(timeWindow);
    const limit = options?.limit || 20;
    const campaignFilter = options?.campaignId ? ' AND cl.campaignId = ?' : '';
    const bindingsBase: unknown[] = options?.campaignId ? [options.campaignId] : [];

    const [campaignRows, zoneRows, publisherRows] = await Promise.all([
      this.buildMetricsQuery(db, {
        scopeType: 'campaign',
        start,
        end,
        campaignFilter,
        bindings: bindingsBase,
        limit,
      }),
      this.buildMetricsQuery(db, {
        scopeType: 'zone',
        start,
        end,
        campaignFilter,
        bindings: bindingsBase,
        limit,
      }),
      this.buildMetricsQuery(db, {
        scopeType: 'publisher',
        start,
        end,
        campaignFilter,
        bindings: bindingsBase,
        limit,
      }),
    ]);

    const rows: Array<{ scopeType: AiOptimizationScopeType; row: Record<string, unknown> }> = [
      ...(campaignRows || []).map((row) => ({ scopeType: 'campaign' as const, row })),
      ...(zoneRows || []).map((row) => ({ scopeType: 'zone' as const, row })),
      ...(publisherRows || []).map((row) => ({ scopeType: 'publisher' as const, row })),
    ];

    const candidates: AiOptimizationCandidate[] = [];
    for (const entry of rows) {
      const snapshot = this.buildMetricsSnapshot(entry.row);
      const recentOperations = await this.getRecentOperationHints(String(entry.row.campaignId || ''));
      candidates.push({
        campaignId: String(entry.row.campaignId || ''),
        scopeType: entry.scopeType,
        scopeId: String(entry.row.scopeId || ''),
        platform: 'propellerads',
        metrics: snapshot,
        evidence: this.buildCandidateEvidence(entry.scopeType, snapshot),
        recentOperations,
        windowStart: start,
        windowEnd: end,
      });
    }

    return candidates
      .filter((candidate) => candidate.campaignId && candidate.scopeId)
      .sort((left, right) => (right.metrics.cost || 0) - (left.metrics.cost || 0))
      .slice(0, limit);
  }

  private async buildMetricsQuery(
    db: D1Database,
    params: {
      scopeType: 'campaign' | 'zone' | 'publisher';
      start: string;
      end: string;
      campaignFilter?: string;
      bindings?: unknown[];
      limit: number;
    },
  ): Promise<Record<string, unknown>[]> {
    const { scopeType, start, end, campaignFilter, bindings, limit } = params;

    const scopeIdExpression = this.buildScopeIdExpression(scopeType);
    const whereConditions = [
      `cl.timestamp >= ?`,
      `cl.timestamp <= ?`,
      campaignFilter,
      this.buildScopeFilterCondition(scopeType),
    ]
      .filter(Boolean)
      .join(' AND ');

    const groupBy = scopeType === 'campaign' ? 'cl.campaignId' : 'cl.campaignId, scopeId';
    const minClicks = this.QUERY_CONFIG.MIN_CLICKS[scopeType];
    const blacklistLayersStr = this.QUERY_CONFIG.BLACKLIST_LAYERS.map((l) => `'${l}'`).join(', ');

    const query = `
      SELECT
        cl.campaignId as campaignId,
        ${scopeIdExpression} as scopeId,
        COUNT(DISTINCT cl.clickId) as clicks,
        COUNT(DISTINCT cv.conversionId) as conversions,
        COALESCE(SUM(cl.cost), 0) as cost,
        COALESCE(SUM(cv.payout), 0) as revenue,
        COALESCE(SUM(CASE WHEN COALESCE(cl.matchedRuleLayer, '') IN (${blacklistLayersStr}) THEN 1 ELSE 0 END), 0) as blacklistHits,
        COALESCE(SUM(COALESCE(cl.ruleBlocked, 0)), 0) as blockedClicks
      FROM clicks cl
      LEFT JOIN conversions cv
        ON cv.clickId = cl.clickId
       AND cv.status = 'approved'
       AND cv.timestamp >= ?
       AND cv.timestamp <= ?
      WHERE ${whereConditions}
      GROUP BY ${groupBy}
      HAVING COUNT(DISTINCT cl.clickId) >= ${minClicks}
      ORDER BY cost DESC
      LIMIT ?
    `;

    const queryBindings = [start, end, start, end, ...(bindings || []), limit];
    const result = await db.prepare(query).bind(...queryBindings).all<Record<string, unknown>>();
    return result.results || [];
  }

  private buildScopeIdExpression(scopeType: 'campaign' | 'zone' | 'publisher'): string {
    switch (scopeType) {
      case 'campaign':
        return 'cl.campaignId';
      case 'zone':
        return "COALESCE(NULLIF(cl.subId1, ''), NULLIF(cl.subId2, ''), NULLIF(cl.subId3, ''))";
      case 'publisher':
        return "NULLIF(cl.subId3, '')";
      default:
        return 'cl.campaignId';
    }
  }

  private buildScopeFilterCondition(scopeType: 'campaign' | 'zone' | 'publisher'): string {
    switch (scopeType) {
      case 'campaign':
        return '';
      case 'zone':
        return "COALESCE(NULLIF(cl.subId1, ''), NULLIF(cl.subId2, ''), NULLIF(cl.subId3, '')) IS NOT NULL";
      case 'publisher':
        return "NULLIF(cl.subId3, '') IS NOT NULL";
      default:
        return '';
    }
  }

  async analyzeCandidateWithAI(candidate: AiOptimizationCandidate): Promise<AiOptimizationAnalysis> {
    return this.decisionProvider.analyzeDecision({
      candidate,
      prompt: this.buildPrompt(candidate),
      model: this.decisionProvider.getModelName(),
      fallback: this.runHeuristicAnalysis(candidate),
      parseResponse: (rawResponse, currentCandidate) => this.parseAiResponse(rawResponse, currentCandidate),
    });
  }

  private async persistInitialDecision(
    candidate: AiOptimizationCandidate,
    analysis: AiOptimizationAnalysis,
    triggerType: TriggerType,
  ): Promise<AiOptimizationDecision> {
    const status = this.initialDecisionStatus(analysis.actionType);
    const executionStatus = status === 'suggested' ? 'pending' : 'skipped';
    const rollbackStatus = analysis.actionType === 'ADJUST_BID' || analysis.actionType.startsWith('BLOCK_')
      ? 'available'
      : 'not_applicable';
    const idempotencyKey = this.buildIdempotencyKey(candidate, analysis.actionType);

    const existing = await this.repo.getAiDecisionByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    const created = await this.repo.createAiDecision({
      idempotencyKey,
      campaignId: candidate.campaignId,
      scopeType: candidate.scopeType,
      scopeId: candidate.scopeId,
      platform: candidate.platform,
      actionType: analysis.actionType,
      confidence: analysis.confidence,
      reason: analysis.reason,
      evidence: analysis.evidence,
      expectedImpact: analysis.expectedImpact,
      rollbackHint: analysis.rollbackHint,
      metricsSnapshot: candidate.metrics,
      windowStart: candidate.windowStart,
      windowEnd: candidate.windowEnd,
      triggerType,
      status,
      executionStatus,
      rollbackStatus,
      operationId: undefined,
      rollbackOperationId: undefined,
      provider: analysis.provider,
      gatewayId: analysis.gatewayId,
      fallbackUsed: analysis.fallbackUsed,
      fallbackReason: analysis.fallbackReason,
      model: analysis.model,
      rawResponse: analysis.rawResponse,
      executionError: undefined,
      executedAt: undefined,
      rollbackedAt: undefined,
    });

    if (!created) {
      throw new Error('Failed to persist AI optimization decision');
    }

    return created;
  }

  private async materializeDecisionToOperation(
    decision: AiOptimizationDecision,
    analysis: AiOptimizationAnalysis,
    candidate: AiOptimizationCandidate,
  ): Promise<{ status: AiOptimizationDecisionStatus }> {
    if (analysis.actionType === 'NO_ACTION') {
      await this.repo.updateAiDecision(decision.id, {
        status: 'no_action',
        executionStatus: 'skipped',
      });
      return { status: 'no_action' };
    }

    if (analysis.actionType === 'OBSERVE') {
      await this.repo.updateAiDecision(decision.id, {
        status: 'observe',
        executionStatus: 'skipped',
      });
      return { status: 'observe' };
    }

    const normalizedAction = this.normalizeActionType(analysis.actionType);
    const safetyContext = this.buildSafetyDecisionContext(candidate, analysis);
    const safety = await this.safetyValve.checkAll(
      normalizedAction,
      candidate.campaignId,
      safetyContext,
    );
    if (!safety.passed) {
      await this.repo.updateAiDecision(decision.id, {
        status: 'blocked_by_safety',
        executionStatus: 'skipped',
        executionError: safety.blockedReason || 'Blocked by safety valve',
      });
      return { status: 'blocked_by_safety' };
    }

    const mapped = this.mapDecisionToOperation(analysis, candidate, decision);
    if (!mapped) {
      await this.repo.updateAiDecision(decision.id, {
        status: 'unsupported',
        executionStatus: 'skipped',
        executionError: 'Unsupported action/platform combination',
      });
      return { status: 'unsupported' };
    }

    const operation = await this.repo.createOperation(mapped);
    if (!operation) {
      await this.repo.updateAiDecision(decision.id, {
        status: 'execution_failed',
        executionStatus: 'failed',
        executionError: 'Failed to persist auto operation',
      });
      return { status: 'execution_failed' };
    }

    await this.repo.updateOperationStatus(operation.id, {
      approvalStatus: 'auto_approved',
    });

    const executionResult = await this.executor.executeOperation(operation.id);
    await this.repo.updateAiDecision(decision.id, {
      operationId: operation.id,
      status: executionResult.success ? 'executed' : 'execution_failed',
      executionStatus: executionResult.success ? 'executed' : 'failed',
      executionError: executionResult.success ? null : executionResult.message,
      executedAt: new Date().toISOString(),
      rollbackStatus: executionResult.success ? 'available' : 'not_applicable',
    });

    return { status: executionResult.success ? 'executed' : 'execution_failed' };
  }

  private mapDecisionToOperation(
    analysis: AiOptimizationAnalysis,
    candidate: AiOptimizationCandidate,
    decision: AiOptimizationDecision,
  ) {
    switch (analysis.actionType) {
      case 'ADJUST_BID':
        return {
          campaignId: candidate.campaignId,
          actionType: 'ADJUST_BID' as const,
          platform: candidate.platform,
          targetType: 'campaign' as const,
          parameters: {
            scopeType: candidate.scopeType,
            scopeId: candidate.scopeId,
            bidMultiplier: analysis.actionParameters?.bidMultiplier ?? 0.9,
            aiDecisionId: decision.id,
          },
          decisionContext: this.buildSafetyDecisionContext(candidate, analysis),
        };
      case 'BLOCK_ZONE':
        return {
          campaignId: candidate.campaignId,
          zoneId: candidate.scopeId,
          actionType: 'BLOCK' as const,
          platform: candidate.platform,
          targetType: 'zone' as const,
          parameters: {
            scopeType: 'zone',
            zoneId: candidate.scopeId,
            aiDecisionId: decision.id,
          },
          decisionContext: this.buildSafetyDecisionContext(candidate, analysis),
        };
      case 'BLOCK_PUBLISHER':
        return {
          campaignId: candidate.campaignId,
          actionType: 'BLOCK' as const,
          platform: candidate.platform,
          targetType: 'zone' as const,
          parameters: {
            scopeType: 'publisher',
            publisherId: candidate.scopeId,
            aiDecisionId: decision.id,
          },
          decisionContext: this.buildSafetyDecisionContext(candidate, analysis),
        };
      default:
        return null;
    }
  }

  private buildSafetyDecisionContext(candidate: AiOptimizationCandidate, analysis: AiOptimizationAnalysis): DecisionContext {
    return {
      roi: candidate.metrics.roi,
      clicks: candidate.metrics.clicks,
      conversions: candidate.metrics.conversions,
      cost: candidate.metrics.cost,
      revenue: candidate.metrics.revenue,
      confidence: analysis.confidence,
      triggerReason: analysis.reason,
      epc: candidate.metrics.epc,
      cpc: candidate.metrics.cpc,
      ctr: candidate.metrics.ctr,
      cr: candidate.metrics.cr,
    };
  }

  private buildMetricsSnapshot(row: Record<string, unknown>): AiOptimizationMetricsSnapshot {
    const clicks = Number(row.clicks || 0);
    const conversions = Number(row.conversions || 0);
    const cost = Number(row.cost || 0);
    const revenue = Number(row.revenue || 0);
    const profit = revenue - cost;
    return {
      roi: cost > 0 ? profit / cost : 0,
      revenue,
      cost,
      profit,
      clicks,
      conversions,
      ctr: 0,
      cr: clicks > 0 ? (conversions / clicks) * 100 : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      epc: clicks > 0 ? revenue / clicks : 0,
      cpa: conversions > 0 ? cost / conversions : 0,
      blacklistHits: Number(row.blacklistHits || 0),
      blockedClicks: Number(row.blockedClicks || 0),
      recentOperationCount: 0,
    };
  }

  private buildCandidateEvidence(scopeType: AiOptimizationScopeType, metrics: AiOptimizationMetricsSnapshot): AiOptimizationEvidenceItem[] {
    return [
      { label: 'Scope', value: scopeType, kind: 'history' },
      { label: 'ROI', value: `${(metrics.roi * 100).toFixed(1)}%`, kind: 'metric' },
      { label: 'Clicks', value: metrics.clicks, kind: 'metric' },
      { label: 'Conversions', value: metrics.conversions, kind: 'metric' },
      { label: 'Blacklist Hits', value: metrics.blacklistHits || 0, kind: 'governance' },
    ];
  }

  private async getRecentOperationHints(campaignId: string): Promise<Array<{ actionType: string; executionStatus: string; createdAt: string }>> {
    const recent = await this.repo.getOperationsByCampaign(campaignId, { limit: 5, offset: 0 });
    return recent.list.map((item) => ({
      actionType: item.actionType,
      executionStatus: item.executionStatus,
      createdAt: item.createdAt,
    }));
  }

  private buildPrompt(candidate: AiOptimizationCandidate): string {
    return JSON.stringify({
      campaignId: candidate.campaignId,
      scopeType: candidate.scopeType,
      scopeId: candidate.scopeId,
      metrics: candidate.metrics,
      evidence: candidate.evidence,
      recentOperations: candidate.recentOperations,
      constraints: {
        campaignActions: ['ADJUST_BID', 'OBSERVE', 'NO_ACTION'],
        zoneActions: ['BLOCK_ZONE', 'OBSERVE', 'NO_ACTION'],
        publisherActions: ['BLOCK_PUBLISHER', 'OBSERVE', 'NO_ACTION'],
      },
    });
  }

  private parseAiResponse(raw: string, candidate: AiOptimizationCandidate): AiOptimizationAnalysis {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '');
    const parsed = JSON.parse(cleaned) as Partial<AiOptimizationAnalysis>;

    if (!this.validateActionType(parsed.actionType, candidate.scopeType)) {
      throw new Error(`AI response actionType is invalid for ${candidate.scopeType}`);
    }
    if (typeof parsed.reason !== 'string' || parsed.reason.trim().length === 0) {
      throw new Error('AI response reason is missing');
    }
    if (!Number.isFinite(Number(parsed.confidence))) {
      throw new Error('AI response confidence is invalid');
    }
    if (!Array.isArray(parsed.evidence)) {
      throw new Error('AI response evidence is missing');
    }
    if (!parsed.expectedImpact || typeof parsed.expectedImpact !== 'object') {
      throw new Error('AI response expectedImpact is missing');
    }

    return {
      actionType: parsed.actionType,
      confidence: this.clampNumber(parsed.confidence, 0, 1, 0.5),
      reason: parsed.reason.trim(),
      evidence: parsed.evidence as AiOptimizationEvidenceItem[],
      expectedImpact: parsed.expectedImpact as AiOptimizationExpectedImpact,
      rollbackHint: typeof parsed.rollbackHint === 'string' ? parsed.rollbackHint : '',
      actionParameters: (parsed.actionParameters || {}) as Record<string, unknown>,
    };
  }

  private runHeuristicAnalysis(candidate: AiOptimizationCandidate): AiOptimizationAnalysis {
    const { metrics, scopeType } = candidate;

    if (scopeType === 'campaign') {
      if (metrics.clicks >= 100 && metrics.roi <= -0.35) {
        return {
          actionType: 'ADJUST_BID',
          confidence: 0.82,
          reason: `Campaign ROI ${(metrics.roi * 100).toFixed(1)}% is negative with enough volume`,
          evidence: [
            { label: 'ROI', value: `${(metrics.roi * 100).toFixed(1)}%`, kind: 'metric' },
            { label: 'Clicks', value: metrics.clicks, kind: 'metric' },
            { label: 'Spend', value: `$${metrics.cost.toFixed(2)}`, kind: 'metric' },
          ],
          expectedImpact: {
            spendDeltaPercent: -20,
            riskLevel: 'medium',
            note: 'Reduce bid pressure while preserving campaign learning',
          },
          rollbackHint: 'Restore previous bid if ROI does not improve after one window',
          actionParameters: { bidMultiplier: 0.8 },
          model: 'heuristic-fallback',
        };
      }

      if (metrics.clicks >= 120 && metrics.roi >= 0.25 && metrics.conversions >= 3) {
        return {
          actionType: 'ADJUST_BID',
          confidence: 0.76,
          reason: `Campaign ROI ${(metrics.roi * 100).toFixed(1)}% is healthy with conversion volume`,
          evidence: [
            { label: 'ROI', value: `${(metrics.roi * 100).toFixed(1)}%`, kind: 'metric' },
            { label: 'Conversions', value: metrics.conversions, kind: 'metric' },
          ],
          expectedImpact: {
            spendDeltaPercent: 10,
            riskLevel: 'medium',
            note: 'Increase reach on stable positive ROI',
          },
          rollbackHint: 'Revert to previous bid if ROI slips below baseline',
          actionParameters: { bidMultiplier: 1.1 },
          model: 'heuristic-fallback',
        };
      }

      return {
        actionType: 'OBSERVE',
        confidence: 0.6,
        reason: 'Campaign performance does not justify immediate automated intervention',
        evidence: [{ label: 'ROI', value: `${(metrics.roi * 100).toFixed(1)}%`, kind: 'metric' }],
        expectedImpact: { riskLevel: 'low', note: 'Observe next window before acting' },
        rollbackHint: 'No rollback needed',
        model: 'heuristic-fallback',
      };
    }

    if (metrics.clicks >= 60 && metrics.roi <= -0.8) {
      return {
        actionType: scopeType === 'zone' ? 'BLOCK_ZONE' : 'BLOCK_PUBLISHER',
        confidence: 0.93,
        reason: `${scopeType} ROI ${(metrics.roi * 100).toFixed(1)}% is critically low with enough click volume`,
        evidence: [
          { label: 'ROI', value: `${(metrics.roi * 100).toFixed(1)}%`, kind: 'metric' },
          { label: 'Clicks', value: metrics.clicks, kind: 'metric' },
          { label: 'Blacklist Hits', value: metrics.blacklistHits || 0, kind: 'governance' },
        ],
        expectedImpact: {
          riskLevel: 'high',
          note: `Stop spend leakage on underperforming ${scopeType}`,
        },
        rollbackHint: `Unblock ${scopeType} if ROI recovers in later windows`,
        model: 'heuristic-fallback',
      };
    }

    return {
      actionType: 'NO_ACTION',
      confidence: 0.55,
      reason: `${scopeType} sample does not justify a safe automated action yet`,
      evidence: [{ label: 'Clicks', value: metrics.clicks, kind: 'metric' }],
      expectedImpact: { riskLevel: 'low', note: 'No action taken' },
      rollbackHint: 'No rollback needed',
      model: 'heuristic-fallback',
    };
  }

  private buildRollbackOperation(operation: any) {
    const parameters = (operation.parameters || {}) as Record<string, unknown>;
    if (operation.actionType === 'BLOCK') {
      if (parameters.scopeType === 'publisher' && typeof parameters.publisherId === 'string') {
        return {
          campaignId: operation.campaignId,
          actionType: 'UNBLOCK' as const,
          platform: operation.platform,
          targetType: 'zone' as const,
          parameters: {
            scopeType: 'publisher',
            publisherId: parameters.publisherId,
          },
          decisionContext: operation.decisionContext,
        };
      }

      if (typeof parameters.zoneId === 'string' || typeof operation.zoneId === 'string') {
        return {
          campaignId: operation.campaignId,
          zoneId: String(parameters.zoneId || operation.zoneId),
          actionType: 'UNBLOCK' as const,
          platform: operation.platform,
          targetType: 'zone' as const,
          parameters: {
            scopeType: 'zone',
            zoneId: String(parameters.zoneId || operation.zoneId),
          },
          decisionContext: operation.decisionContext,
        };
      }
    }

    if (operation.actionType === 'ADJUST_BID' && operation.executionResult) {
      const payload = typeof operation.executionResult === 'string'
        ? JSON.parse(operation.executionResult)
        : operation.executionResult;
      const previousBid = Number(payload.previousBid);
      if (Number.isFinite(previousBid) && previousBid > 0) {
        return {
          campaignId: operation.campaignId,
          actionType: 'ADJUST_BID' as const,
          platform: operation.platform,
          targetType: 'campaign' as const,
          parameters: {
            bid: previousBid,
            scopeType: 'campaign',
            scopeId: operation.campaignId,
          },
          decisionContext: operation.decisionContext,
        };
      }
    }

    return null;
  }

  private buildIdempotencyKey(candidate: AiOptimizationCandidate, actionType: AiOptimizationActionType): string {
    return [
      candidate.campaignId,
      candidate.scopeType,
      candidate.scopeId,
      candidate.windowStart,
      candidate.windowEnd,
      actionType,
    ].join('|');
  }

  private normalizeActionType(actionType: AiOptimizationActionType) {
    return actionType === 'ADJUST_BID' ? 'ADJUST_BID' : 'BLOCK';
  }

  private initialDecisionStatus(actionType: AiOptimizationActionType): AiOptimizationDecisionStatus {
    switch (actionType) {
      case 'NO_ACTION':
        return 'no_action';
      case 'OBSERVE':
        return 'observe';
      default:
        return 'suggested';
    }
  }

  private validateActionType(actionType: unknown, scopeType: AiOptimizationScopeType): actionType is AiOptimizationActionType {
    const normalized = String(actionType || '');
    const allowedByScope: Record<AiOptimizationScopeType, AiOptimizationActionType[]> = {
      campaign: ['ADJUST_BID', 'OBSERVE', 'NO_ACTION'],
      zone: ['BLOCK_ZONE', 'OBSERVE', 'NO_ACTION'],
      publisher: ['BLOCK_PUBLISHER', 'OBSERVE', 'NO_ACTION'],
    };
    return allowedByScope[scopeType].includes(normalized as AiOptimizationActionType);
  }

  private parseTimeWindow(timeWindow: TimeWindow): { start: string; end: string } {
    const now = new Date();
    const windowMap: Record<TimeWindow, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
      custom: 24,
    };
    const hours = windowMap[timeWindow] || 24;
    return {
      start: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  private readBooleanFlag(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    }
    return fallback;
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }
}
