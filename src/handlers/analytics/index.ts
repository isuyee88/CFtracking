/**
 * @fileoverview Analytics Engine 连接管理
 * @description 统一管理 Analytics Engine 连接和事件写入
 * @module handlers/analytics/index
 */

import type { Env } from '@/config/env';
import type { ClickData, ConversionData } from '@/types/tracking';
import { extractNumericId } from '@/utils/crypto';

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
   *
   * 数据模型 (Analytics Engine 限制: blobs≤20, doubles≤20, indexes≤1):
   * - indexes[0]: campaignId (用于索引查询)
   * - blobs: ip, country, city, device, browser, os, subId1-5, utmSource, utmMedium, utmCampaign, referer
   * - doubles: clickId, flowId, landingPageId, offerId, visitorId, cost, riskScore, cfBotScore
   */
  trackClick(data: ClickData): void {
    try {
      const blobs = [
        data.campaignId,
        data.ip,
        data.country || '',
        data.city || '',
        data.device || '',
        data.browser || '',
        data.os || '',
        data.subId1 || '',
        data.subId2 || '',
        data.subId3 || '',
        data.subId4 || '',
        data.subId5 || '',
        data.utmSource || '',
        data.utmMedium || '',
        data.utmCampaign || '',
        data.referer || '',
      ];

      const doubles = [
        extractNumericId(data.clickId),
        data.flowId ? extractNumericId(data.flowId) : 0,
        data.landingPageId ? extractNumericId(data.landingPageId) : 0,
        data.offerId ? extractNumericId(data.offerId) : 0,
        extractNumericId(data.visitorId),
        data.cost || 0,
        data.riskScore || 0,
        data.cfBotScore || 0,
      ];

      console.log('[AnalyticsService] Writing click:', {
        campaignId: data.campaignId,
        blobCount: blobs.length,
        doubleCount: doubles.length,
      });

      this.client.writeDataPoint({
        blobs,
        doubles,
        indexes: [data.campaignId],
      });

      console.log('[AnalyticsService] Click written successfully');
    } catch (error) {
      console.error('[AnalyticsService] Error tracking click to Analytics Engine:', error);
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
