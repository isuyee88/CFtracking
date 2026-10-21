/**
 * @fileoverview Publish immutable click configuration snapshots.
 *
 * Control-plane writes are followed by a snapshot publish; the click path then
 * reads only KV/Cache. This intentionally runs outside the click request path.
 */

import type { Env } from '@/config/env';
import { getD1Connection } from '@/handlers/d1';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { FlowRepository } from '@/handlers/d1/flow.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';

const KEY_PREFIX = 'clickcfg:';

export interface ClickConfigSnapshot {
  campaignId: string;
  flowId: string | null;
  offerId: string | null;
  offerUrl: string;
  landingPageId: string | null;
  status: 'active' | 'paused' | 'archived';
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

  async publishCampaign(aliasOrId: string): Promise<ClickConfigSnapshot | null> {
    const actualAlias = String(aliasOrId || '').trim();
    if (!actualAlias) return null;
    const campaign = await this.campaignRepo.findByAlias(actualAlias)
      || await this.campaignRepo.findById(actualAlias);
    if (!campaign) return null;

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
      await this.env.UNIQUENESS_KV.put(`${KEY_PREFIX}${campaign.alias}`, JSON.stringify(snapshot));
      return snapshot;
    }
    return null;
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
