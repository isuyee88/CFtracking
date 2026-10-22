/**
 * @fileoverview Bulk campaign operations (activate / pause / update / delete).
 *
 * Every statement in this service targets the canonical D1 schema from
 * `schema/migrations`: camelCase columns on `campaigns`/`flows`, `"group"` is
 * quoted because it is a reserved word, flow relations live in `flowOffers` /
 * `flowLandingPages`, flow rules in `flowRules` (production shape, see migration 083)
 * and the legacy `flow_rules`, and autorule bindings in
 * `campaign_rule_bindings` / `flow_rule_bindings` (+ `*_entries`).
 *
 * Invariants:
 * - `offers` and `landingPages` are global libraries: deleting a campaign only
 *   removes the relation rows, never the library rows they point at.
 * - Deletes run in FK-safe order inside one D1 batch (relations -> flows ->
 *   autorule scope bindings -> autorule scope configs -> campaign bindings ->
 *   campaign) so a mid-way failure rolls back.
 * - At most 50 ids per call keeps a batch inside the D1 subrequest budget.
 *
 * @see schema/migrations/001_init.sql
 * @see schema/migrations/023_add_campaign_uniqueness_method.sql
 * @see schema/migrations/045_enhance_flow_rules.sql
 * @see schema/migrations/083_flow_rules_compat.sql
 * @see schema/migrations/058_unify_autorules_binding_and_metrics.sql
 * @see schema/migrations/061_expand_autorule_bindings_priority.sql
 * @see schema/migrations/064_add_autorule_scope_configs.sql
 */

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export interface BulkResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface BulkUpdateOptions {
  costModel?: 'cpc' | 'cpm' | 'cpa' | 'flat';
  costValue?: number;
  trafficSource?: string;
  group?: string;
  status?: 'active' | 'paused';
}

/** Route validators cap the array at 50; keep the service honest too. */
const MAX_BATCH_SIZE = 50;

export class BulkOperationsService {
  constructor(private db: D1Database) {}

  /**
   * Bulk-activate campaigns.
   *
   * Writes `campaigns.status` + `updatedAt` for each id. Idempotent; one D1
   * batch means a failure leaves every row untouched.
   *
   * @param ids campaign ids, 1..50
   * @returns per-call summary; never throws for a D1 batch failure
   */
  async bulkActivate(ids: string[]): Promise<BulkResult> {
    return this.setStatus(ids, 'active');
  }

  /**
   * Bulk-pause campaigns. Same semantics as {@link bulkActivate}.
   */
  async bulkPause(ids: string[]): Promise<BulkResult> {
    return this.setStatus(ids, 'paused');
  }

