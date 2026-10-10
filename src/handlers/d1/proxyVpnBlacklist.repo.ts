/**
 * @fileoverview 代理/VPN黑名单数据仓库
 * @description 处理代理/VPN黑名单的数据库操作
 * @module handlers/d1/proxyVpnBlacklist.repo
 */

import type { D1Database } from './index';
import type {
  ProxyVPNBlacklistEntry,
  ProxyVPNBlacklistCreateInput,
  ProxyVPNBlacklistRepository,
  ProxyVPNType,
  DetectionSeverity,
} from '@/types/ipDetection';
import { nanoid } from 'nanoid';

export class ProxyVPNBlacklistRepo implements ProxyVPNBlacklistRepository {
  constructor(private db: D1Database) {}

  async findByIP(ip: string): Promise<ProxyVPNBlacklistEntry | null> {
    const now = new Date().toISOString();

    return await this.db
      .prepare(`
        SELECT * FROM proxyVpnBlacklist 
        WHERE (ip = ? OR (ipRange IS NOT NULL AND ? LIKE ipRange || '%'))
        AND (autoExpire = 0 OR expiresAt IS NULL OR expiresAt > ?)
        LIMIT 1
      `)
      .bind(ip, ip, now)
      .first<ProxyVPNBlacklistEntry>();
  }

  async create(input: ProxyVPNBlacklistCreateInput): Promise<ProxyVPNBlacklistEntry> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO proxyVpnBlacklist (
          id, ip, ipRange, type, reason, source, severity, autoExpire, expiresAt, notes, createdBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        input.ip,
        input.ipRange || null,
        input.type,
        input.reason || 'manual',
        input.source || 'manual',
        input.severity || 'high',
        input.autoExpire ? 1 : 0,
        input.expiresAt || null,
        input.notes || null,
        input.createdBy || null,
        now,
        now
      )
      .run();

    return (await this.db.prepare('SELECT * FROM proxyVpnBlacklist WHERE id = ?').bind(id).first())!;
  }

  async update(
    id: string,
    input: Partial<ProxyVPNBlacklistCreateInput>
  ): Promise<ProxyVPNBlacklistEntry> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.ipRange !== undefined) {
      updates.push('ipRange = ?');
      values.push(input.ipRange);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.reason !== undefined) {
      updates.push('reason = ?');
      values.push(input.reason);
    }
    if (input.source !== undefined) {
      updates.push('source = ?');
      values.push(input.source);
    }
    if (input.severity !== undefined) {
      updates.push('severity = ?');
      values.push(input.severity);
    }
    if (input.autoExpire !== undefined) {
      updates.push('autoExpire = ?');
      values.push(input.autoExpire ? 1 : 0);
    }
    if (input.expiresAt !== undefined) {
      updates.push('expiresAt = ?');
      values.push(input.expiresAt);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db
        .prepare(`UPDATE proxyVpnBlacklist SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return (await this.db
      .prepare('SELECT * FROM proxyVpnBlacklist WHERE id = ?')
      .bind(id)
      .first())!;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM proxyVpnBlacklist WHERE id = ?').bind(id).run();
  }

  async list(options: {
    page?: number;
    pageSize?: number;
    type?: ProxyVPNType;
    severity?: DetectionSeverity;
  } = {}): Promise<{ list: ProxyVPNBlacklistEntry[]; total: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: any[] = [];

    if (options.type) {
      whereClause += ' AND type = ?';
      params.push(options.type);
    }
    if (options.severity) {
      whereClause += ' AND severity = ?';
      params.push(options.severity);
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM proxyVpnBlacklist WHERE ${whereClause}`)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    const results = await this.db
      .prepare(
        `SELECT * FROM proxyVpnBlacklist WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, pageSize, offset)
      .all<ProxyVPNBlacklistEntry>();

    return { list: results.results || [], total };
  }

  async batchCreate(entries: ProxyVPNBlacklistCreateInput[]): Promise<number> {
    const now = new Date().toISOString();
    let successCount = 0;

    for (const entry of entries) {
      try {
        const id = nanoid();
        await this.db
          .prepare(`
            INSERT OR IGNORE INTO proxyVpnBlacklist (
              id, ip, ipRange, type, reason, source, severity, autoExpire, expiresAt, notes, createdBy, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            id,
            entry.ip,
            entry.ipRange || null,
            entry.type,
            entry.reason || 'manual',
            entry.source || 'manual',
            entry.severity || 'high',
            entry.autoExpire ? 1 : 0,
            entry.expiresAt || null,
            entry.notes || null,
            entry.createdBy || null,
            now,
            now
          )
          .run();
        successCount++;
      } catch (error) {
        console.error(`Failed to add IP ${entry.ip} to blacklist:`, error);
      }
    }

    return successCount;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare('DELETE FROM proxyVpnBlacklist WHERE autoExpire = 1 AND expiresAt <= ?')
      .bind(now)
      .run();
    return result.meta.changes || 0;
  }

  async getStats(): Promise<{
    total: number;
    byType: Record<ProxyVPNType, number>;
    bySeverity: Record<DetectionSeverity, number>;
  }> {
    const totalResult = await this.db
      .prepare('SELECT COUNT(*) as total FROM proxyVpnBlacklist')
      .first<{ total: number }>();

    const byTypeResult = await this.db
      .prepare('SELECT type, COUNT(*) as count FROM proxyVpnBlacklist GROUP BY type')
      .all<{ type: ProxyVPNType; count: number }>();

    const bySeverityResult = await this.db
      .prepare('SELECT severity, COUNT(*) as count FROM proxyVpnBlacklist GROUP BY severity')
      .all<{ severity: DetectionSeverity; count: number }>();

    const byType: Record<ProxyVPNType, number> = {
      proxy: 0,
      vpn: 0,
      tor: 0,
      datacenter: 0,
      mixed: 0,
    };

    const bySeverity: Record<DetectionSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const r of byTypeResult.results || []) {
      byType[r.type] = r.count;
    }

    for (const r of bySeverityResult.results || []) {
      bySeverity[r.severity] = r.count;
    }

    return {
      total: totalResult?.total || 0,
      byType,
      bySeverity,
    };
  }
}

export function createProxyVPNBlacklistRepo(db: D1Database): ProxyVPNBlacklistRepo {
  return new ProxyVPNBlacklistRepo(db);
}
