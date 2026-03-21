/**
 * @fileoverview Analytics Engine 连接管理
 * @description 统一管理 Analytics Engine 连接和事件写入
 * @module handlers/analytics/index
 */

import type { Env } from '@/config/env';
import type { ClickData, ConversionData } from '@/types/tracking';

export type AnalyticsClient = AnalyticsEngineDataset;

export interface AnalyticsEvent {
  dataset: string;
  blobs: string[];
  doubles: number[];
  indexes: string[];
}

export function getAnalyticsClient(env: Env): AnalyticsClient {
  return env.ANALYTICS;
}

export class AnalyticsService {
  private client: AnalyticsClient;

  constructor(client: AnalyticsClient) {
    this.client = client;
  }

  /**
   * 写入点击事件
   */
  trackClick(data: ClickData): void {
    try {
      this.client.writeDataPoint({
        blobs: [
          data.clickId,
          data.campaignId,
          data.flowId || '',
          data.landingPageId || '',
          data.offerId || '',
          data.ip,
          data.userAgent,
          data.referer || '',
          data.country || '',
          data.city || '',
          data.device || '',
          data.browser || '',
          data.os || '',
          data.visitorId,
          data.subId1 || '',
          data.subId2 || '',
          data.subId3 || '',
          data.subId4 || '',
          data.subId5 || '',
          data.utmSource || '',
          data.utmMedium || '',
          data.utmCampaign || '',
          data.timestamp,
        ],
        doubles: [
          data.cost || 0,
          data.riskScore || 0,
          data.cfBotScore || 0,
        ],
        indexes: [
          data.campaignId, // 主要索引用于按活动查询
          data.flowId || '', // 辅助索引用于按流量查询
          data.country || '', // 辅助索引用于按国家查询
        ],
      });
    } catch (error) {
      console.error('Error tracking click to Analytics Engine:', error);
    }
  }

  /**
   * 写入转化事件
   */
  trackConversion(data: ConversionData): void {
    try {
      this.client.writeDataPoint({
        blobs: [
          data.conversionId,
          data.clickId,
          data.campaignId,
          data.offerId,
          data.conversionType,
          data.offerName || '',
          data.currency,
          data.timestamp,
        ],
        doubles: [data.revenue, data.payout],
        indexes: [data.campaignId], // 只使用一个索引
      });
    } catch (error) {
      console.error('Error tracking conversion to Analytics Engine:', error);
    }
  }

  /**
   * 写入自定义事件
   */
  trackEvent(event: AnalyticsEvent): void {
    try {
      // 确保只使用一个索引，并且转换为正确的类型
      const indexes = event.indexes.length > 0 ? [event.indexes[0] || ''] : [];
      this.client.writeDataPoint({
        blobs: event.blobs,
        doubles: event.doubles,
        indexes: indexes as (string | ArrayBuffer | null)[],
      });
    } catch (error) {
      console.error('Error tracking custom event to Analytics Engine:', error);
    }
  }
}

export function createAnalyticsService(env: Env): AnalyticsService {
  return new AnalyticsService(getAnalyticsClient(env));
}
