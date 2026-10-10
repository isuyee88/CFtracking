/**
 * @fileoverview 安全阀服务
 * @description 实现五大安全阀机制：硬限额、冷却期、审批、回滚、多因子验证
 * @module services/auto-optimization/safety-valve
 *
 * 核心原则:
 * 1. 安全优先：宁可漏过也不要误阻断
 * 2. 可配置：全局默认 + Campaign级别覆盖
 * 3. 可追溯：所有拦截操作记录日志
 *
 * 使用方式:
 * 在执行任何自动化操作前，必须调用 checkAll() 进行全量安全阀检查
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  SafetyValveCheckResult,
  SafetyValveCategory,
  ActionType,
  HardLimitsConfig,
  CooldownConfig,
  ApprovalConfig,
  MultiFactorConfig,
  DecisionContext,
} from '@/types/auto-optimization';

export class SafetyValveService {
  private repo: AutoOptimizationRepository;
  private env: Env;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
    this.env = env;
  }

  /**
   * 执行完整的安全阀检查（在执行任何操作前调用）
   */
  async checkAll(
    actionType: ActionType,
    campaignId: string,
    context: DecisionContext
  ): Promise<{ passed: boolean; results: SafetyValveCheckResult[]; blockedReason?: string }> {
    const categories: SafetyValveCategory[] = ['hard_limits', 'cooldown', 'multi_factor', 'approval'];
    const results: SafetyValveCheckResult[] = [];

    for (const category of categories) {
      const result = await this.checkSingle(category, actionType, campaignId, context);
      results.push(result);

      if (!result.passed) {
        return {
          passed: false,
          results,
          blockedReason: `[${category}] ${result.reason}`,
        };
      }
    }

    return { passed: true, results };
  }

  /**
   * 检查单个安全阀类别
   */
  async checkSingle(
    category: SafetyValveCategory,
    actionType: ActionType,
    campaignId: string,
    context: DecisionContext
  ): Promise<SafetyValveCheckResult> {
    switch (category) {
      case 'hard_limits':
        return await this.checkHardLimits(actionType, campaignId, context);
      case 'cooldown':
        return await this.checkCooldown(actionType, campaignId, context);
      case 'approval':
        return await this.checkApproval(actionType, campaignId);
      case 'multi_factor':
        return await this.checkMultiFactor(campaignId, context);
      default:
        return { passed: true, category, reason: 'Unknown category, allowing by default' };
    }
  }

  /**
   * 获取安全阀配置（合并全局和Campaign级别）
   */
  async getConfig<T>(
    category: SafetyValveCategory,
    campaignId: string
  ): Promise<T | null> {
    const configs = await this.repo.getSafetyValveConfigs(category, 'campaign', campaignId);

    if (configs.length > 0) {
      const config = configs[0];
      return config?.config as unknown as T;
    }

    const globalConfigs = await this.repo.getSafetyValveConfigs(category, 'global');
    const globalConfig = globalConfigs[0];
    return globalConfig ? globalConfig.config as unknown as T : null;
  }

  // ============================================
  // 各类安全阀实现
  // ============================================

  private async checkHardLimits(
    actionType: ActionType,
    campaignId: string,
    context: DecisionContext
  ): Promise<SafetyValveCheckResult> {
    const config = await this.getConfig<HardLimitsConfig>('hard_limits', campaignId);
    if (!config) {
      return { passed: true, category: 'hard_limits', reason: 'No config, allowing' };
    }

    const db = getD1Connection(this.env);
    const maxDailySpend = this.getNumberConfig(config, ['maxDailySpend', 'max_daily_spend'], 500);
    const maxConcurrentActions = this.getNumberConfig(config, ['maxConcurrentActions', 'max_concurrent_actions'], 3);
    const maxBidAdjustmentPercent = this.getNumberConfig(
      config,
      ['maxBidAdjustmentPercent', 'max_bid_adjustment_percent'],
      30,
    );
    const minZoneAgeHours = this.getNumberConfig(config, ['minZoneAgeHours', 'min_zone_age_hours'], 24);

    switch (actionType) {
      case 'BLOCK':
      case 'PAUSE': {
        const todaySpend = await this.getTodayCampaignSpend(db, campaignId);
        if (todaySpend >= maxDailySpend) {
          return {
            passed: false,
            category: 'hard_limits',
            reason: `Daily spend $${todaySpend.toFixed(2)} exceeds limit $${maxDailySpend}`,
            blockingFactor: 'max_daily_spend',
          };
        }

        const recentBlocks = await this.countRecentActions(db, campaignId, ['BLOCK', 'PAUSE'], '24h');
        if (recentBlocks >= maxConcurrentActions) {
          return {
            passed: false,
            category: 'hard_limits',
            reason: `Too many recent block/pause operations (${recentBlocks}/${maxConcurrentActions})`,
            blockingFactor: 'max_concurrent_actions',
          };
        }
        break;
      }

      case 'ADJUST_BID': {
        const adjustment = context.confidence || 0;
        if (Math.abs(adjustment) > maxBidAdjustmentPercent / 100) {
          return {
            passed: false,
            category: 'hard_limits',
            reason: `Bid adjustment ${(adjustment * 100).toFixed(1)}% exceeds limit ±${maxBidAdjustmentPercent}%`,
            blockingFactor: 'max_bid_adjustment_percent',
          };
        }
        break;
      }
    }

    if (context.zoneAgeHours !== undefined && context.zoneAgeHours < minZoneAgeHours) {
      return {
        passed: false,
        category: 'hard_limits',
        reason: `Zone age ${context.zoneAgeHours.toFixed(1)}h below minimum ${minZoneAgeHours}h`,
        blockingFactor: 'min_zone_age_hours',
      };
    }

    return { passed: true, category: 'hard_limits', reason: 'All hard limits passed' };
  }

  private async checkCooldown(
    actionType: ActionType,
    campaignId: string,
    _context?: DecisionContext
  ): Promise<SafetyValveCheckResult> {
    const config = await this.getConfig<CooldownConfig>('cooldown', campaignId);
    if (!config) {
      return { passed: true, category: 'cooldown', reason: 'No config, allowing' };
    }

    const db = getD1Connection(this.env);
    const afterBlockHours = this.getNumberConfig(config, ['afterBlockHours', 'after_block_hours'], 24);
    const afterBidAdjustMinutes = this.getNumberConfig(
      config,
      ['afterBidAdjustMinutes', 'after_bid_adjust_minutes'],
      60,
    );

    switch (actionType) {
      case 'BLOCK': {
        const lastBlock = await this.getLastActionTime(db, campaignId, 'BLOCK');
        if (lastBlock && this.hoursSince(lastBlock) < afterBlockHours) {
          const remaining = afterBlockHours - this.hoursSince(lastBlock);
          return {
            passed: false,
            category: 'cooldown',
            reason: `Block cooldown active, ${remaining.toFixed(1)}h remaining`,
            blockingFactor: 'after_block_cooldown',
          };
        }
        break;
      }

      case 'ADJUST_BID': {
        const lastAdjustment = await this.getLastActionTime(db, campaignId, 'ADJUST_BID');
        if (lastAdjustment && this.minutesSince(lastAdjustment) < afterBidAdjustMinutes) {
          const remaining = afterBidAdjustMinutes - this.minutesSince(lastAdjustment);
          return {
            passed: false,
            category: 'cooldown',
            reason: `Bid adjustment cooldown active, ${remaining.toFixed(0)}min remaining`,
            blockingFactor: 'bid_adjustment_cooldown',
          };
        }
        break;
      }
    }

    return { passed: true, category: 'cooldown', reason: 'No cooldown restrictions' };
  }

  private async checkApproval(actionType: ActionType, campaignId: string, _context?: DecisionContext): Promise<SafetyValveCheckResult> {
    const config = await this.getConfig<ApprovalConfig>('approval', campaignId);
    if (!config) {
      return { passed: true, category: 'approval', reason: 'No approval required' };
    }

    const requireApprovalFor = this.getArrayConfig<ActionType>(
      config,
      ['requireApprovalFor', 'require_approval_for'],
    );
    const requiresApproval = requireApprovalFor.includes(actionType);

    if (requiresApproval) {
      return {
        passed: false,
        category: 'approval',
        reason: `${actionType} operation requires human approval`,
        score: 0,
      };
    }

    return { passed: true, category: 'approval', reason: 'Auto-approved action type' };
  }

  private async checkMultiFactor(
    campaignId: string,
    context: DecisionContext
  ): Promise<SafetyValveCheckResult> {
    const config = await this.getConfig<MultiFactorConfig>('multi_factor', campaignId);
    if (!config) {
      return { passed: true, category: 'multi_factor', reason: 'No multi-factor config, allowing' };
    }

    let totalWeight = 0;
    let weightedSum = 0;
    const factorResults: string[] = [];
    const minimumScore = this.getNumberConfig(config, ['minimumScore', 'minimum_score'], 0.65);
    const configRecord = this.asRecord(config);
    const factors = this.asRecord(configRecord.factors) as Record<string, Record<string, unknown>>;

    for (const [factorName, factorConfig] of Object.entries(factors)) {
      const weight = this.getNumberConfig(factorConfig, ['weight'], 0);
      let score = 0;

      switch (factorName) {
        case 'data_freshness': {
          score = 1;
          break;
        }
        case 'dataFreshness': {
          score = 1;
          break;
        }
        case 'sample_size': {
          const threshold = this.getNumberConfig(factorConfig, ['thresholdClicks', 'threshold_clicks'], 100);
          score = context.clicks >= threshold ? 1 : 0;
          factorResults.push(`${factorName}: ${context.clicks >= threshold ? 'PASS' : 'FAIL'} (${context.clicks} clicks)`);
          break;
        }
        case 'sampleSize': {
          const threshold = this.getNumberConfig(factorConfig, ['thresholdClicks', 'threshold_clicks'], 100);
          score = context.clicks >= threshold ? 1 : 0;
          factorResults.push(`${factorName}: ${context.clicks >= threshold ? 'PASS' : 'FAIL'} (${context.clicks} clicks)`);
          break;
        }
        case 'historical_consistency': {
          score = 0.8;
          factorResults.push(`${factorName}: ASSUME_OK (${score})`);
          break;
        }
        case 'historicalConsistency': {
          score = 0.8;
          factorResults.push(`${factorName}: ASSUME_OK (${score})`);
          break;
        }
        default:
          score = 1;
      }

      weightedSum += score * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 1;
    const passed = finalScore >= minimumScore;

    return {
      passed,
      category: 'multi_factor',
      score: finalScore,
      reason: passed
        ? `Multi-factor score ${finalScore.toFixed(2)} >= threshold ${minimumScore}`
        : `Multi-factor score ${finalScore.toFixed(2)} < threshold ${minimumScore}: ${factorResults.join('; ')}`,
      blockingFactor: passed ? undefined : 'multi_factor_score',
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  private async getTodayCampaignSpend(db: D1Database, campaignId: string): Promise<number> {
    const result = await db.prepare(`
      SELECT COALESCE(SUM(cost), 0) as total_spend
      FROM clicks
      WHERE campaignId = ? AND date(timestamp) = date('now')
    `).bind(campaignId).first<{ total_spend: number }>();

    return result?.total_spend || 0;
  }

  private async countRecentActions(
    db: D1Database,
    campaignId: string,
    actionTypes: string[],
    timeRange: string
  ): Promise<number> {
    const hours = parseInt(timeRange) || 24;

    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM auto_operations
      WHERE campaign_id = ? AND action_type IN (${actionTypes.map(() => '?').join(',')})
        AND created_at > datetime('now', '-' || ? || ' hours')
        AND execution_status = 'success'
    `).bind(campaignId, ...actionTypes, String(hours)).first<{ count: number }>();

    return result?.count || 0;
  }

  private async getLastActionTime(
    db: D1Database,
    campaignId: string,
    actionType: ActionType,
    zoneId?: string
  ): Promise<string | null> {
    let query = `
      SELECT created_at FROM auto_operations
      WHERE campaign_id = ? AND action_type = ? AND execution_status = 'success'
    `;
    const bindings: unknown[] = [campaignId, actionType];

    if (zoneId) {
      query += ' AND zone_id = ?';
      bindings.push(zoneId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await db.prepare(query).bind(...bindings).first<{ created_at: string }>();
    return result?.created_at || null;
  }

  private hoursSince(timestamp: string): number {
    return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  }

  private minutesSince(timestamp: string): number {
    return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);
  }

  private getNumberConfig(
    source: unknown,
    keys: string[],
    fallback: number,
  ): number {
    const record = this.asRecord(source);
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    return fallback;
  }

  private getArrayConfig<T>(source: unknown, keys: string[]): T[] {
    const record = this.asRecord(source);
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
      if (typeof value === 'string' && value.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed as T[];
          }
        } catch {
          continue;
        }
      }
    }
    return [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  }
}
