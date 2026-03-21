/**
 * @fileoverview Landing Page 数据仓库
 * @description 封装 Landing Page 相关的所有数据库操作
 * @module handlers/d1/landingPage.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { LandingPage, CreateLandingPageDTO, UpdateLandingPageDTO } from '@/types/landingPage';
import { IdService } from '@/services/id.service';

export class LandingPageRepository extends BaseRepository<LandingPage> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'landingPages');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): LandingPage {
    return {
      ...row,
      id: row.displayId || row.id,
    } as LandingPage;
  }

  async findByDisplayId(displayId: string): Promise<LandingPage | null> {
    const result = await this.db
      .prepare(`SELECT * FROM landingPages WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 创建 Landing Page
   */
  async create(data: CreateLandingPageDTO): Promise<LandingPage> {
    const id = crypto.randomUUID();
    const displayId = await this.idService.generateId('landingPages');
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO landingPages (id, displayId, name, url, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, displayId, data.name, data.url, 'active', now, now)
      .run();

    const lp = await this.findById(id);
    return lp!;
  }

  /**
   * 更新 Landing Page
   */
  async update(id: string, data: UpdateLandingPageDTO): Promise<LandingPage | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.group !== undefined) { fields.push('"group" = ?'); values.push(data.group); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE landingPages SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按状态查询
   */
  async findByStatus(status: string): Promise<LandingPage[]> {
    return this.findBy('status', status);
  }

  /**
   * 检查 URL 是否已存在
   */
  async urlExists(url: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM landingPages WHERE url = ?';
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
  async getCampaignCount(landingPageId: string): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(DISTINCT f.campaignId) as count
        FROM flowLandingPages flp
        JOIN flows f ON flp.flowId = f.id
        WHERE flp.landingPageId = ?
      `)
      .bind(landingPageId)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * 获取 Landing Page 统计数据 (clicks, conversions)
   */
  async getStats(landingPageId: string): Promise<{ clicks: number; conversions: number }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions
        FROM trafficSummary
        WHERE landingPageId = ?
      `)
      .bind(landingPageId)
      .first<{ clicks: number; conversions: number }>();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
    };
  }
}
