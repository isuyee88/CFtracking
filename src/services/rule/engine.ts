/**
 * @fileoverview 规则引擎核心
 * @description 规则评估和执行的核心逻辑
 * @module services/rule/engine
 */

import { RuleRepository } from '@/handlers/d1/rule.repo';
import { TrafficRepository } from '@/handlers/d1/traffic.repo';
import { TaskRepository } from '@/handlers/d1/task.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Rule, Condition, Action, RuleExecutionLog } from '@/types/rule';


export interface RuleEvaluationContext {
  campaignId: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    cr: number;
    cpa: number;
    roi: number;
  };
  timeRange: string;
}

export class RuleEngine {
  private ruleRepo: RuleRepository;
  private trafficRepo: TrafficRepository;
  private taskRepo: TaskRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.ruleRepo = new RuleRepository(db);
    this.trafficRepo = new TrafficRepository(db);
    this.taskRepo = new TaskRepository(db);
  }

  /**
   * 评估所有启用的规则
   */
  async evaluateAllRules(): Promise<void> {
    const rules = await this.ruleRepo.findEnabled();

    for (const rule of rules) {
    try {
      await this.evaluateRule(rule);
    } catch (error) {
      console.error(`Failed to evaluate rule ${rule.id}:`, error);
    }
    }
  }

  /**
   * 评估单个规则
   */
  async evaluateRule(rule: Rule): Promise<boolean> {
    const context = await this.buildEvaluationContext(rule);
    const legacyConditions = this.toLegacyConditions(rule.conditions);

    const conditionsMet = await this.evaluateConditions(legacyConditions, context);

    if (conditionsMet) {
    await this.executeActions(rule, context);
    await this.logExecution(rule, legacyConditions, context, true);
    return true;
    }

    return false;
  }

  /**
   * 构建评估上下文
   */
  private async buildEvaluationContext(rule: Rule): Promise<RuleEvaluationContext> {
    const campaignId = rule.campaignId || '';
    const conditions = this.toLegacyConditions(rule.conditions);
    const now = new Date();
    const duration = this.parseDuration(conditions[0]?.duration);
    const startDate = new Date(now.getTime() - duration).toISOString().split('T')[0] || '';
    const endDate = now.toISOString().split('T')[0] || '';
    const metrics = await this.trafficRepo.getCampaignMetrics(
      campaignId,
      startDate,
      endDate
    );

    return {
      campaignId,
      metrics,
      timeRange: conditions[0]?.duration || '24h',
    };
  }

  /**
   * 解析 duration 字符串为毫秒
   */
  private parseDuration(duration: string | undefined): number {
    if (!duration) {
      return 24 * 60 * 60 * 1000;
    }
    const match = duration.match(/^(\d+)(h|d|m)$/);
    if (!match) {
      return 24 * 60 * 60 * 1000;
    }
    const value = parseInt(match[1] || '24', 10);
    const unit = match[2];
    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 评估条件
   */
  private async evaluateConditions(
    conditions: Condition[],
    context: RuleEvaluationContext
  ): Promise<boolean> {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return false;
    }
    for (const condition of conditions) {
      const value = this.getMetricValue(condition.metric, context.metrics);
      const met = this.compareValues(value, condition.operator, Number(condition.value));

      if (!met) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取指标值
   */
  private getMetricValue(metric: string, metrics: RuleEvaluationContext['metrics']): number {
    return metrics[metric as keyof typeof metrics] || 0;
  }

  /**
   * 比较值
   */
  private compareValues(
    actual: number,
    operator: string,
    expected: number
  ): boolean {
    switch (operator) {
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      default:
        return false;
    }
  }

  /**
   * 执行操作
   */
  private async executeActions(rule: Rule, context: RuleEvaluationContext): Promise<void> {
    for (const action of rule.actions) {
    await this.scheduleAction(rule, action, context);
    }
  }

  /**
   * 调度操作执行
   */
  private async scheduleAction(
    rule: Rule,
    action: Action,
    context: RuleEvaluationContext
  ): Promise<void> {
    const task = {
      type: 'rule_action',
      payload: {
        ruleId: rule.id,
        action: action.type,
        platform: action.platform,
        parameters: action.parameters,
        campaignId: context.campaignId,
      },
      priority: rule.priority,
      scheduledAt: action.delay > 0
        ? new Date(Date.now() + action.delay * 1000).toISOString()
        : undefined,
    };

    await this.taskRepo.create(task);
  }

  /**
   * 记录执行日志
   */
  private async logExecution(
    rule: Rule,
    conditions: Condition[],
    context: RuleEvaluationContext,
    success: boolean
  ): Promise<void> {
    const log: Omit<RuleExecutionLog, 'id'> = {
      ruleId: rule.id,
      campaignId: context.campaignId,
      timestamp: new Date().toISOString(),
      conditions,
      actions: rule.actions,
      executionResult: {
        success,
        message: success ? 'Rule triggered successfully' : 'Conditions not met',
      },
      triggeredBy: context.metrics,
    };

    await this.ruleRepo.logExecution(log);
  }

  private toLegacyConditions(conditions: Rule['conditions']): Condition[] {
    if (!Array.isArray(conditions)) {
      return [];
    }

    return conditions as Condition[];
  }
}
