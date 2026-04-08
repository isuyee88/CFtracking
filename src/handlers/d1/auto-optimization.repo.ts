/**
 * @fileoverview 自动化优化系统D1 Repository层
 * @description 统一管理所有自动化优化相关的数据库操作
 * @module handlers/d1/auto-optimization.repo
 */

import type {
  AutoOperation,
  CreateAutoOperationDTO,
  AutoRollbackOperation,
  SafetyValveConfig,
  PredefinedAutoRule,
  CampaignAutoRule,
  ApprovalRequest,
  ROICalculationCache,
  ApprovalStatus,
  ExecutionStatus,
} from '@/types/auto-optimization';

export class AutoOptimizationRepository {
  constructor(private db: D1Database) {}

  async createOperation(data: CreateAutoOperationDTO): Promise<AutoOperation | null> {
    const id = crypto.randomUUID();
    const result = await this.db.prepare(`
      INSERT INTO auto_operations (
        id, campaign_id, zone_id, creative_id, rule_id, rule_name,
        action_type, platform, target_type, parameters, decision_context,
        approval_status, execution_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    `).bind(
      id,
      data.campaignId,
      data.zoneId || null,
      data.creativeId || null,
      data.ruleId || null,
      data.ruleName || null,
      data.actionType,
      data.platform,
      data.targetType,
      JSON.stringify(data.parameters),
      JSON.stringify(data.decisionContext)
    ).run();

    if (!result.success) {
      return null;
    }
    return this.getOperation(id);
  }

  async getOperation(id: string): Promise<AutoOperation | null> {
    const result = await this.db.prepare('SELECT * FROM auto_operations WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return result ? this.parseOperation(result) : null;
  }

  async updateOperationStatus(
    id: string,
    updates: Partial<{ approvalStatus: ApprovalStatus; executionStatus: ExecutionStatus }>
  ): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.approvalStatus) {
      sets.push('approval_status = ?');
      values.push(updates.approvalStatus);
    }
    if (updates.executionStatus) {
      sets.push('execution_status = ?');
      values.push(updates.executionStatus);
    }

    sets.push("updated_at = datetime('now')");
    values.push(id);

    await this.db.prepare(`UPDATE auto_operations SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async getOperationsByCampaign(
    campaignId: string,
    options?: { status?: ApprovalStatus; limit?: number; offset?: number }
  ): Promise<{ list: AutoOperation[]; total: number }> {
    let query = 'SELECT * FROM auto_operations WHERE campaign_id = ?';
    const bindings: unknown[] = [campaignId];

    if (options?.status) {
      query += ' AND approval_status = ?';
      bindings.push(options.status);
    }

    const countResult = await this.db.prepare(query.replace('*', 'COUNT(*) as total')).bind(...bindings).first<{ total: number }>();

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(options?.limit || 20, options?.offset || 0);

    const results = await this.db.prepare(query).bind(...bindings).all<Record<string, unknown>>();

    return {
      list: results.results.map(r => this.parseOperation(r)),
      total: countResult?.total || 0,
    };
  }

  async getRecentOperations(limit: number = 50): Promise<AutoOperation[]> {
    const results = await this.db.prepare(
      'SELECT * FROM auto_operations ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all<Record<string, unknown>>();

    return results.results.map(r => this.parseOperation(r));
  }

  async getPendingApprovals(): Promise<AutoOperation[]> {
    const results = await this.db.prepare(`
      SELECT o.* FROM auto_operations o
      INNER JOIN approval_requests ar ON ar.operation_id = o.id
      WHERE o.approval_status = 'pending' AND ar.status = 'pending' AND ar.expires_at > datetime('now')
      ORDER BY o.created_at ASC
    `).all<Record<string, unknown>>();

    return results.results.map(r => this.parseOperation(r));
  }

  async getPendingExecutableOperations(limit: number = 20): Promise<AutoOperation[]> {
    const results = await this.db.prepare(`
      SELECT * FROM auto_operations
      WHERE approval_status IN ('approved', 'auto_approved')
        AND execution_status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(limit).all<Record<string, unknown>>();

    return (results.results || []).map((row) => this.parseOperation(row));
  }

