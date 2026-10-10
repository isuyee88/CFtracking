/**
 * @fileoverview Autorule binding repository
 * @description Manage campaign/flow -> rule binding persistence with priority ordering.
 * @module handlers/d1/autoruleBinding.repo
 */

import type { D1Database } from './index';

export interface RuleBindingRecord {
  scope: 'campaign' | 'flow';
  scopeId: string;
  ruleId: string;
  priority: number;
  updatedAt: string;
}

export interface ReplaceRuleBindingInput {
  ruleId: string;
  priority?: number;
}

type BindingScope = 'campaign' | 'flow';

export class AutoruleBindingRepository {
  constructor(private readonly db: D1Database) {}

  private async resolveCampaignStorageId(campaignIdOrDisplayId: string): Promise<string | null> {
    const direct = await this.db
      .prepare('SELECT id FROM campaigns WHERE id = ? OR displayId = ? LIMIT 1')
      .bind(campaignIdOrDisplayId, campaignIdOrDisplayId)
      .first<{ id: string }>();
    return direct?.id || null;
  }

  private async resolveFlowStorageId(flowIdOrDisplayId: string): Promise<string | null> {
    const direct = await this.db
      .prepare('SELECT id FROM flows WHERE id = ? OR displayId = ? LIMIT 1')
      .bind(flowIdOrDisplayId, flowIdOrDisplayId)
      .first<{ id: string }>();
    return direct?.id || null;
  }

  private resolveScopeTable(scope: BindingScope): string {
    return scope === 'campaign' ? 'campaign_rule_binding_entries' : 'flow_rule_binding_entries';
  }

  private resolveScopeIdColumn(scope: BindingScope): string {
    return scope === 'campaign' ? 'campaignId' : 'flowId';
  }

  private async resolveScopeStorageId(scope: BindingScope, scopeIdOrDisplayId: string): Promise<string | null> {
    return scope === 'campaign'
      ? this.resolveCampaignStorageId(scopeIdOrDisplayId)
      : this.resolveFlowStorageId(scopeIdOrDisplayId);
  }

  private async queryBindings(scope: BindingScope, scopeIdOrDisplayId: string): Promise<RuleBindingRecord[]> {
    const storageId = await this.resolveScopeStorageId(scope, scopeIdOrDisplayId);
    if (!storageId) return [];

    const table = this.resolveScopeTable(scope);
    const scopeIdColumn = this.resolveScopeIdColumn(scope);
    const rows = await this.db
      .prepare(
        `SELECT ${scopeIdColumn} as scopeId, ruleId, priority, updatedAt
         FROM ${table}
         WHERE ${scopeIdColumn} = ? AND enabled = 1
         ORDER BY priority ASC, updatedAt DESC`
      )
      .bind(storageId)
      .all<{ scopeId: string; ruleId: string; priority: number; updatedAt: string }>();

    return ((rows.results as Array<{ scopeId: string; ruleId: string; priority: number; updatedAt: string }>) || []).map(
      (row) => ({
        scope,
        scopeId: row.scopeId,
        ruleId: row.ruleId,
        priority: Number(row.priority || 0),
        updatedAt: row.updatedAt,
      })
    );
  }

