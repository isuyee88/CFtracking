/**
 * @fileoverview Flow 数据仓库
 * @description 封装 Flow 相关的所有数据库操作，包括规则管理
 * @module handlers/d1/flow.repo
 * @input Flow DTO, CreateFlowRuleDTO
 * @output Flow, FlowRule
 * @logic 数据库 CRUD 操作
 * @frontend 无
 * @backend FlowService 使用
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { Flow, CreateFlowDTO, UpdateFlowDTO, FlowLandingPage, FlowOffer } from '@/types/flow';
import type { FlowRule, CreateFlowRuleDTO, UpdateFlowRuleDTO, FilterGroup } from '@/types/flow.schema';

export class FlowRepository extends BaseRepository<Flow> {
  constructor(db: D1Database) {
    super(db, 'flows');
  }

  /**
   * 创建 Flow
   */
  async create(data: CreateFlowDTO): Promise<Flow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO flows (id, campaignId, name, type, weight, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, data.campaignId, data.name, data.type || 'regular', data.weight || 100, 'active', now, now)
      .run();

    const flow = await this.findById(id);
    return flow!;
  }

  /**
   * 更新 Flow
   */
  async update(id: string, data: UpdateFlowDTO): Promise<Flow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE flows SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按 Campaign ID 查询
   */
  async findByCampaignId(campaignId: string): Promise<Flow[]> {
    return this.findBy('campaignId', campaignId);
  }

  /**
   * 按 Campaign ID 和 Status 查询
   */
  async findByCampaignIdAndStatus(campaignId: string, status: string): Promise<Flow[]> {
    const result = await this.db
      .prepare('SELECT * FROM flows WHERE campaignId = ? AND status = ?')
      .bind(campaignId, status)
      .all();
    return (result.results as unknown as Flow[]) || [];
  }

  /**
   * 添加 Landing Page 到 Flow
   */
  async addLandingPage(flowId: string, landingPageId: string, weight = 100): Promise<FlowLandingPage> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt)
        VALUES (?, ?, ?, ?)
      `)
      .bind(flowId, landingPageId, weight, now)
      .run();

    return {
      id: String(result.meta.last_row_id),
      flowId,
      landingPageId,
      weight,
      createdAt: now,
    };
  }

  /**
   * 添加 Offer 到 Flow
   */
  async addOffer(flowId: string, offerId: string, weight = 100): Promise<FlowOffer> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        INSERT INTO flowOffers (flowId, offerId, weight, createdAt)
        VALUES (?, ?, ?, ?)
      `)
      .bind(flowId, offerId, weight, now)
      .run();

    return {
      id: String(result.meta.last_row_id),
      flowId,
      offerId,
      weight,
      createdAt: now,
    };
  }

  /**
   * 获取 Flow 的 Landing Pages
   */
  async getLandingPages(flowId: string): Promise<FlowLandingPage[]> {
    const result = await this.db
      .prepare('SELECT * FROM flowLandingPages WHERE flowId = ?')
      .bind(flowId)
      .all();
    return (result.results as unknown as FlowLandingPage[]) || [];
  }

  /**
   * 获取 Flow 的 Offers
   */
  async getOffers(flowId: string): Promise<FlowOffer[]> {
    const result = await this.db
      .prepare('SELECT * FROM flowOffers WHERE flowId = ?')
      .bind(flowId)
      .all();
    return (result.results as unknown as FlowOffer[]) || [];
  }

  /**
   * 移除 Flow 的 Landing Page
   */
  async removeLandingPage(flowId: string, landingPageId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM flowLandingPages WHERE flowId = ? AND landingPageId = ?')
      .bind(flowId, landingPageId)
      .run();
    return result.success;
  }

  /**
   * 移除 Flow 的 Offer
   */
  async removeOffer(flowId: string, offerId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM flowOffers WHERE flowId = ? AND offerId = ?')
      .bind(flowId, offerId)
      .run();
    return result.success;
  }

  // ==================== Flow Rules ====================

  /**
   * 创建 Flow 规则
   */
  async createFlowRule(data: CreateFlowRuleDTO): Promise<FlowRule> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const priority = data.priority ?? 0;

    // 将条件对象序列化为 JSON
    const conditionJson = JSON.stringify(data.condition);
    const actionJson = JSON.stringify(data.action);

    await this.db
      .prepare(`
        INSERT INTO flowRules (id, flowId, name, description, priority, condition, action, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.flowId,
        data.name,
        data.description || null,
        priority,
        conditionJson,
        actionJson,
        'active',
        now,
        now
      )
      .run();

    const rule = await this.getFlowRuleById(id);
    return rule!;
  }

  /**
   * 获取 Flow 规则详情
   */
  async getFlowRuleById(id: string): Promise<FlowRule | null> {
    const result = await this.db
      .prepare('SELECT * FROM flowRules WHERE id = ?')
      .bind(id)
      .first();

    if (!result) {
      return null;
    }

    return this.parseFlowRule(result as Record<string, unknown>);
  }

  /**
   * 获取 Flow 的所有规则
   */
  async getFlowRules(flowId: string): Promise<FlowRule[]> {
    const result = await this.db
      .prepare('SELECT * FROM flowRules WHERE flowId = ? ORDER BY priority ASC, createdAt ASC')
      .bind(flowId)
      .all();

    if (!result.results) {
      return [];
    }

    return (result.results as Record<string, unknown>[]).map(r => this.parseFlowRule(r));
  }

  /**
   * 更新 Flow 规则
   */
  async updateFlowRule(id: string, data: UpdateFlowRuleDTO): Promise<FlowRule | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.condition !== undefined) {
      fields.push('condition = ?');
      values.push(JSON.stringify(data.condition));
    }
    if (data.action !== undefined) {
      fields.push('action = ?');
      values.push(JSON.stringify(data.action));
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.getFlowRuleById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE flowRules SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.getFlowRuleById(id);
  }

  /**
   * 删除 Flow 规则（软删除）
   */
  async deleteFlowRule(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE flowRules SET status = 'deleted' WHERE id = ?")
      .bind(id)
      .run();
    return result.success;
  }

  /**
   * 解析 FlowRule 数据库记录
   */
  private parseFlowRule(row: Record<string, unknown>): FlowRule {
    return {
      id: row.id as string,
      flowId: row.flowId as string,
      name: row.name as string,
      description: row.description as string | undefined,
      priority: row.priority as number,
      condition: JSON.parse(row.condition as string) as FilterGroup,
      action: JSON.parse(row.action as string) as FlowRule['action'],
      status: row.status as FlowRule['status'],
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  }
}
