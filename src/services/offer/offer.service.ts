/**
 * @fileoverview Offer 业务服务
 * @description 处理 Offer 相关的业务逻辑
 * @module services/offer/offer.service
 */

import { OfferRepository } from '@/handlers/d1/offer.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Offer, CreateOfferDTO, UpdateOfferDTO } from '@/types/offer';
import { NotFoundError, DuplicateError } from '@/middleware/error';

export class OfferService {
  private repo: OfferRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new OfferRepository(db);
  }

  /**
   * 创建 Offer
   */
  async create(data: CreateOfferDTO): Promise<Offer> {
    const urlExists = await this.repo.urlExists(data.url);
    if (urlExists) {
      throw new DuplicateError(`Offer with URL "${data.url}" already exists`);
    }

    return this.repo.create(data);
  }

  /**
   * 获取 Offer 详情
   */
  async getById(id: string): Promise<Offer> {
    const offer = await this.repo.findById(id);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }
    return offer;
  }

  /**
   * 获取 Offer 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: Offer[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count(),
    ]);
    return { list, total };
  }

  /**
   * 获取活跃的 Offer 列表
   */
  async getActive(): Promise<Offer[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Offer
   */
  async update(id: string, data: UpdateOfferDTO): Promise<Offer> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Offer not found');
    }

    if (data.url && data.url !== existing.url) {
      const urlExists = await this.repo.urlExists(data.url, id);
      if (urlExists) {
        throw new DuplicateError(`Offer with URL "${data.url}" already exists`);
      }
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 Offer
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Offer not found');
    }

    await this.repo.update(id, { status: 'deleted' });
  }

  /**
   * 获取 Offer 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<Offer & { campaignCount: number; clicks: number; conversions: number; revenue: number; epc: number; cr: number }> {
    const offer = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id),
    ]);

    const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
    const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

    return {
      ...offer,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      epc: Math.round(epc * 100) / 100,
      cr: Math.round(cr * 100) / 100,
    };
  }

  /**
   * 获取 Offer 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (Offer & { campaignCount: number; clicks: number; conversions: number; revenue: number; epc: number; cr: number })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (offer) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(offer.id),
          this.repo.getStats(offer.id),
        ]);
        const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
        const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        return {
          ...offer,
          campaignCount,
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