  /**
   * Bulk-delete campaigns and their flow-owned rows.
   *
   * Statement order matters because flow rows are referenced by
   * `flowOffers`, `flowLandingPages`, `flow_rules` and the flow binding tables:
   * delete those first, then `flows`, then the campaign-level autorule scopes
   * (`autorule_scope_bindings` before `autorule_scope_configs`), bindings, then
   * `campaigns`. Global `offers` / `landingPages` rows and non-campaign
   * (`global` / `traffic_source`) scope rows are intentionally kept.
   *
   * @param ids campaign ids, 1..50
   * @returns summary; a failing batch rolls back and reports `success:false`
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const uniqueIds = this.requireIds(ids);
    const result = this.emptyResult();
    const placeholders = this.placeholders(uniqueIds);

    try {
      const statements: D1PreparedStatement[] = [
        // Relations owned by the campaign's flows.
        this.db
          .prepare(
            `DELETE FROM flowOffers
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM flowLandingPages
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM flowRules
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM flow_rules
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM flow_rule_binding_entries
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM flow_rule_bindings
             WHERE flowId IN (SELECT id FROM flows WHERE campaignId IN (${placeholders}))`
          )
          .bind(...uniqueIds),
        // Flows depend on campaigns, never the other way around.
        this.db.prepare(`DELETE FROM flows WHERE campaignId IN (${placeholders})`).bind(...uniqueIds),
        // 064 layered autorule scopes: campaign scope rows are owned by the
        // campaign. Bindings first (FK -> autorule_scope_configs), then the
        // config; global / traffic_source scopes are never touched.
        this.db
          .prepare(
            `DELETE FROM autorule_scope_bindings
             WHERE scopeConfigId IN (
               SELECT id FROM autorule_scope_configs
               WHERE scopeType = 'campaign' AND scopeId IN (${placeholders})
             )`
          )
          .bind(...uniqueIds),
        this.db
          .prepare(
            `DELETE FROM autorule_scope_configs
             WHERE scopeType = 'campaign' AND scopeId IN (${placeholders})`
          )
          .bind(...uniqueIds),
        // Campaign-scoped autorule bindings, then the campaign itself.
        this.db
          .prepare(`DELETE FROM campaign_rule_binding_entries WHERE campaignId IN (${placeholders})`)
          .bind(...uniqueIds),
        this.db
          .prepare(`DELETE FROM campaign_rule_bindings WHERE campaignId IN (${placeholders})`)
          .bind(...uniqueIds),
        this.db.prepare(`DELETE FROM campaigns WHERE id IN (${placeholders})`).bind(...uniqueIds),
      ];

      await this.db.batch(statements);
      result.processed = uniqueIds.length;
    } catch (error) {
      result.success = false;
      result.failed = uniqueIds.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Bulk-update the editable campaign fields.
   *
   * The SET list is built from a closed allowlist, so every fragment is a
   * constant and every value stays bound. `updatedAt` is the real column
   * (camelCase); `datetime('now')` matches the rest of the schema.
   *
   * @param ids campaign ids, 1..50
   * @param updates at least one allow-listed field
   * @returns summary; a failing batch rolls back and reports `success:false`
   */
  async bulkUpdate(ids: string[], updates: BulkUpdateOptions): Promise<BulkResult> {
    const uniqueIds = this.requireIds(ids);

    if (Object.keys(updates).length === 0) {
      throw new Error('At least one update field is required');
    }

    const result = this.emptyResult();
    const setClauses: string[] = [];
    const params: Array<string | number> = [];

    if (updates.costModel !== undefined) {
      setClauses.push('costModel = ?');
      params.push(updates.costModel);
    }
    if (updates.costValue !== undefined) {
      setClauses.push('costValue = ?');
      params.push(updates.costValue);
    }
    if (updates.trafficSource !== undefined) {
      setClauses.push('trafficSource = ?');
      params.push(updates.trafficSource);
    }
    if (updates.group !== undefined) {
      setClauses.push('"group" = ?');
      params.push(updates.group);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    setClauses.push("updatedAt = datetime('now')");

    try {
      const setClause = setClauses.join(', ');
      await this.db.batch(
        uniqueIds.map(id =>
          this.db
            .prepare(`UPDATE campaigns SET ${setClause} WHERE id = ?`)
            .bind(...params, id)
        )
      );
      result.processed = uniqueIds.length;
    } catch (error) {
      result.success = false;
      result.failed = uniqueIds.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Split requested ids into existing / missing campaigns.
   *
   * Single indexed lookup on the primary key; used by routes to return 404
   * before any write. An empty input is treated as "nothing to validate".
   */
  async validateCampaigns(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return { valid: [], invalid: [] };
    }

    const placeholders = this.placeholders(uniqueIds);
    const result = await this.db
      .prepare(`SELECT id FROM campaigns WHERE id IN (${placeholders})`)
      .bind(...uniqueIds)
      .all();

    const validIds = (result.results as Array<{ id: string }>).map(row => row.id);
    const invalidIds = uniqueIds.filter(id => !validIds.includes(id));

    return { valid: validIds, invalid: invalidIds };
  }

  /**
   * Read aliases before a delete: `clickcfg:{alias}` keys must be dropped after
   * the campaign row (and therefore the alias) is gone.
   *
   * @returns map of campaign id -> alias; missing ids are omitted
   */
  async getAliases(ids: string[]): Promise<Record<string, string>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return {};
    }

    const placeholders = this.placeholders(uniqueIds);
    const result = await this.db
      .prepare(`SELECT id, alias FROM campaigns WHERE id IN (${placeholders})`)
      .bind(...uniqueIds)
      .all();

    const aliases: Record<string, string> = {};
    for (const row of result.results as Array<{ id: string; alias: string }>) {
      aliases[row.id] = row.alias;
    }
    return aliases;
  }

  private async setStatus(ids: string[], status: 'active' | 'paused'): Promise<BulkResult> {
    const uniqueIds = this.requireIds(ids);
    const result = this.emptyResult();

    try {
      await this.db.batch(
        uniqueIds.map(id =>
          this.db
            .prepare("UPDATE campaigns SET status = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(status, id)
        )
      );
      result.processed = uniqueIds.length;
    } catch (error) {
      result.success = false;
      result.failed = uniqueIds.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private requireIds(ids: string[]): string[] {
    if (!ids || ids.length === 0) {
      throw new Error('Campaign IDs are required');
    }

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > MAX_BATCH_SIZE) {
      throw new Error(`At most ${MAX_BATCH_SIZE} campaigns can be changed per batch`);
    }
    return uniqueIds;
  }

  private placeholders(ids: string[]): string {
    return ids.map(() => '?').join(', ');
  }

  private emptyResult(): BulkResult {
    return {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };
  }
}
