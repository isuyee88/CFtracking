import type { Env } from '@/config/env';
import { getD1Connection } from '@/handlers/d1';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { RuleRepository } from '@/handlers/d1/rule.repo';
import { FlowLogService } from '@/services/flow/flow.log.service';
import { createDashboardQueryService } from '@/services/analytics/dashboard-query.service';
import { AffiliateNetworkService } from '@/services/affiliateNetwork/affiliateNetwork.service';
import { BlacklistService } from '@/services/blacklist/blacklist.service';
import { CampaignService } from '@/services/campaign/campaign.service';
import { CacheKeyBuilder } from '@/services/cache/unified-cache-manager';
import { DomainService } from '@/services/domain/domain.service';
import { FlowService } from '@/services/flow/flow.service';
import { LandingPageService } from '@/services/landingPage/lp.service';
import { OfferService } from '@/services/offer/offer.service';
import { PlatformManager } from '@/services/platform/manager';
import { TrafficSourceService } from '@/services/trafficSource/trafficSource.service';
import { createTrackingScriptService } from '@/services/tracking/tracking-script.service';
import { createTrendsService } from '@/services/trends/trends.service';
import { WhitelistService } from '@/services/whitelist/whitelist.service';
import type { UserPreferenceData } from '@/handlers/do/user-preference.do';
import { getWorkerVersionInfo, type WorkerVersionInfo } from '@/services/cache/version-utils';

export type AdminPageKey =
  | 'campaigns'
  | 'campaign-detail'
  | 'landings'
  | 'offers'
  | 'traffic-sources'
  | 'affiliate-networks'
  | 'domains'
  | 'platforms'
  | 'rules'
  | 'trends'
  | 'audit'
  | 'conversions'
  | 'reports'
  | 'settings'
  | 'help'
  | 'blacklist'
  | 'whitelist'
  | 'target';

export interface AdminPageMatch {
  page: AdminPageKey;
  params: Record<string, string>;
}

export interface AdminPageBundle {
  page: AdminPageKey;
  scope: Record<string, unknown>;
  data: Record<string, unknown>;
  generatedAt: string;
  version: WorkerVersionInfo;
}

const SETTINGS_USER_ID = 'default-user';

function toDateOnly(value: Date) {
  return value.toISOString().split('T')[0]!;
}

function getRecentDateRange(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
  };
}

export function normalizeAdminPagePath(pathname: string) {
  if (pathname === '/l') {
    return '/landings';
  }

  return pathname;
}

export function matchAdminPage(url: URL): AdminPageMatch | null {
  const pathname = normalizeAdminPagePath(url.pathname);

  const staticPages: Record<string, AdminPageKey> = {
    '/campaigns': 'campaigns',
    '/landings': 'landings',
    '/offers': 'offers',
    '/traffic-sources': 'traffic-sources',
    '/affiliate-networks': 'affiliate-networks',
    '/domains': 'domains',
    '/platforms': 'platforms',
    '/rules': 'rules',
    '/trends': 'trends',
    '/audit': 'audit',
    '/conversions': 'conversions',
    '/reports': 'reports',
    '/settings': 'settings',
    '/help': 'help',
    '/blacklist': 'blacklist',
    '/whitelist': 'whitelist',
    '/target': 'target',
  };

  if (pathname in staticPages) {
    return {
      page: staticPages[pathname]!,
      params: {},
    };
  }

  const campaignDetailMatch = pathname.match(/^\/campaigns\/([^/]+)$/);
  if (campaignDetailMatch) {
    return {
      page: 'campaign-detail',
      params: {
        id: campaignDetailMatch[1]!,
      },
    };
  }

  return null;
}

export function buildAdminPageCacheKey(
  url: URL,
  match: AdminPageMatch,
  workerVersion = 'unversioned'
): string {
  const params = Array.from(url.searchParams.entries())
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    })
    .reduce<Record<string, string>>((result, [key, value]) => {
      result[key] = value;
      return result;
    }, {});

  return CacheKeyBuilder.pageBundle(match.page, 'full', {
    workerVersion,
    pathname: normalizeAdminPagePath(url.pathname),
    params: match.params,
    search: params,
  });
}

