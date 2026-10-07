import type { Campaign, Flow, Offer, LandingPage, TrafficSource } from '../src/types';

export const seedData = {
  campaigns: [
    {
      id: 'test-campaign-1',
      displayId: 'TC001',
      name: '测试推广活动-电子商品',
      alias: 'test-electronics',
      domain: 'https://example.com',
      group: '电商',
      trafficSource: 'test-ts-1',
      flowRotation: 'weight' as const,
      costModel: 'cpc' as const,
      costValue: 0.5,
      currency: 'USD',
      trafficLoss: 5,
      uniquenessMethod: 'ip_ua' as const,
      uniquenessParameter: null,
      uniquenessTTL: 86400,
      visitorBinding: 'cookie' as const,
      apiToken: null,
      parameters: {},
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'test-campaign-2',
      displayId: 'TC002',
      name: '测试推广活动-APP下载',
      alias: 'test-app-download',
      domain: 'https://app.example.com',
      group: '移动应用',
      trafficSource: 'test-ts-2',
      flowRotation: 'position' as const,
      costModel: 'cpa' as const,
      costValue: 2.0,
      currency: 'USD',
      trafficLoss: 3,
      uniquenessMethod: 'ip' as const,
      uniquenessParameter: null,
      uniquenessTTL: 172800,
      visitorBinding: 'ip' as const,
      apiToken: 'test-token-12345',
      parameters: { deep_link: true },
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Campaign[],

  flows: [
    {
      id: 'test-flow-1',
      displayId: 'TF001',
      campaignId: 'test-campaign-1',
      name: '主流量流-美国',
      type: 'regular' as const,
      weight: 70,
      status: 'active' as const,
      filters: [
        { field: 'country', operator: 'equals', value: 'US' },
        { field: 'device', operator: 'equals', value: 'desktop' },
      ],
      actionType: 'redirect' as const,
      actionConfig: { redirectUrl: 'https://offer.com/us', statusCode: 302 },
      limit: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'test-flow-2',
      displayId: 'TF002',
      campaignId: 'test-campaign-1',
      name: '备用流量流',
      type: 'default' as const,
      weight: 30,
      status: 'active' as const,
      filters: [],
      actionType: 'show_offer' as const,
      actionConfig: { offerId: 'test-offer-1' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Flow[],

  offers: [
    {
      id: 'test-offer-1',
      displayId: 'TO001',
      name: '测试Offer-电子产品',
      url: 'https://affiliate.com/offer123',
      payout: 15.5,
      currency: 'USD',
      payoutType: 'cpa' as const,
      redirectType: 'http' as const,
      actionType: 'redirect' as const,
      countries: ['US', 'CA', 'GB'],
      network: 'ClickBank',
      group: '电商',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'test-offer-2',
      displayId: 'TO002',
      name: '测试Offer-移动应用',
      url: 'https://appstore.com/app456',
      payout: 3.0,
      currency: 'USD',
      payoutType: 'fixed' as const,
      redirectType: 'js_blank' as const,
      actionType: 'redirect' as const,
      countries: ['US', 'CN', 'JP'],
      network: 'PropellerAds',
      group: '应用',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Offer[],

  landingPages: [
    {
      id: 'test-lp-1',
      displayId: 'TLP001',
      name: '测试落地页-产品介绍',
      url: 'https://landing.example.com/product',
      campaignId: 'test-campaign-1',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as LandingPage,

    {
      id: 'test-lp-2',
      displayId: 'TLP002',
      name: '测试落地页-下载页',
      url: 'https://landing.example.com/download',
      campaignId: 'test-campaign-2',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as LandingPage,
  ],

  trafficSources: [
    {
      id: 'test-ts-1',
      displayId: 'TTS001',
      name: 'Google Ads',
      alias: 'google-ads',
      type: 'search_ppc' as const,
      postbackUrl: 'https://api.example.com/postback',
      parameters: { click_id: '{clickid}', source: 'google' },
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as TrafficSource,

    {
      id: 'test-ts-2',
      displayId: 'TTS002',
      name: 'Facebook Ads',
      alias: 'facebook-ads',
      type: 'social' as const,
      postbackUrl: 'https://api.example.com/fb-postback',
      parameters: { fbclid: '{fbclid}', source: 'facebook' },
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as TrafficSource,
  ],
};

export async function seedTestData(db: D1Database): Promise<void> {
  console.log('🌱 开始播种测试数据...');

  for (const campaign of seedData.campaigns) {
    await db
      .prepare(
        `INSERT OR REPLACE INTO campaigns (id, display_id, name, alias, domain, \`group\`, traffic_source, 
         flow_rotation, cost_model, cost_value, currency, traffic_loss, uniqueness_method, 
         uniqueness_parameter, uniqueness_ttl, visitor_binding, api_token, parameters, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        campaign.id,
        campaign.displayId,
        campaign.name,
        campaign.alias,
        campaign.domain,
        campaign.group,
        campaign.trafficSource,
        campaign.flowRotation,
        campaign.costModel,
        campaign.costValue,
        campaign.currency,
        campaign.trafficLoss,
        campaign.uniquenessMethod,
        campaign.uniquenessParameter,
        campaign.uniquenessTTL,
        campaign.visitorBinding,
        campaign.apiToken,
        JSON.stringify(campaign.parameters),
        campaign.status,
        campaign.createdAt,
        campaign.updatedAt
      )
      .run();
  }

  for (const flow of seedData.flows) {
    await db
      .prepare(
        `INSERT OR REPLACE INTO flows (id, display_id, campaign_id, name, type, weight, status, 
         filters, action_type, action_config, limit_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        flow.id,
        flow.displayId,
        flow.campaignId,
        flow.name,
        flow.type,
        flow.weight,
        flow.status,
        JSON.stringify(flow.filters),
        flow.actionType,
        JSON.stringify(flow.actionConfig),
        flow.limit || 0,
        flow.createdAt,
        flow.updatedAt
      )
      .run();
  }

  for (const offer of seedData.offers) {
    await db
      .prepare(
        `INSERT OR REPLACE INTO offers (id, display_id, name, url, payout, currency, payout_type, 
         redirect_type, action_type, countries, network, \`group\`, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        offer.id,
        offer.displayId,
        offer.name,
        offer.url,
        offer.payout,
        offer.currency,
        offer.payoutType,
        offer.redirectType,
        offer.actionType,
        JSON.stringify(offer.countries),
        offer.network,
        offer.group,
        offer.status,
        offer.createdAt,
        offer.updatedAt
      )
      .run();
  }

  console.log('✅ 测试数据播种完成');
}

export async function clearTestData(db: D1Database): Promise<void> {
  console.log('🧹 清理测试数据...');

  await db.prepare("DELETE FROM campaigns WHERE id LIKE 'test-%'").run();
  await db.prepare("DELETE FROM flows WHERE id LIKE 'test-%'").run();
  await db.prepare("DELETE FROM offers WHERE id LIKE 'test-%'").run();

  console.log('✅ 测试数据清理完成');
}
