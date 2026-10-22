/**
 * @fileoverview Publish immutable click configuration snapshots.
 *
 * Control-plane writes are followed by a snapshot publish; the click path then
 * reads only KV/Cache. This intentionally runs outside the click request path.
 *
 * Invariant: a published key must describe the current control-plane state. A
 * rename/pause/delete therefore also *deletes* the alias key; leaving it in
 * place makes the fast path redirect to an offer that was already edited.
 *
 * Failure invariant: publishing is fail-closed. If a KV write or D1 read fails,
 * the alias keys are deleted so clicks fall back to D1 instead of reading a
 * partially written snapshot.
 */

import type { Env } from '@/config/env';
import { getD1Connection } from '@/handlers/d1';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { FlowRepository } from '@/handlers/d1/flow.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';

const KEY_PREFIX = 'clickcfg:';
const POINTER_PREFIX = 'cfg:pointer:';

export interface ClickConfigSnapshot {
  campaignId: string;
  flowId: string | null;
  offerId: string | null;
  offerUrl: string;
  landingPageId: string | null;
  status: 'active' | 'paused' | 'archived';
  updatedAt: string;
}

export interface FullConfigSnapshot {
  scope: string;
  version: string;
  campaign: unknown;
  flows: Array<{
    id: string;
    type: string;
    weight: number;
    status: string;
    filters: unknown;
    actionType: string;
    actionConfig: unknown;
    offers: Array<{ offerId: string; weight: number; url: string | null }>;
    landingPages: Array<{ landingPageId: string; weight: number }>;
  }>;
  updatedAt: string;
}

export class ConfigSnapshotPublisher {
  private campaignRepo: CampaignRepository;
  private flowRepo: FlowRepository;
  private offerRepo: OfferRepository;

  constructor(private env: Env) {
    const db = getD1Connection(env);
    this.campaignRepo = new CampaignRepository(db);
    this.flowRepo = new FlowRepository(db);
    this.offerRepo = new OfferRepository(db);
  }

  /**
   * Publish the alias-scoped config for one campaign.
   *
   * `previousAlias` is the alias the row had before an update: a rename would
   * otherwise leave the old key serving the pre-rename config.
   *
   * Returns null when there is nothing publishable (campaign gone, paused, or
   * no active offer). The alias key is deleted in that case so the click path
   * falls back to D1 instead of serving a stale offer URL.
   *
   * Reads campaigns/flows/flowOffers/flowLandingPages/offers. Writes or deletes
   * `clickcfg:{alias}` plus `cfg:snapshot:*`/`cfg:pointer:*` in UNIQUENESS_KV.
   * Idempotent for the same control-plane state. Throws after deleting the
   * affected alias keys when storage fails, because a retained key would serve
   * a pre-write offer URL.
   */
  async publishCampaign(aliasOrId: string, previousAlias?: string): Promise<ClickConfigSnapshot | null> {
    const actualAlias = String(aliasOrId || '').trim();
    if (!actualAlias) return null;
    try {
      return await this.publishCampaignInner(actualAlias, previousAlias);
    } catch (error) {
      // A half-published snapshot is worse than no snapshot: the compatibility
      // reader ignores `status`, so drop both the alias this call tried to write
      // and the one it was renamed from. Cleanup is best-effort; the original
      // failure is what the caller must see.
      await this.dropAliases([actualAlias, previousAlias]);
      throw error;
    }
  }

