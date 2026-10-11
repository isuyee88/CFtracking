/**
 * @fileoverview 自动化规则 Repository
 */

import type { AutomationRule, RuleExecution, OptimizationTarget } from '@/types/automationRule';

export class AutomationRuleRepository {
  constructor(private db: D1Database) {}

  /**
   * 获取所有活跃的规则
   */
  async findActive(triggerType?: string): Promise<AutomationRule[]> {
    let query = 'SELECT * FROM automation_rules WHERE status = ?';
    const params: any[] = ['active'];

    if (triggerType) {
      query += ' AND trigger_type = ?';
      params.push(triggerType);
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results.map(row => this.transformRule(row));
  }

  /**
   * 根据 ID 获取规则
   */
  async findById(id: string): Promise<AutomationRule | null> {
    const result = await this.db.prepare(
      'SELECT * FROM automation_rules WHERE id = ?'
    ).bind(id).first();

    return result ? this.transformRule(result) : null;
  }

  /**
   * 创建规则
   */
  async create(data: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'total_executions' | 'successful_executions'>): Promise<AutomationRule> {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await this.db.prepare(`
      INSERT INTO automation_rules (
        id, name, description, type, trigger_type, trigger_config,
        conditions, actions, status, priority, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      data.name,
      data.description || null,
      data.type,
      data.trigger_type,
      data.trigger_config ? JSON.stringify(data.trigger_config) : null,
      JSON.stringify(data.conditions),
      JSON.stringify(data.actions),
      data.status,
      data.priority,
      data.created_by || 'system'
    ).run();

    return (await this.findById(id))!;
  }

  /**
   * 更新规则执行统计
   */
  async updateExecutionStats(id: string, success: boolean): Promise<void> {
    await this.db.prepare(`
      UPDATE automation_rules 
      SET total_executions = total_executions + 1,
          successful_executions = successful_executions + ?,
          last_executed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(success ? 1 : 0, id).run();
  }

  /**
   * 记录规则执行
   */
  async recordExecution(data: Omit<RuleExecution, 'id' | 'execution_time'>): Promise<void> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await this.db.prepare(`
      INSERT INTO rule_executions (
        id, rule_id, execution_time, duration_ms, trigger_context,
        success, actions_taken, affected_count, errors
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.rule_id,
      data.duration_ms,
      data.trigger_context ? JSON.stringify(data.trigger_context) : null,
      data.success ? 1 : 0,
      JSON.stringify(data.actions_taken),
      data.affected_count,
      data.errors || null
    ).run();
  }

  /**
   * 获取优化目标
   */
  async findOptimizationTargets(
    platform?: string,
    windowHours: number = 24
  ): Promise<OptimizationTarget[]> {
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    let query = `
      SELECT * FROM optimization_targets 
      WHERE window_end >= ? AND status = 'active'
    `;
    const params: any[] = [windowStart.toISOString()];

    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY roi ASC';

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results.map(row => this.transformTarget(row));
  }

  /**
   * 转换规则数据
   */
  private transformRule(row: any): AutomationRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      trigger_type: row.trigger_type,
      trigger_config: row.trigger_config ? JSON.parse(row.trigger_config) : undefined,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
      status: row.status,
      priority: row.priority,
      total_executions: row.total_executions,
      successful_executions: row.successful_executions,
      last_executed_at: row.last_executed_at,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * 转换优化目标数据
   */
  private transformTarget(row: any): OptimizationTarget {
    return {
      id: row.id,
      platform: row.platform,
      zone_id: row.zone_id,
      pubid: row.pubid,
      subid: row.subid,
      device: row.device,
      geo: row.geo,
      clicks: row.clicks,
      conversions: row.conversions,
      spend: row.spend,
      revenue: row.revenue,
      roi: row.roi,
      cr: row.cr,
      epc: row.epc,
      status: row.status,
      optimization_action: row.optimization_action,
      window_start: row.window_start,
      window_end: row.window_end,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
