/**
 * @fileoverview 规则引擎服务 - 主入口
 * @description 协调规则评估和执行
 */

import type { Env } from '@/config/env';
import type { AutomationRule, ExecutionContext, OptimizationTarget } from '@/types/automationRule';
import { AutomationRuleRepository } from '@/handlers/d1/automationRule.repo';
import { ConditionMatcher } from './condition-matcher';
import { ActionExecutor } from './action-executor';

export class RuleEngine {
  private repo: AutomationRuleRepository;
  private matcher: ConditionMatcher;

  constructor(private env: Env) {
    this.repo = new AutomationRuleRepository(env.DB);
    this.matcher = new ConditionMatcher();
  }

  /**
   * 执行 Cron 触发的规则
   */
  async executeCronRules(schedule: string): Promise<void> {
    const startTime = Date.now();
    console.log(`[RuleEngine] Executing cron rules for schedule: ${schedule}`);

    const context: ExecutionContext = {
      trigger_type: 'cron',
      trigger_data: { schedule },
      simulation_mode: this.env.SIMULATION_MODE === 'true'
    };

    // 获取匹配的规则
    const rules = await this.repo.findActive('cron');
    const matchingRules = rules.filter(rule => 
      rule.trigger_config?.schedule === schedule
    );

    console.log(`[RuleEngine] Found ${matchingRules.length} matching cron rules`);

    for (const rule of matchingRules) {
      await this.executeRule(rule, context);
    }

    const duration = Date.now() - startTime;
    console.log(`[RuleEngine] Cron execution completed in ${duration}ms`);
  }

  /**
   * 执行单个规则
   */
  async executeRule(rule: AutomationRule, context: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    console.log(`[RuleEngine] Executing rule: ${rule.name} (${rule.id})`);

    try {
      // 1. 获取优化目标数据
      const targets = await this.repo.findOptimizationTargets(
        undefined,
        rule.conditions.window_hours || 24
      );

      console.log(`[RuleEngine] Loaded ${targets.length} optimization targets`);

      // 2. 筛选匹配条件的目标
      const matchedTargets = targets.filter(target => 
        this.matcher.match(rule.conditions, target)
      );

      console.log(`[RuleEngine] ${matchedTargets.length} targets matched conditions`);

      if (matchedTargets.length === 0) {
        console.log(`[RuleEngine] No targets matched, skipping actions`);
        await this.recordExecution(rule, startTime, true, [], matchedTargets);
        return;
      }

      // 3. 执行动作
      const executor = new ActionExecutor(this.env, context);
      const actionResults = await executor.executeAll(rule.actions, matchedTargets);

      console.log(`[RuleEngine] Executed ${actionResults.length} actions`);

      // 4. 记录执行结果
      const success = actionResults.every(r => r.result !== 'failed');
      await this.recordExecution(rule, startTime, success, actionResults, matchedTargets);

      // 5. 更新规则统计
      await this.repo.updateExecutionStats(rule.id, success);

      const duration = Date.now() - startTime;
      console.log(`[RuleEngine] Rule executed in ${duration}ms (success: ${success})`);

    } catch (error) {
      console.error(`[RuleEngine] Rule execution failed:`, error);
      
      await this.recordExecution(
        rule, 
        startTime, 
        false, 
        [], 
        [],
        error instanceof Error ? error.message : String(error)
      );

      await this.repo.updateExecutionStats(rule.id, false);
    }
  }

  /**
   * 记录执行结果
   */
  private async recordExecution(
    rule: AutomationRule,
    startTime: number,
    success: boolean,
    actionResults: any[],
    matchedTargets: OptimizationTarget[],
    error?: string
  ): Promise<void> {
    const duration = Date.now() - startTime;

    await this.repo.recordExecution({
      rule_id: rule.id,
      duration_ms: duration,
      trigger_context: {
        rule_name: rule.name,
        matched_count: matchedTargets.length
      },
      success,
      actions_taken: actionResults,
      affected_count: matchedTargets.length,
      errors: error
    });
  }
}