async function buildCampaignsBundle(env: Env, url: URL): Promise<AdminPageBundle> {
  const campaignService = new CampaignService(env);
  const analytics = createDashboardQueryService(env);
  const trafficSourceService = new TrafficSourceService(env);
  const landingPageService = new LandingPageService(env);
  const offerService = new OfferService(env);
  const version = getWorkerVersionInfo(env);
  const range = url.searchParams.get('range') || 'today';
  const [campaigns, entityStats, trafficSources, landings, offers] = await Promise.all([
    campaignService.getList({ page: 1, pageSize: 200 }),
    analytics.getEntityStats('campaigns', range).catch(() => []),
    trafficSourceService.getListWithStats(1, 200).then((result) => result.list).catch(() => []),
    landingPageService.getListWithStats(1, 200).then((result) => result.list).catch(() => []),
    offerService.getListWithStats(1, 200).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'campaigns',
    scope: { range },
    data: {
      campaigns: campaigns.list,
      entityStats,
      trafficSources,
      landings,
      offers,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildCampaignDetailBundle(env: Env, id: string, url: URL): Promise<AdminPageBundle> {
  const version = getWorkerVersionInfo(env);
  const campaignService = new CampaignService(env);
  const flowService = new FlowService(env);
  const flowLogService = new FlowLogService(env);
  const trafficSourceService = new TrafficSourceService(env);
  const landingPageService = new LandingPageService(env);
  const offerService = new OfferService(env);
  const trackingScriptService = createTrackingScriptService(env);
  const trendsService = createTrendsService(env);
  const db = getD1Connection(env);
  const conversionRepo = new ConversionRepository(db);

  const defaultRange = getRecentDateRange(7);
  const startDate = url.searchParams.get('startDate') || defaultRange.startDate;
  const endDate = url.searchParams.get('endDate') || defaultRange.endDate;
  const interval = (url.searchParams.get('interval') as 'hour' | 'day' | 'week' | 'month') || 'day';

  const [campaign, flows, trafficSources, landings, offers, stats, trends, conversions, flowStats] = await Promise.all([
    campaignService.getById(id),
    flowService.getByCampaignId(id).catch(() => []),
    trafficSourceService.getList(1, 200).then((result) => result.list).catch(() => []),
    landingPageService.getList(1, 200).then((result) => result.list).catch(() => []),
    offerService.getList(1, 200).then((result) => result.list).catch(() => []),
    campaignService.getStats(id, startDate, endDate).catch(() => null),
    trendsService
      .generateReport({
        startDate,
        endDate,
        campaignId: id,
        interval,
      })
      .catch(() => null),
    conversionRepo
      .findConversions({
        page: 1,
        pageSize: 6,
        campaignId: id,
        startDate,
        endDate,
      })
      .catch(() => ({ list: [], total: 0, page: 1, pageSize: 6 })),
    flowService.getCampaignFlowStats(id, { startDate, endDate }).catch(() => []),
  ]);

  const domain = campaign.domain || url.host;
  const trackingConfig = {
    campaignId: campaign.displayId || campaign.id,
    domain,
  };

  const flowSchemasById = Object.fromEntries(
    await Promise.all(
      flows.map(async (flow) => {
        const flowId = String(flow.id);
        const schema = await flowService.getFlowSchema(flowId).catch(() => null);
        return [flowId, schema] as const;
      })
    )
  );

  const flowRulesById = Object.fromEntries(
    Object.entries(flowSchemasById).map(([flowId, schema]) => [flowId, schema?.rules || []])
  );

  const flowLogsById = Object.fromEntries(
    await Promise.all(
      flows.map(async (flow) => {
        const flowId = String(flow.id);
        const logs = await flowLogService
          .query({
            flowId,
            limit: 8,
          })
          .catch(() => ({ logs: [], total: 0, hasMore: false }));
        return [flowId, logs] as const;
      })
    )
  );

  return {
    page: 'campaign-detail',
    scope: {
      id,
      startDate,
      endDate,
      interval,
    },
    data: {
      campaign,
      flows,
      trafficSources,
      landings,
      offers,
      stats,
      flowStats,
      flowSchemasById,
      flowRulesById,
      flowLogsById,
      trends,
      conversions: conversions.list,
      trackingScript: {
        code: trackingScriptService.generateTrackingScript(trackingConfig),
      },
      kclientScript: {
        code: trackingScriptService.generateKClientJS(trackingConfig),
      },
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

function buildDefaultUserPreferenceDocument(): UserPreferenceData {
  return {
    version: '1.0',
    lastUpdated: 0,
    lastModifiedBy: 'system',
    preferences: {
      ui: {
        theme: 'auto',
        density: 'standard',
        fontSize: 'medium',
        sidebarCollapsed: false,
      },
      tables: {},
      views: {},
      system: {
        language: 'en',
        timezone: 'UTC',
        refreshInterval: 30000,
      },
    },
  };
}

async function readUserPreferenceDocument(env: Env, userId: string): Promise<UserPreferenceData> {
  try {
    const id = env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
    const stub = env.USER_PREFERENCE_DO.get(id);
    const response = await stub.fetch(
      new Request('https://do/preferences', {
        method: 'GET',
        headers: {
          'X-Device-ID': 'bootstrap',
        },
      })
    );

    if (!response.ok) {
      return buildDefaultUserPreferenceDocument();
    }

    const document = (await response.json()) as UserPreferenceData | null;
    return document ?? buildDefaultUserPreferenceDocument();
  } catch {
    return buildDefaultUserPreferenceDocument();
  }
}

async function buildLandingsBundle(env: Env): Promise<AdminPageBundle> {
  const landingPageService = new LandingPageService(env);
  const version = getWorkerVersionInfo(env);
  const landings = await landingPageService.getListWithStats(1, 200);

  return {
    page: 'landings',
    scope: {},
    data: {
      landings: landings.list,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildOffersBundle(env: Env): Promise<AdminPageBundle> {
  const offerService = new OfferService(env);
  const affiliateNetworkService = new AffiliateNetworkService(env);
  const version = getWorkerVersionInfo(env);
  const [offers, affiliateNetworks] = await Promise.all([
    offerService.getListWithStats(1, 200),
    affiliateNetworkService.getListWithStats(1, 200).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'offers',
    scope: {},
    data: {
      offers: offers.list,
      affiliateNetworks,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildTrafficSourcesBundle(env: Env): Promise<AdminPageBundle> {
  const trafficSourceService = new TrafficSourceService(env);
  const version = getWorkerVersionInfo(env);
  const trafficSources = await trafficSourceService.getListWithStats(1, 200);

  return {
    page: 'traffic-sources',
    scope: {},
    data: {
      trafficSources: trafficSources.list,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildAffiliateNetworksBundle(env: Env): Promise<AdminPageBundle> {
  const affiliateNetworkService = new AffiliateNetworkService(env);
  const version = getWorkerVersionInfo(env);
  const affiliateNetworks = await affiliateNetworkService.getListWithStats(1, 200);

  return {
    page: 'affiliate-networks',
    scope: {},
    data: {
      affiliateNetworks: affiliateNetworks.list,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildDomainsBundle(env: Env): Promise<AdminPageBundle> {
  const domainService = new DomainService(env);
  const campaignService = new CampaignService(env);
  const landingPageService = new LandingPageService(env);
  const version = getWorkerVersionInfo(env);
  const [domains, campaigns, landings] = await Promise.all([
    domainService.getListWithStats(1, 200),
    campaignService.getList({ page: 1, pageSize: 200 }).then((result) => result.list).catch(() => []),
    landingPageService.getList(1, 200).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'domains',
    scope: {},
    data: {
      domains: domains.list,
      campaigns,
      landings,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildPlatformsBundle(env: Env): Promise<AdminPageBundle> {
  const platformManager = PlatformManager.createDefault();
  const version = getWorkerVersionInfo(env);

  return {
    page: 'platforms',
    scope: {},
    data: {
      platforms: platformManager.getAvailablePlatforms(),
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildRulesBundle(env: Env, url: URL): Promise<AdminPageBundle> {
  const db = getD1Connection(env);
  const repo = new RuleRepository(db);
  const version = getWorkerVersionInfo(env);
  const type = url.searchParams.get('type') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const result = await repo.findList({
    page: 1,
    pageSize: 200,
    type,
    status,
  });

  return {
    page: 'rules',
    scope: {
      type: type || 'all',
      status: status || 'all',
    },
    data: {
      rules: result.list,
      meta: {
        page: 1,
        pageSize: 200,
        total: result.total,
      },
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildTrendsBundle(env: Env, url: URL): Promise<AdminPageBundle> {
  const trendsService = createTrendsService(env);
  const campaignService = new CampaignService(env);
  const version = getWorkerVersionInfo(env);
  const defaults = getRecentDateRange(7);
  const startDate = url.searchParams.get('startDate') || defaults.startDate;
  const endDate = url.searchParams.get('endDate') || defaults.endDate;
  const interval = (url.searchParams.get('interval') as 'hour' | 'day' | 'week' | 'month') || 'day';
  const campaignId = url.searchParams.get('campaignId') || undefined;

  const [report, campaigns] = await Promise.all([
    trendsService
      .generateReport({
        startDate,
        endDate,
        campaignId,
        interval,
      })
      .catch(() => null),
    campaignService.getList({ page: 1, pageSize: 200 }).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'trends',
    scope: {
      startDate,
      endDate,
      interval,
      campaignId: campaignId || '',
    },
    data: {
      report,
      campaigns,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildAuditBundle(env: Env, url: URL): Promise<AdminPageBundle> {
  const db = getD1Connection(env);
  const clickRepo = new ClickRepository(db);
  const version = getWorkerVersionInfo(env);
  const defaults = getRecentDateRange(7);
  const startDate = url.searchParams.get('startDate') || defaults.startDate;
  const endDate = url.searchParams.get('endDate') || defaults.endDate;
  const page = Number(url.searchParams.get('page') || '1') || 1;
  const pageSize = Number(url.searchParams.get('pageSize') || '20') || 20;
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || 'all';
  const isUnique = status === 'unique' ? true : status === 'nonunique' ? false : undefined;

  const [clicks, stats] = await Promise.all([
    clickRepo.findClicks({
      page,
      pageSize,
      search,
      startDate,
      endDate,
      isUnique,
    }),
    clickRepo.getClickStats(startDate, endDate).catch(() => ({
      totalClicks: 0,
      uniqueClicks: 0,
      countries: 0,
      deviceTypes: 0,
    })),
  ]);

  return {
    page: 'audit',
    scope: {
      page,
      pageSize,
      startDate,
      endDate,
      search: search || '',
      status,
    },
    data: {
      clicks: clicks.list,
      stats,
      pagination: {
        page: clicks.page,
        pageSize: clicks.pageSize,
        total: clicks.total,
        totalPages: Math.ceil(clicks.total / clicks.pageSize),
      },
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildConversionsBundle(env: Env, url: URL): Promise<AdminPageBundle> {
  const db = getD1Connection(env);
  const repo = new ConversionRepository(db);
  const version = getWorkerVersionInfo(env);
  const defaults = getRecentDateRange(7);
  const startDate = url.searchParams.get('startDate') || defaults.startDate;
  const endDate = url.searchParams.get('endDate') || defaults.endDate;
  const page = Number(url.searchParams.get('page') || '1') || 1;
  const pageSize = Number(url.searchParams.get('pageSize') || '20') || 20;
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const [conversions, stats] = await Promise.all([
    repo.findConversions({
      page,
      pageSize,
      search,
      startDate,
      endDate,
      status,
    }),
    repo.getConversionStats(startDate, endDate).catch(() => ({
      totalConversions: 0,
      approvedConversions: 0,
      pendingConversions: 0,
      rejectedConversions: 0,
      totalRevenue: 0,
      totalPayout: 0,
    })),
  ]);

  return {
    page: 'conversions',
    scope: {
      page,
      pageSize,
      startDate,
      endDate,
      search: search || '',
      status: status || 'all',
    },
    data: {
      conversions: conversions.list,
      stats,
      pagination: {
        page: conversions.page,
        pageSize: conversions.pageSize,
        total: conversions.total,
        totalPages: Math.ceil(conversions.total / conversions.pageSize),
      },
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildBlacklistBundle(env: Env): Promise<AdminPageBundle> {
  const blacklistService = new BlacklistService(env);
  const trafficSourceService = new TrafficSourceService(env);
  const version = getWorkerVersionInfo(env);
  const [entries, trafficSources] = await Promise.all([
    blacklistService.query({}).catch(() => []),
    trafficSourceService.getList(1, 200).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'blacklist',
    scope: {},
    data: {
      entries,
      trafficSources,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildWhitelistBundle(env: Env): Promise<AdminPageBundle> {
  const whitelistService = new WhitelistService(env);
  const trafficSourceService = new TrafficSourceService(env);
  const version = getWorkerVersionInfo(env);
  const [entries, trafficSources] = await Promise.all([
    whitelistService.query({}).catch(() => []),
    trafficSourceService.getList(1, 200).then((result) => result.list).catch(() => []),
  ]);

  return {
    page: 'whitelist',
    scope: {},
    data: {
      entries,
      trafficSources,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

async function buildSettingsBundle(env: Env): Promise<AdminPageBundle> {
  const version = getWorkerVersionInfo(env);
  const preferenceDocument = await readUserPreferenceDocument(env, SETTINGS_USER_ID);

  return {
    page: 'settings',
    scope: {
      userId: SETTINGS_USER_ID,
    },
    data: {
      preferenceDocument,
    },
    generatedAt: new Date().toISOString(),
    version,
  };
}

function buildStaticBundle(page: AdminPageKey, env: Env): AdminPageBundle {
  const version = getWorkerVersionInfo(env);
  return {
    page,
    scope: {},
    data: {},
    generatedAt: new Date().toISOString(),
    version,
  };
}

export async function buildAdminPageBundle(env: Env, url: URL, match: AdminPageMatch): Promise<AdminPageBundle> {
  switch (match.page) {
    case 'campaigns':
      return buildCampaignsBundle(env, url);
    case 'campaign-detail':
      return buildCampaignDetailBundle(env, match.params.id!, url);
    case 'landings':
      return buildLandingsBundle(env);
    case 'offers':
      return buildOffersBundle(env);
    case 'traffic-sources':
      return buildTrafficSourcesBundle(env);
    case 'affiliate-networks':
      return buildAffiliateNetworksBundle(env);
      case 'domains':
        return buildDomainsBundle(env);
      case 'platforms':
        return buildPlatformsBundle(env);
    case 'rules':
      return buildRulesBundle(env, url);
    case 'trends':
      return buildTrendsBundle(env, url);
    case 'audit':
      return buildAuditBundle(env, url);
    case 'conversions':
      return buildConversionsBundle(env, url);
    case 'settings':
      return buildSettingsBundle(env);
    case 'blacklist':
      return buildBlacklistBundle(env);
    case 'whitelist':
      return buildWhitelistBundle(env);
      case 'reports':
      case 'help':
      case 'target':
        return buildStaticBundle(match.page, env);
    }
  }
