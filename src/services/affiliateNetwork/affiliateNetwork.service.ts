/**
 * @fileoverview Affiliate Network 业务服务
 * @description 处理 Affiliate Network 相关的业务逻辑
 * @module services/affiliateNetwork/affiliateNetwork.service
 */

import { AffiliateNetworkRepository } from '@/handlers/d1/affiliateNetwork.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { AffiliateNetwork, CreateAffiliateNetworkDTO, UpdateAffiliateNetworkDTO } from '@/types/affiliateNetwork';
import { NotFoundError } from '@/middleware/error';

export class AffiliateNetworkService {
  private repo: AffiliateNetworkRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new AffiliateNetworkRepository(db);
  }

  /**
   * 创建 Affiliate Network
   */
  async create(data: CreateAffiliateNetworkDTO): Promise<AffiliateNetwork> {
    return this.repo.create(data);
  }

  /**
   * 获取 Affiliate Network 详情
   */
  async getById(id: string): Promise<AffiliateNetwork> {
    const network = await this.repo.findById(id);
    if (!network) {
      throw new NotFoundError('Affiliate Network not found');
    }
    return network;
  }

  /**
   * 获取 Affiliate Network 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: AffiliateNetwork[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count(),
    ]);
    return { list, total };
  }

  /**
   * 获取活跃的 Affiliate Network 列表
   */
  async getActive(): Promise<AffiliateNetwork[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Affiliate Network
   */
  async update(id: string, data: UpdateAffiliateNetworkDTO): Promise<AffiliateNetwork> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Affiliate Network not found');
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 Affiliate Network
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Affiliate Network not found');
    }

    await this.repo.update(id, { status: 'deleted' });
  }

  /**
   * 获取 Affiliate Network 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<AffiliateNetwork & { 
    offerCount: number; 
    clicks: number; 
    conversions: number; 
    revenue: number; 
    epc: number;
    cr: number;
  }> {
    const network = await this.getById(id);
    const [offerCount, stats] = await Promise.all([
      this.repo.getOfferCount(id),
      this.repo.getStats(id),
    ]);

    const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
    const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

    return {
      ...network,
      offerCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      epc: Math.round(epc * 100) / 100,
      cr: Math.round(cr * 100) / 100,
    };
  }

  /**
   * 获取 Affiliate Network 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (AffiliateNetwork & { 
      offerCount: number; 
      clicks: number; 
      conversions: number; 
      revenue: number; 
      epc: number;
      cr: number;
    })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (network) => {
        const [offerCount, stats] = await Promise.all([
          this.repo.getOfferCount(network.id),
          this.repo.getStats(network.id),
        ]);
        const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
        const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        return {
          ...network,
          offerCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          epc: Math.round(epc * 100) / 100,
          cr: Math.round(cr * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }
}
