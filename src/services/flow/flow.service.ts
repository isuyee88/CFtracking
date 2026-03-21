/**
 * @fileoverview Flow 业务服务
 * @description 处理 Flow 相关的业务逻辑，包括规则验证
 * @module services/flow/flow.service
 * @input Flow DTO, ValidationContext
 * @output Flow, FlowValidationResult
 * @logic 管理 Flow CRUD 和规则验证
 * @frontend 无
 * @backend FlowRoutes, TrackingService 使用
 */

import { FlowRepository } from '@/handlers/d1/flow.repo';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Flow, CreateFlowDTO, UpdateFlowDTO, FlowLandingPage, FlowOffer, FlowStats, FlowStatsQuery } from '@/types/flow';
import type { FlowSchema, ValidationContext, FlowValidationResult, CreateFlowRuleDTO, UpdateFlowRuleDTO, FilterGroup, FlowRule } from '@/types/flow.schema';
import { FlowValidator } from './flow.validator';
import { NotFoundError } from '@/middleware/error';

export class FlowService {
  private repo: FlowRepository;
  private campaignRepo: CampaignRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
  }

  /**
   * 创建 Flow
   */
  async create(data: CreateFlowDTO): Promise<Flow> {
    const campaign = await this.campaignRepo.findById(data.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    return this.repo.create(data);
  }

  /**
   * 获取 Flow 详情
   */
  async getById(id: string): Promise<Flow> {
    const flow = await this.repo.findById(id);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    return flow;
  }

  /**
   * 按 Campaign ID 获取 Flow 列表
   */
  async getByCampaignId(campaignId: string): Promise<Flow[]> {
    return this.repo.findByCampaignId(campaignId);
  }

  /**
   * 获取活跃的 Flow 列表
   */
  async getActiveByCampaignId(campaignId: string): Promise<Flow[]> {
    return this.repo.findByCampaignIdAndStatus(campaignId, 'active');
  }

  /**
   * 更新 Flow
   */
  async update(id: string, data: UpdateFlowDTO): Promise<Flow> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Flow not found');
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 Flow
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Flow not found');
    }

    await this.repo.update(id, { status: 'deleted' });
  }

  /**
   * 添加 Landing Page 到 Flow
   */
  async addLandingPage(flowId: string, landingPageId: string, weight?: number): Promise<FlowLandingPage> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    return this.repo.addLandingPage(flowId, landingPageId, weight);
  }

  /**
   * 添加 Offer 到 Flow
   */
  async addOffer(flowId: string, offerId: string, weight?: number): Promise<FlowOffer> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    return this.repo.addOffer(flowId, offerId, weight);
  }

  /**
   * 获取 Flow 的 Landing Pages
   */
  async getLandingPages(flowId: string): Promise<FlowLandingPage[]> {
    return this.repo.getLandingPages(flowId);
  }

  /**
   * 获取 Flow 的 Offers
   */
  async getOffers(flowId: string): Promise<FlowOffer[]> {
    return this.repo.getOffers(flowId);
  }

  /**
   * 移除 Flow 的 Landing Page
   */
  async removeLandingPage(flowId: string, landingPageId: string): Promise<void> {
    await this.repo.removeLandingPage(flowId, landingPageId);
  }

  /**
   * 移除 Flow 的 Offer
   */
  async removeOffer(flowId: string, offerId: string): Promise<void> {
    await this.repo.removeOffer(flowId, offerId);
  }

  // ==================== Flow Schema & Rules ====================

  /**
   * 获取 Flow 完整 Schema（包含规则）
   */
  async getFlowSchema(flowId: string): Promise<FlowSchema | null> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      return null;
    }

    const rules = await this.repo.getFlowRules(flowId);

    return {
      flow: {
        id: flow.id,
        campaignId: flow.campaignId,
        name: flow.name,
        type: flow.type,
        weight: flow.weight,
        status: flow.status,
      },
      rules: rules.filter(r => r.status !== 'deleted'),
      defaultAction: {
        type: 'allow',
        weight: 100,
      },
      version: '1.0',
      updatedAt: flow.updatedAt,
    };
  }

  /**
   * 验证 Flow Schema
   */
  validateSchema(schema: FlowSchema): { valid: boolean; errors: string[] } {
    return FlowValidator.validateSchema(schema);
  }

  /**
   * 执行 Flow 验证
   */
  async executeValidation(flowId: string, context: ValidationContext): Promise<FlowValidationResult> {
    const schema = await this.getFlowSchema(flowId);
    if (!schema) {
      throw new NotFoundError('Flow not found');
    }

    return FlowValidator.validate(schema, context);
  }

  /**
   * 创建 Flow 规则
   */
  async createRule(data: CreateFlowRuleDTO): Promise<FlowSchema['rules'][0]> {
    const flow = await this.repo.findById(data.flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    // 验证条件结构
    const tempSchema: FlowSchema = {
      flow: {
        id: flow.id,
        campaignId: flow.campaignId,
        name: flow.name,
        type: flow.type,
        weight: flow.weight,
        status: flow.status,
      },
      rules: [{
        id: 'temp',
        name: data.name,
        flowId: data.flowId,
        priority: data.priority ?? 0,
        condition: data.condition as FilterGroup,
        action: data.action,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      defaultAction: { type: 'allow' },
      version: '1.0',
      updatedAt: new Date().toISOString(),
    };

    const validation = this.validateSchema(tempSchema);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    return this.repo.createFlowRule(data);
  }

  /**
   * 更新 Flow 规则
   */
  async updateRule(ruleId: string, data: UpdateFlowRuleDTO): Promise<FlowRule> {
    const rule = await this.repo.getFlowRuleById(ruleId);
    if (!rule) {
      throw new NotFoundError('Rule not found');
    }

    const updated = await this.repo.updateFlowRule(ruleId, data);
    if (!updated) {
      throw new NotFoundError('Rule not found after update');
    }
    return updated;
  }

  /**
   * 删除 Flow 规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rule = await this.repo.getFlowRuleById(ruleId);
    if (!rule) {
      throw new NotFoundError('Rule not found');
    }

    await this.repo.updateFlowRule(ruleId, { status: 'deleted' });
  }

  /**
   * 获取 Flow 的所有规则
   */
  async getFlowRules(flowId: string): Promise<FlowSchema['rules']> {
    return this.repo.getFlowRules(flowId);
  }

  /**
   * 获取单个规则详情
   */
  async getRuleById(ruleId: string): Promise<FlowSchema['rules'][0] | null> {
    return this.repo.getFlowRuleById(ruleId);
  }

  // ==================== Flow Statistics ====================

  /**
   * 获取 Flow 统计数据
   */
  async getFlowStats(flowId: string, query?: FlowStatsQuery): Promise<FlowStats> {
    const stats = await this.repo.getFlowStats(flowId, query);
    if (!stats) {
      throw new NotFoundError('Flow not found');
    }
    return stats;
  }

  /**
   * 获取 Campaign 下所有 Flow 的统计数据
   */
  async getCampaignFlowStats(campaignId: string, query?: FlowStatsQuery): Promise<FlowStats[]> {
    return this.repo.getCampaignFlowStats(campaignId, query);
  }

  /**
   * 克隆 Flow
   */
  async clone(flowId: string): Promise<Flow> {
    const original = await this.repo.findById(flowId);
    if (!original) {
      throw new NotFoundError('Flow not found');
    }

    const clonedName = `${original.name} (Copy)`;

    const clonedFlow = await this.repo.create({
      campaignId: original.campaignId,
      name: clonedName,
      type: original.type,
      weight: original.weight,
    });

    // Clone filters if exists
    if (original.filters && original.filters.length > 0) {
      await this.repo.update(clonedFlow.id, { 
        filters: original.filters.map(f => ({
          ...f,
          id: crypto.randomUUID(),
        }))
      });
    }

    // Clone landing pages
    const landingPages = await this.repo.getLandingPages(flowId);
    for (const lp of landingPages) {
      await this.repo.addLandingPage(clonedFlow.id, lp.landingPageId, lp.weight);
    }

    // Clone offers
    const offers = await this.repo.getOffers(flowId);
    for (const offer of offers) {
      await this.repo.addOffer(clonedFlow.id, offer.offerId, offer.weight);
    }

    return this.repo.findById(clonedFlow.id) as Promise<Flow>;
  }
}
