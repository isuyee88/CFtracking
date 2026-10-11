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
import { TrafficPlatformManager } from '@/services/traffic-platforms/platform-manager';

export class ActionExecutor {
  private platformManager: TrafficPlatformManager;

  constructor(private env: Env, private context: ExecutionContext) {
    this.platformManager = new TrafficPlatformManager(env);
  }

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
      
      case 'generate_creative':
        return await this.generateCreative(action);
      
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
    if (this.context.simulation_mode) {
      console.log(`[ActionExecutor] [SIMULATION] Increase bid: ${action.percentage}%`);
      return {
        action: 'increase_bid',
        result: 'skipped',
        details: { simulation: true, platform: action.platform, percentage: action.percentage }
      };
    }

    const results: any[] = [];

    for (const target of targets) {
      if (target.platform === action.platform && target.zone_id) {
        // 计算新出价
        const currentBid = 1.0; // TODO: 从 Campaign 获取当前出价
        const increase = action.percentage ? (action.percentage / 100) : 0;
        const newBid = currentBid * (1 + increase) + (action.amount || 0);

        // 调用平台 API
        const result = await this.platformManager.updateBid(
          action.platform,
          target.zone_id, // 或 campaign_id
          newBid
        );

        results.push({
          zone_id: target.zone_id,
          old_bid: currentBid,
          new_bid: newBid,
          success: result.success,
          error: result.error
        });
      }
    }

    console.log(`[ActionExecutor] Increased bid for ${results.length} zones`);

    return {
      action: 'increase_bid',
      result: results.every(r => r.success) ? 'success' : 'failed',
      details: { platform: action.platform, percentage: action.percentage, results }
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
    if (this.context.simulation_mode) {
      console.log(`[ActionExecutor] [SIMULATION] Increase budget: ${action.percentage}%`);
      return {
        action: 'increase_budget',
        result: 'skipped',
        details: { simulation: true, platform: action.platform, percentage: action.percentage }
      };
    }

    const results: any[] = [];

    for (const target of targets) {
      if (target.platform === action.platform && target.zone_id) {
        const currentBudget = 100.0; // TODO: 从 Campaign 获取当前预算
        const increase = action.percentage ? (action.percentage / 100) : 0;
        const newBudget = currentBudget * (1 + increase) + (action.amount || 0);

        const result = await this.platformManager.updateBudget(
          action.platform,
          target.zone_id,
          newBudget
        );

        results.push({
          zone_id: target.zone_id,
          old_budget: currentBudget,
          new_budget: newBudget,
          success: result.success,
          error: result.error
        });
      }
    }

    console.log(`[ActionExecutor] Increased budget for ${results.length} zones`);

    return {
      action: 'increase_budget',
      result: results.every(r => r.success) ? 'success' : 'failed',
      details: { platform: action.platform, percentage: action.percentage, results }
    };
  }

  /**
   * 创建 Campaign
   */
  private async createCampaign(
    action: Extract<RuleAction, { type: 'create_campaign' }>
  ): Promise<ActionResult> {
    if (this.context.simulation_mode) {
      console.log(`[ActionExecutor] [SIMULATION] Create campaign on ${action.platform}`);
      return {
        action: 'create_campaign',
        result: 'skipped',
        details: { simulation: true, platform: action.platform }
      };
    }

    try {
      // 如果指定了模板 ID，使用模板生成配置
      let campaignConfig = action.config || {};
      
      if (action.template_id) {
        const { CampaignTemplateService } = await import('./campaign-template.service');
        const templateService = new CampaignTemplateService(this.env.DB);
        campaignConfig = await templateService.generateCampaignConfig(
          action.template_id,
          action.config
        );
      }

      // 调用平台 API 创建 Campaign
      const result = await this.platformManager.createCampaign(
        action.platform,
        campaignConfig
      );

      if (result.success) {
        console.log(`[ActionExecutor] Created campaign: ${result.campaignId}`);
      }

      return {
        action: 'create_campaign',
        result: result.success ? 'success' : 'failed',
        details: { 
          platform: action.platform, 
          campaign_id: result.campaignId,
          error: result.error
        }
      };
    } catch (error) {
      return {
        action: 'create_campaign',
        result: 'failed',
        details: { 
          platform: action.platform,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
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
   * 生成广告素材
   */
  private async generateCreative(
    action: Extract<RuleAction, { type: 'generate_creative' }>
  ): Promise<ActionResult> {
    if (this.context.simulation_mode) {
      console.log(`[ActionExecutor] [SIMULATION] Generate ${action.count} creatives`);
      return {
        action: 'generate_creative',
        result: 'skipped',
        details: { simulation: true, count: action.count }
      };
    }

    try {
      const { CreativeGenerationService } = await import('./creative-generation.service');
      const creativeService = new CreativeGenerationService(this.env.DB);

      const result = await creativeService.generateAndUpload(
        {
          template_id: action.template,
          platform: 'propellerads', // TODO: 从规则上下文获取
          format: 'push',
          count: action.count
        },
        'campaign-id-placeholder' // TODO: 从规则上下文获取
      );

      console.log(`[ActionExecutor] Generated ${result.creatives.length} creatives`);

      return {
        action: 'generate_creative',
        result: result.success ? 'success' : 'failed',
        details: { 
          count: result.creatives.length,
          creative_ids: result.creatives.map(c => c.id),
          errors: result.errors
        }
      };
    } catch (error) {
      return {
        action: 'generate_creative',
        result: 'failed',
        details: { 
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
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