  async finalizeOperationExecution(
    id: string,
    payload: {
      success: boolean;
      executionResult?: Record<string, unknown>;
      executionError?: string;
    }
  ): Promise<void> {
    if (payload.success) {
      await this.db.prepare(`
        UPDATE auto_operations
        SET
          approval_status = 'executed',
          execution_status = 'success',
          execution_result = ?,
          execution_error = NULL,
          executed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        JSON.stringify(payload.executionResult || {}),
        id
      ).run();
      return;
    }

    await this.db.prepare(`
      UPDATE auto_operations
      SET
        execution_status = 'failed',
        execution_error = ?,
        executed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      payload.executionError || 'Unknown execution error',
      id
    ).run();
  }

  // ============================================
  // 回滚操作 (auto_rollback_operations)
  // ============================================

  async createRollback(data: {
    originalOperationId: string;
    rollbackAction: string;
    rollbackParameters: Record<string, unknown>;
    preRollbackSnapshot: Record<string, unknown>;
    triggerType: 'manual' | 'auto' | 'scheduled';
    triggeredBy?: string;
  }): Promise<AutoRollbackOperation> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO auto_rollback_operations (
        id, original_operation_id, rollback_action, rollback_parameters,
        pre_rollback_snapshot, trigger_type, triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.originalOperationId,
      data.rollbackAction,
      JSON.stringify(data.rollbackParameters),
      JSON.stringify(data.preRollbackSnapshot),
      data.triggerType,
      data.triggeredBy || null
    ).run();

    const result = await this.db.prepare('SELECT * FROM auto_rollback_operations WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    return {
      id: String(result?.id || id),
      originalOperationId: String(result?.original_operation_id || ''),
      rollbackAction: String(result?.rollback_action || ''),
      rollbackParameters: this.parseJsonField(result?.rollback_parameters, {}),
      preRollbackSnapshot: this.parseJsonField(result?.pre_rollback_snapshot, {}),
      postRollbackMetrics: this.parseJsonField(result?.post_rollback_metrics),
      rollbackEffectiveness: (result?.rollback_effectiveness as AutoRollbackOperation['rollbackEffectiveness']) || 'pending',
      effectivenessNote: (result?.effectiveness_note as string | undefined) || undefined,
      triggerType: (result?.trigger_type as AutoRollbackOperation['triggerType']) || 'manual',
      triggeredBy: (result?.triggered_by as string | undefined) || undefined,
      createdAt: String(result?.created_at || new Date().toISOString()),
      completedAt: (result?.completed_at as string | undefined) || undefined,
    };
  }

  async getRollbacksByOperation(operationId: string): Promise<AutoRollbackOperation[]> {
    const results = await this.db.prepare(
      'SELECT * FROM auto_rollback_operations WHERE original_operation_id = ? ORDER BY created_at DESC'
    ).bind(operationId).all<Record<string, unknown>>();

    return (results.results || []).map((row) => ({
      id: String(row.id || ''),
      originalOperationId: String(row.original_operation_id || ''),
      rollbackAction: String(row.rollback_action || ''),
      rollbackParameters: this.parseJsonField<Record<string, unknown>>(row.rollback_parameters, {}),
      preRollbackSnapshot: this.parseJsonField<Record<string, unknown>>(row.pre_rollback_snapshot, {}),
      postRollbackMetrics: this.parseJsonField<Record<string, unknown> | undefined>(row.post_rollback_metrics),
      rollbackEffectiveness: (row.rollback_effectiveness as AutoRollbackOperation['rollbackEffectiveness']) || 'pending',
      effectivenessNote: (row.effectiveness_note as string | undefined) || undefined,
      triggerType: (row.trigger_type as AutoRollbackOperation['triggerType']) || 'manual',
      triggeredBy: (row.triggered_by as string | undefined) || undefined,
      createdAt: String(row.created_at || ''),
      completedAt: (row.completed_at as string | undefined) || undefined,
    }));
  }

  // ============================================
  // 安全阀配置 (safety_valves_config)
  // ============================================

  async getSafetyValveConfigs(category?: string, scope?: 'global' | 'campaign', campaignId?: string): Promise<SafetyValveConfig[]> {
    let query = 'SELECT * FROM safety_valves_config WHERE enabled = 1';
    const bindings: unknown[] = [];

    if (category) {
      query += ' AND category = ?';
      bindings.push(category);
    }
    if (scope) {
      query += ' AND scope = ?';
      bindings.push(scope);
      if (scope === 'campaign' && campaignId) {
        query += ' AND campaign_id = ?';
        bindings.push(campaignId);
      }
    }

    query += ' ORDER BY scope DESC, category';

    const results = await this.db.prepare(query).bind(...bindings).all<Record<string, unknown>>();
    return (results.results || []).map((row) => this.parseSafetyValveConfig(row));
  }

