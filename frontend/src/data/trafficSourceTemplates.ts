/**
 * File: trafficSourceTemplates.ts
 * Purpose: 预定义流量源模板数据，参考 Keitaro 的模板系统
 * Input/Output: 提供常见流量源的默认参数配置
 * Logic: 包含 Facebook、Google、Taboola 等主流平台的参数模板
 */

import type { TrafficSourceTemplate } from '../types/trafficSource';

export const TRAFFIC_SOURCE_TEMPLATES: TrafficSourceTemplate[] = [
  {
    id: 'facebook',
    name: 'Facebook Ads',
    domain: 'facebook.com',
    type: 'social',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{{campaign.name}}' },
      { alias: 'AdSet', paramName: 'utm_adset', macro: '{{adset.name}}' },
      { alias: 'Ad', paramName: 'utm_ad', macro: '{{ad.name}}' },
      { alias: 'Placement', paramName: 'utm_placement', macro: '{{placement}}' },
      { alias: 'SiteSource', paramName: 'utm_source', macro: '{{site_source_name}}' },
    ],
    postbackUrl: 'https://www.facebook.com/tr?ev=Purchase&cd[value]={{revenue}}&cd[currency]={{currency}}',
    postbackMacros: {
      revenue: '{{revenue}}',
      currency: '{{currency}}',
      clickId: '{{fbclid}}'
    }
  },
  {
    id: 'google',
    name: 'Google Ads',
    domain: 'google.com',
    type: 'search',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaignid}' },
      { alias: 'AdGroup', paramName: 'utm_adgroup', macro: '{adgroupid}' },
      { alias: 'Creative', paramName: 'utm_creative', macro: '{creative}' },
      { alias: 'Keyword', paramName: 'utm_keyword', macro: '{keyword}' },
      { alias: 'MatchType', paramName: 'utm_matchtype', macro: '{matchtype}' },
      { alias: 'Device', paramName: 'utm_device', macro: '{device}' },
      { alias: 'Network', paramName: 'utm_network', macro: '{network}' },
    ],
    postbackUrl: 'https://www.googleadservices.com/pagead/conversion/CONVERSION_ID/?value={{revenue}}&currency_code={{currency}}&label=LABEL&guid=ON&script=0',
    postbackMacros: {
      revenue: '{{revenue}}',
      currency: '{{currency}}',
      gclid: '{gclid}'
    }
  },
  {
    id: 'taboola',
    name: 'Taboola Native',
    domain: 'taboola.com',
    type: 'native',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Site', paramName: 'utm_site', macro: '{site_id}' },
      { alias: 'Placement', paramName: 'utm_placement', macro: '{placement}' },
      { alias: 'Creative', paramName: 'utm_creative', macro: '{creative_id}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{click_id}' },
    ],
    postbackUrl: 'https://trc.taboola.com/sg/trk/click?s={{click_id}}&r={{revenue}}&c={{currency}}',
    postbackMacros: {
      clickId: '{click_id}',
      revenue: '{{revenue}}',
      currency: '{{currency}}'
    }
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    domain: 'tiktok.com',
    type: 'social',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '__CAMPAIGN_ID__' },
      { alias: 'AdGroup', paramName: 'utm_adgroup', macro: '__AID__' },
      { alias: 'Creative', paramName: 'utm_creative', macro: '__CID__' },
      { alias: 'Placement', paramName: 'utm_placement', macro: '__PLACEMENT__' },
      { alias: 'TTCID', paramName: 'ttclid', macro: '__TTCLID__' },
    ],
    postbackUrl: 'https://analytics.tiktok.com/api/v1/track?event=CompletePayment&value={{revenue}}&currency={{currency}}',
    postbackMacros: {
      revenue: '{{revenue}}',
      currency: '{{currency}}',
      ttclid: '__TTCLID__'
    }
  },
  {
    id: 'propellerads',
    name: 'PropellerAds',
    domain: 'propellerads.com',
    type: 'push',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Zone', paramName: 'utm_zone', macro: '{zone_id}' },
      { alias: 'Banner', paramName: 'utm_banner', macro: '{banner_id}' },
      { alias: 'Device', paramName: 'utm_device', macro: '{device}' },
      { alias: 'OS', paramName: 'utm_os', macro: '{os}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{click_id}' },
    ],
    postbackUrl: 'https://ad.propellerads.com/conversion?click_id={{click_id}}&payout={{revenue}}&currency={{currency}}',
    postbackMacros: {
      clickId: '{click_id}',
      revenue: '{{revenue}}',
      currency: '{{currency}}'
    }
  },
  {
    id: 'zeropark',
    name: 'Zeropark',
    domain: 'zeropark.com',
    type: 'push',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Target', paramName: 'utm_target', macro: '{target}' },
      { alias: 'Source', paramName: 'utm_source', macro: '{source}' },
      { alias: 'Keyword', paramName: 'utm_keyword', macro: '{keyword}' },
      { alias: 'Match', paramName: 'utm_match', macro: '{match}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{external_id}' },
    ],
    postbackUrl: 'https://postback.zeropark.com/postback?external_id={{click_id}}&payout={{revenue}}&currency={{currency}}',
    postbackMacros: {
      clickId: '{external_id}',
      revenue: '{{revenue}}',
      currency: '{{currency}}'
    }
  },
  {
    id: 'mgid',
    name: 'MGID',
    domain: 'mgid.com',
    type: 'native',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Widget', paramName: 'utm_widget', macro: '{widget_id}' },
      { alias: 'Teaser', paramName: 'utm_teaser', macro: '{teaser_id}' },
      { alias: 'Geo', paramName: 'utm_geo', macro: '{geo}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{click_id}' },
    ],
    postbackUrl: 'https://mgid.com/conversion?click_id={{click_id}}&payout={{revenue}}&currency={{currency}}',
    postbackMacros: {
      clickId: '{click_id}',
      revenue: '{{revenue}}',
      currency: '{{currency}}'
    }
  },
  {
    id: 'outbrain',
    name: 'Outbrain',
    domain: 'outbrain.com',
    type: 'native',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Section', paramName: 'utm_section', macro: '{section_id}' },
      { alias: 'Creative', paramName: 'utm_creative', macro: '{creative_id}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{ob_click_id}' },
    ],
    postbackUrl: 'https://tr.outbrain.com/conversion?ob_click_id={{click_id}}&value={{revenue}}&currency={{currency}}',
    postbackMacros: {
      clickId: '{ob_click_id}',
      revenue: '{{revenue}}',
      currency: '{{currency}}'
    }
  },
  {
    id: 'revcontent',
    name: 'RevContent',
    domain: 'revcontent.com',
    type: 'native',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Widget', paramName: 'utm_widget', macro: '{widget_id}' },
      { alias: 'Target', paramName: 'utm_target', macro: '{target_id}' },
      { alias: 'Content', paramName: 'utm_content', macro: '{content_id}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{rc_click_id}' },
    ],
    postbackUrl: 'https://revcontent.com/conversion?rc_click_id={{click_id}}&amount={{revenue}}',
    postbackMacros: {
      clickId: '{rc_click_id}',
      revenue: '{{revenue}}'
    }
  },
  {
    id: 'exoclick',
    name: 'ExoClick',
    domain: 'exoclick.com',
    type: 'display',
    parameters: [
      { alias: 'Campaign', paramName: 'utm_campaign', macro: '{campaign_id}' },
      { alias: 'Zone', paramName: 'utm_zone', macro: '{zone_id}' },
      { alias: 'Category', paramName: 'utm_category', macro: '{category_id}' },
      { alias: 'Site', paramName: 'utm_site', macro: '{site_id}' },
      { alias: 'ClickID', paramName: 'click_id', macro: '{conversions_tracking}' },
    ],
    postbackUrl: 'https://syndication.exoclick.com/conversion?tracking_id={{click_id}}&amount={{revenue}}',
    postbackMacros: {
      clickId: '{conversions_tracking}',
      revenue: '{{revenue}}'
    }
  }
];

/**
 * 根据模板ID获取模板
 */
export function getTemplateById(id: string): TrafficSourceTemplate | undefined {
  return TRAFFIC_SOURCE_TEMPLATES.find(t => t.id === id);
}

/**
 * 根据域名查找匹配的模板
 */
export function findTemplateByDomain(domain: string): TrafficSourceTemplate | undefined {
  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return TRAFFIC_SOURCE_TEMPLATES.find(t => 
    normalizedDomain.includes(t.domain) || t.domain.includes(normalizedDomain)
  );
}

/**
 * 获取所有模板选项（用于下拉选择）
 */
export function getTemplateOptions(): { value: string; label: string; type: string }[] {
  return [
    { value: '', label: 'Custom (No Template)', type: 'other' },
    ...TRAFFIC_SOURCE_TEMPLATES.map(t => ({
      value: t.id,
      label: t.name,
      type: t.type
    }))
  ];
}
