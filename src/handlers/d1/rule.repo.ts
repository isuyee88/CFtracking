/**
 * @fileoverview Rule 数据仓库
 * @description 封装 Rule 相关的所有数据库操作
 * @module handlers/d1/rule.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { Rule, CreateRuleDTO, UpdateRuleDTO, RuleExecutionLog } from '@/types/rule';

export class RuleRepository extends BaseRepository<Rule> {
  constructor(db: D1Database) {
    super(db, 'rules');
  }

  /**
   * 创建 Rule
   */
  async create(data: CreateRuleDTO): Promise<Rule> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO rules (id, name, description, type, conditions, actions, priority, enabled, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.name,
        data.description || null,
        data.type,
        JSON.stringify(data.conditions),
        JSON.stringify(data.actions),
        data.priority || 0,
        data.enabled ? 1 : 0,
        'active',
        now,
        now
      )
      .run();

    const rule = await this.findById(id);
    return this.mapRule(rule!);
  }

  /**
   * 更新 Rule
   */
  async update(id: string, data: UpdateRuleDTO): Promise<Rule | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.conditions !== undefined) { fields.push('conditions = ?'); values.push(JSON.stringify(data.conditions)); }
    if (data.actions !== undefined) { fields.push('actions = ?'); values.push(JSON.stringify(data.actions)); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const rule = await this.findById(id);
    return rule ? this.mapRule(rule) : null;
  }

  /**
   * 获取所有启用的规则
   */
  async findEnabled(): Promise<Rule[]> {
    const result = await this.db
      .prepare('SELECT * FROM rules WHERE enabled = 1 AND status = ? ORDER BY priority DESC')
      .bind('active')
      .all();
    return (result.results as unknown as Rule[]).map(this.mapRule);
  }

  /**
   * 按类型查询
   */
  async findByType(type: string): Promise<Rule[]> {
    const result = await this.db
      .prepare('SELECT * FROM rules WHERE type = ? AND status = ? ORDER BY priority DESC')
      .bind(type, 'active')
      .all();
    return (result.results as unknown as Rule[]).map(this.mapRule);
  }

  /**
   * 记录规则执行日志
   */
  async logExecution(log: Omit<RuleExecutionLog, 'id'>): Promise<RuleExecutionLog> {
    const id = crypto.randomUUID();

    await this.db
      .prepare(`
        INSERT INTO ruleExecutions (id, ruleId, campaignId, timestamp, conditions, actions, executionResult, triggeredBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        log.ruleId,
        log.campaignId,
        log.timestamp,
        JSON.stringify(log.conditions),
        JSON.stringify(log.actions),
        JSON.stringify(log.executionResult),
        JSON.stringify(log.triggeredBy)
      )
      .run();

    return { id, ...log };
  }

  /**
   * 获取规则执行历史
   */
  async getExecutionHistory(ruleId: string, limit = 50): Promise<RuleExecutionLog[]> {
    const result = await this.db
      .prepare('SELECT * FROM ruleExecutions WHERE ruleId = ? ORDER BY timestamp DESC LIMIT ?')
      .bind(ruleId, limit)
      .all();

    return (result.results || []).map((row) => ({
      id: row.id as string,
      ruleId: row.ruleId as string,
      campaignId: row.campaignId as string,
      timestamp: row.timestamp as string,
      conditions: JSON.parse(row.conditions as string),
      actions: JSON.parse(row.actions as string),
      executionResult: JSON.parse(row.executionResult as string),
      triggeredBy: JSON.parse(row.triggeredBy as string),
    }));
  }

  /**
   * 映射数据库记录到 Rule 类型
   */
  private mapRule(row: Rule): Rule {
    return {
      ...row,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      enabled: Number(row.enabled) === 1 || row.enabled === true,
    };
  }

  /**
   * 查询列表（支持搜索和过滤）
   */
  async findList(query: { page?: number; pageSize?: number; type?: string; status?: string }): Promise<{ list: Rule[]; total: number }> {
    const { page = 1, pageSize = 20, type, status } = query;
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM rules WHERE 1=1';
    let listSql = 'SELECT * FROM rules WHERE 1=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (type) {
      countSql += ' AND type = ?';
      listSql += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    if (status) {
      countSql += ' AND status = ?';
      listSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    listSql += ' ORDER BY priority DESC, createdAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all(),
    ]);

    return {
      list: (listResult.results as unknown as Rule[]).map(this.mapRule),
      total: (countResult?.count as number) || 0,
    };
  }
}
