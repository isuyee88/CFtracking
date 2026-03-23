/**
 * File: affiliateNetworkTemplates.ts
 * Purpose: 预定义联盟网络模板数据，参考 Keitaro 的模板系统
 * Input/Output: 提供常见联盟网络的默认参数配置和 Postback 模板
 * Logic: 包含 AdCombo、Dr.Cash、Leadbit 等主流联盟的参数模板
 */

export interface AffiliateNetworkOfferParameter {
  name: string;
  value: string;
  description?: string;
}

export interface AffiliateNetworkTemplate {
  id: string;
  name: string;
  domain?: string;
  type: string;
  parameters: AffiliateNetworkOfferParameter[];
  postbackUrl?: string;
  postbackMacros?: {
    clickId?: string;
    revenue?: string;
    currency?: string;
    status?: string;
  };
}

export const AFFILIATE_NETWORK_TEMPLATES: AffiliateNetworkTemplate[] = [
  {
    id: 'adcombo',
    name: 'AdCombo',
    domain: 'adcombo.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Source', value: 'sub2={{source}}', description: 'Traffic source' },
      { name: 'Country', value: 'sub3={{country}}', description: 'Visitor country' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?click_id={{subid}}&status={status}&payout={{payout}}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}',
      revenue: '{{payout}}'
    }
  },
  {
    id: 'drcash',
    name: 'Dr.Cash',
    domain: 'drcash.me',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'click_id={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Source', value: 'sub1={{source}}', description: 'Traffic source' },
      { name: 'Country', value: 'sub2={{country}}', description: 'Visitor country' },
      { name: 'Device', value: 'sub3={{device}}', description: 'Device type' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?click_id={{subid}}&status={status}&amount={{payout}}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}',
      revenue: '{{payout}}'
    }
  },
  {
    id: 'leadalb',
    name: 'Leadbit',
    domain: 'leadbit.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Campaign', value: 'sub2={{campaign}}', description: 'Campaign name' },
      { name: 'Country', value: 'sub3={{country}}', description: 'Visitor country' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}&trans_id={transaction_id}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}'
    }
  },
  {
    id: 'm4leads',
    name: 'M4Leads',
    domain: 'm4leads.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Country', value: 'country={{country}}', description: 'Visitor country' },
      { name: 'Offer ID', value: 'offer_id={{offer_id}}', description: 'Offer identifier' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}'
    }
  },
  {
    id: 'partners1xbet',
    name: 'Partners1xBet',
    domain: '1xbet.partners',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'click_id={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Country', value: 'country={{country}}', description: 'Visitor country' },
      { name: 'Language', value: 'lang={{language}}', description: 'Visitor language' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?click_id={{subid}}&action={action}&amount={{payout}}',
    postbackMacros: {
      clickId: '{{subid}}',
      revenue: '{{payout}}'
    }
  },
  {
    id: 'trafficlight',
    name: 'Traffic Light',
    domain: 'traffic-light.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Campaign', value: 'campaign_id={{campaign_id}}', description: 'Campaign ID' },
      { name: 'Country', value: 'geo={{country}}', description: 'Visitor country' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}'
    }
  },
  {
    id: 'melbetaffiliates',
    name: 'Melbetaffiliates',
    domain: 'melbetaffiliates.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required)' },
      { name: 'Country', value: 'sub2={{country}}', description: 'Visitor country' },
      { name: 'Device', value: 'sub3={{device}}', description: 'Device type' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}'
    }
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    domain: 'clickbank.com',
    type: 'cpa',
    parameters: [
      { name: 'Click ID', value: 'cb_click_id={{subid}}', description: 'Keitaro Click ID' },
      { name: 'Campaign', value: 'cbraid={{cbraid}}', description: 'ClickBank Campaign ID' },
      { name: 'Product', value: 'cbprod={{offer_id}}', description: 'ClickBank Product ID' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?cb_click_id={{subid}}&sale_amount={{payout}}',
    postbackMacros: {
      clickId: '{{subid}}',
      revenue: '{{payout}}'
    }
  },
  {
    id: 'custom',
    name: 'Custom / Other',
    domain: '',
    type: 'custom',
    parameters: [
      { name: 'Click ID', value: 'subid={{subid}}', description: 'Keitaro Click ID (required for postback)' },
    ],
    postbackUrl: 'https://your-tracking-domain.com/postback?subid={{subid}}&status={status}&payout={{payout}}',
    postbackMacros: {
      clickId: '{{subid}}',
      status: '{status}',
      revenue: '{{payout}}'
    }
  }
];

/**
 * 根据模板ID获取模板
 */
export function getAffiliateTemplateById(id: string): AffiliateNetworkTemplate | undefined {
  return AFFILIATE_NETWORK_TEMPLATES.find(t => t.id === id);
}

/**
 * 根据域名查找匹配的模板
 */
export function findAffiliateTemplateByDomain(domain: string): AffiliateNetworkTemplate | undefined {
  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return AFFILIATE_NETWORK_TEMPLATES.find(t =>
    t.domain && (normalizedDomain.includes(t.domain) || t.domain.includes(normalizedDomain))
  );
}

/**
 * 获取所有模板选项（用于下拉选择）
 */
export function getAffiliateTemplateOptions(): { value: string; label: string; type: string }[] {
  return [
    { value: 'custom', label: 'Custom / Other', type: 'custom' },
    ...AFFILIATE_NETWORK_TEMPLATES.filter(t => t.id !== 'custom').map(t => ({
      value: t.id,
      label: t.name,
      type: t.type
    }))
  ];
}
