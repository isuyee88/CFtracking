/**
 * @fileoverview Campaign 业务服务
 * @description 处理 Campaign 相关的业务逻辑
 * @module services/campaign/campaign.service
 */

import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { TrafficRepository } from '@/handlers/d1/traffic.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Campaign, CreateCampaignDTO, UpdateCampaignDTO, CampaignListQuery } from '@/types/campaign';
import { DuplicateError, NotFoundError } from '@/middleware/error';

export class CampaignService {
  private repo: CampaignRepository;
  private trafficRepo: TrafficRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new CampaignRepository(db);
    this.trafficRepo = new TrafficRepository(db);
  }

  /**
   * 创建 Campaign
   */
  async create(data: CreateCampaignDTO): Promise<Campaign> {
    const exists = await this.repo.aliasExists(data.alias);
    if (exists) {
      throw new DuplicateError(`Campaign with alias "${data.alias}" already exists`);
    }

    return this.repo.create(data);
  }

  /**
   * 获取 Campaign 详情
   */
  async getById(id: string): Promise<Campaign> {
    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    return campaign;
  }

  /**
   * 获取 Campaign 列表
   */
  async getList(query: CampaignListQuery): Promise<{ list: Campaign[]; total: number }> {
    return this.repo.findList(query);
  }

  /**
   * 更新 Campaign
   */
  async update(id: string, data: UpdateCampaignDTO): Promise<Campaign> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Campaign not found');
    }

    if (data.alias && data.alias !== existing.alias) {
      const aliasExists = await this.repo.aliasExists(data.alias, id);
      if (aliasExists) {
        throw new DuplicateError(`Campaign with alias "${data.alias}" already exists`);
      }
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 Campaign（软删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Campaign not found');
    }

    await this.repo.update(id, { status: 'deleted' });
  }

  /**
   * 暂停 Campaign
   */
  async pause(id: string): Promise<Campaign> {
    return this.update(id, { status: 'paused' });
  }

  /**
   * 激活 Campaign
   */
  async activate(id: string): Promise<Campaign> {
    return this.update(id, { status: 'active' });
  }

  /**
   * 获取活跃的 Campaign 列表
   */
  async getActive(): Promise<Campaign[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 重新生成 API Token
   */
  async regenerateApiToken(id: string): Promise<string> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Campaign not found');
    }
    return this.repo.regenerateApiToken(id);
  }

  /**
   * 按 API Token 查询
   */
  async getByApiToken(apiToken: string): Promise<Campaign> {
    const campaign = await this.repo.findByApiToken(apiToken);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    return campaign;
  }

  /**
   * 获取 Campaign 统计数据
   */
  async getStats(id: string, startDate?: string, endDate?: string): Promise<{
    clicks: number;
    uniqueClicks: number;
    conversions: number;
    revenue: number;
    cost: number;
    profit: number;
    roi: number;
    epc: number;
    cpa: number;
    cr: number;
  }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Campaign not found');
    }

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get campaign metrics from traffic repository
    const metrics = await this.trafficRepo.getCampaignMetrics(id, start, end);

    return {
      clicks: metrics.clicks,
      uniqueClicks: metrics.uniqueClicks || metrics.clicks,
      conversions: metrics.conversions,
      revenue: metrics.revenue,
      cost: metrics.cost || metrics.spend,
      profit: metrics.profit || (metrics.revenue - metrics.spend),
      roi: metrics.roi,
      epc: metrics.epc,
      cpa: metrics.cpa,
      cr: metrics.cr,
    };
  }
}
