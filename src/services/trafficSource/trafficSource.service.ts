/**
 * @fileoverview Traffic Source 业务服务
 * @description 处理 Traffic Source 相关的业务逻辑
 * @module services/trafficSource/trafficSource.service
 */

import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { TrafficSource, CreateTrafficSourceDTO, UpdateTrafficSourceDTO } from '@/types/trafficSource';
import { NotFoundError } from '@/middleware/error';

export class TrafficSourceService {
  private repo: TrafficSourceRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new TrafficSourceRepository(db);
  }

  /**
   * 创建 Traffic Source
   */
  async create(data: CreateTrafficSourceDTO): Promise<TrafficSource> {
    return this.repo.create(data);
  }

  /**
   * 获取 Traffic Source 详情
   */
  async getById(id: string): Promise<TrafficSource> {
    const ts = await this.repo.findById(id);
    if (!ts) {
      throw new NotFoundError('Traffic Source not found');
    }
    return ts;
  }

  /**
   * 获取 Traffic Source 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: TrafficSource[]; total: number }> {
    return this.repo.findList(page, pageSize);
  }

  /**
   * 获取活跃的 Traffic Source 列表
   */
  async getActive(): Promise<TrafficSource[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Traffic Source
   */
  async update(id: string, data: UpdateTrafficSourceDTO): Promise<TrafficSource> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Traffic Source not found');
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  /**
   * 删除 Traffic Source（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Traffic Source not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 获取 Traffic Source 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<TrafficSource & { 
    campaignCount: number; 
    clicks: number; 
    conversions: number; 
    revenue: number; 
    cost: number;
    profit: number;
    roi: number;
  }> {
    const ts = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id),
    ]);

    const profit = stats.revenue - stats.cost;
    const roi = stats.cost > 0 ? ((profit / stats.cost) * 100) : 0;

    return {
      ...ts,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      cost: stats.cost,
      profit: Math.round(profit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  }

  /**
   * 获取 Traffic Source 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (TrafficSource & { 
      campaignCount: number; 
      clicks: number; 
      conversions: number; 
      revenue: number; 
      cost: number;
      profit: number;
      roi: number;
    })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (ts) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(ts.id),
          this.repo.getStats(ts.id),
        ]);
        const profit = stats.revenue - stats.cost;
        const roi = stats.cost > 0 ? ((profit / stats.cost) * 100) : 0;
        return {
          ...ts,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          cost: stats.cost,
          profit: Math.round(profit * 100) / 100,
          roi: Math.round(roi * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }
}
