/**
 * @fileoverview Multi-offer 类型定义
 * @description 定义 Multi-offer 相关的类型和接口，支持多 Offer 分配功能
 * @module types/multi-offer
 * 
 * 数据流:
 * 1. Flow 关联多个 Offers (flowOffers 表)
 * 2. MultiOfferEngine 根据 allocationStrategy 选择 Offer
 * 3. 支持转化限制、唯一性检查等高级功能
 */

/**
 * Multi-offer 分配策略
 * - weight: 权重随机分配（按 weight 字段的比例随机选择）
 * - random: 完全随机分配（每个 Offer 概率相等）
 * - priority: 按优先级顺序分配（priority 越小优先级越高）
 * - round-robin: 轮询分配（按顺序依次选择）
 */
export type AllocationStrategy = 'weight' | 'random' | 'priority' | 'round-robin';

/**
 * Flow-Offer 关联（增强版）
 * 用于 Multi-offer 功能
 */
export interface FlowOfferEnhanced {
  id: string;
  flowId: string;
  offerId: string;
  weight: number;
  priority: number;
  allocationStrategy: AllocationStrategy;
  conversionLimit: number;
  uniqueCheck: number;
  share: number;
  conversions: number;
  clicks: number;
  enabled: boolean;
  createdAt: string;
  
  // 关联的 Offer 信息（可选，查询时填充）
  offer?: {
    id: string;
    name: string;
    url: string;
    payout: number;
    currency: string;
    status: string;
  };
}

/**
 * 创建 Multi-offer DTO
 */
export interface CreateMultiOfferDTO {
  flowId: string;
  offerId: string;
  weight?: number;
  priority?: number;
  allocationStrategy?: AllocationStrategy;
  conversionLimit?: number;
  uniqueCheck?: number;
  share?: number;
  enabled?: boolean;
}

/**
 * 更新 Multi-offer DTO
 */
export interface UpdateMultiOfferDTO {
  weight?: number;
  priority?: number;
  allocationStrategy?: AllocationStrategy;
  conversionLimit?: number;
  uniqueCheck?: number;
  share?: number;
  enabled?: boolean;
}

/**
 * 批量更新 Multi-offer DTO
 */
export interface BatchUpdateMultiOfferDTO {
  flowId: string;
  offers: Array<{
    offerId: string;
    weight?: number;
    priority?: number;
    allocationStrategy?: AllocationStrategy;
    conversionLimit?: number;
    uniqueCheck?: number;
    share?: number;
    enabled?: boolean;
  }>;
}

/**
 * Multi-offer 选择结果
 */
export interface MultiOfferSelectionResult {
  flowOfferId: string;
  offerId: string;
  offer: {
    id: string;
    name: string;
    url: string;
    payout: number;
    currency: string;
  };
  selectionMethod: string;
  weight: number;
  priority: number;
}

/**
 * Multi-offer 统计数据
 */
export interface MultiOfferStats {
  flowOfferId: string;
  offerId: string;
  offerName: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  conversionRate: number;
  epc: number;
  weight: number;
  priority: number;
  enabled: boolean;
}

/**
 * Multi-offer 配置摘要
 */
export interface MultiOfferConfigSummary {
  flowId: string;
  flowName: string;
  totalOffers: number;
  activeOffers: number;
  allocationStrategy: AllocationStrategy;
  totalWeight: number;
  offers: FlowOfferEnhanced[];
}

/**
 * Multi-offer 选择上下文
 * 用于 MultiOfferEngine
 */
export interface MultiOfferSelectionContext {
  flowId: string;
  visitorId: string;
  offers: FlowOfferEnhanced[];
  offerDetails: Map<string, {
    id: string;
    name: string;
    url: string;
    payout: number;
    currency: string;
  }>;
  env: {
    UNIQUENESS_KV?: KVNamespace;
    [key: string]: unknown;
  };
}
