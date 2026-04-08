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
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

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
    const normalizedData = this.normalizeCreateInput(data);
    const urlExists = await this.repo.urlExists(normalizedData.url);
    if (urlExists) {
      throw new DuplicateError(`Offer with URL "${normalizedData.url}" already exists`);
    }

    return this.repo.create(normalizedData);
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
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Offer not found');
    }

    if (normalizedData.url && normalizedData.url !== existing.url) {
      const urlExists = await this.repo.urlExists(normalizedData.url, id);
      if (urlExists) {
        throw new DuplicateError(`Offer with URL "${normalizedData.url}" already exists`);
      }
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Offer（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Offer not found');
    }

    await this.repo.deleteById(id);
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

  private normalizeCreateInput(data: CreateOfferDTO): CreateOfferDTO {
    return {
      ...data,
      name: normalizeRequiredString(data.name as unknown, {
        field: 'offer.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      url: normalizeRequiredString(data.url as unknown, {
        field: 'offer.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      network: normalizeOptionalString(data.network as unknown, {
        field: 'offer.network',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      group: normalizeOptionalString(data.group as unknown, {
        field: 'offer.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      }),
    };
  }

  private normalizeUpdateInput(data: UpdateOfferDTO): UpdateOfferDTO {
    const normalizedData: UpdateOfferDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'offer.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.url !== undefined) {
      normalizedData.url = normalizeRequiredString(data.url as unknown, {
        field: 'offer.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.network !== undefined) {
      normalizedData.network = normalizeOptionalString(data.network as unknown, {
        field: 'offer.network',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      });
    }

    if (data.group !== undefined) {
      normalizedData.group = normalizeOptionalString(data.group as unknown, {
        field: 'offer.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      });
    }

    return normalizedData;
  }
}
