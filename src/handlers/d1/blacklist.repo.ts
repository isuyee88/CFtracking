/**
 * @fileoverview Blacklist 数据仓库
 * @description 封装黑名单相关的所有数据库操作
 * @module handlers/d1/blacklist.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { BlacklistEntry, BlacklistQueryParams, BlacklistType } from '@/types/blacklist';

export class BlacklistRepository extends BaseRepository<BlacklistEntry> {
  constructor(db: D1Database) {
    super(db, 'blacklist');
  }

  /**
   * 创建黑名单条目
   */
  async create(data: Omit<BlacklistEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlacklistEntry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO blacklist (
          id, trafficSourceId, type, value, name, reason, status, synced,
          syncedAt, campaignId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.trafficSourceId,
        data.type,
        data.value,
        data.name || null,
        data.reason || null,
        data.status || 'active',
        data.synced || false,
        data.syncedAt || null,
        data.campaignId || null,
        now,
        now
      )
      .run();

    const entry = await this.findById(id);
    return entry!;
  }

  /**
   * 批量创建黑名单条目
   */
  async batchCreate(
    trafficSourceId: string,
    type: BlacklistType,
    items: Array<{
      value: string;
      name?: string;
      reason?: string;
      campaignId?: string;
    }>
  ): Promise<BlacklistEntry[]> {
    const entries: BlacklistEntry[] = [];

    for (const item of items) {
      // 检查是否已存在
      const existing = await this.findByValue(trafficSourceId, type, item.value);
      if (existing) {
        // 如果已存在但状态为 removed，则重新激活
        if (existing.status === 'removed') {
          await this.update(existing.id, {
            status: 'active',
            reason: item.reason || existing.reason,
            synced: false,
          });
          const updated = await this.findById(existing.id);
          if (updated) entries.push(updated);
        }
        continue;
      }

      const entry = await this.create({
        trafficSourceId,
        type,
        value: item.value,
        name: item.name,
        reason: item.reason,
        status: 'active',
        synced: false,
        campaignId: item.campaignId,
      });
      entries.push(entry);
    }

    return entries;
  }

  /**
   * 根据条件查询黑名单
   */
  async findByParams(params: BlacklistQueryParams): Promise<BlacklistEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.trafficSourceId) {
      conditions.push('trafficSourceId = ?');
      values.push(params.trafficSourceId);
    }
    if (params.type) {
      conditions.push('type = ?');
      values.push(params.type);
    }
    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.synced !== undefined) {
      conditions.push('synced = ?');
      values.push(params.synced ? 1 : 0);
    }
    if (params.campaignId) {
      conditions.push('campaignId = ?');
      values.push(params.campaignId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db
      .prepare(`SELECT * FROM blacklist ${whereClause} ORDER BY createdAt DESC`)
      .bind(...values)
      .all();

    return (result.results as unknown as BlacklistEntry[]) || [];
  }

  /**
   * 根据值查找黑名单条目
   */
  async findByValue(
    trafficSourceId: string,
    type: BlacklistType,
    value: string
  ): Promise<BlacklistEntry | null> {
    const result = await this.db
      .prepare(`
        SELECT * FROM blacklist
        WHERE trafficSourceId = ? AND type = ? AND value = ?
        LIMIT 1
      `)
      .bind(trafficSourceId, type, value)
      .first();

    return result as BlacklistEntry | null;
  }

  /**
   * 更新黑名单条目
   */
  async update(
    id: string,
    data: Partial<Omit<BlacklistEntry, 'id' | 'createdAt'>>
  ): Promise<BlacklistEntry | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.reason !== undefined) {
      fields.push('reason = ?');
      values.push(data.reason);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.synced !== undefined) {
      fields.push('synced = ?');
      values.push(data.synced ? 1 : 0);
    }
    if (data.syncedAt !== undefined) {
      fields.push('syncedAt = ?');
      values.push(data.syncedAt);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE blacklist SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 标记为已同步
   */
  async markSynced(id: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE blacklist
        SET synced = 1, syncedAt = ?, updatedAt = ?
        WHERE id = ?
      `)
      .bind(new Date().toISOString(), new Date().toISOString(), id)
      .run();
  }

  /**
   * 获取未同步的黑名单条目
   */
  async findUnsynced(trafficSourceId?: string): Promise<BlacklistEntry[]> {
    let sql = 'SELECT * FROM blacklist WHERE synced = 0 AND status = \'active\'';
    const values: unknown[] = [];

    if (trafficSourceId) {
      sql += ' AND trafficSourceId = ?';
      values.push(trafficSourceId);
    }

    sql += ' ORDER BY createdAt ASC';

    const result = await this.db.prepare(sql).bind(...values).all();
    return (result.results as unknown as BlacklistEntry[]) || [];
  }

  /**
   * 从黑名单中移除（软删除）
   */
  async remove(id: string): Promise<BlacklistEntry | null> {
    return this.update(id, { status: 'removed', synced: false });
  }

  /**
   * 获取黑名单统计
   */
  async getStats(trafficSourceId: string): Promise<{
    total: number;
    active: number;
    synced: number;
    unsynced: number;
  }> {
    const result = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN synced = 0 AND status = 'active' THEN 1 ELSE 0 END) as unsynced
        FROM blacklist
        WHERE trafficSourceId = ?
      `)
      .bind(trafficSourceId)
      .first<{
        total: number;
        active: number;
        synced: number;
        unsynced: number;
      }>();

    return {
      total: result?.total || 0,
      active: result?.active || 0,
      synced: result?.synced || 0,
      unsynced: result?.unsynced || 0,
    };
  }
}
