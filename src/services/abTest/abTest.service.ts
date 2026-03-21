/**
 * @fileoverview A/B Test 业务服务
 * @description 处理 A/B 测试相关的业务逻辑
 * @module services/abTest/abTest.service
 */

import { ABTestRepository } from '@/handlers/d1/abTest.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { ABTest, CreateABTestDTO, UpdateABTestDTO, ABTestResult } from '@/types/abTest';
import { NotFoundError } from '@/middleware/error';
import { determineWinner, selectVariant } from '@/types/abTest';

export class ABTestService {
  private repo: ABTestRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new ABTestRepository(db);
  }

  /**
   * 创建 A/B 测试
   */
  async create(data: CreateABTestDTO): Promise<ABTest> {
    return this.repo.create(data);
  }

  /**
   * 获取 A/B 测试详情
   */
  async getById(id: string): Promise<ABTest> {
    const test = await this.repo.findById(id);
    if (!test) {
      throw new NotFoundError('A/B Test not found');
    }
    return test;
  }

  /**
   * 获取 A/B 测试列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: ABTest[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count(),
    ]);
    return { list, total };
  }

  /**
   * 获取 Campaign 的 A/B 测试列表
   */
  async getByCampaignId(campaignId: string): Promise<ABTest[]> {
    return this.repo.findByCampaignId(campaignId);
  }

  /**
   * 获取活跃的 A/B 测试列表
   */
  async getActive(): Promise<ABTest[]> {
    return this.repo.findByStatus('running');
  }

  /**
   * 更新 A/B 测试
   */
  async update(id: string, data: UpdateABTestDTO): Promise<ABTest> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('A/B Test not found');
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 A/B 测试
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('A/B Test not found');
    }

    await this.repo.delete(id);
  }

  /**
   * 启动 A/B 测试
   */
  async start(id: string): Promise<ABTest> {
    const test = await this.getById(id);
    if (test.status === 'running') {
      throw new Error('A/B Test is already running');
    }

    const updated = await this.repo.update(id, {
      status: 'running',
      startDate: new Date().toISOString(),
    });
    if (!updated) throw new Error('Failed to update A/B Test');
    return updated;
  }

  /**
   * 暂停 A/B 测试
   */
  async pause(id: string): Promise<ABTest> {
    const test = await this.getById(id);
    if (test.status !== 'running') {
      throw new Error('A/B Test is not running');
    }

    const updated = await this.repo.update(id, {
      status: 'paused',
    });
    if (!updated) throw new Error('Failed to update A/B Test');
    return updated;
  }

  /**
   * 完成 A/B 测试
   */
  async complete(id: string): Promise<ABTest> {
    const test = await this.getById(id);
    if (test.status === 'completed') {
      throw new Error('A/B Test is already completed');
    }

    const updated = await this.repo.update(id, {
      status: 'completed',
      endDate: new Date().toISOString(),
    });
    if (!updated) throw new Error('Failed to update A/B Test');
    return updated;
  }

  /**
   * 选择 A/B 测试变体
   */
  async selectTestVariant(testId: string, visitorId: string): Promise<{ variantId: string; variantName: string }> {
    const test = await this.getById(testId);
    if (test.status !== 'running') {
      throw new Error('A/B Test is not running');
    }

    const variantId = selectVariant(test.variants, visitorId);
    const variant = test.variants.find(v => v.id === variantId);

    if (!variant) {
      throw new Error('Variant not found');
    }

    return { variantId: variant.id, variantName: variant.name };
  }

  /**
   * 记录 A/B 测试点击
   */
  async recordClick(testId: string, variantId: string, cost = 0): Promise<void> {
    await this.repo.updateVariantStats(testId, variantId, {
      clicks: 1,
      cost,
    });
  }

  /**
   * 记录 A/B 测试转化
   */
  async recordConversion(testId: string, variantId: string, revenue: number): Promise<void> {
    await this.repo.updateVariantStats(testId, variantId, {
      conversions: 1,
      revenue,
    });

    // 检查是否需要自动选择获胜者
    const test = await this.getById(testId);
    if (test.autoSelectWinner) {
      await this.checkAutoWinner(test);
    }
  }

  /**
   * 检查是否自动选择获胜者
   */
  private async checkAutoWinner(test: ABTest): Promise<void> {
    // 检查样本大小
    const totalClicks = test.variants.reduce((sum, v) => sum + (v.clicks || 0), 0);
    if (test.minSampleSize && totalClicks < test.minSampleSize) {
      return;
    }

    // 确定获胜者
    const { winnerId } = determineWinner(
      test.variants,
      test.winnerCriteria as any,
      test.minConfidence || 95
    );

    if (winnerId) {
      await this.repo.markWinner(test.id, winnerId);
    }
  }

  /**
   * 获取 A/B 测试结果
   */
  async getTestResult(testId: string): Promise<ABTestResult> {
    const test = await this.getById(testId);

    const totalClicks = test.variants.reduce((sum, v) => sum + (v.clicks || 0), 0);
    const totalConversions = test.variants.reduce((sum, v) => sum + (v.conversions || 0), 0);
    const totalRevenue = test.variants.reduce((sum, v) => sum + (v.revenue || 0), 0);

    // 计算每个变体的指标
    const variants = test.variants.map(variant => {
      const cr = variant.clicks > 0 ? (variant.conversions / variant.clicks) * 100 : 0;
      const epc = variant.clicks > 0 ? variant.revenue / variant.clicks : 0;
      const roi = variant.cost > 0 ? ((variant.revenue - variant.cost) / variant.cost) * 100 : 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        clicks: variant.clicks,
        conversions: variant.conversions,
        revenue: variant.revenue,
        cr: Math.round(cr * 100) / 100,
        epc: Math.round(epc * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        isWinner: variant.isWinner || false,
      };
    });

    // 确定获胜者
    let winner: { variantId: string; variantName: string; confidence: number; } | undefined;
    if (test.status === 'completed') {
      const winningVariant = test.variants.find(v => v.isWinner);
      if (winningVariant) {
        winner = {
          variantId: winningVariant.id,
          variantName: winningVariant.name,
          confidence: 100, // 已完成的测试，置信度为100%
        };
      }
    }

    return {
      testId: test.id,
      testName: test.name,
      status: test.status,
      totalClicks,
      totalConversions,
      totalRevenue,
      variants,
      winner,
      recommendations: this.generateRecommendations(test, variants),
    };
  }

  /**
   * 生成 A/B 测试建议
   */
  private generateRecommendations(test: ABTest, variants: ABTestResult['variants']): string[] {
    const recommendations: string[] = [];

    // 检查样本大小
    const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);
    if (test.minSampleSize && totalClicks < test.minSampleSize) {
      recommendations.push(`Test needs more data. Current sample size: ${totalClicks}, required: ${test.minSampleSize}`);
    }

    // 检查变体性能
    if (variants.length > 1) {
      const bestVariant = variants.reduce((best, current) => 
        current.cr > best.cr ? current : best
      );

      const worstVariant = variants.reduce((worst, current) => 
        current.cr < worst.cr ? current : worst
      );

      if (bestVariant.cr > worstVariant.cr * 1.2) { // 20% improvement
        recommendations.push(`${bestVariant.variantName} is performing ${Math.round((bestVariant.cr / worstVariant.cr - 1) * 100)}% better than ${worstVariant.variantName}`);
      }
    }

    // 检查转化情况
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
    if (totalConversions === 0) {
      recommendations.push('No conversions yet. Consider adjusting your landing page or offer.');
    }

    return recommendations;
  }

  /**
   * 获取 A/B 测试统计摘要
   */
  async getTestSummary(testId: string): Promise<{
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    averageCR: number;
    averageEPC: number;
    bestVariant: {
      id: string;
      name: string;
      cr: number;
      epc: number;
    };
  }> {
    const test = await this.getById(testId);

    const totalClicks = test.variants.reduce((sum, v) => sum + (v.clicks || 0), 0);
    const totalConversions = test.variants.reduce((sum, v) => sum + (v.conversions || 0), 0);
    const totalRevenue = test.variants.reduce((sum, v) => sum + (v.revenue || 0), 0);

    const averageCR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const averageEPC = totalClicks > 0 ? totalRevenue / totalClicks : 0;

    // 找出表现最好的变体
    const bestVariant = test.variants.reduce((best, current) => {
      const currentCR = current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0;
      const bestCR = best.clicks > 0 ? (best.conversions / best.clicks) * 100 : 0;
      return currentCR > bestCR ? current : best;
    });

    return {
      totalClicks,
      totalConversions,
      totalRevenue,
      averageCR: Math.round(averageCR * 100) / 100,
      averageEPC: Math.round(averageEPC * 100) / 100,
      bestVariant: {
        id: bestVariant.id,
        name: bestVariant.name,
        cr: Math.round(((bestVariant.conversions || 0) / (bestVariant.clicks || 1)) * 100 * 100) / 100,
        epc: Math.round(((bestVariant.revenue || 0) / (bestVariant.clicks || 1)) * 100) / 100,
      },
    };
  }
}

export function createABTestService(env: Env): ABTestService {
  return new ABTestService(env);
}
