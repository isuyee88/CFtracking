/**
 * @fileoverview Campaign deep-clone service.
 *
 * Copies a campaign's control-plane configuration — the campaign row, its
 * flows, each flow's offer/landing relations, and the campaign-level autorule
 * binding entries — onto freshly generated IDs.
 *
 * Schema source of truth: `schema/migrations`. Campaigns/flows use camelCase
 * columns (`domain`, `"group"`, `trafficSource`, `costModel`, `costValue`,
 * `campaignId`, `status`, `actionType`, `actionConfig`, `createdAt`,
 * `updatedAt`); flow relations live in `flowOffers` / `flowLandingPages`;
 * campaign autorules live in `campaign_rule_binding_entries`.
 *
 * Invariants:
 * - `offers` and `landingPages` are global libraries: clones reference them,
 *   never copy or delete them.
 * - `campaigns.alias` is UNIQUE, so every clone gets a freshly probed alias;
 *   `apiToken` is UNIQUE too, so it is regenerated rather than copied.
 * - All writes go through one `db.batch()`. D1 batches are atomic, so a failure
 *   leaves neither a campaign nor orphan flows/relations behind.
 * - Statistics are not columns on `campaigns` and are not copied. Traffic
 *   aggregates are per-campaign rows in `trafficSummary`, keyed by the new id,
 *   so the clone starts with zero history for free.
 *
 * @see schema/migrations/001_init.sql
 * @see schema/migrations/016_add_display_ids.sql
 * @see schema/migrations/023_add_campaign_uniqueness_method.sql
 * @see schema/migrations/024_add_flow_action_fields.sql
 * @see schema/migrations/045_enhance_flow_rules.sql
 * @see schema/migrations/058_unify_autorules_binding_and_metrics.sql
 * @see schema/migrations/061_expand_autorule_bindings_priority.sql
 */

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { generateApiToken, generateUUID } from '@/utils/crypto';

export interface CloneOptions {
  /** Keep the original status; otherwise the clone is created `paused`. */
  cloneStatus?: boolean;
  /** Clone the campaign's flows (default true). */
  cloneFlows?: boolean;
  /** Clone each cloned flow's `flowOffers` rows (default true). */
  cloneOffers?: boolean;
  /** Clone each cloned flow's `flowLandingPages` rows (default true). */
  cloneLandings?: boolean;
  /** Clone the campaign-level `campaign_rule_binding_entries` (default true). */
  cloneAutorules?: boolean;
  /** Copy `costModel`/`costValue`; otherwise reset to `cpc`/0 (default true). */
  cloneCostSettings?: boolean;
}

/** The committed campaign row as returned to the caller. */
export interface ClonedCampaign {
  id: string;
  displayId: string;
  name: string;
  alias: string;
  domain: string;
  group: string | null;
  trafficSource: string | null;
  flowRotation: string;
  costModel: string;
  costValue: number;
  currency: string;
  trafficLoss: number;
  uniquenessMethod: string;
  uniquenessParameter: string | null;
  uniquenessTTL: number;
  visitorBinding: string;
  apiToken: string;
  parameters: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloneCampaignResult {
  success: boolean;
  data: {
    originalId: string;
    clonedId: string;
    clonedCampaign: ClonedCampaign;
    clonedFlowCount: number;
    clonedOfferCount: number;
    clonedLandingCount: number;
    clonedAutoruleCount: number;
  };
  message: string;
}

interface CampaignRow {
  id: string;
  displayId: string | null;
  name: string;
  alias: string;
  domain: string;
  group: string | null;
  trafficSource: string | null;
  flowRotation: string | null;
  costModel: string | null;
  costValue: number | null;
  currency: string | null;
  trafficLoss: number | null;
  uniquenessMethod: string | null;
  uniquenessParameter: string | null;
  uniquenessTTL: number | null;
  visitorBinding: string | null;
  parameters: string | null;
  status: string | null;
}

interface FlowRow {
  id: string;
  name: string;
  type: string | null;
  weight: number | null;
  status: string | null;
  filters: string | null;
  filterLogic: string | null;
  priority: number | null;
  actionType: string | null;
  actionConfig: string | null;
}

interface FlowOfferRow {
  flowId: string;
  offerId: string;
  weight: number | null;
}

interface FlowLandingRow {
  flowId: string;
  landingPageId: string;
  weight: number | null;
}

interface BindingEntryRow {
  ruleId: string;
  priority: number;
  enabled: number;
}

export class CampaignCloneService {
  constructor(private db: D1Database) {}

