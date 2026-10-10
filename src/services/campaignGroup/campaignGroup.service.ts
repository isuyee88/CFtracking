/**
 * @fileoverview Campaign Group 服务
 * @description 提供 Campaign 分组的业务逻辑
 * @module services/campaignGroup/campaignGroup.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  CampaignGroup,
  CampaignGroupStats,
  CreateCampaignGroupDTO,
  UpdateCampaignGroupDTO,
} from '@/types/campaignGroup';
import { nanoid } from 'nanoid';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class CampaignGroupService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = getD1Connection(env);
  }

  async getAll(): Promise<CampaignGroup[]> {
    const results = await this.db
      .prepare('SELECT * FROM campaign_groups ORDER BY sortOrder ASC, name ASC')
      .all<CampaignGroup>();
    return results.results || [];
  }

  async getById(id: string): Promise<CampaignGroup | null> {
    return await this.db
      .prepare('SELECT * FROM campaign_groups WHERE id = ?')
      .bind(id)
      .first<CampaignGroup>();
  }

  async getStats(groupId: string, startDate?: string, endDate?: string): Promise<CampaignGroupStats> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const statsResult = await this.db
      .prepare(`
        SELECT 
          COUNT(DISTINCT c.id) as campaignCount,
          COALESCE(SUM(cl.clicks), 0) as totalClicks,
          COALESCE(SUM(cl.conversions), 0) as totalConversions,
          COALESCE(SUM(cl.revenue), 0) as totalRevenue,
          COALESCE(SUM(cl.cost), 0) as totalSpend
        FROM campaigns c
        LEFT JOIN campaign_logs cl ON c.id = cl.campaignId AND cl.date >= ? AND cl.date <= ?
        WHERE c.groupId = ?
      `)
      .bind(start, end, groupId)
      .first<{ campaignCount: number; totalClicks: number; totalConversions: number; totalRevenue: number; totalSpend: number }>();

    const group = await this.getById(groupId);
    const totalSpend = statsResult?.totalSpend || 0;
    const totalRevenue = statsResult?.totalRevenue || 0;
    const avgROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

    return {
      id: groupId,
      name: group?.name || '',
      campaignCount: statsResult?.campaignCount || 0,
      totalClicks: statsResult?.totalClicks || 0,
      totalConversions: statsResult?.totalConversions || 0,
      totalRevenue,
      totalSpend,
      avgROI,
    };
  }

  async create(data: CreateCampaignGroupDTO): Promise<CampaignGroup> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO campaign_groups (id, name, description, color, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.name,
        data.description || null,
        data.color || '#1890ff',
        data.sortOrder || 0,
        now,
        now
      )
      .run();

    return (await this.getById(id))!;
  }

  async update(id: string, data: UpdateCampaignGroupDTO): Promise<CampaignGroup> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sortOrder = ?');
      values.push(data.sortOrder);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db
        .prepare(`UPDATE campaign_groups SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('UPDATE campaigns SET groupId = NULL WHERE groupId = ?').bind(id).run();
    await this.db.prepare('DELETE FROM campaign_groups WHERE id = ?').bind(id).run();
  }

  async assignCampaigns(groupId: string, campaignIds: string[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE campaigns SET groupId = ? WHERE id = ?');
    const batch = campaignIds.map((campaignId) => stmt.bind(groupId, campaignId));
    await this.db.batch(batch);
  }

  async unassignCampaigns(campaignIds: string[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE campaigns SET groupId = NULL WHERE id = ?');
    const batch = campaignIds.map((campaignId) => stmt.bind(campaignId));
    await this.db.batch(batch);
  }

  async getGroupedCampaigns(): Promise<Record<string, string[]>> {
    const results = await this.db
      .prepare('SELECT id, groupId FROM campaigns WHERE groupId IS NOT NULL')
      .all<{ id: string; groupId: string }>();

    const grouped: Record<string, string[]> = {};
    for (const row of results.results || []) {
      if (row.groupId) {
        const group = grouped[row.groupId] || [];
        group.push(row.id);
        grouped[row.groupId] = group;
      }
    }

    return grouped;
  }
}

export function createCampaignGroupService(env: Env): CampaignGroupService {
  return new CampaignGroupService(env);
}
