/**
 * @fileoverview ID 生成服务
 * @description 生成带前缀的自增 ID，格式: {前缀}{数字}
 * @module services/id.service
 * 
 * ID 前缀设计:
 * - Campaign: c (c1, c100, c9999)
 * - Flow: f (f1, f50)
 * - Landing Page: lp (lp1, lp20)
 * - Offer: o (o1, o50)
 * - Traffic Source: ts (ts1, ts10)
 * - Affiliate Network: an (an1, an5)
 * - Rule: r (r1, r10)
 */

import type { D1Database } from '@/handlers/d1/index';

export type IdPrefix = 'c' | 'f' | 'lp' | 'o' | 'ts' | 'an' | 'r' | 'd';

export const ID_PREFIXES: Record<string, IdPrefix> = {
  campaigns: 'c',
  flows: 'f',
  landingPages: 'lp',
  offers: 'o',
  trafficSources: 'ts',
  affiliateNetworks: 'an',
  rules: 'r',
  domains: 'd',
} as const;

export class IdService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * 生成下一个带前缀的 ID
   * @param tableName 表名
   * @returns 带前缀的 ID，如 "c1", "o50"
   */
  async generateId(tableName: string): Promise<string> {
    const prefix = ID_PREFIXES[tableName];
    if (!prefix) {
      throw new Error(`Unknown table name: ${tableName}`);
    }

    const nextNumber = await this.getNextNumber(tableName);
    return `${prefix}${nextNumber}`;
  }

  /**
   * 获取下一个序号
   * 使用数据库事务确保原子性
   */
  private async getNextNumber(tableName: string): Promise<number> {
    const now = new Date().toISOString();

    const counter = await this.db
      .prepare('SELECT currentNumber FROM idCounters WHERE tableName = ?')
      .bind(tableName)
      .first<{ currentNumber: number }>();

    if (counter) {
      const newNumber = counter.currentNumber + 1;
      await this.db
        .prepare('UPDATE idCounters SET currentNumber = ?, updatedAt = ? WHERE tableName = ?')
        .bind(newNumber, now, tableName)
        .run();
      return newNumber;
    } else {
      await this.db
        .prepare('INSERT INTO idCounters (tableName, currentNumber, createdAt, updatedAt) VALUES (?, 1, ?, ?)')
        .bind(tableName, now, now)
        .run();
      return 1;
    }
  }

  /**
   * 批量生成 ID（用于数据迁移）
   * @param tableName 表名
   * @param count 数量
   * @returns ID 数组
   */
  async generateBatch(tableName: string, count: number): Promise<string[]> {
    const prefix = ID_PREFIXES[tableName];
    if (!prefix) {
      throw new Error(`Unknown table name: ${tableName}`);
    }

    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = await this.generateId(tableName);
      ids.push(id);
    }
    return ids;
  }

  /**
   * 解析 ID 获取表名
   * @param displayId 带前缀的 ID
   * @returns 表名或 null
   */
  static getTableNameFromId(displayId: string): string | null {
    if (!displayId || displayId.length < 2) return null;

    if (displayId.startsWith('lp')) return 'landingPages';
    if (displayId.startsWith('ts')) return 'trafficSources';
    if (displayId.startsWith('an')) return 'affiliateNetworks';
    if (displayId.startsWith('clk')) return 'clicks';
    if (displayId.startsWith('conv')) return 'conversions';
    
    const prefix = displayId[0];
    switch (prefix) {
      case 'c': return 'campaigns';
      case 'f': return 'flows';
      case 'o': return 'offers';
      case 'r': return 'rules';
      case 'd': return 'domains';
      default: return null;
    }
  }

  /**
   * 验证 ID 格式
   * @param displayId 带前缀的 ID
   * @param expectedTable 期望的表名
   * @returns 是否有效
   */
  static validateId(displayId: string, expectedTable: string): boolean {
    const tableName = IdService.getTableNameFromId(displayId);
    return tableName === expectedTable;
  }
}

/**
 * 创建 ID 服务实例
 */
export function createIdService(db: D1Database): IdService {
  return new IdService(db);
}
