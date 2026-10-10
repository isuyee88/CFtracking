/**
 * @fileoverview Affiliate Network 数据仓库
 * @description 封装 Affiliate Network 相关的所有数据库操作
 * @module handlers/d1/affiliateNetwork.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { AffiliateNetwork, CreateAffiliateNetworkDTO, UpdateAffiliateNetworkDTO } from '@/types/affiliateNetwork';
import { IdService } from '@/services/id.service';

export class AffiliateNetworkRepository extends BaseRepository<AffiliateNetwork> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'affiliateNetworks');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): AffiliateNetwork {
    const network = {
      ...row,
      id: row.displayId || row.id,
    } as AffiliateNetwork;

    if (network.offerParameters && typeof network.offerParameters === 'string') {
      try {
        network.offerParameters = JSON.parse(network.offerParameters);
      } catch {
        network.offerParameters = [];
      }
    }

    return network;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  async findByDisplayId(displayId: string): Promise<AffiliateNetwork | null> {
    const result = await this.db
      .prepare(`SELECT * FROM affiliateNetworks WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 创建 Affiliate Network
   */
  async create(data: CreateAffiliateNetworkDTO): Promise<AffiliateNetwork> {
    const displayId = await this.idService.generateId('affiliateNetworks');
    const now = new Date().toISOString();
    const offerParametersJson = data.offerParameters ? JSON.stringify(data.offerParameters) : null;

    await this.db
      .prepare(`
        INSERT INTO affiliateNetworks (id, displayId, name, type, status, apiUrl, apiKey, apiSecret, postbackUrl, offerParameters, notes, templateId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId,
        displayId,
        data.name,
        data.type || 'api',
        'active',
        data.apiUrl || null,
        data.apiKey || null,
        data.apiSecret || null,
        data.postbackUrl || null,
        offerParametersJson,
        data.notes || null,
        data.templateId || null,
        now,
        now
      )
      .run();

    const network = await this.findById(displayId);
    return network!;
  }

  /**
   * 更新 Affiliate Network
   */
  async update(id: string, data: UpdateAffiliateNetworkDTO): Promise<AffiliateNetwork | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.apiUrl !== undefined) { fields.push('apiUrl = ?'); values.push(data.apiUrl); }
    if (data.apiKey !== undefined) { fields.push('apiKey = ?'); values.push(data.apiKey); }
    if (data.apiSecret !== undefined) { fields.push('apiSecret = ?'); values.push(data.apiSecret); }
    if (data.postbackUrl !== undefined) { fields.push('postbackUrl = ?'); values.push(data.postbackUrl); }
    if (data.offerParameters !== undefined) { fields.push('offerParameters = ?'); values.push(JSON.stringify(data.offerParameters)); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.templateId !== undefined) { fields.push('templateId = ?'); values.push(data.templateId); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE affiliateNetworks SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按状态查询
   */
  async findByStatus(status: string): Promise<AffiliateNetwork[]> {
    return this.findBy('status', status);
  }

  /**
   * 按类型查询
   */
  async findByType(type: string): Promise<AffiliateNetwork[]> {
    return this.findBy('type', type);
  }

  /**
   * 查询列表（支持分页和过滤）
   */
  async findList(page = 1, pageSize = 20, status?: string): Promise<{ list: AffiliateNetwork[]; total: number }> {
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM affiliateNetworks WHERE 1=1';
    let listSql = 'SELECT * FROM affiliateNetworks WHERE 1=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (status) {
      countSql += ' AND status = ?';
      listSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    listSql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all(),
    ]);

    return {
      list: (listResult.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [],
      total: (countResult?.count as number) || 0,
    };
  }

  /**
   * 获取关联的 Offer 数量
   */
  async getOfferCount(networkId: string): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM offers
        WHERE network = ?
      `)
      .bind(networkId)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * 获取 Affiliate Network 统计数据
   */
  async getStats(networkId: string): Promise<{ clicks: number; conversions: number; revenue: number }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(ts.clicks), 0) as clicks,
          COALESCE(SUM(ts.conversions), 0) as conversions,
          COALESCE(SUM(ts.revenue), 0) as revenue
        FROM trafficSummary ts
        JOIN offers o ON ts.offerId = o.id
        WHERE o.network = ?
      `)
      .bind(networkId)
      .first<{ clicks: number; conversions: number; revenue: number }>();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0,
    };
  }
}
