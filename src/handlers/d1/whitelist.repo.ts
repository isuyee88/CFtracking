/**
 * @fileoverview Whitelist 数据仓库
 * @description 封装白名单相关数据库操作（含条件规则字段）
 * @module handlers/d1/whitelist.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type {
  WhitelistEntry,
  WhitelistQueryParams,
  WhitelistType,
  ListCondition,
  ListConditionMode,
} from '@/types/whitelist';

export class WhitelistRepository extends BaseRepository<WhitelistEntry> {
  constructor(db: D1Database) {
    super(db, 'whitelist');
  }

  private getTypeVariants(type: WhitelistType): WhitelistType[] {
    if (type === 'country' || type === 'geo') {
      return ['country', 'geo'];
    }

    return [type];
  }

  private mapEntry(row: Record<string, unknown> | null | undefined): WhitelistEntry | null {
    if (!row) return null;

    let conditions: ListCondition[] | undefined;
    const rawConditions = row.conditionsJson;
    if (typeof rawConditions === 'string' && rawConditions.trim()) {
      try {
        const parsed = JSON.parse(rawConditions);
        if (Array.isArray(parsed)) {
          conditions = parsed as ListCondition[];
        }
      } catch {
        // Keep backward compatibility when historical payload is malformed.
      }
    }

    return {
      ...(row as unknown as WhitelistEntry),
      synced: Boolean(row.synced),
      syncToPlatform: row.syncToPlatform === undefined ? true : Boolean(row.syncToPlatform),
      matchMode:
        typeof row.conditionMode === 'string' && (row.conditionMode === 'all' || row.conditionMode === 'any')
          ? (row.conditionMode as ListConditionMode)
          : undefined,
      conditions,
    };
  }

  async create(data: Omit<WhitelistEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhitelistEntry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO whitelist (
          id, trafficSourceId, type, value, name, reason, status, synced,
          syncedAt, campaignId, ipMatchMode, uaMatchMode, syncToPlatform,
          conditionMode, conditionsJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.ipMatchMode || null,
        data.uaMatchMode || null,
        data.syncToPlatform !== undefined ? (data.syncToPlatform ? 1 : 0) : 1,
        data.matchMode || null,
        data.conditions && data.conditions.length > 0 ? JSON.stringify(data.conditions) : null,
        now,
        now,
      )
      .run();

    const entry = await this.findById(id);
    return entry!;
  }

  async batchCreate(
    trafficSourceId: string,
    type: WhitelistType,
    items: Array<{
      value: string;
      name?: string;
      reason?: string;
      campaignId?: string;
    }>,
  ): Promise<WhitelistEntry[]> {
    const entries: WhitelistEntry[] = [];

    for (const item of items) {
      const existing = await this.findByValue(trafficSourceId, type, item.value);
      if (existing) {
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

  async findByParams(params: WhitelistQueryParams): Promise<WhitelistEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.trafficSourceId) {
      conditions.push('trafficSourceId = ?');
      values.push(params.trafficSourceId);
    }
    if (params.type) {
      const typeVariants = this.getTypeVariants(params.type);
      conditions.push(`(${typeVariants.map(() => 'type = ?').join(' OR ')})`);
      values.push(...typeVariants);
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
      .prepare(`SELECT * FROM whitelist ${whereClause} ORDER BY createdAt DESC`)
      .bind(...values)
      .all();

    return ((result.results as unknown as Record<string, unknown>[]) || [])
      .map((row) => this.mapEntry(row))
      .filter((item): item is WhitelistEntry => Boolean(item));
  }

  async findByValue(trafficSourceId: string, type: WhitelistType, value: string): Promise<WhitelistEntry | null> {
    const typeVariants = this.getTypeVariants(type);
    const typeClause = `(${typeVariants.map(() => 'type = ?').join(' OR ')})`;
    const result = await this.db
      .prepare(
        `
        SELECT * FROM whitelist
        WHERE trafficSourceId = ? AND ${typeClause} AND value = ?
        LIMIT 1
      `,
      )
      .bind(trafficSourceId, ...typeVariants, value)
      .first();

    return this.mapEntry(result as unknown as Record<string, unknown> | null);
  }

  async update(id: string, data: Partial<Omit<WhitelistEntry, 'id' | 'createdAt'>>): Promise<WhitelistEntry | null> {
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
    if (data.ipMatchMode !== undefined) {
      fields.push('ipMatchMode = ?');
      values.push(data.ipMatchMode);
    }
    if (data.uaMatchMode !== undefined) {
      fields.push('uaMatchMode = ?');
      values.push(data.uaMatchMode);
    }
    if (data.syncToPlatform !== undefined) {
      fields.push('syncToPlatform = ?');
      values.push(data.syncToPlatform ? 1 : 0);
    }
    if (data.matchMode !== undefined) {
      fields.push('conditionMode = ?');
      values.push(data.matchMode);
    }
    if (data.conditions !== undefined) {
      fields.push('conditionsJson = ?');
      values.push(data.conditions && data.conditions.length > 0 ? JSON.stringify(data.conditions) : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE whitelist SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async markSynced(id: string): Promise<void> {
    await this.db
      .prepare(
        `
        UPDATE whitelist
        SET synced = 1, syncedAt = ?, updatedAt = ?
        WHERE id = ?
      `,
      )
      .bind(new Date().toISOString(), new Date().toISOString(), id)
      .run();
  }

  async findUnsynced(trafficSourceId?: string): Promise<WhitelistEntry[]> {
    let sql = "SELECT * FROM whitelist WHERE synced = 0 AND status = 'active'";
    const values: unknown[] = [];

    if (trafficSourceId) {
      sql += ' AND trafficSourceId = ?';
      values.push(trafficSourceId);
    }
    sql += ' ORDER BY createdAt ASC';

    const result = await this.db.prepare(sql).bind(...values).all();
    return ((result.results as unknown as Record<string, unknown>[]) || [])
      .map((row) => this.mapEntry(row))
      .filter((item): item is WhitelistEntry => Boolean(item));
  }

  async remove(id: string): Promise<WhitelistEntry | null> {
    return this.update(id, { status: 'removed', synced: false });
  }

  async getStats(trafficSourceId: string): Promise<{
    total: number;
    active: number;
    synced: number;
    unsynced: number;
  }> {
    const result = await this.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN synced = 0 AND status = 'active' THEN 1 ELSE 0 END) as unsynced
        FROM whitelist
        WHERE trafficSourceId = ?
      `,
      )
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

  async findById(id: string): Promise<WhitelistEntry | null> {
    const result = await this.db.prepare('SELECT * FROM whitelist WHERE id = ? LIMIT 1').bind(id).first();
    return this.mapEntry(result as unknown as Record<string, unknown> | null);
  }
}