  private async replaceBindings(
    scope: BindingScope,
    scopeIdOrDisplayId: string,
    bindings: ReplaceRuleBindingInput[]
  ): Promise<RuleBindingRecord[]> {
    const storageId = await this.resolveScopeStorageId(scope, scopeIdOrDisplayId);
    if (!storageId) {
      throw new Error(scope === 'campaign' ? 'Campaign not found' : 'Flow not found');
    }

    const table = this.resolveScopeTable(scope);
    const scopeIdColumn = this.resolveScopeIdColumn(scope);

    await this.db
      .prepare(`DELETE FROM ${table} WHERE ${scopeIdColumn} = ?`)
      .bind(storageId)
      .run();

    const now = new Date().toISOString();
    const normalized = bindings
      .map((binding, index) => ({
        ruleId: String(binding.ruleId || '').trim(),
        priority: Number.isFinite(Number(binding.priority)) ? Number(binding.priority) : index,
      }))
      .filter((binding) => binding.ruleId);

    for (const binding of normalized) {
      await this.db
        .prepare(
          `INSERT INTO ${table} (id, ${scopeIdColumn}, ruleId, priority, enabled, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(crypto.randomUUID(), storageId, binding.ruleId, binding.priority, now, now)
        .run();
    }

    return normalized
      .sort((left, right) => left.priority - right.priority)
      .map((binding) => ({
        scope,
        scopeId: storageId,
        ruleId: binding.ruleId,
        priority: binding.priority,
        updatedAt: now,
      }));
  }

  async getCampaignBindings(campaignIdOrDisplayId: string): Promise<RuleBindingRecord[]> {
    return this.queryBindings('campaign', campaignIdOrDisplayId);
  }

  async replaceCampaignBindings(
    campaignIdOrDisplayId: string,
    bindings: ReplaceRuleBindingInput[]
  ): Promise<RuleBindingRecord[]> {
    return this.replaceBindings('campaign', campaignIdOrDisplayId, bindings);
  }

  async clearCampaignBindings(campaignIdOrDisplayId: string): Promise<boolean> {
    const storageId = await this.resolveCampaignStorageId(campaignIdOrDisplayId);
    if (!storageId) {
      throw new Error('Campaign not found');
    }

    const result = await this.db
      .prepare('DELETE FROM campaign_rule_binding_entries WHERE campaignId = ?')
      .bind(storageId)
      .run();
    return Boolean(result.success);
  }

  async getFlowBindings(flowIdOrDisplayId: string): Promise<RuleBindingRecord[]> {
    return this.queryBindings('flow', flowIdOrDisplayId);
  }

  async replaceFlowBindings(flowIdOrDisplayId: string, bindings: ReplaceRuleBindingInput[]): Promise<RuleBindingRecord[]> {
    return this.replaceBindings('flow', flowIdOrDisplayId, bindings);
  }

  async clearFlowBindings(flowIdOrDisplayId: string): Promise<boolean> {
    const storageId = await this.resolveFlowStorageId(flowIdOrDisplayId);
    if (!storageId) {
      throw new Error('Flow not found');
    }

    const result = await this.db
      .prepare('DELETE FROM flow_rule_binding_entries WHERE flowId = ?')
      .bind(storageId)
      .run();
    return Boolean(result.success);
  }

  async getCampaignBinding(campaignIdOrDisplayId: string): Promise<RuleBindingRecord | null> {
    const bindings = await this.getCampaignBindings(campaignIdOrDisplayId);
    return bindings[0] || null;
  }

  async setCampaignBinding(campaignIdOrDisplayId: string, ruleId: string): Promise<RuleBindingRecord> {
    const bindings = await this.replaceCampaignBindings(campaignIdOrDisplayId, [{ ruleId, priority: 0 }]);
    if (!bindings[0]) {
      throw new Error('Campaign binding was not persisted');
    }
    return bindings[0];
  }

  async clearCampaignBinding(campaignIdOrDisplayId: string): Promise<boolean> {
    return this.clearCampaignBindings(campaignIdOrDisplayId);
  }

  async getFlowBinding(flowIdOrDisplayId: string): Promise<RuleBindingRecord | null> {
    const bindings = await this.getFlowBindings(flowIdOrDisplayId);
    return bindings[0] || null;
  }

  async setFlowBinding(flowIdOrDisplayId: string, ruleId: string): Promise<RuleBindingRecord> {
    const bindings = await this.replaceFlowBindings(flowIdOrDisplayId, [{ ruleId, priority: 0 }]);
    if (!bindings[0]) {
      throw new Error('Flow binding was not persisted');
    }
    return bindings[0];
  }

  async clearFlowBinding(flowIdOrDisplayId: string): Promise<boolean> {
    return this.clearFlowBindings(flowIdOrDisplayId);
  }

  async getEffectiveBinding(campaignIdOrDisplayId: string, flowIdOrDisplayId?: string): Promise<RuleBindingRecord | null> {
    const bindings = await this.getEffectiveBindings(campaignIdOrDisplayId, flowIdOrDisplayId);
    return bindings[0] || null;
  }

  async getEffectiveBindings(campaignIdOrDisplayId: string, flowIdOrDisplayId?: string): Promise<RuleBindingRecord[]> {
    const campaignBindings = await this.getCampaignBindings(campaignIdOrDisplayId);
    if (campaignBindings.length > 0) {
      return campaignBindings;
    }

    if (flowIdOrDisplayId) {
      const flowBindings = await this.getFlowBindings(flowIdOrDisplayId);
      if (flowBindings.length > 0) {
        return flowBindings;
      }
    }

    return [];
  }
}
