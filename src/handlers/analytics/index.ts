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
   * 
   * indexes[0]: campaignId (用于索引查询，不需要在 blobs 中重复)
   * 
   * blobs[0-17]: ip, country, city, device, browser, os, subId1-5, utmSource, utmMedium, 
   *              utmCampaign, referer, userAgent, isp, fingerprint
   * 
   * doubles[0-10]: clickId, flowId, landingPageId, offerId, visitorId, cost, riskScore, 
   *                cfBotScore, connectionType, proxy, isBot
   * 
   * connectionType 编码: 0=未知, 4=4G, 5=5G, 6=WiFi
   * proxy 编码: 0=否, 1=是
   * isBot 编码: 0=否, 1=是
   */
  trackClick(data: ClickData): void {
    try {
      const connectionTypeMap: Record<string, number> = {
        '4G': 4,
        '5G': 5,
        'WiFi': 6,
        'Ethernet': 6,
        'Cellular': 4,
      };
      const connectionTypeNum = connectionTypeMap[data.connectionType || ''] || 0;

      const blobs = [
        data.ip,              // blob1
        data.country || '',   // blob2
        data.city || '',      // blob3
        data.device || '',    // blob4
        data.browser || '',   // blob5
        data.os || '',        // blob6
        data.subId1 || '',    // blob7
        data.subId2 || '',    // blob8
        data.subId3 || '',    // blob9
        data.subId4 || '',    // blob10
        data.subId5 || '',    // blob11
        data.utmSource || '', // blob12
        data.utmMedium || '', // blob13
        data.utmCampaign || '', // blob14
        data.referer || '',   // blob15
        data.userAgent || '', // blob16
        data.isp || '',       // blob17
        data.fingerprint || '', // blob18 - 硬件指纹 ID
      ];

      const doubles = [
        extractNumericId(data.clickId),           // double1
        data.flowId ? extractNumericId(data.flowId) : 0,  // double2
        data.landingPageId ? extractNumericId(data.landingPageId) : 0, // double3
        data.offerId ? extractNumericId(data.offerId) : 0, // double4
        extractNumericId(data.visitorId),         // double5
        data.cost || 0,                           // double6
        data.riskScore || 0,                      // double7
        data.cfBotScore || 0,                     // double8
        connectionTypeNum,                        // double9 - 连接类型
        data.isProxy ? 1 : 0,                     // double10 - 是否代理
        data.isBot ? 1 : 0,                       // double11 - 是否机器人
      ];

      console.log('[AnalyticsService] Writing click:', {
        campaignId: data.campaignId,
        blobCount: blobs.length,
        doubleCount: doubles.length,
        userAgent: data.userAgent ? 'present' : 'empty',
        fingerprint: data.fingerprint ? 'present' : 'empty',
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
