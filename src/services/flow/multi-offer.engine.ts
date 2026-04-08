/**
 * @fileoverview Multi-offer 选择引擎
 * @description 实现 Multi-offer 的选择算法和限制检查
 * @module services/flow/multi-offer.engine
 * 
 * 支持的分配策略:
 * - weight: 权重随机分配
 * - random: 完全随机分配
 * - priority: 按优先级顺序分配
 * - round-robin: 轮询分配
 * 
 * 功能:
 * - 转化限制检查
 * - 唯一性检查
 * - 统计数据更新
 */

import type { 
  FlowOfferEnhanced, 
  AllocationStrategy, 
  MultiOfferSelectionResult,
  MultiOfferSelectionContext 
} from '@/types/multi-offer';

/**
 * Multi-offer 选择引擎
 */
export class MultiOfferEngine {
  private kv: KVNamespace | null = null;

  constructor(env: { UNIQUENESS_KV?: KVNamespace; [key: string]: unknown }) {
    this.kv = env.UNIQUENESS_KV || null;
  }

  /**
   * 选择 Multi-offer
   * 主入口方法，根据策略选择合适的 Offer
   */
  async selectOffer(context: MultiOfferSelectionContext): Promise<MultiOfferSelectionResult | null> {
    // 1. 过滤可用的 Offers
    const availableOffers = await this.filterAvailableOffers(context);
    
    if (availableOffers.length === 0) {
      return null;
    }

    // 2. 确定分配策略（使用第一个 Offer 的策略，或混合策略）
    const strategy = this.determineStrategy(availableOffers);

    // 3. 根据策略选择 Offer
    let selectedOffer: FlowOfferEnhanced | null = null;
    let selectionMethod = '';

    switch (strategy) {
      case 'weight':
        selectedOffer = this.selectByWeight(availableOffers);
        selectionMethod = 'weight-based';
        break;
      case 'random':
        selectedOffer = this.selectRandom(availableOffers);
        selectionMethod = 'random';
        break;
      case 'priority':
        selectedOffer = this.selectByPriority(availableOffers);
        selectionMethod = 'priority-based';
        break;
      case 'round-robin':
        selectedOffer = await this.selectRoundRobin(context, availableOffers);
        selectionMethod = 'round-robin';
        break;
      default:
        selectedOffer = this.selectByWeight(availableOffers);
        selectionMethod = 'weight-based';
    }

    if (!selectedOffer) {
      return null;
    }

    // 4. 记录访问者（用于唯一性检查）
    if (selectedOffer.uniqueCheck > 0) {
      await this.recordVisitor(context, selectedOffer);
    }

    // 5. 构建返回结果
    const offerDetail = context.offerDetails.get(selectedOffer.offerId);
    if (!offerDetail) {
      return null;
    }

    return {
      flowOfferId: selectedOffer.id,
      offerId: selectedOffer.offerId,
      offer: {
        id: offerDetail.id,
        name: offerDetail.name,
        url: offerDetail.url,
        payout: offerDetail.payout,
        currency: offerDetail.currency,
      },
      selectionMethod,
      weight: selectedOffer.weight,
      priority: selectedOffer.priority,
    };
  }

  /**
   * 过滤可用的 Offers
   * 检查：启用状态、转化限制、唯一性
   */
  private async filterAvailableOffers(context: MultiOfferSelectionContext): Promise<FlowOfferEnhanced[]> {
    const available: FlowOfferEnhanced[] = [];

    for (const offer of context.offers) {
      // 检查是否启用
      if (!offer.enabled) {
        continue;
      }

      // 检查转化限制
      if (offer.conversionLimit > 0 && offer.conversions >= offer.conversionLimit) {
        continue;
      }

      // 检查唯一性
      if (offer.uniqueCheck > 0) {
        const isUnique = await this.checkUniqueness(context, offer);
        if (!isUnique) {
          continue;
        }
      }

      available.push(offer);
    }

    return available;
  }

