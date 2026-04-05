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
import type { Flow, CreateFlowDTO, UpdateFlowDTO, FlowLandingPage, FlowOffer, FlowStats, FlowStatsQuery } from '@/types/flow';
import type { FlowRule, CreateFlowRuleDTO, UpdateFlowRuleDTO, FilterGroup } from '@/types/flow.schema';
import { IdService } from '@/services/id.service';

export class FlowRepository extends BaseRepository<Flow> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'flows');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): Flow {
    let filters = row.filters;
    if (typeof filters === 'string') {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = [];
      }
    }
    if (!Array.isArray(filters)) {
      filters = [];
    }
    
    return {
      ...row,
      id: row.id as string,
      filters: filters as Flow['filters'],
      actionConfig: typeof row.actionConfig === 'string' 
        ? JSON.parse(row.actionConfig) 
        : row.actionConfig || {},
    } as Flow;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  async findByDisplayId(displayId: string): Promise<Flow | null> {
    const result = await this.db
      .prepare(`SELECT * FROM flows WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 创建 Flow
   */
  async create(data: CreateFlowDTO): Promise<Flow> {
    const displayId = await this.idService.generateId('flows');
    const now = new Date().toISOString();
    const actionType = data.actionType || 'redirect';
    const actionConfig = data.actionConfig ? JSON.stringify(data.actionConfig) : '{}';

    await this.db
      .prepare(`
        INSERT INTO flows (id, displayId, campaignId, name, type, weight, status, actionType, actionConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(displayId, displayId, data.campaignId, data.name, data.type || 'regular', data.weight || 100, 'active', actionType, actionConfig, now, now)
      .run();

    const flow = await this.findById(displayId);
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
    if (data.filters !== undefined) { fields.push('filters = ?'); values.push(JSON.stringify(data.filters)); }
    if (data.actionType !== undefined) { fields.push('actionType = ?'); values.push(data.actionType); }
    if (data.actionConfig !== undefined) { fields.push('actionConfig = ?'); values.push(JSON.stringify(data.actionConfig)); }

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
   * 支持 UUID 和短 ID 格式
   */
  async findByCampaignIdAndStatus(campaignId: string, status: string): Promise<Flow[]> {
    const result = await this.db
      .prepare('SELECT * FROM flows WHERE (campaignId = ? OR campaignId IN (SELECT id FROM campaigns WHERE displayId = ?)) AND status = ?')
      .bind(campaignId, campaignId, status)
      .all();
    const rows = (result.results as unknown as Record<string, unknown>[]) || [];
    return rows.map(row => this.transform(row));
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
    const now = new Date().toISOString();
    const priority = data.priority ?? 0;
    const ruleId = crypto.randomUUID();

    // 将条件对象序列化为 JSON
    const conditionJson = JSON.stringify(data.condition);
    const actionJson = JSON.stringify(data.action);

    await this.db
      .prepare(`
        INSERT INTO flowRules (id, flowId, name, description, priority, condition, action, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        ruleId,
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

    const rule = await this.getFlowRuleById(ruleId);
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

  // ==================== Flow Statistics ====================

  /**
   * 获取 Flow 统计数据
   */
  async getFlowStats(flowId: string, query?: FlowStatsQuery): Promise<FlowStats | null> {
    const flow = await this.findById(flowId);
    if (!flow) return null;

    let whereClause = 'WHERE c.flowId = ?';
    const params: unknown[] = [flowId];

    if (query?.startDate) {
      whereClause += ' AND c.timestamp >= ?';
      params.push(query.startDate);
    }
    if (query?.endDate) {
      whereClause += ' AND c.timestamp <= ?';
      params.push(query.endDate);
    }

    const clickStats = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as clicks,
          SUM(CASE WHEN c.isUnique = 1 THEN 1 ELSE 0 END) as uniqueClicks
        FROM clicks c
        ${whereClause}
      `)
      .bind(...params)
      .first();

    const conversionStats = await this.db
      .prepare(`
        SELECT 
          COUNT(cv.id) as conversions,
          COALESCE(SUM(cv.revenue), 0) as revenue
        FROM clicks c
        LEFT JOIN conversions cv ON c.clickId = cv.clickId
        ${whereClause}
      `)
      .bind(...params)
      .first();

    const costStats = await this.db
      .prepare(`
        SELECT COALESCE(SUM(c.cost), 0) as cost
        FROM clicks c
        ${whereClause}
      `)
      .bind(...params)
      .first();

    const clicks = (clickStats?.clicks as number) || 0;
    const uniqueClicks = (clickStats?.uniqueClicks as number) || 0;
    const conversions = (conversionStats?.conversions as number) || 0;
    const revenue = (conversionStats?.revenue as number) || 0;
    const cost = (costStats?.cost as number) || 0;
    const profit = revenue - cost;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;

    return {
      flowId: flow.id,
      flowName: flow.name,
      flowType: flow.type,
      clicks,
      uniqueClicks,
      bots: 0,
      conversions,
      revenue,
      cost,
      profit,
      conversionRate: Math.round(conversionRate * 100) / 100,
      epc: Math.round(epc * 100) / 100,
      ctr: 0,
    };
  }

  /**
   * 获取 Campaign 下所有 Flow 的统计数据
   */
  async getCampaignFlowStats(campaignId: string, query?: FlowStatsQuery): Promise<FlowStats[]> {
    const flows = await this.findByCampaignId(campaignId);
    const stats: FlowStats[] = [];

    for (const flow of flows) {
      if (flow.status === 'deleted') continue;
      const flowStats = await this.getFlowStats(flow.id, query);
      if (flowStats) {
        stats.push(flowStats);
      }
    }

    return stats;
  }
}
