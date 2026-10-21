/**
 * @fileoverview 转化追踪服务
 * @description 处理转化追踪的业务逻辑
 * @module services/tracking/conversion.service
 */

import { DOService } from '@/handlers/do';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { getD1Connection } from '@/handlers/d1';
import { isAeOnlyClickPersistence, readClickContext } from './click-context';
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
  duplicate?: boolean;
}

export class ConversionService {
  private env: Env;
  private doService: DOService;
  private clickRepo: ClickRepository;
  private conversionRepo: ConversionRepository;

  constructor(env: Env) {
    this.env = env;
    this.doService = new DOService(env);
    const db = getD1Connection(env);
    this.clickRepo = new ClickRepository(db);
    this.conversionRepo = new ConversionRepository(db);
  }

  /**
   * 处理转化请求
   */
  async handleConversion(request: ConversionRequest): Promise<ConversionResult> {
    const conversionId = generateConversionId();

    // A retried postback must not create a second conversion for one click.
    try {
      const existing = await this.conversionRepo.findByClickId(request.clickId);
      if (Array.isArray(existing) && existing.length > 0) {
        return { conversionId: existing[0]?.conversionId || conversionId, success: true, duplicate: true };
      }
    } catch (error) {
      console.warn('[ConversionService] idempotency lookup failed:', error);
    }

    // AE-only: the click row did not exist in D1. Materialize it now, then
    // persist the conversion; both are conversion-path writes, not click-path.
    if (isAeOnlyClickPersistence(this.env)) {
      const context = await readClickContext(this.env, request.clickId);
      if (context) {
        try {
          await this.clickRepo.saveClick(context);
        } catch (error) {
          // A retried conversion may already have materialized the click.
          console.warn('[ConversionService] click context already materialized or invalid:', error);
        }
      }
    }

    await this.conversionRepo.saveConversion({
      conversionId,
      clickId: request.clickId,
      campaignId: request.campaignId,
      offerId: request.offerId,
      timestamp: new Date().toISOString(),
      revenue: Number(request.revenue) || 0,
      payout: Number(request.payout ?? request.revenue) || 0,
      currency: request.currency || 'USD',
      conversionType: request.conversionType || 'sale',
      offerName: request.offerName || null,
    });

    await this.doService.trackConversion({
      clickId: request.clickId,
      revenue: request.revenue
    });

    await this.doService.incrementCounter(`campaign:${request.campaignId}:today`, {
      conversions: 1,
      revenue: request.revenue,
    });

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
