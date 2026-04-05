/**
 * @fileoverview Offer 数据仓库
 * @description 封装 Offer 相关的所有数据库操作
 * @module handlers/d1/offer.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { Offer, CreateOfferDTO, UpdateOfferDTO } from '@/types/offer';
import { IdService } from '@/services/id.service';

export class OfferRepository extends BaseRepository<Offer> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'offers');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): Offer {
    return {
      ...row,
      id: row.displayId || row.id,
    } as Offer;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  protected getExcludedStatusesCondition(): string {
    return "status != 'deleted'";
  }

  async findAll(limit = 100, offset = 0): Promise<Offer[]> {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }

  async findBy(field: string, value: unknown): Promise<Offer[]> {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} AND ${field} = ?`)
      .bind(value)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }

  async findOneBy(field: string, value: unknown): Promise<Offer | null> {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} AND ${field} = ? LIMIT 1`)
      .bind(value)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  async count(conditions?: string, params?: unknown[]): Promise<number> {
    const excluded = this.getExcludedStatusesCondition();
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${excluded}`;
    if (conditions) {
      sql += ` AND ${conditions}`;
    }
    const stmt = this.db.prepare(sql);
    const bound = params ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    return (result?.count as number) || 0;
  }

  async exists(id: string): Promise<boolean> {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db
      .prepare(`SELECT 1 FROM ${this.tableName} WHERE ${excluded} AND id = ? LIMIT 1`)
      .bind(id)
      .first();
    return result !== null;
  }

  async findByDisplayId(displayId: string): Promise<Offer | null> {
    const result = await this.db
      .prepare(`SELECT * FROM offers WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 创建 Offer
   */
  async create(data: CreateOfferDTO): Promise<Offer> {
    const displayId = await this.idService.generateId('offers');
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO offers (id, displayId, name, url, payout, currency, payoutType, redirectType, network, "group", status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId, 
        displayId,
        data.name, 
        data.url, 
        data.payout || 0, 
        data.currency || 'USD',
        data.payoutType || 'fixed',
        data.redirectType || 'http',
        data.network || '',
        data.group || '',
        'active', 
        now, 
        now
      )
      .run();

    const offer = await this.findById(displayId);
    return offer!;
  }

  /**
   * 更新 Offer
   */
  async update(id: string, data: UpdateOfferDTO): Promise<Offer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.payout !== undefined) { fields.push('payout = ?'); values.push(data.payout); }
    if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
    if (data.payoutType !== undefined) { fields.push('payoutType = ?'); values.push(data.payoutType); }
    if (data.redirectType !== undefined) { fields.push('redirectType = ?'); values.push(data.redirectType); }
    if (data.network !== undefined) { fields.push('network = ?'); values.push(data.network); }
    if (data.group !== undefined) { fields.push('"group" = ?'); values.push(data.group); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE offers SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按状态查询
   */
  async findByStatus(status: string): Promise<Offer[]> {
    return this.findBy('status', status);
  }

  /**
   * 检查 URL 是否已存在
   */
  async urlExists(url: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM offers WHERE url = ?';
    const params: unknown[] = [url];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }

  /**
   * 获取关联的 Campaign 数量
   */
  async getCampaignCount(offerId: string): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(DISTINCT f.campaignId) as count
        FROM flowOffers fo
        JOIN flows f ON fo.flowId = f.id
        WHERE fo.offerId = ?
      `)
      .bind(offerId)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * 获取 Offer 统计数据 (clicks, conversions, revenue)
   */
  async getStats(offerId: string): Promise<{ clicks: number; conversions: number; revenue: number }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE offerId = ?
      `)
      .bind(offerId)
      .first<{ clicks: number; conversions: number; revenue: number }>();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0,
    };
  }
}
