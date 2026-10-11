/**
 * @fileoverview 规则引擎 - 动作执行器
 * @description 执行规则定义的动作
 */

import type { 
  RuleAction, 
  ActionResult, 
  ExecutionContext,
  OptimizationTarget 
} from '@/types/automationRule';
import type { Env } from '@/config/env';

export class ActionExecutor {
  constructor(private env: Env, private context: ExecutionContext) {}

  /**
   * 执行所有动作
   */
  async executeAll(
    actions: RuleAction[],
    matchedTargets: OptimizationTarget[]
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeOne(action, matchedTargets);
        results.push(result);
      } catch (error) {
        results.push({
          action: action.type,
          result: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * 执行单个动作
   */
  private async executeOne(
    action: RuleAction,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    // 模拟模式：只记录不执行
    if (this.context.simulation_mode) {
      return {
        action: action.type,
        result: 'skipped',
        details: { simulation: true, target_count: targets.length }
      };
    }

    switch (action.type) {
      case 'disable_zone':
        return await this.disableZone(action, targets);
      
      case 'add_blacklist':
        return await this.addBlacklist(action, targets);
      
      case 'increase_bid':
        return await this.increaseBid(action, targets);
      
      case 'decrease_bid':
        return await this.decreaseBid(action, targets);
      
      case 'increase_budget':
        return await this.increaseBudget(action, targets);
      
      case 'create_campaign':
        return await this.createCampaign(action);
      
      case 'pause_campaign':
        return await this.pauseCampaign(action);
      
      case 'send_notification':
        return await this.sendNotification(action, targets);
      
      default:
        return {
          action: action.type,
          result: 'skipped',
          details: { reason: 'not_implemented' }
        };
    }
  }

  /**
   * 禁用 Zone
   */
  private async disableZone(
    action: Extract<RuleAction, { type: 'disable_zone' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    const affectedZones: string[] = [];

    for (const target of targets) {
      if (target.zone_id && target.platform === action.platform) {
        // 更新数据库状态
        await this.env.DB.prepare(
          'UPDATE optimization_targets SET status = ?, optimization_action = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind('disabled', 'auto_disabled_by_rule', target.id).run();

        affectedZones.push(target.zone_id);
      }
    }

    console.log(`[ActionExecutor] Disabled ${affectedZones.length} zones on ${action.platform}`);

    return {
      action: 'disable_zone',
      result: 'success',
      details: { platform: action.platform, zones: affectedZones }
    };
  }

  /**
   * 添加到黑名单
   */
  private async addBlacklist(
    action: Extract<RuleAction, { type: 'add_blacklist' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    const affectedEntities: string[] = [];

    for (const target of targets) {
      if (target.platform === action.platform) {
        const entityValue = this.getEntityValue(target, action.entity_type);
        if (!entityValue) continue;

        // 插入黑名单
        const id = `bl-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await this.env.DB.prepare(`
          INSERT INTO platform_blacklist (id, platform, entity_type, entity_value, reason, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          id,
          action.platform,
          action.entity_type,
          entityValue,
          action.reason,
          JSON.stringify({ target_id: target.id, roi: target.roi, clicks: target.clicks })
        ).run();

        affectedEntities.push(entityValue);
      }
    }

    console.log(`[ActionExecutor] Added ${affectedEntities.length} entities to blacklist`);

    return {
      action: 'add_blacklist',
      result: 'success',
      details: { platform: action.platform, entities: affectedEntities }
    };
  }

  /**
   * 提高出价
   */
  private async increaseBid(
    action: Extract<RuleAction, { type: 'increase_bid' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    // TODO: 调用流量平台 API
    console.log(`[ActionExecutor] Increase bid: ${action.percentage}%`);

    return {
      action: 'increase_bid',
      result: 'success',
      details: { platform: action.platform, percentage: action.percentage }
    };
  }

  /**
   * 降低出价
   */
  private async decreaseBid(
    action: Extract<RuleAction, { type: 'decrease_bid' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    // TODO: 调用流量平台 API
    console.log(`[ActionExecutor] Decrease bid: ${action.percentage}%`);

    return {
      action: 'decrease_bid',
      result: 'success',
      details: { platform: action.platform, percentage: action.percentage }
    };
  }

  /**
   * 提高预算
   */
  private async increaseBudget(
    action: Extract<RuleAction, { type: 'increase_budget' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    // TODO: 调用流量平台 API
    console.log(`[ActionExecutor] Increase budget: ${action.percentage}%`);

    return {
      action: 'increase_budget',
      result: 'success',
      details: { platform: action.platform, percentage: action.percentage }
    };
  }

  /**
   * 创建 Campaign
   */
  private async createCampaign(
    action: Extract<RuleAction, { type: 'create_campaign' }>
  ): Promise<ActionResult> {
    // TODO: 调用流量平台 API
    console.log(`[ActionExecutor] Create campaign on ${action.platform}`);

    return {
      action: 'create_campaign',
      result: 'success',
      details: { platform: action.platform }
    };
  }

  /**
   * 暂停 Campaign
   */
  private async pauseCampaign(
    action: Extract<RuleAction, { type: 'pause_campaign' }>
  ): Promise<ActionResult> {
    // TODO: 调用流量平台 API
    console.log(`[ActionExecutor] Pause campaign ${action.campaign_id}`);

    return {
      action: 'pause_campaign',
      result: 'success',
      details: { platform: action.platform, campaign_id: action.campaign_id }
    };
  }

  /**
   * 发送通知
   */
  private async sendNotification(
    action: Extract<RuleAction, { type: 'send_notification' }>,
    targets: OptimizationTarget[]
  ): Promise<ActionResult> {
    console.log(`[ActionExecutor] Send notification to ${action.channel}`);
    console.log(`   Message: ${action.message || 'Rule triggered'}`);
    console.log(`   Affected targets: ${targets.length}`);

    return {
      action: 'send_notification',
      result: 'success',
      details: { channel: action.channel, target_count: targets.length }
    };
  }

  /**
   * 获取实体值
   */
  private getEntityValue(
    target: OptimizationTarget,
    entityType: 'zone' | 'pubid' | 'subid' | 'ip' | 'device_combo'
  ): string | null {
    switch (entityType) {
      case 'zone':
        return target.zone_id || null;
      case 'pubid':
        return target.pubid || null;
      case 'subid':
        return target.subid || null;
      case 'device_combo':
        return target.device ? `${target.device}_${target.geo}` : null;
      default:
        return null;
    }
  }
}
