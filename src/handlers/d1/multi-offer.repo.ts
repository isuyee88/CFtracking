/**
 * @fileoverview Multi-offer 数据仓库
 * @description 封装 Multi-offer 相关的所有数据库操作
 * @module handlers/d1/multi-offer.repo
 * @input FlowOfferEnhanced, CreateMultiOfferDTO, UpdateMultiOfferDTO
 * @output FlowOfferEnhanced, MultiOfferStats
 * @logic 数据库 CRUD 操作，统计更新
 * @frontend 无
 * @backend MultiOfferService, FlowEngine 使用
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type {
  FlowOfferEnhanced,
  CreateMultiOfferDTO,
  UpdateMultiOfferDTO,
  BatchUpdateMultiOfferDTO,
  MultiOfferStats,
  AllocationStrategy,
} from '@/types/multi-offer';

export class MultiOfferRepository extends BaseRepository<FlowOfferEnhanced> {
  constructor(db: D1Database) {
    super(db, 'flowOffers');
  }

  protected transform(row: Record<string, unknown>): FlowOfferEnhanced {
    return {
      id: row.id as string,
      flowId: row.flowId as string,
      offerId: row.offerId as string,
      weight: (row.weight as number) || 100,
      priority: (row.priority as number) || 0,
      allocationStrategy: (row.allocationStrategy as AllocationStrategy) || 'weight',
      conversionLimit: (row.conversionLimit as number) || 0,
      uniqueCheck: (row.uniqueCheck as number) || 0,
      share: (row.share as number) || 0,
      conversions: (row.conversions as number) || 0,
      clicks: (row.clicks as number) || 0,
      enabled: row.enabled === 1 || row.enabled === true,
      createdAt: row.createdAt as string,
    };
  }

  /**
   * 获取 Flow 的所有 Multi-offers（增强版）
   */
  async getFlowOffers(flowId: string): Promise<FlowOfferEnhanced[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM flowOffers 
        WHERE flowId = ? 
        ORDER BY priority ASC, weight DESC
      `)
      .bind(flowId)
      .all();
    
    return (result.results as unknown as Record<string, unknown>[]).map(r => this.transform(r));
  }

  /**
   * 获取 Flow 的所有 Multi-offers 及其 Offer 详情
   */
  async getFlowOffersWithDetails(flowId: string): Promise<FlowOfferEnhanced[]> {
    const result = await this.db
      .prepare(`
        SELECT 
          fo.*,
          o.id as offer_id,
          o.name as offer_name,
          o.url as offer_url,
          o.payout as offer_payout,
          o.currency as offer_currency,
          o.status as offer_status
        FROM flowOffers fo
        LEFT JOIN offers o ON fo.offerId = o.id
        WHERE fo.flowId = ?
        ORDER BY fo.priority ASC, fo.weight DESC
      `)
      .bind(flowId)
      .all();

    return (result.results as unknown as Record<string, unknown>[]).map(row => {
      const transformed = this.transform(row);
      transformed.offer = {
        id: row.offer_id as string,
        name: row.offer_name as string,
        url: row.offer_url as string,
        payout: (row.offer_payout as number) || 0,
        currency: (row.offer_currency as string) || 'USD',
        status: row.offer_status as string,
      };
      return transformed;
    });
  }

  /**
   * 添加 Offer 到 Flow（增强版）
   */
  async addOffer(data: CreateMultiOfferDTO): Promise<FlowOfferEnhanced> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    const weight = data.weight ?? 100;
    const priority = data.priority ?? 0;
    const allocationStrategy = data.allocationStrategy ?? 'weight';
    const conversionLimit = data.conversionLimit ?? 0;
    const uniqueCheck = data.uniqueCheck ?? 0;
    const share = data.share ?? 0;
    const enabled = data.enabled !== false ? 1 : 0;

    await this.db
      .prepare(`
        INSERT INTO flowOffers (
          id, flowId, offerId, weight, priority, allocationStrategy,
          conversionLimit, uniqueCheck, share, conversions, clicks, enabled, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `)
      .bind(
        id, data.flowId, data.offerId, weight, priority, allocationStrategy,
        conversionLimit, uniqueCheck, share, enabled, now
      )
      .run();

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 更新 Flow-Offer 关联
   */
  async updateOffer(id: string, data: UpdateMultiOfferDTO): Promise<FlowOfferEnhanced | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.weight !== undefined) {
      fields.push('weight = ?');
      values.push(data.weight);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.allocationStrategy !== undefined) {
      fields.push('allocationStrategy = ?');
      values.push(data.allocationStrategy);
    }
    if (data.conversionLimit !== undefined) {
      fields.push('conversionLimit = ?');
      values.push(data.conversionLimit);
    }
    if (data.uniqueCheck !== undefined) {
      fields.push('uniqueCheck = ?');
      values.push(data.uniqueCheck);
    }
    if (data.share !== undefined) {
      fields.push('share = ?');
      values.push(data.share);
    }
    if (data.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await this.db
      .prepare(`UPDATE flowOffers SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 批量更新 Multi-offers
   */
  async batchUpdateOffers(data: BatchUpdateMultiOfferDTO): Promise<FlowOfferEnhanced[]> {
    const results: FlowOfferEnhanced[] = [];

    for (const offerData of data.offers) {
      const existing = await this.db
        .prepare('SELECT id FROM flowOffers WHERE flowId = ? AND offerId = ?')
        .bind(data.flowId, offerData.offerId)
        .first();

      if (existing) {
        const updated = await this.updateOffer(existing.id as string, offerData);
        if (updated) results.push(updated);
      } else {
        const created = await this.addOffer({
          flowId: data.flowId,
          ...offerData,
        });
        results.push(created);
      }
    }

    return results;
  }

  /**
   * 移除 Flow 的 Offer
   */
  async removeOffer(flowId: string, offerId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM flowOffers WHERE flowId = ? AND offerId = ?')
      .bind(flowId, offerId)
      .run();
    return result.success;
  }

  /**
   * 按 ID 移除
   */
  async removeOfferById(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM flowOffers WHERE id = ?')
      .bind(id)
      .run();
    return result.success;
  }

  /**
   * 增加 Click 统计
   */
  async incrementClicks(flowOfferId: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE flowOffers SET clicks = clicks + 1 WHERE id = ?')
      .bind(flowOfferId)
      .run();
    return result.success;
  }

  /**
   * 增加 Conversion 统计
   */
  async incrementConversions(flowOfferId: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE flowOffers SET conversions = conversions + 1 WHERE id = ?')
      .bind(flowOfferId)
      .run();
    return result.success;
  }

  /**
   * 获取 Multi-offer 统计数据
   */
  async getStats(flowOfferId: string): Promise<MultiOfferStats | null> {
    const result = await this.db
      .prepare(`
        SELECT 
          fo.id as flowOfferId,
          fo.offerId,
          o.name as offerName,
          fo.clicks,
          fo.conversions,
          COALESCE(SUM(cv.revenue), 0) as revenue,
          0 as cost,
          fo.weight,
          fo.priority,
          fo.enabled
        FROM flowOffers fo
        LEFT JOIN offers o ON fo.offerId = o.id
        LEFT JOIN conversions cv ON cv.offerId = fo.offerId
        WHERE fo.id = ?
        GROUP BY fo.id
      `)
      .bind(flowOfferId)
      .first();

    if (!result) return null;

    const clicks = (result.clicks as number) || 0;
    const conversions = (result.conversions as number) || 0;
    const revenue = (result.revenue as number) || 0;
    const cost = (result.cost as number) || 0;
    const profit = revenue - cost;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;

    return {
      flowOfferId: result.flowOfferId as string,
      offerId: result.offerId as string,
      offerName: (result.offerName as string) || 'Unknown',
      clicks,
      conversions,
      revenue,
      cost,
      profit,
      conversionRate: Math.round(conversionRate * 100) / 100,
      epc: Math.round(epc * 100) / 100,
      weight: (result.weight as number) || 0,
      priority: (result.priority as number) || 0,
      enabled: result.enabled === 1,
    };
  }

  /**
   * 获取 Flow 下所有 Multi-offer 统计
   */
  async getFlowStats(flowId: string): Promise<MultiOfferStats[]> {
    const flowOffers = await this.getFlowOffers(flowId);
    const stats: MultiOfferStats[] = [];

    for (const fo of flowOffers) {
      const stat = await this.getStats(fo.id);
      if (stat) {
        stats.push(stat);
      }
    }

    return stats;
  }

  /**
   * 重置统计数据
   */
  async resetStats(flowOfferId: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE flowOffers SET clicks = 0, conversions = 0 WHERE id = ?')
      .bind(flowOfferId)
      .run();
    return result.success;
  }

  /**
   * 批量设置 Offers 的启用状态
   */
  async batchSetEnabled(flowId: string, offerIds: string[], enabled: boolean): Promise<number> {
    if (offerIds.length === 0) return 0;

    const placeholders = offerIds.map(() => '?').join(',');
    const result = await this.db
      .prepare(`
        UPDATE flowOffers 
        SET enabled = ? 
        WHERE flowId = ? AND offerId IN (${placeholders})
      `)
      .bind(enabled ? 1 : 0, flowId, ...offerIds)
      .run();

    return result.meta.changes || 0;
  }

  /**
   * 检查 Offer 是否已存在于 Flow
   */
  async existsInFlow(flowId: string, offerId: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT 1 FROM flowOffers WHERE flowId = ? AND offerId = ? LIMIT 1')
      .bind(flowId, offerId)
      .first();
    return result !== null;
  }

  /**
   * 获取 Flow 的活跃 Offers 数量
   */
  async getActiveOfferCount(flowId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM flowOffers WHERE flowId = ? AND enabled = 1')
      .bind(flowId)
      .first();
    return (result?.count as number) || 0;
  }

  /**
   * 获取达到转化限制的 Offers
   */
  async getOffersAtConversionLimit(flowId: string): Promise<FlowOfferEnhanced[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM flowOffers 
        WHERE flowId = ? 
          AND conversionLimit > 0 
          AND conversions >= conversionLimit
      `)
      .bind(flowId)
      .all();

    return (result.results as unknown as Record<string, unknown>[]).map(r => this.transform(r));
  }
}