  /**
   * Clone a campaign and its configuration.
   *
   * Reads the original campaign, flows, flow relations and campaign bindings,
   * generates new IDs/alias/token, then writes everything in one atomic batch.
   * The original row and the global offer/landing libraries are never modified.
   *
   * @param originalId campaign `id` or `displayId`
   * @param newName requested clone name; made unique against existing names
   * @param options clone switches; omitted flags default to true/false as documented
   * @returns committed clone plus per-entity copied counts
   * @throws Error when the campaign is missing or the batch fails (nothing written)
   */
  async clone(
    originalId: string,
    newName: string,
    options: CloneOptions = {}
  ): Promise<CloneCampaignResult> {
    const opts: Required<CloneOptions> = {
      cloneStatus: options.cloneStatus ?? false,
      cloneFlows: options.cloneFlows ?? true,
      cloneOffers: options.cloneOffers ?? true,
      cloneLandings: options.cloneLandings ?? true,
      cloneAutorules: options.cloneAutorules ?? true,
      cloneCostSettings: options.cloneCostSettings ?? true,
    };

    const original = await this.getCampaignById(originalId);
    if (!original) {
      throw new Error(`Campaign with ID '${originalId}' not found`);
    }

    const now = new Date().toISOString();
    const newId = this.generateId('c');
    const uniqueName = await this.generateUniqueName(newName);
    const alias = await this.generateUniqueAlias(uniqueName, original.alias);

    // A deleted campaign must not produce a deleted clone: only an explicit
    // cloneStatus request copies a status that is still visible in the UI.
    const status = opts.cloneStatus && original.status && original.status !== 'deleted'
      ? original.status
      : 'paused';

    const clonedCampaign: ClonedCampaign = {
      id: newId,
      displayId: newId,
      name: uniqueName,
      alias,
      domain: original.domain ?? '',
      group: original.group ?? null,
      trafficSource: original.trafficSource ?? null,
      flowRotation: original.flowRotation ?? 'position',
      costModel: opts.cloneCostSettings ? (original.costModel ?? 'cpc') : 'cpc',
      costValue: opts.cloneCostSettings ? (original.costValue ?? 0) : 0,
      currency: original.currency ?? 'USD',
      trafficLoss: original.trafficLoss ?? 0,
      uniquenessMethod: original.uniquenessMethod ?? 'none',
      uniquenessParameter: original.uniquenessParameter ?? null,
      uniquenessTTL: original.uniquenessTTL ?? 86400,
      visitorBinding: original.visitorBinding ?? 'none',
      apiToken: generateApiToken(),
      parameters: original.parameters ?? '{}',
      status,
      createdAt: now,
      updatedAt: now,
    };

    // Flows may point at either the row id or the displayId; accept both.
    const campaignIds = this.uniqueStrings([original.id, original.displayId]);
    const flows = opts.cloneFlows ? await this.getFlows(campaignIds) : [];
    const flowIdMap = new Map<string, string>();
    for (const flow of flows) {
      flowIdMap.set(flow.id, this.generateId('f'));
    }

    const oldFlowIds = flows.map((flow) => flow.id);
    const offers = opts.cloneOffers && oldFlowIds.length > 0
      ? await this.getFlowOffers(oldFlowIds)
      : [];
    const landings = opts.cloneLandings && oldFlowIds.length > 0
      ? await this.getFlowLandings(oldFlowIds)
      : [];
    const bindings = opts.cloneAutorules
      ? await this.getCampaignBindingEntries(campaignIds)
      : [];

    const statements: D1PreparedStatement[] = [
      this.db.prepare(`
        INSERT INTO campaigns (
          id, displayId, name, alias, domain, "group", trafficSource,
          flowRotation, costModel, costValue, currency, trafficLoss,
          uniquenessMethod, uniquenessParameter, uniquenessTTL,
          visitorBinding, apiToken, parameters, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        clonedCampaign.id,
        clonedCampaign.displayId,
        clonedCampaign.name,
        clonedCampaign.alias,
        clonedCampaign.domain,
        clonedCampaign.group,
        clonedCampaign.trafficSource,
        clonedCampaign.flowRotation,
        clonedCampaign.costModel,
        clonedCampaign.costValue,
        clonedCampaign.currency,
        clonedCampaign.trafficLoss,
        clonedCampaign.uniquenessMethod,
        clonedCampaign.uniquenessParameter,
        clonedCampaign.uniquenessTTL,
        clonedCampaign.visitorBinding,
        clonedCampaign.apiToken,
        clonedCampaign.parameters,
        clonedCampaign.status,
        clonedCampaign.createdAt,
        clonedCampaign.updatedAt
      ),
    ];

    for (const flow of flows) {
      const newFlowId = flowIdMap.get(flow.id);
      if (!newFlowId) continue;
      statements.push(
        this.db.prepare(`
          INSERT INTO flows (
            id, displayId, campaignId, name, type, weight, status,
            filters, filterLogic, priority, actionType, actionConfig,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newFlowId,
          newFlowId,
          newId,
          flow.name,
          flow.type ?? 'regular',
          flow.weight ?? 100,
          flow.status ?? 'active',
          flow.filters ?? '[]',
          flow.filterLogic ?? 'AND',
          flow.priority ?? 0,
          flow.actionType ?? 'redirect',
          flow.actionConfig ?? '{}',
          now,
          now
        )
      );
    }

    for (const offer of offers) {
      const newFlowId = flowIdMap.get(offer.flowId);
      if (!newFlowId) continue;
      statements.push(
        this.db.prepare(
          `INSERT INTO flowOffers (flowId, offerId, weight, createdAt) VALUES (?, ?, ?, ?)`
        ).bind(newFlowId, offer.offerId, offer.weight ?? 100, now)
      );
    }

    for (const landing of landings) {
      const newFlowId = flowIdMap.get(landing.flowId);
      if (!newFlowId) continue;
      statements.push(
        this.db.prepare(
          `INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt) VALUES (?, ?, ?, ?)`
        ).bind(newFlowId, landing.landingPageId, landing.weight ?? 100, now)
      );
    }

    for (const binding of bindings) {
      statements.push(
        this.db.prepare(`
          INSERT INTO campaign_rule_binding_entries (
            id, campaignId, ruleId, priority, enabled, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          `cre-${generateUUID()}`,
          newId,
          binding.ruleId,
          binding.priority ?? 0,
          binding.enabled ?? 1,
          now,
          now
        )
      );
    }

    // One batch keeps the clone atomic: campaign, flows and relations commit
    // together or not at all. No cache/invalidation work here — the route owns
    // that, after the commit is observable.
    try {
      await this.db.batch(statements);
    } catch (error) {
      throw new Error(`Failed to clone campaign: ${(error as Error).message}`);
    }

    return {
      success: true,
      data: {
        originalId: original.id,
        clonedId: newId,
        clonedCampaign,
        clonedFlowCount: flows.length,
        clonedOfferCount: offers.filter((row) => flowIdMap.has(row.flowId)).length,
        clonedLandingCount: landings.filter((row) => flowIdMap.has(row.flowId)).length,
        clonedAutoruleCount: bindings.length,
      },
      message: `Campaign '${uniqueName}' cloned successfully`,
    };
  }

  private async getCampaignById(id: string): Promise<CampaignRow | null> {
    const row = await this.db
      .prepare(`SELECT * FROM campaigns WHERE id = ? OR displayId = ? LIMIT 1`)
      .bind(id, id)
      .first<CampaignRow>();
    return row ?? null;
  }

  private async getFlows(campaignIds: string[]): Promise<FlowRow[]> {
    const placeholders = this.placeholders(campaignIds);
    const result = await this.db
      .prepare(`
        SELECT id, name, type, weight, status, filters, filterLogic, priority, actionType, actionConfig
        FROM flows
        WHERE campaignId IN (${placeholders})
        ORDER BY createdAt ASC, id ASC
      `)
      .bind(...campaignIds)
      .all<FlowRow>();
    return result.results ?? [];
  }

  private async getFlowOffers(flowIds: string[]): Promise<FlowOfferRow[]> {
    const placeholders = this.placeholders(flowIds);
    const result = await this.db
      .prepare(`
        SELECT flowId, offerId, weight
        FROM flowOffers
        WHERE flowId IN (${placeholders})
        ORDER BY flowId ASC, id ASC
      `)
      .bind(...flowIds)
      .all<FlowOfferRow>();
    return result.results ?? [];
  }

  private async getFlowLandings(flowIds: string[]): Promise<FlowLandingRow[]> {
    const placeholders = this.placeholders(flowIds);
    const result = await this.db
      .prepare(`
        SELECT flowId, landingPageId, weight
        FROM flowLandingPages
        WHERE flowId IN (${placeholders})
        ORDER BY flowId ASC, id ASC
      `)
      .bind(...flowIds)
      .all<FlowLandingRow>();
    return result.results ?? [];
  }

  private async getCampaignBindingEntries(campaignIds: string[]): Promise<BindingEntryRow[]> {
    const placeholders = this.placeholders(campaignIds);
    const result = await this.db
      .prepare(`
        SELECT ruleId, priority, enabled
        FROM campaign_rule_binding_entries
        WHERE campaignId IN (${placeholders})
        ORDER BY priority ASC, ruleId ASC
      `)
      .bind(...campaignIds)
      .all<BindingEntryRow>();
    return result.results ?? [];
  }

  /**
   * Keep the requested name unique for the admin UI. `campaigns.name` is not
   * UNIQUE, but two identically named rows are indistinguishable in list views.
   */
  private async generateUniqueName(baseName: string): Promise<string> {
    const requested = baseName.trim() || 'Campaign Copy';
    if (!(await this.nameExists(requested))) {
      return requested;
    }

    const copyBaseName = /^(.*) - Copy(?: \d+)?$/.exec(requested)?.[1];
    const suffixBaseName = copyBaseName ? `${copyBaseName} - Copy` : requested;
    let counter = 1;
    let candidate = `${suffixBaseName} ${counter}`;
    while (await this.nameExists(candidate)) {
      counter++;
      candidate = `${suffixBaseName} ${counter}`;
    }
    return candidate;
  }

  private async nameExists(name: string): Promise<boolean> {
    const row = await this.db
      .prepare(`SELECT 1 AS found FROM campaigns WHERE name = ? LIMIT 1`)
      .bind(name)
      .first<{ found: number }>();
    return row !== null;
  }

  /**
   * Derive an alias from the clone name and probe until it is UNIQUE. A
   * non-latin name slugifies to '' and falls back to the original alias so the
   * clone never gets a meaningless or empty alias.
   */
  private async generateUniqueAlias(seedName: string, originalAlias: string): Promise<string> {
    let base = this.slugify(seedName) || this.slugify(originalAlias) || 'campaign';
    if (base.length < 2) {
      base = `${base}-copy`;
    }

    for (let counter = 1; ; counter++) {
      const suffix = counter === 1 ? '' : `-${counter}`;
      const head = base.slice(0, Math.max(1, 50 - suffix.length)).replace(/-+$/, '');
      const candidate = `${head || 'campaign'}${suffix}`;
      if (!(await this.aliasExists(candidate))) {
        return candidate;
      }
    }
  }

  private async aliasExists(alias: string): Promise<boolean> {
    const row = await this.db
      .prepare(`SELECT 1 AS found FROM campaigns WHERE alias = ? LIMIT 1`)
      .bind(alias)
      .first<{ found: number }>();
    return row !== null;
  }

  /** Lowercase kebab-case; mirrors the alias shape the create route accepts. */
  private slugify(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '');
  }

  private generateId(prefix: string): string {
    return `${prefix}${generateUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  private placeholders(values: string[]): string {
    return values.map(() => '?').join(',');
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }
}
