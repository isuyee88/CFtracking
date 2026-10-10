/**
 * @fileoverview 自动规则评估引擎
 * @description 评估6条预定义硬规则，生成操作建议
 * @module services/auto-optimization/rule-evaluator
 *
 * 核心流程:
 * 1. 加载Campaign关联的启用规则
 * 2. 获取实时ROI指标
 * 3. 逐条评估规则条件
 * 4. 通过安全阀检查
 * 5. 生成操作建议（需审批/可直接执行）
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { ROICalculatorService } from './roi-calculator.service';
import { SafetyValveService } from './safety-valve.service';
import { ApprovalWorkflowService } from './approval.service';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  RuleEvaluationInput,
  RuleEvaluationResult,
  PredefinedAutoRule,
  CampaignAutoRule,
  DecisionContext,
  ActionType,
  TargetType,
} from '@/types/auto-optimization';

export class AutoRuleEvaluatorService {
  private repo: AutoOptimizationRepository;
  private roiCalculator: ROICalculatorService;
  private safetyValve: SafetyValveService;
  private approvalWorkflow: ApprovalWorkflowService;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
    this.roiCalculator = new ROICalculatorService(env);
    this.safetyValve = new SafetyValveService(env);
    this.approvalWorkflow = new ApprovalWorkflowService(env);
  }

  /**
   * 评估单个Campaign的所有启用规则
   */
  async evaluateCampaign(campaignId: string, zoneId?: string, creativeId?: string): Promise<{
    triggeredRules: RuleEvaluationResult[];
    allEvaluated: number;
    evaluationTime: string;
  }> {
    const campaignRules = await this.repo.getCampaignRules(campaignId);

    if (campaignRules.length === 0) {
      return {
        triggeredRules: [],
        allEvaluated: 0,
        evaluationTime: new Date().toISOString(),
      };
    }

    const roiResult = await this.roiCalculator.calculateROI({
      campaignId,
      zoneId,
      timeWindow: '24h',
    });

    const now = new Date();
    const evaluationInput: RuleEvaluationInput = {
      campaignId,
      zoneId,
      creativeId,
      metrics: roiResult.metrics,
      additionalContext: {
        hourOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
      },
    };

    const results: RuleEvaluationResult[] = [];

    for (const campaignRule of campaignRules) {
      const ruleWithCode = campaignRule as CampaignAutoRule & { ruleCode: string };
      const predefinedRule = await this.repo.getPredefinedRuleByCode(ruleWithCode.ruleCode);
      if (!predefinedRule || !predefinedRule.enabled) continue;

      const conditions = ruleWithCode.overrideConditions || predefinedRule.conditions;
      const actions = ruleWithCode.overrideActions || predefinedRule.actions;

      const result = await this.evaluateSingleRule(
        predefinedRule,
        conditions,
        actions,
        evaluationInput
      );

      if (result.triggered) {
        results.push(result);

        await this.repo.incrementRuleTriggerStats(
          campaignRule.id,
          result.recommendedActions.some((action) => {
            if (action.type === 'ALERT' || action.type === 'PROTECT') {
              return false;
            }

            const params = action.parameters as Record<string, unknown> | undefined;
            return params?.blockedBySafetyValve !== true && params?.operationPersistFailed !== true;
          })
        );
      }
    }

    return {
      triggeredRules: results,
      allEvaluated: campaignRules.length,
      evaluationTime: new Date().toISOString(),
    };
  }

  /**
   * 批量评估多个Campaign（用于定时任务）
   */
  async evaluateAllActiveCampaigns(): Promise<{
    totalCampaigns: number;
    evaluatedCampaigns: number;
    totalTriggers: number;
    details: Array<{ campaignId: string; triggers: number; rules: RuleEvaluationResult[] }>;
  }> {
    const db = getD1Connection(this.env);

    const activeCampaigns = await db.prepare(`
      SELECT DISTINCT c.id FROM campaigns c
      JOIN clicks cl ON cl.campaignId = c.id
      WHERE cl.timestamp > datetime('now', '-24 hours')
        AND c.status = 'active'
    `).all<{ id: string }>();

    const details = [];
    let totalTriggers = 0;

    for (const { id } of activeCampaigns.results || []) {
      try {
        const result = await this.evaluateCampaign(id);
        details.push({
          campaignId: id,
          triggers: result.triggeredRules.length,
          rules: result.triggeredRules,
        });
        totalTriggers += result.triggeredRules.length;
      } catch (error) {
        console.error(`[RuleEvaluator] Failed to evaluate campaign ${id}:`, error);
        details.push({
          campaignId: id,
          triggers: 0,
          rules: [],
        });
      }
    }

    return {
      totalCampaigns: (activeCampaigns.results || []).length,
      evaluatedCampaigns: details.length,
      totalTriggers,
      details,
    };
  }

  /**
   * 为所有活跃Campaign启用默认规则集
   */
  async enableDefaultRulesForCampaign(campaignId: string): Promise<void> {
    const predefinedRules = await this.repo.getAllPredefinedRules(true);

    for (const rule of predefinedRules) {
      await this.repo.enableCampaignRule(campaignId, rule.id);
    }

    console.log(`[RuleEvaluator] Enabled ${predefinedRules.length} default rules for campaign ${campaignId}`);
  }

  // ============================================
  // 规则评估核心逻辑
  // ============================================

  private async evaluateSingleRule(
    rule: PredefinedAutoRule,
    conditions: PredefinedAutoRule['conditions'],
    actions: PredefinedAutoRule['actions'],
    input: RuleEvaluationInput
  ): Promise<RuleEvaluationResult> {
    const matchedConditions: PredefinedAutoRule['conditions'] = [];
    let allConditionsMet = true;

    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, input);
      if (met) {
        matchedConditions.push(condition);
      } else {
        allConditionsMet = false;
        break;
      }
    }

    if (!allConditionsMet || matchedConditions.length === 0) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleName: rule.name,
        triggered: false,
        matchedConditions: [],
        recommendedActions: [],
        confidence: 0,
        evaluationTime: new Date().toISOString(),
      };
    }

    const confidence = this.calculateConfidence(matchedConditions, input.metrics);
    const decisionContext = this.buildDecisionContext(input, matchedConditions, confidence);
    const recommendedActions: PredefinedAutoRule['actions'] = [];

    for (const action of actions) {
      if (this.isInformationalAction(action.type)) {
        recommendedActions.push(action);
        continue;
      }

      const safetyCheck = await this.safetyValve.checkAll(
        action.type,
        input.campaignId,
        decisionContext
      );
      const failedCheck = safetyCheck.results.find((result) => !result.passed);

      if (failedCheck && failedCheck.category !== 'approval') {
        recommendedActions.push({
          ...action,
          parameters: {
            ...action.parameters,
            blockedBySafetyValve: true,
            safetyReason: safetyCheck.blockedReason,
          },
        });
        continue;
      }

      const operation = await this.repo.createOperation({
        campaignId: input.campaignId,
        zoneId: input.zoneId,
        creativeId: input.creativeId,
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: action.type,
        platform: action.platform,
        targetType: this.resolveTargetType(input, action.type),
        parameters: action.parameters,
        decisionContext,
      });

      if (!operation) {
        recommendedActions.push({
          ...action,
          parameters: {
            ...action.parameters,
            operationPersistFailed: true,
          },
        });
        continue;
      }

      if (failedCheck?.category === 'approval') {
        const approval = await this.approvalWorkflow.createApprovalForOperation(operation.id);
        recommendedActions.push({
          ...action,
          parameters: {
            ...action.parameters,
            operationId: operation.id,
            approvalRequired: true,
            approvalRequestId: approval.id,
          },
        });
        continue;
      }

      await this.repo.updateOperationStatus(operation.id, {
        approvalStatus: 'auto_approved',
      });

      recommendedActions.push({
        ...action,
        parameters: {
          ...action.parameters,
          operationId: operation.id,
          approvalRequired: false,
          approvalStatus: 'auto_approved',
        },
      });
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleName: rule.name,
      triggered: true,
      matchedConditions,
      recommendedActions,
      confidence,
      evaluationTime: new Date().toISOString(),
    };
  }

  private async evaluateCondition(
    condition: PredefinedAutoRule['conditions'][number],
    input: RuleEvaluationInput
  ): Promise<boolean> {
    const metricValue = this.getMetricValue(condition.metric, input);

    switch (condition.operator) {
      case '>':
        return Number(metricValue) > Number(condition.value);
      case '<':
        return Number(metricValue) < Number(condition.value);
      case '>=':
        return Number(metricValue) >= Number(condition.value);
      case '<=':
        return Number(metricValue) <= Number(condition.value);
      case '==':
        return String(metricValue) === String(condition.value);
      case '!=':
        return String(metricValue) !== String(condition.value);
      case 'in_range': {
        const range = JSON.parse(String(condition.value));
        const num = Number(metricValue);
        return num >= range[0] && num <= range[1];
      }
      default:
        return false;
    }
  }

  private getMetricValue(metric: string, input: RuleEvaluationInput): number | string {
    switch (metric) {
      case 'roi':
        return input.metrics.roi;
      case 'clicks':
        return input.metrics.clicks;
      case 'conversions':
        return input.metrics.conversions;
      case 'cost':
        return input.metrics.cost;
      case 'revenue':
        return input.metrics.revenue;
      case 'epc':
        return input.metrics.epc || 0;
      case 'cpc':
        return input.metrics.cpc || 0;
      case 'ctr':
        return input.metrics.ctr;
      case 'cr':
        return input.metrics.cr;
      case 'cpa':
        return input.metrics.cpa;
      case 'hour_of_day':
        return input.additionalContext.hourOfDay;
      case 'day_of_week':
        return input.additionalContext.dayOfWeek;
      case 'zone_age_hours':
        return input.additionalContext.zoneAgeHours || 0;
      case 'creative_age_hours':
        return input.additionalContext.creativeAgeHours || 0;
      case 'ctr_decline_percent':
        return 0;
      default:
        return 0;
    }
  }

  private buildDecisionContext(
    input: RuleEvaluationInput,
    matchedConditions: PredefinedAutoRule['conditions'],
    confidence: number
  ): DecisionContext {
    const m = input.metrics;
    const triggerReason = matchedConditions
      .map(c => `${c.metric} ${c.operator} ${c.value}`)
      .join(' AND ');

    return {
      roi: m.roi,
      clicks: m.clicks,
      conversions: m.conversions,
      cost: m.cost,
      revenue: m.revenue,
      epc: m.epc,
      cpc: m.cpc,
      ctr: m.ctr,
      cr: m.cr,
      timeOfDay: input.additionalContext.hourOfDay,
      dayOfWeek: input.additionalContext.dayOfWeek,
      zoneAgeHours: input.additionalContext.zoneAgeHours,
      creativeAgeHours: input.additionalContext.creativeAgeHours,
      confidence,
      triggerReason: `Rule triggered: ${triggerReason}`,
    };
  }

  private isInformationalAction(actionType: ActionType): boolean {
    return actionType === 'ALERT' || actionType === 'PROTECT';
  }

  private resolveTargetType(input: RuleEvaluationInput, actionType: ActionType): TargetType {
    if (input.creativeId) {
      return 'creative';
    }
    if (input.zoneId) {
      return 'zone';
    }
    if (actionType === 'BUDGET_REALLOC') {
      return 'budget';
    }
    return 'campaign';
  }

  private calculateConfidence(
    matchedConditions: PredefinedAutoRule['conditions'],
    metrics: RuleEvaluationInput['metrics']
  ): number {
    let baseConfidence = 0.7 + (matchedConditions.length * 0.05);

    if (metrics.clicks > 500) baseConfidence += 0.1;
    else if (metrics.clicks > 200) baseConfidence += 0.05;
    else if (metrics.clicks < 50) baseConfidence -= 0.2;

    if (Math.abs(metrics.roi) > 0.5) baseConfidence += 0.1;

    return Math.min(0.99, Math.max(0.1, baseConfidence));
  }
}
