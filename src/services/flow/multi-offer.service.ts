/**
 * @fileoverview Multi-offer 业务服务
 * @description 处理 Multi-offer 相关的业务逻辑
 * @module services/flow/multi-offer.service
 * @input CreateMultiOfferDTO, UpdateMultiOfferDTO
 * @output FlowOfferEnhanced, MultiOfferStats
 * @logic 管理 Multi-offer CRUD 和统计
 * @frontend 无
 * @backend MultiOfferRoutes 使用
 */

import { MultiOfferRepository } from '@/handlers/d1/multi-offer.repo';
import { FlowRepository } from '@/handlers/d1/flow.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  FlowOfferEnhanced,
  CreateMultiOfferDTO,
  UpdateMultiOfferDTO,
  BatchUpdateMultiOfferDTO,
  MultiOfferStats,
  MultiOfferConfigSummary,
} from '@/types/multi-offer';
import { NotFoundError } from '@/middleware/error';

export class MultiOfferService {
  private repo: MultiOfferRepository;
  private flowRepo: FlowRepository;
  private offerRepo: OfferRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new MultiOfferRepository(db);
    this.flowRepo = new FlowRepository(db);
    this.offerRepo = new OfferRepository(db);
  }

  /**
   * 添加 Offer 到 Flow（增强版）
   */
  async addOffer(data: CreateMultiOfferDTO): Promise<FlowOfferEnhanced> {
    const flow = await this.flowRepo.findById(data.flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    const offer = await this.offerRepo.findById(data.offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    const exists = await this.repo.existsInFlow(data.flowId, data.offerId);
    if (exists) {
      throw new Error('Offer already exists in this flow');
    }

    return this.repo.addOffer(data);
  }

  /**
   * 获取 Flow 的所有 Multi-offers
   */
  async getFlowOffers(flowId: string): Promise<FlowOfferEnhanced[]> {
    return this.repo.getFlowOffersWithDetails(flowId);
  }

  /**
   * 获取单个 Multi-offer 详情
   */
  async getById(id: string): Promise<FlowOfferEnhanced> {
    const offer = await this.repo.findById(id);
    if (!offer) {
      throw new NotFoundError('Multi-offer not found');
    }
    return offer;
  }

  /**
   * 更新 Multi-offer
   */
  async update(id: string, data: UpdateMultiOfferDTO): Promise<FlowOfferEnhanced> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Multi-offer not found');
    }

    const updated = await this.repo.updateOffer(id, data);
    return updated!;
  }

  /**
   * 批量更新 Multi-offers
   */
  async batchUpdate(data: BatchUpdateMultiOfferDTO): Promise<FlowOfferEnhanced[]> {
    const flow = await this.flowRepo.findById(data.flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    return this.repo.batchUpdateOffers(data);
  }

  /**
   * 移除 Multi-offer
   */
  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Multi-offer not found');
    }

    await this.repo.removeOfferById(id);
  }

  /**
   * 移除 Flow 的 Offer
   */
  async removeFromFlow(flowId: string, offerId: string): Promise<void> {
    await this.repo.removeOffer(flowId, offerId);
  }

  /**
   * 获取 Multi-offer 统计数据
   */
  async getStats(id: string): Promise<MultiOfferStats> {
    const stats = await this.repo.getStats(id);
    if (!stats) {
      throw new NotFoundError('Multi-offer not found');
    }
    return stats;
  }

  /**
   * 获取 Flow 下所有 Multi-offer 统计
   */
  async getFlowStats(flowId: string): Promise<MultiOfferStats[]> {
    return this.repo.getFlowStats(flowId);
  }

  /**
   * 重置统计数据
   */
  async resetStats(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Multi-offer not found');
    }

    await this.repo.resetStats(id);
  }

  /**
   * 批量设置启用状态
   */
  async batchSetEnabled(flowId: string, offerIds: string[], enabled: boolean): Promise<number> {
    return this.repo.batchSetEnabled(flowId, offerIds, enabled);
  }

  /**
   * 获取 Multi-offer 配置摘要
   */
  async getConfigSummary(flowId: string): Promise<MultiOfferConfigSummary> {
    const flow = await this.flowRepo.findById(flowId);
    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    const offers = await this.repo.getFlowOffersWithDetails(flowId);
    const activeOffers = offers.filter(o => o.enabled);
    const totalWeight = offers.reduce((sum, o) => sum + o.weight, 0);

    const strategies = new Set(offers.map(o => o.allocationStrategy));
    const allocationStrategy = strategies.size === 1 ? offers[0]?.allocationStrategy || 'weight' : 'weight';

    return {
      flowId,
      flowName: flow.name,
      totalOffers: offers.length,
      activeOffers: activeOffers.length,
      allocationStrategy,
      totalWeight,
      offers,
    };
  }

  /**
   * 获取达到转化限制的 Offers
   */
  async getOffersAtConversionLimit(flowId: string): Promise<FlowOfferEnhanced[]> {
    return this.repo.getOffersAtConversionLimit(flowId);
  }

  /**
   * 增加 Click 统计
   */
  async incrementClicks(flowOfferId: string): Promise<void> {
    await this.repo.incrementClicks(flowOfferId);
  }

  /**
   * 增加 Conversion 统计
   */
  async incrementConversions(flowOfferId: string): Promise<void> {
    await this.repo.incrementConversions(flowOfferId);
  }
}

/**
 * 创建 MultiOfferService 实例的工厂函数
 */
export function createMultiOfferService(env: Env): MultiOfferService {
  return new MultiOfferService(env);
}
