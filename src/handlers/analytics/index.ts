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
      ],
      doubles: [data.cost],
      indexes: [data.campaignId, data.timestamp],
    });
  }

  /**
   * 写入转化事件
   */
  trackConversion(data: ConversionData): void {
    this.client.writeDataPoint({
      blobs: [
        data.conversionId,
        data.clickId,
        data.campaignId,
        data.offerId,
        data.conversionType,
        data.offerName || '',
        data.currency,
      ],
      doubles: [data.revenue, data.payout],
      indexes: [data.campaignId, data.offerId, data.timestamp],
    });
  }

  /**
   * 写入自定义事件
   */
  trackEvent(event: AnalyticsEvent): void {
    this.client.writeDataPoint({
      blobs: event.blobs,
      doubles: event.doubles,
      indexes: event.indexes,
    });
  }
}

export function createAnalyticsService(env: Env): AnalyticsService {
  return new AnalyticsService(getAnalyticsClient(env));
}