  async getSafetyValveConfig(category: string, scope: 'global' | 'campaign' = 'global', campaignId?: string): Promise<SafetyValveConfig | null> {
    let query = 'SELECT * FROM safety_valves_config WHERE category = ? AND scope = ? AND enabled = 1';
    const bindings: unknown[] = [category, scope];

    if (scope === 'campaign' && campaignId) {
      query += ' AND campaign_id = ?';
      bindings.push(campaignId);
    }

    query += ' LIMIT 1';

    const result = await this.db.prepare(query).bind(...bindings).first<Record<string, unknown>>();
    return result ? this.parseSafetyValveConfig(result) : null;
  }

  // ============================================
  // 预定义规则 (predefined_auto_rules)
  // ============================================

  async getAllPredefinedRules(enabledOnly = true): Promise<PredefinedAutoRule[]> {
    const query = enabledOnly
      ? 'SELECT * FROM predefined_auto_rules WHERE enabled = 1 ORDER BY priority DESC'
      : 'SELECT * FROM predefined_auto_rules ORDER BY priority DESC';

    const results = await this.db.prepare(query).all<Record<string, unknown>>();
    return results.results.map(r => this.parsePredefinedRule(r));
  }

  async getPredefinedRuleByCode(ruleCode: string): Promise<PredefinedAutoRule | null> {
    const result = await this.db.prepare(
      'SELECT * FROM predefined_auto_rules WHERE rule_code = ?'
    ).bind(ruleCode).first<Record<string, unknown>>();

    return result ? this.parsePredefinedRule(result) : null;
  }

  // ============================================
  // Campaign规则关联 (campaign_auto_rules)
  // ============================================

  async getCampaignRules(campaignId: string): Promise<(CampaignAutoRule & { ruleCode: string; name: string })[]> {
    const results = await this.db.prepare(`
      SELECT
        car.id,
        car.campaign_id as campaignId,
        car.predefined_rule_id as predefinedRuleId,
        car.override_conditions as overrideConditions,
        car.override_actions as overrideActions,
        car.override_priority as overridePriority,
        car.enabled,
        car.total_triggers as totalTriggers,
        car.successful_triggers as successfulTriggers,
        car.last_triggered_at as lastTriggeredAt,
        car.created_at as createdAt,
        car.updated_at as updatedAt,
        par.rule_code as ruleCode,
        par.name,
        par.priority as defaultPriority,
        par.conditions as defaultConditions,
        par.actions as defaultActions
      FROM campaign_auto_rules car
      JOIN predefined_auto_rules par ON car.predefined_rule_id = par.id
      WHERE car.campaign_id = ? AND car.enabled = 1
      ORDER BY COALESCE(car.override_priority, par.priority) DESC
    `).bind(campaignId).all<Record<string, unknown>>();

    return (results.results || []).map((row) => ({
      id: String(row.id || ''),
      campaignId: String(row.campaignId || ''),
      predefinedRuleId: String(row.predefinedRuleId || ''),
      overrideConditions: this.parseJsonField<CampaignAutoRule['overrideConditions']>(row.overrideConditions),
      overrideActions: this.parseJsonField<CampaignAutoRule['overrideActions']>(row.overrideActions),
      overridePriority: row.overridePriority !== null && row.overridePriority !== undefined
        ? Number(row.overridePriority)
        : undefined,
      enabled: this.toBoolean(row.enabled),
      totalTriggers: Number(row.totalTriggers || 0),
      successfulTriggers: Number(row.successfulTriggers || 0),
      lastTriggeredAt: (row.lastTriggeredAt as string | undefined) || undefined,
      createdAt: String(row.createdAt || ''),
      updatedAt: String(row.updatedAt || ''),
      ruleCode: String(row.ruleCode || ''),
      name: String(row.name || ''),
    }));
  }

