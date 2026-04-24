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
import {
  AutoruleBindingRepository,
  type ReplaceRuleBindingInput,
  type RuleBindingRecord,
} from '@/handlers/d1/autoruleBinding.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Flow, CreateFlowDTO, UpdateFlowDTO, FlowLandingPage, FlowOffer, FlowStats, FlowStatsQuery } from '@/types/flow';
import type { FlowSchema, ValidationContext, FlowValidationResult, CreateFlowRuleDTO, UpdateFlowRuleDTO, FilterGroup, FlowRule } from '@/types/flow.schema';
import { FlowValidator } from './flow.validator';
import { NotFoundError, ValidationError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class FlowService {
  private repo: FlowRepository;
  private campaignRepo: CampaignRepository;
  private autoruleBindingRepo: AutoruleBindingRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
    this.autoruleBindingRepo = new AutoruleBindingRepository(db);
  }

  async getList(query: {
    page?: number;
    pageSize?: number;
    campaignId?: string;
    status?: string;
  }): Promise<{ list: Flow[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.repo.findList(page, pageSize, query.campaignId, query.status);
  }

  /**
   * 创建 Flow
   */
  async create(data: CreateFlowDTO): Promise<Flow> {
    const normalizedData = this.normalizeCreateInput(data);
    const campaign = await this.campaignRepo.findById(normalizedData.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    return this.repo.create(normalizedData);
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

  async getAutoruleBinding(flowId: string): Promise<RuleBindingRecord | null> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    return this.autoruleBindingRepo.getFlowBinding(flowId);
  }

  async getAutoruleBindings(flowId: string): Promise<RuleBindingRecord[]> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    return this.autoruleBindingRepo.getFlowBindings(flowId);
  }

  async setAutoruleBinding(flowId: string, ruleId: string): Promise<RuleBindingRecord> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    return this.autoruleBindingRepo.setFlowBinding(flowId, ruleId);
  }

  async replaceAutoruleBindings(flowId: string, bindings: ReplaceRuleBindingInput[]): Promise<RuleBindingRecord[]> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    return this.autoruleBindingRepo.replaceFlowBindings(flowId, bindings);
  }

  async clearAutoruleBinding(flowId: string): Promise<void> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    await this.autoruleBindingRepo.clearFlowBinding(flowId);
  }

  async clearAutoruleBindings(flowId: string): Promise<void> {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }
    await this.autoruleBindingRepo.clearFlowBindings(flowId);
  }

  /**
   * 更新 Flow
   */
  async update(id: string, data: UpdateFlowDTO): Promise<Flow> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Flow not found');
    }
    const normalizedData = this.normalizeUpdateInput(data, existing);

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Flow（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Flow not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 添加 Landing Page 到 Flow
   */
  async addLandingPage(flowId: string, landingPageId: string, weight?: number): Promise<FlowLandingPage> {
    const normalizedFlowId = normalizeRequiredString(flowId as unknown, {
      field: 'flow.id',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const normalizedLandingPageId = normalizeRequiredString(landingPageId as unknown, {
      field: 'flow.landingPageId',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const flow = await this.repo.findById(normalizedFlowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    return this.repo.addLandingPage(normalizedFlowId, normalizedLandingPageId, weight);
  }

  /**
   * 添加 Offer 到 Flow
   */
  async addOffer(flowId: string, offerId: string, weight?: number): Promise<FlowOffer> {
    const normalizedFlowId = normalizeRequiredString(flowId as unknown, {
      field: 'flow.id',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const normalizedOfferId = normalizeRequiredString(offerId as unknown, {
      field: 'flow.offerId',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const flow = await this.repo.findById(normalizedFlowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    return this.repo.addOffer(normalizedFlowId, normalizedOfferId, weight);
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
    const normalizedData = this.normalizeCreateRuleInput(data);
    const flow = await this.repo.findById(normalizedData.flowId);
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
        name: normalizedData.name,
        flowId: normalizedData.flowId,
        priority: normalizedData.priority ?? 0,
        condition: normalizedData.condition as FilterGroup,
        action: normalizedData.action,
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

    return this.repo.createFlowRule(normalizedData);
  }

  /**
   * 更新 Flow 规则
   */
  async updateRule(ruleId: string, data: UpdateFlowRuleDTO): Promise<FlowRule> {
    const rule = await this.repo.getFlowRuleById(ruleId);
    if (!rule) {
      throw new NotFoundError('Rule not found');
    }
    const normalizedData = this.normalizeUpdateRuleInput(data);

    const updated = await this.repo.updateFlowRule(ruleId, normalizedData);
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

  private normalizeCreateInput(data: CreateFlowDTO): CreateFlowDTO {
    return {
      ...data,
      campaignId: normalizeRequiredString(data.campaignId as unknown, {
        field: 'flow.campaignId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      name: normalizeRequiredString(data.name as unknown, {
        field: 'flow.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      actionConfig: data.actionConfig ? this.normalizeFlowActionConfig(data.actionConfig) : data.actionConfig,
    };
  }

  private normalizeUpdateInput(data: UpdateFlowDTO, existing: Flow): UpdateFlowDTO {
    const normalizedData: UpdateFlowDTO = { ...data };

    if (data.name !== undefined && data.name !== existing.name) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'flow.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    } else if (data.name !== undefined) {
      delete normalizedData.name;
    }

    if (data.actionConfig !== undefined) {
      normalizedData.actionConfig = this.normalizeFlowActionConfig(data.actionConfig);
    }

    return normalizedData;
  }

  private normalizeCreateRuleInput(data: CreateFlowRuleDTO): CreateFlowRuleDTO {
    return {
      ...data,
      flowId: normalizeRequiredString(data.flowId as unknown, {
        field: 'rule.flowId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      name: normalizeRequiredString(data.name as unknown, {
        field: 'rule.name',
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_NAME,
      }),
      description: normalizeOptionalString(data.description as unknown, {
        field: 'rule.description',
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_DESCRIPTION,
      }),
      condition: this.normalizeRuleCondition(data.condition, 'rule.condition'),
      action: this.normalizeRuleAction(data.action, 'rule.action'),
    };
  }

  private normalizeUpdateRuleInput(data: UpdateFlowRuleDTO): UpdateFlowRuleDTO {
    const normalizedData: UpdateFlowRuleDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'rule.name',
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_NAME,
      });
    }

    if (data.description !== undefined) {
      normalizedData.description = normalizeOptionalString(data.description as unknown, {
        field: 'rule.description',
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_DESCRIPTION,
      });
    }

    if (data.condition !== undefined) {
      normalizedData.condition = this.normalizeRuleCondition(data.condition, 'rule.condition');
    }

    if (data.action !== undefined) {
      normalizedData.action = this.normalizeRuleAction(data.action, 'rule.action');
    }

    return normalizedData;
  }

  private normalizeFlowActionConfig(actionConfig: NonNullable<CreateFlowDTO['actionConfig']>): NonNullable<CreateFlowDTO['actionConfig']> {
    return {
      ...actionConfig,
      redirectUrl: normalizeOptionalString(actionConfig.redirectUrl as unknown, {
        field: 'flow.actionConfig.redirectUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      offerId: normalizeOptionalString(actionConfig.offerId as unknown, {
        field: 'flow.actionConfig.offerId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      landingPageId: normalizeOptionalString(actionConfig.landingPageId as unknown, {
        field: 'flow.actionConfig.landingPageId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
    };
  }

  private normalizeRuleCondition(
    condition: CreateFlowRuleDTO['condition'],
    fieldPath: string
  ): CreateFlowRuleDTO['condition'] {
    if (!condition || typeof condition !== 'object') {
      throw new ValidationError(`${fieldPath} must be an object`);
    }

    if (!Array.isArray(condition.filters)) {
      throw new ValidationError(`${fieldPath}.filters must be an array`);
    }

    const normalizedFilters = condition.filters.map((filter, index) => {
      const filterPath = `${fieldPath}.filters[${index}]`;
      const normalizedName = normalizeOptionalString((filter as any)?.name as unknown, {
        field: `${filterPath}.name`,
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_NAME,
      });
      const normalizedValue = this.normalizeRuleFilterValue(
        (filter as any)?.value,
        String((filter as any)?.target || ''),
        `${filterPath}.value`
      );

      return {
        ...filter,
        name: normalizedName,
        value: normalizedValue,
      };
    });

    const normalizedGroups = Array.isArray(condition.groups)
      ? condition.groups.map((group, index) =>
          this.normalizeRuleCondition(group, `${fieldPath}.groups[${index}]`)
        )
      : condition.groups;

    return {
      ...condition,
      name: normalizeOptionalString((condition as any).name as unknown, {
        field: `${fieldPath}.name`,
        maxLength: FIELD_MAX_LENGTH.ROUTING_RULE_NAME,
      }),
      filters: normalizedFilters,
      groups: normalizedGroups,
    };
  }

  private normalizeRuleFilterValue(
    value: unknown,
    target: string,
    fieldPath: string
  ): string | string[] | number | number[] | boolean | null | undefined {
    if (value === undefined || value === null || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    const maxLength = target === 'visit.referrer'
      ? FIELD_MAX_LENGTH.ROUTING_TEST_REFERRER
      : FIELD_MAX_LENGTH.ROUTING_TEST_VALUE;

    if (typeof value === 'string') {
      return normalizeOptionalString(value as unknown, {
        field: fieldPath,
        maxLength,
      }) ?? '';
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (typeof item === 'string') {
          return normalizeOptionalString(item as unknown, {
            field: `${fieldPath}[${index}]`,
            maxLength,
          }) ?? '';
        }
        if (item === null || typeof item === 'number' || typeof item === 'boolean') {
          return item;
        }
        throw new ValidationError(`${fieldPath}[${index}] has unsupported value type`);
      });
    }

    throw new ValidationError(`${fieldPath} has unsupported value type`);
  }

  private normalizeRuleAction(
    action: CreateFlowRuleDTO['action'],
    fieldPath: string
  ): CreateFlowRuleDTO['action'] {
    if (!action || typeof action !== 'object') {
      throw new ValidationError(`${fieldPath} must be an object`);
    }

    return {
      ...action,
      targetId: normalizeOptionalString((action as any).targetId as unknown, {
        field: `${fieldPath}.targetId`,
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      redirectUrl: normalizeOptionalString((action as any).redirectUrl as unknown, {
        field: `${fieldPath}.redirectUrl`,
        maxLength: FIELD_MAX_LENGTH.ROUTING_REDIRECT_URL,
      }),
      blockReason: normalizeOptionalString((action as any).blockReason as unknown, {
        field: `${fieldPath}.blockReason`,
        maxLength: FIELD_MAX_LENGTH.ROUTING_BLOCK_REASON,
      }),
    };
  }
}