  private async publishCampaignInner(actualAlias: string, previousAlias?: string): Promise<ClickConfigSnapshot | null> {
    const campaign = await this.campaignRepo.findByAlias(actualAlias)
      || await this.campaignRepo.findById(actualAlias);
    if (!campaign) {
      await this.invalidateAlias(actualAlias);
      await this.dropPreviousAlias(previousAlias, actualAlias);
      return null;
    }

    // The update DTO accepts `alias: null`, so the row can be alias-less even
    // though the type says string. Publishing would write a junk
    // `clickcfg:null`; treat it as unpublishable and clean up the known alias.
    const campaignAlias = String(campaign.alias || '').trim();
    if (!campaignAlias) {
      await this.invalidateAlias(actualAlias);
      await this.dropPreviousAlias(previousAlias, actualAlias);
      return null;
    }

    // The compatibility `clickcfg` reader ignores `status`, so a paused
    // campaign must not keep a key at all.
    if (campaign.status !== 'active') {
      await this.invalidateAlias(campaignAlias);
      await this.dropPreviousAlias(previousAlias, campaignAlias);
      return null;
    }

    const flows = await this.flowRepo.findByCampaignIdAndStatus(campaign.id, 'active');
    for (const flow of flows) {
      const offers = await this.flowRepo.getOffers(flow.id);
      const ranked = await Promise.all(offers.map(async (assoc) => {
        const offer = await this.offerRepo.findById(assoc.offerId);
        return { assoc, offer };
      }));
      const winner = ranked
        .filter((item) => item.offer?.status === 'active' && item.offer?.url)
        .sort((a, b) => Number(b.assoc.weight || 0) - Number(a.assoc.weight || 0))[0];
      if (!winner?.offer) continue;
      const landingPages = await this.flowRepo.getLandingPages(flow.id);
      const landing = landingPages
        .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))[0] || null;
      const snapshot: ClickConfigSnapshot = {
        campaignId: campaign.id,
        flowId: flow.id,
        offerId: winner.offer.id,
        offerUrl: winner.offer.url,
        landingPageId: landing?.landingPageId || null,
        status: campaign.status === 'active' ? 'active' : 'paused',
        updatedAt: new Date().toISOString(),
      };
      await this.env.UNIQUENESS_KV.put(`${KEY_PREFIX}${campaignAlias}`, JSON.stringify(snapshot));
      await this.publishFullSnapshot(campaign, flows);
      await this.dropPreviousAlias(previousAlias, campaignAlias);
      return snapshot;
    }

    await this.invalidateAlias(campaignAlias);
    await this.dropPreviousAlias(previousAlias, campaignAlias);
    return null;
  }

  /**
   * Remove the alias-scoped config. Deletion is the safe state: the click path
   * falls back to D1, which is always fresher than a retained key.
   */
  async invalidateAlias(alias: string): Promise<void> {
    const actualAlias = String(alias || '').trim();
    if (!actualAlias) return;
    await Promise.all([
      this.env.UNIQUENESS_KV.delete(`${KEY_PREFIX}${actualAlias}`),
      this.env.UNIQUENESS_KV.delete(`${POINTER_PREFIX}${actualAlias}`),
    ]);
  }

  /**
   * Re-publish every campaign alias affected by a control-plane write.
   * Sequential on purpose: admin writes are low-QPS and this bounds D1 reads.
   *
   * A single alias failure must not leave the remaining aliases on the old
   * snapshot, so every alias is attempted; the first error is rethrown after
   * the loop. `publishCampaign` already deleted the failing alias key.
   */
  async publishAliases(aliases: string[]): Promise<number> {
    let published = 0;
    let firstError: unknown = null;
    for (const alias of this.normalizeAliases(aliases)) {
      try {
        if (await this.publishCampaign(alias)) published += 1;
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) throw firstError;
    return published;
  }

  /** Republish every campaign whose flow references this offer. */
  async publishForOffer(offerId: string): Promise<number> {
    return this.publishAliases(await this.aliasesForOffer(offerId));
  }

  /** Republish the campaign that owns this flow. */
  async publishForFlow(flowId: string): Promise<number> {
    const campaigns = await this.campaignRepo.findByFlowId(flowId);
    return this.publishAliases(campaigns.map((campaign) => campaign.alias));
  }

  /** Republish every campaign whose flow uses this landing page. */
  async publishForLandingPage(landingPageId: string): Promise<number> {
    return this.publishAliases(await this.aliasesForLandingPage(landingPageId));
  }

  /**
   * Capture affected aliases *before* a delete: joining rows may cascade away,
   * after which the affected campaigns can no longer be discovered.
   */
  async aliasesForOffer(offerId: string): Promise<string[]> {
    const campaigns = await this.campaignRepo.findByOfferId(offerId);
    return campaigns.map((campaign) => campaign.alias);
  }

  async aliasesForLandingPage(landingPageId: string): Promise<string[]> {
    const campaigns = await this.campaignRepo.findByLandingPageId(landingPageId);
    return campaigns.map((campaign) => campaign.alias);
  }

  private async dropPreviousAlias(previousAlias: string | undefined, currentAlias: string): Promise<void> {
    const previous = String(previousAlias || '').trim();
    if (previous && previous !== currentAlias) {
      await this.invalidateAlias(previous);
    }
  }

  /** Trim, drop blanks, and dedupe so one alias is published at most once. */
  private normalizeAliases(aliases: Array<string | undefined>): string[] {
    return [...new Set(aliases.map((alias) => String(alias || '').trim()).filter(Boolean))];
  }

  /** Delete every given alias, tolerating storage errors during failure cleanup. */
  private async dropAliases(aliases: Array<string | undefined>): Promise<void> {
    await Promise.all(this.normalizeAliases(aliases).map(async (alias) => {
      try {
        await this.invalidateAlias(alias);
      } catch {
        // Best-effort: the publish error is the actionable signal.
      }
    }));
  }

  /**
   * Immutable full snapshot for the future flow/rule-aware click fast path.
   * `clickcfg` remains the compatibility fast path until that engine is live.
   */
  private async publishFullSnapshot(campaign: any, flows: any[]): Promise<void> {
    const fullFlows = [];
    for (const flow of flows) {
      const [offerAssocs, landingAssocs] = await Promise.all([
        this.flowRepo.getOffers(flow.id),
        this.flowRepo.getLandingPages(flow.id),
      ]);
      const offers = [];
      for (const assoc of offerAssocs) {
        const offer = await this.offerRepo.findById(assoc.offerId);
        offers.push({ offerId: assoc.offerId, weight: Number(assoc.weight) || 0, url: offer?.url || null });
      }
      fullFlows.push({
        id: flow.id,
        type: String(flow.type || 'regular'),
        weight: Number(flow.weight) || 0,
        status: String(flow.status || 'active'),
        filters: flow.filters || [],
        actionType: String(flow.actionType || 'redirect'),
        actionConfig: flow.actionConfig || {},
        offers,
        landingPages: landingAssocs.map((item) => ({ landingPageId: item.landingPageId, weight: Number(item.weight) || 0 })),
      });
    }
    const version = Date.now().toString(36);
    const full: FullConfigSnapshot = {
      scope: campaign.alias,
      version,
      campaign,
      flows: fullFlows,
      updatedAt: new Date().toISOString(),
    };
    await this.env.UNIQUENESS_KV.put(`cfg:snapshot:${campaign.alias}:${version}`, JSON.stringify(full), {
      expirationTtl: 7 * 24 * 60 * 60,
    });
    await this.env.UNIQUENESS_KV.put(`cfg:pointer:${campaign.alias}`, JSON.stringify({
      version,
      updatedAt: full.updatedAt,
    }), { expirationTtl: 7 * 24 * 60 * 60 });
  }

  async publishAll(): Promise<{ total: number; published: number }> {
    const active = await this.campaignRepo.findByStatus('active', 1000, 0);
    let published = 0;
    for (const campaign of active) {
      if (await this.publishCampaign(campaign.alias)) published += 1;
    }
    return { total: active.length, published };
  }
}