  async enableCampaignRule(campaignId: string, predefinedRuleId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO campaign_auto_rules (campaign_id, predefined_rule_id, enabled)
      VALUES (?, ?, TRUE)
      ON CONFLICT(campaign_id, predefined_rule_id) DO UPDATE SET enabled = TRUE, updated_at = datetime('now')
    `).bind(campaignId, predefinedRuleId).run();
  }

  async disableCampaignRule(campaignId: string, predefinedRuleId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE campaign_auto_rules SET enabled = FALSE, updated_at = datetime('now')
      WHERE campaign_id = ? AND predefined_rule_id = ?
    `).bind(campaignId, predefinedRuleId).run();
  }

  async incrementRuleTriggerStats(ruleId: string, success: boolean): Promise<void> {
    await this.db.prepare(`
      UPDATE campaign_auto_rules SET
        total_triggers = total_triggers + 1,
        successful_triggers = successful_triggers + ?,
        last_triggered_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(success ? 1 : 0, ruleId).run();
  }

  // ============================================
  // 审批请求 (approval_requests)
  // ============================================

  async createApprovalRequest(data: {
    operationId: string;
    expiresInMinutes?: number;
    notificationChannels?: string[];
  }): Promise<ApprovalRequest> {
    const id = crypto.randomUUID();
    const expiresIn = data.expiresInMinutes || 30;

    await this.db.prepare(`
      INSERT INTO approval_requests (id, operation_id, expires_at, notification_channels)
      VALUES (?, ?, datetime('now', '+' || ? || ' minutes'), ?)
    `).bind(
      id,
      data.operationId,
      expiresIn,
      JSON.stringify(data.notificationChannels || ['websocket'])
    ).run();

    const result = await this.db.prepare(`
      SELECT
        id,
        operation_id as operationId,
        status,
        requested_by as requestedBy,
        reviewed_by as reviewedBy,
        reviewed_at as reviewedAt,
        decision,
        decision_note as decisionNote,
        expires_at as expiresAt,
        notification_sent as notificationSent,
        notification_channels as notificationChannels,
        created_at as createdAt,
        updated_at as updatedAt
      FROM approval_requests
      WHERE id = ?
    `)
      .bind(id)
      .first<Record<string, unknown>>();

    return {
      id: String(result?.id || id),
      operationId: String(result?.operationId || data.operationId),
      status: (result?.status as ApprovalRequest['status']) || 'pending',
      requestedBy: (result?.requestedBy as string) || 'system',
      reviewedBy: (result?.reviewedBy as string | undefined) || undefined,
      reviewedAt: (result?.reviewedAt as string | undefined) || undefined,
      decision: (result?.decision as ApprovalRequest['decision'] | undefined) || undefined,
      decisionNote: (result?.decisionNote as string | undefined) || undefined,
      expiresAt: String(result?.expiresAt || ''),
      notificationSent: this.toBoolean(result?.notificationSent),
      notificationChannels: this.parseJsonField<string[]>(result?.notificationChannels, []),
      createdAt: String(result?.createdAt || ''),
      updatedAt: String(result?.updatedAt || ''),
    };
  }

  async approveRequest(requestId: string, reviewerId: string, note?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE approval_requests SET
        status = 'approved',
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        decision = 'approve',
        decision_note = ?,
        updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).bind(reviewerId, note || null, requestId).run();
  }

  async rejectRequest(requestId: string, reviewerId: string, reason: string): Promise<void> {
    await this.db.prepare(`
      UPDATE approval_requests SET
        status = 'rejected',
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        decision = 'reject',
        decision_note = ?,
        updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).bind(reviewerId, reason, requestId).run();
  }

  async getExpiredRequests(): Promise<ApprovalRequest[]> {
    const results = await this.db.prepare(`
      SELECT
        id,
        operation_id as operationId,
        status,
        requested_by as requestedBy,
        reviewed_by as reviewedBy,
        reviewed_at as reviewedAt,
        decision,
        decision_note as decisionNote,
        expires_at as expiresAt,
        notification_sent as notificationSent,
        notification_channels as notificationChannels,
        created_at as createdAt,
        updated_at as updatedAt
      FROM approval_requests
      WHERE status = 'pending' AND expires_at < datetime('now')
    `).all<Record<string, unknown>>();

    return (results.results || []).map((row) => ({
      id: String(row.id || ''),
      operationId: String(row.operationId || ''),
      status: (row.status as ApprovalRequest['status']) || 'pending',
      requestedBy: (row.requestedBy as string) || 'system',
      reviewedBy: (row.reviewedBy as string | undefined) || undefined,
      reviewedAt: (row.reviewedAt as string | undefined) || undefined,
      decision: (row.decision as ApprovalRequest['decision'] | undefined) || undefined,
      decisionNote: (row.decisionNote as string | undefined) || undefined,
      expiresAt: String(row.expiresAt || ''),
      notificationSent: this.toBoolean(row.notificationSent),
      notificationChannels: this.parseJsonField<string[]>(row.notificationChannels, []),
      createdAt: String(row.createdAt || ''),
      updatedAt: String(row.updatedAt || ''),
    }));
  }

  // ============================================
  // ROI缓存 (roi_calculation_cache)
  // ============================================

  async getCachedROI(cacheKey: string): Promise<(ROICalculationCache & { result: unknown }) | null> {
    const result = await this.db.prepare(`
      SELECT * FROM roi_calculation_cache
      WHERE cache_key = ? AND expires_at > datetime('now')
    `).bind(cacheKey).first<ROICalculationCache & { result: string }>();

    if (!result) return null;

    await this.db.prepare(`
      UPDATE roi_calculation_cache SET hit_count = hit_count + 1 WHERE cache_key = ?
    `).bind(cacheKey).run();

    return {
      ...result,
      result: typeof result.result === 'string' ? JSON.parse(result.result) : result.result,
    };
  }

  async setROICache(data: {
    cacheKey: string;
    campaignId: string;
    zoneId?: string;
    timeWindow: string;
    dimensions: string[];
    result: Record<string, unknown>;
    ttlSeconds?: number;
  }): Promise<void> {
    const ttl = data.ttlSeconds || 300;

    await this.db.prepare(`
      INSERT INTO roi_calculation_cache (
        cache_key, campaign_id, zone_id, time_window, dimensions,
        result, ttl_seconds, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))
      ON CONFLICT(cache_key) DO UPDATE SET
        result = excluded.result,
        calculated_at = datetime('now'),
        ttl_seconds = excluded.ttl_seconds,
        expires_at = datetime('now', '+' || excluded.ttl_seconds || ' seconds'),
        hit_count = 0
    `).bind(
      data.cacheKey,
      data.campaignId,
      data.zoneId || null,
      data.timeWindow,
      JSON.stringify(data.dimensions),
      JSON.stringify(data.result),
      ttl,
      ttl
    ).run();
  }

  async clearExpiredROICache(): Promise<number> {
    const result = await this.db.prepare(
      "DELETE FROM roi_calculation_cache WHERE expires_at < datetime('now')"
    ).run();
    return result.meta.changes || 0;
  }

  // ============================================
  // 统计查询
  // ============================================

  async getOperationStats(days: number = 30): Promise<{
    totalOperations: number;
    executedSuccessfully: number;
    executedFailed: number;
    pendingApproval: number;
    rolledBack: number;
  }> {
    const stats = await this.db.prepare(`
      SELECT
        COUNT(*) as totalOperations,
        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as executedSuccessfully,
        SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) as executedFailed,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pendingApproval,
        SUM(CASE WHEN approval_status = 'rolled_back' THEN 1 ELSE 0 END) as rolledBack
      FROM auto_operations
      WHERE created_at > datetime('now', '-' || ? || ' days')
    `).bind(days).first<{
      totalOperations: number;
      executedSuccessfully: number;
      executedFailed: number;
      pendingApproval: number;
      rolledBack: number;
    }>();

    return stats || {
      totalOperations: 0,
      executedSuccessfully: 0,
      executedFailed: 0,
      pendingApproval: 0,
      rolledBack: 0,
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  private parseOperation(raw: Record<string, unknown>): AutoOperation {
    const context = this.parseJsonField<Record<string, unknown>>(raw.decision_context, {});
    const triggerReason = (context.triggerReason || context.trigger_reason || '') as string;

    return {
      id: String(raw.id || ''),
      displayId: Number(raw.display_id || 0),
      campaignId: String(raw.campaign_id || ''),
      zoneId: (raw.zone_id as string | undefined) || undefined,
      creativeId: (raw.creative_id as string | undefined) || undefined,
      ruleId: (raw.rule_id as string | undefined) || undefined,
      ruleName: (raw.rule_name as string | undefined) || undefined,
      actionType: String(raw.action_type || 'ALERT') as AutoOperation['actionType'],
      platform: String(raw.platform || ''),
      targetType: String(raw.target_type || 'campaign') as AutoOperation['targetType'],
      parameters: this.parseJsonField<Record<string, unknown>>(raw.parameters, {}),
      decisionContext: {
        roi: Number(context.roi || 0),
        clicks: Number(context.clicks || 0),
        conversions: Number(context.conversions || 0),
        cost: Number(context.cost || 0),
        revenue: Number(context.revenue || 0),
        confidence: Number(context.confidence || 0),
        triggerReason,
        timeOfDay: context.timeOfDay !== undefined ? Number(context.timeOfDay) : undefined,
        dayOfWeek: context.dayOfWeek !== undefined ? Number(context.dayOfWeek) : undefined,
        zoneAgeHours: context.zoneAgeHours !== undefined ? Number(context.zoneAgeHours) : undefined,
        creativeAgeHours: context.creativeAgeHours !== undefined ? Number(context.creativeAgeHours) : undefined,
        epc: context.epc !== undefined ? Number(context.epc) : undefined,
        cpc: context.cpc !== undefined ? Number(context.cpc) : undefined,
        ctr: context.ctr !== undefined ? Number(context.ctr) : undefined,
        cr: context.cr !== undefined ? Number(context.cr) : undefined,
      },
      approvalStatus: String(raw.approval_status || 'pending') as AutoOperation['approvalStatus'],
      approvedBy: (raw.approved_by as string | undefined) || undefined,
      approvedAt: (raw.approved_at as string | undefined) || undefined,
      rejectionReason: (raw.rejection_reason as string | undefined) || undefined,
      executionStatus: String(raw.execution_status || 'pending') as AutoOperation['executionStatus'],
      executedAt: (raw.executed_at as string | undefined) || undefined,
      executionResult: (raw.execution_result as string | undefined) || undefined,
      executionError: (raw.execution_error as string | undefined) || undefined,
      rollbackOperationId: (raw.rollback_operation_id as string | undefined) || undefined,
      rollbackedAt: (raw.rollbacked_at as string | undefined) || undefined,
      createdAt: String(raw.created_at || ''),
      updatedAt: String(raw.updated_at || ''),
    };
  }

  private parsePredefinedRule(raw: Record<string, unknown>): PredefinedAutoRule {
    return {
      id: String(raw.id || ''),
      ruleCode: String(raw.rule_code || raw.ruleCode || ''),
      name: String(raw.name || ''),
      description: (raw.description as string | undefined) || undefined,
      ruleType: String(raw.rule_type || raw.ruleType || 'performance') as PredefinedAutoRule['ruleType'],
      priority: Number(raw.priority || 0),
      conditions: this.parseJsonField<PredefinedAutoRule['conditions']>(raw.conditions, []),
      actions: this.parseJsonField<PredefinedAutoRule['actions']>(raw.actions, []),
      enabled: this.toBoolean(raw.enabled),
      isSystemRule: this.toBoolean(raw.is_system_rule ?? raw.isSystemRule),
      version: Number(raw.version || 1),
      createdAt: String(raw.created_at || raw.createdAt || ''),
      updatedAt: String(raw.updated_at || raw.updatedAt || ''),
    };
  }

  private parseSafetyValveConfig(raw: Record<string, unknown>): SafetyValveConfig {
    return {
      id: String(raw.id || ''),
      scope: String(raw.scope || 'global') as SafetyValveConfig['scope'],
      campaignId: (raw.campaign_id as string | undefined) || undefined,
      category: String(raw.category || 'hard_limits') as SafetyValveConfig['category'],
      config: this.parseJsonField<SafetyValveConfig['config']>(raw.config, {} as SafetyValveConfig['config']),
      enabled: this.toBoolean(raw.enabled),
      createdBy: (raw.created_by as string | undefined) || undefined,
      updatedBy: (raw.updated_by as string | undefined) || undefined,
      createdAt: String(raw.created_at || ''),
      updatedAt: String(raw.updated_at || ''),
    } as SafetyValveConfig;
  }

  private parseJsonField<T = unknown>(value: unknown, fallback?: T): T {
    if (value === null || value === undefined || value === '') {
      return fallback as T;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback as T;
      }
    }

    return value as T;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return normalized === '1' || normalized === 'true';
    }
    return false;
  }
}
