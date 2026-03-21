/**
 * @fileoverview A/B Test 数据仓库
 * @description 封装 A/B 测试相关的所有数据库操作
 * @module handlers/d1/abTest.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { ABTest, ABTestVariant, CreateABTestDTO, UpdateABTestDTO } from '@/types/abTest';

export class ABTestRepository extends BaseRepository<ABTest> {
  constructor(db: D1Database) {
    super(db, 'abTests');
  }

  /**
   * 创建 A/B 测试
   */
  async create(data: CreateABTestDTO): Promise<ABTest> {
    const id = `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const test: ABTest = {
      id,
      campaignId: data.campaignId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'draft',
      trafficAllocation: data.trafficAllocation || 'equal',
      variants: data.variants.map((v, index) => ({
        id: `variant_${id}_${index}`,
        name: v.name,
        landingPageId: v.landingPageId,
        landingPageName: v.landingPageName,
        offerId: v.offerId,
        offerName: v.offerName,
        weight: v.weight,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
      })),
      winnerCriteria: data.winnerCriteria || 'conversion_rate',
      minSampleSize: data.minSampleSize,
      minConfidence: data.minConfidence,
      autoSelectWinner: data.autoSelectWinner || false,
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: now,
      updatedAt: now,
    };

    await this.db
      .prepare(`
        INSERT INTO abTests (
          id, campaignId, name, description, type, status, 
          trafficAllocation, variants, winnerCriteria, minSampleSize, 
          minConfidence, autoSelectWinner, startDate, endDate, 
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        test.id,
        test.campaignId,
        test.name,
        test.description || null,
        test.type,
        test.status,
        test.trafficAllocation,
        JSON.stringify(test.variants),
        test.winnerCriteria,
        test.minSampleSize || null,
        test.minConfidence || null,
        test.autoSelectWinner,
        test.startDate || null,
        test.endDate || null,
        test.createdAt,
        test.updatedAt
      )
      .run();

    return test;
  }

  /**
   * 按ID查找 A/B 测试
   */
  async findById(id: string): Promise<ABTest | null> {
    const result = await this.db
      .prepare('SELECT * FROM abTests WHERE id = ?')
      .bind(id)
      .first();

    if (!result) return null;

    return this.parseABTest(result as any);
  }

  /**
   * 按Campaign ID查找 A/B 测试列表
   */
  async findByCampaignId(campaignId: string): Promise<ABTest[]> {
    const result = await this.db
      .prepare('SELECT * FROM abTests WHERE campaignId = ? ORDER BY createdAt DESC')
      .bind(campaignId)
      .all();

    return (result.results as any[] || []).map(this.parseABTest);
  }

  /**
   * 查找所有 A/B 测试
   */
  async findAll(limit = 20, offset = 0): Promise<ABTest[]> {
    const result = await this.db
      .prepare('SELECT * FROM abTests ORDER BY createdAt DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();

    return (result.results as any[] || []).map(this.parseABTest);
  }

  /**
   * 按状态查找 A/B 测试
   */
  async findByStatus(status: string): Promise<ABTest[]> {
    const result = await this.db
      .prepare('SELECT * FROM abTests WHERE status = ? ORDER BY createdAt DESC')
      .bind(status)
      .all();

    return (result.results as any[] || []).map(this.parseABTest);
  }

  /**
   * 更新 A/B 测试
   */
  async update(id: string, data: UpdateABTestDTO): Promise<ABTest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.trafficAllocation !== undefined) {
      updates.push('trafficAllocation = ?');
      params.push(data.trafficAllocation);
    }
    if (data.variants !== undefined) {
      updates.push('variants = ?');
      params.push(JSON.stringify(data.variants));
    }
    if (data.winnerCriteria !== undefined) {
      updates.push('winnerCriteria = ?');
      params.push(data.winnerCriteria);
    }
    if (data.minSampleSize !== undefined) {
      updates.push('minSampleSize = ?');
      params.push(data.minSampleSize);
    }
    if (data.minConfidence !== undefined) {
      updates.push('minConfidence = ?');
      params.push(data.minConfidence);
    }
    if (data.autoSelectWinner !== undefined) {
      updates.push('autoSelectWinner = ?');
      params.push(data.autoSelectWinner);
    }
    if (data.startDate !== undefined) {
      updates.push('startDate = ?');
      params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push('endDate = ?');
      params.push(data.endDate);
    }

    updates.push('updatedAt = ?');
    params.push(now);
    params.push(id);

    await this.db
      .prepare(`UPDATE abTests SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    return this.findById(id);
  }

  /**
   * 删除 A/B 测试
   */
  async delete(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM abTests WHERE id = ?')
      .bind(id)
      .run();
  }

  /**
   * 统计 A/B 测试数量
   */
  async count(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM abTests')
      .first();

    return (result as any)?.count || 0;
  }

  /**
   * 更新变体统计数据
   */
  async updateVariantStats(testId: string, variantId: string, stats: {
    clicks?: number;
    conversions?: number;
    revenue?: number;
    cost?: number;
  }): Promise<void> {
    const test = await this.findById(testId);
    if (!test) return;

    const updatedVariants = test.variants.map(variant => {
      if (variant.id === variantId) {
        return {
          ...variant,
          clicks: (variant.clicks || 0) + (stats.clicks || 0),
          conversions: (variant.conversions || 0) + (stats.conversions || 0),
          revenue: (variant.revenue || 0) + (stats.revenue || 0),
          cost: (variant.cost || 0) + (stats.cost || 0),
          cr: ((variant.conversions || 0) + (stats.conversions || 0)) / ((variant.clicks || 0) + (stats.clicks || 0)) * 100,
          epc: ((variant.revenue || 0) + (stats.revenue || 0)) / ((variant.clicks || 0) + (stats.clicks || 0)),
          roi: ((variant.revenue || 0) + (stats.revenue || 0) - (variant.cost || 0) - (stats.cost || 0)) / ((variant.cost || 0) + (stats.cost || 0)) * 100,
        };
      }
      return variant;
    });

    await this.db
      .prepare('UPDATE abTests SET variants = ?, updatedAt = ? WHERE id = ?')
      .bind(JSON.stringify(updatedVariants), new Date().toISOString(), testId)
      .run();
  }

  /**
   * 标记获胜变体
   */
  async markWinner(testId: string, variantId: string): Promise<void> {
    const test = await this.findById(testId);
    if (!test) return;

    const updatedVariants = test.variants.map(variant => ({
      ...variant,
      isWinner: variant.id === variantId,
    }));

    await this.db
      .prepare('UPDATE abTests SET variants = ?, status = ?, endDate = ?, updatedAt = ? WHERE id = ?')
      .bind(
        JSON.stringify(updatedVariants),
        'completed',
        new Date().toISOString(),
        new Date().toISOString(),
        testId
      )
      .run();
  }

  /**
   * 解析 A/B 测试数据
   */
  private parseABTest(data: any): ABTest {
    return {
      id: data.id,
      campaignId: data.campaignId,
      campaignName: data.campaignName,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      trafficAllocation: data.trafficAllocation,
      variants: JSON.parse(data.variants || '[]'),
      winnerCriteria: data.winnerCriteria,
      minSampleSize: data.minSampleSize,
      minConfidence: data.minConfidence,
      autoSelectWinner: data.autoSelectWinner,
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
    };
  }
}
