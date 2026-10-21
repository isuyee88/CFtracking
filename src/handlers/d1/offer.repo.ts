/**
 * @fileoverview Offer 数据仓库
 * @description 封装 Offer 相关的所有数据库操作
 * @module handlers/d1/offer.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { Offer, CreateOfferDTO, UpdateOfferDTO } from '@/types/offer';
import { IdService } from '@/services/id.service';

// COUNT(*) scans the offers table; list/dashboard burst calls repeat the same
// count. Keep a short per-isolate memo; invalidation is bounded by TTL.
const COUNT_TTL_MS = 30_000;
const COUNT_CACHE = new Map<string, { value: number; expiresAt: number }>();

export class OfferRepository extends BaseRepository<Offer> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'offers');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): Offer {
    const offer = {
      ...row,
      id: row.displayId || row.id,
    } as Offer;
    if (typeof row.countries === 'string') {
      try { offer.countries = JSON.parse(row.countries); } catch { offer.countries = []; }
    }
    if (typeof row.metadata === 'string') {
      try { offer.metadata = JSON.parse(row.metadata); } catch { offer.metadata = {}; }
    }
    return offer;
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

  /**
   * Paginated list with optional status/search. The route previously ignored
   * these query params, so `status=active` returned the unfiltered list.
   */
  async findPage({ limit = 20, offset = 0, status, search }: {
    limit?: number; offset?: number; status?: string; search?: string;
  } = {}): Promise<{ list: Offer[]; total: number }> {
    const excluded = this.getExcludedStatusesCondition();
    const conditions: string[] = [excluded];
    const params: unknown[] = [];
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(name LIKE ? OR url LIKE ? OR displayId LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }
    const where = conditions.join(' AND ');
    const [list, total] = await Promise.all([
      this.db.prepare(`SELECT * FROM offers WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
      this.count(conditions.slice(1).join(' AND ') || undefined, params),
    ]);
    return {
      list: (list.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [],
      total,
    };
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
    const cacheKey = `${sql}|${JSON.stringify(params || [])}`;
    const cached = COUNT_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const stmt = this.db.prepare(sql);
    const bound = params ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    const value = (result?.count as number) || 0;
    COUNT_CACHE.set(cacheKey, { value, expiresAt: Date.now() + COUNT_TTL_MS });
    return value;
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
        INSERT INTO offers (id, displayId, name, url, payout, currency, payoutType, redirectType, network, "group", externalId, countries, metadata, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.externalId || null,
        data.countries ? JSON.stringify(data.countries) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        'active', 
        now, 
        now
      )
      .run();

    COUNT_CACHE.clear();
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
    if (data.externalId !== undefined) { fields.push('externalId = ?'); values.push(data.externalId); }
    if (data.countries !== undefined) { fields.push('countries = ?'); values.push(JSON.stringify(data.countries)); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(data.metadata)); }

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

    COUNT_CACHE.clear();
    return this.findById(id);
  }

  /**
   * 按状态查询
   */
  async findByStatus(status: string): Promise<Offer[]> {
    return this.findBy('status', status);
  }

  async findByExternalId(externalId: string): Promise<Offer | null> {
    const result = await this.db.prepare('SELECT * FROM offers WHERE externalId = ? LIMIT 1').bind(externalId).first();
    return result ? this.transform(result as Record<string, unknown>) : null;
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