  /**
   * 权重随机选择
   * 根据权重比例随机选择 Offer
   */
  private selectByWeight(offers: FlowOfferEnhanced[]): FlowOfferEnhanced | null {
    if (offers.length === 0) return null;
    if (offers.length === 1) return offers[0] || null;

    const validOffers = offers.filter(o => o.weight > 0);
    if (validOffers.length === 0) return offers[0] || null;

    const totalWeight = validOffers.reduce((sum, o) => sum + o.weight, 0);
    let random = Math.random() * totalWeight;

    for (const offer of validOffers) {
      random -= offer.weight;
      if (random <= 0) {
        return offer;
      }
    }

    return validOffers[validOffers.length - 1] || null;
  }

  /**
   * 完全随机选择
   * 每个 Offer 被选中的概率相等
   */
  private selectRandom(offers: FlowOfferEnhanced[]): FlowOfferEnhanced | null {
    if (offers.length === 0) return null;
    const index = Math.floor(Math.random() * offers.length);
    return offers[index] || null;
  }

  /**
   * 按优先级选择
   * 选择优先级最高（数字最小）的 Offer
   */
  private selectByPriority(offers: FlowOfferEnhanced[]): FlowOfferEnhanced | null {
    if (offers.length === 0) return null;
    
    // 按优先级排序（数字越小优先级越高）
    const sorted = [...offers].sort((a, b) => a.priority - b.priority);
    return sorted[0] || null;
  }

  /**
   * 轮询选择
   * 按顺序依次选择 Offer
   */
  private async selectRoundRobin(
    context: MultiOfferSelectionContext, 
    offers: FlowOfferEnhanced[]
  ): Promise<FlowOfferEnhanced | null> {
    if (offers.length === 0) return null;

    // 从 KV 获取当前轮询索引
    const key = `round-robin:${context.flowId}`;
    let currentIndex = 0;

    if (this.kv) {
      try {
        const stored = await this.kv.get(key);
        if (stored) {
          currentIndex = parseInt(stored, 10);
        }
      } catch (err) {
        console.error('[MultiOfferEngine] Failed to get round-robin index:', err);
      }
    }

    // 选择当前索引的 Offer
    const selectedOffer = offers[currentIndex % offers.length] || null;

    // 更新索引
    if (this.kv && selectedOffer) {
      try {
        await this.kv.put(key, String((currentIndex + 1) % offers.length));
      } catch (err) {
        console.error('[MultiOfferEngine] Failed to update round-robin index:', err);
      }
    }

    return selectedOffer;
  }

  /**
   * 检查唯一性
   * 检查访问者是否已经访问过该 Offer
   */
  private async checkUniqueness(
    context: MultiOfferSelectionContext, 
    offer: FlowOfferEnhanced
  ): Promise<boolean> {
    if (!this.kv) return true;

    const key = `unique:${offer.id}:${context.visitorId}`;
    try {
      const exists = await this.kv.get(key);
      return !exists;
    } catch (err) {
      console.error('[MultiOfferEngine] Failed to check uniqueness:', err);
      return true;
    }
  }

  /**
   * 记录访问者
   * 用于唯一性检查
   */
  private async recordVisitor(
    context: MultiOfferSelectionContext, 
    offer: FlowOfferEnhanced
  ): Promise<void> {
    if (!this.kv) return;

    const key = `unique:${offer.id}:${context.visitorId}`;
    try {
      await this.kv.put(key, '1', { expirationTtl: offer.uniqueCheck });
    } catch (err) {
      console.error('[MultiOfferEngine] Failed to record visitor:', err);
    }
  }

  /**
   * 确定分配策略
   * 如果所有 Offer 使用相同策略，使用该策略；否则默认使用权重
   */
  private determineStrategy(offers: FlowOfferEnhanced[]): AllocationStrategy {
    if (offers.length === 0) return 'weight';
    
    // 如果所有 Offer 使用相同策略，使用该策略
    const strategies = new Set(offers.map(o => o.allocationStrategy));
    if (strategies.size === 1) {
      return offers[0]?.allocationStrategy || 'weight';
    }

    // 混合策略：默认使用权重
    return 'weight';
  }
}

/**
 * 创建 MultiOfferEngine 实例
 */
export function createMultiOfferEngine(env: { UNIQUENESS_KV?: KVNamespace; [key: string]: unknown }): MultiOfferEngine {
  return new MultiOfferEngine(env);
}
