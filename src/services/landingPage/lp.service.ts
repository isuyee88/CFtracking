/**
 * @fileoverview Landing Page 业务服务
 * @description 处理 Landing Page 相关的业务逻辑
 * @module services/landingPage/lp.service
 */

import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { LandingPage, CreateLandingPageDTO, UpdateLandingPageDTO } from '@/types/landingPage';
import { NotFoundError, DuplicateError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class LandingPageService {
  private repo: LandingPageRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new LandingPageRepository(db);
  }

  /**
   * 创建 Landing Page
   */
  async create(data: CreateLandingPageDTO): Promise<LandingPage> {
    const normalizedData = this.normalizeCreateInput(data);
    const urlExists = await this.repo.urlExists(normalizedData.url);
    if (urlExists) {
      throw new DuplicateError(`Landing Page with URL "${normalizedData.url}" already exists`);
    }

    return this.repo.create(normalizedData);
  }

  /**
   * 获取 Landing Page 详情
   */
  async getById(id: string): Promise<LandingPage> {
    const lp = await this.repo.findById(id);
    if (!lp) {
      throw new NotFoundError('Landing Page not found');
    }
    return lp;
  }

  /**
   * 获取 Landing Page 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: LandingPage[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count(),
    ]);
    return { list, total };
  }

  /**
   * 获取活跃的 Landing Page 列表
   */
  async getActive(): Promise<LandingPage[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Landing Page
   */
  async update(id: string, data: UpdateLandingPageDTO): Promise<LandingPage> {
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Landing Page not found');
    }

    if (normalizedData.url && normalizedData.url !== existing.url) {
      const urlExists = await this.repo.urlExists(normalizedData.url, id);
      if (urlExists) {
        throw new DuplicateError(`Landing Page with URL "${normalizedData.url}" already exists`);
      }
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Landing Page（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Landing Page not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 获取 Landing Page 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<LandingPage & { campaignCount: number; clicks: number; conversions: number; cr: number }> {
    const lp = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id),
    ]);

    const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

    return {
      ...lp,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      cr: Math.round(cr * 100) / 100,
    };
  }

  /**
   * 获取 Landing Page 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (LandingPage & { campaignCount: number; clicks: number; conversions: number; cr: number })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (lp) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(lp.id),
          this.repo.getStats(lp.id),
        ]);
        const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        return {
          ...lp,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          cr: Math.round(cr * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }

  private normalizeCreateInput(data: CreateLandingPageDTO): CreateLandingPageDTO {
    return {
      ...data,
      name: normalizeRequiredString(data.name as unknown, {
        field: 'landingPage.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      url: normalizeRequiredString(data.url as unknown, {
        field: 'landingPage.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      group: normalizeOptionalString(data.group as unknown, {
        field: 'landingPage.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      }),
    };
  }

  private normalizeUpdateInput(data: UpdateLandingPageDTO): UpdateLandingPageDTO {
    const normalizedData: UpdateLandingPageDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'landingPage.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.url !== undefined) {
      normalizedData.url = normalizeRequiredString(data.url as unknown, {
        field: 'landingPage.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.group !== undefined) {
      normalizedData.group = normalizeOptionalString(data.group as unknown, {
        field: 'landingPage.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      });
    }

    return normalizedData;
  }
}
