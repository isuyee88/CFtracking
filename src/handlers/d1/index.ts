/**
 * @fileoverview D1 数据库连接管理
 * @description 统一管理 D1 数据库连接，导出所有 Repository
 * @module handlers/d1/index
 */

import type { Env } from '@/config/env';
import { CampaignRepository } from './campaign.repo';
import { FlowRepository } from './flow.repo';
import { LandingPageRepository } from './landingPage.repo';
import { OfferRepository } from './offer.repo';
import { RuleRepository } from './rule.repo';
import { TrafficRepository } from './traffic.repo';
import { ClickRepository } from './click.repo';
import { ConversionRepository } from './conversion.repo';
import { BlacklistRepository } from './blacklist.repo';
import { WhitelistRepository } from './whitelist.repo';
import { DomainRepository } from './domain.repo';
import { MultiOfferRepository } from './multi-offer.repo';

export type { D1Database } from '@cloudflare/workers-types';

export interface D1Repositories {
  campaign: CampaignRepository;
  flow: FlowRepository;
  landingPage: LandingPageRepository;
  offer: OfferRepository;
  rule: RuleRepository;
  traffic: TrafficRepository;
  click: ClickRepository;
  conversion: ConversionRepository;
  blacklist: BlacklistRepository;
  whitelist: WhitelistRepository;
  domain: DomainRepository;
  multiOffer: MultiOfferRepository;
}

export function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export function createRepositories(db: D1Database): D1Repositories {
  return {
    campaign: new CampaignRepository(db),
    flow: new FlowRepository(db),
    landingPage: new LandingPageRepository(db),
    offer: new OfferRepository(db),
    rule: new RuleRepository(db),
    traffic: new TrafficRepository(db),
    click: new ClickRepository(db),
    conversion: new ConversionRepository(db),
    blacklist: new BlacklistRepository(db),
    whitelist: new WhitelistRepository(db),
    domain: new DomainRepository(db),
    multiOffer: new MultiOfferRepository(db),
  };
}

export { CampaignRepository } from './campaign.repo';
export { FlowRepository } from './flow.repo';
export { LandingPageRepository } from './landingPage.repo';
export { OfferRepository } from './offer.repo';
export { RuleRepository } from './rule.repo';
export { TrafficRepository } from './traffic.repo';
export { ClickRepository } from './click.repo';
export { ConversionRepository } from './conversion.repo';
export { BlacklistRepository } from './blacklist.repo';
export { WhitelistRepository } from './whitelist.repo';
export { DomainRepository } from './domain.repo';
export { MultiOfferRepository } from './multi-offer.repo';

