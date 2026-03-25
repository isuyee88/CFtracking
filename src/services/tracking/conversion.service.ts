/**
 * @fileoverview 转化追踪服务
 * @description 处理转化追踪的业务逻辑
 * @module services/tracking/conversion.service
 */

import { DOService } from '@/handlers/do';
import type { Env } from '@/config/env';
import type { ConversionData } from '@/types/tracking';
import { generateConversionId } from '@/utils/crypto';


export interface ConversionRequest {
  clickId: string;
  campaignId: string;
  offerId: string;
  revenue: number;
  payout?: number;
  currency?: string;
  conversionType?: string;
  offerName?: string;
}

export interface ConversionResult {
  conversionId: string;
  success: boolean;
}

export class ConversionService {
  private doService: DOService;

  constructor(env: Env) {
    this.doService = new DOService(env);
  }

  /**
   * 处理转化请求
   */
  async handleConversion(request: ConversionRequest): Promise<ConversionResult> {
    const conversionId = generateConversionId();

    const conversionData: ConversionData = {
      conversionId,
      clickId: request.clickId,
      campaignId: request.campaignId,
      offerId: request.offerId,
      timestamp: new Date().toISOString(),
      revenue: request.revenue,
      payout: request.payout || 0,
      currency: request.currency || 'USD',
      conversionType: request.conversionType || 'lead',
      offerName: request.offerName || null,
    };

    await this.doService.trackConversion({
      clickId: request.clickId,
      revenue: request.revenue
    });

    await this.doService.incrementCounter(`campaign:${request.campaignId}:today`, {
      conversions: 1,
      revenue: request.revenue,
    });

    // 暂未实现每日汇总更新

    return {
      conversionId,
      success: true,
    };
  }

  /**
   * 批量处理转化
   */
  async handleBatchConversions(requests: ConversionRequest[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.handleConversion(request);
        results.push(result);
      } catch (error) {
        results.push({
          conversionId: '',
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * 获取转化的点击详情
   */
  async getConversionClickDetails(_conversionId: string): Promise<ConversionData | null> {
    return null; // 暂未实现
  }
}

/**
 * 创建 ConversionService 实例的工厂函数
 */
export function createConversionService(env: Env): ConversionService {
  return new ConversionService(env);
}
