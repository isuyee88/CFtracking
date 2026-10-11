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
    const lp = {
      ...row,
      id: row.displayId || row.id,
    } as LandingPage;
    
    // 解析 JSON 字段
    if (typeof lp.content === 'string') {
      try {
        lp.content = JSON.parse(lp.content);
      } catch {
        lp.content = undefined;
      }
    }
    
    if (typeof lp.geo_targeting === 'string') {
      try {
        lp.geo_targeting = JSON.parse(lp.geo_targeting);
      } catch {
        lp.geo_targeting = undefined;
      }
    }
    
    // 转换 boolean
    if (typeof lp.is_public === 'number') {
      lp.is_public = lp.is_public === 1;
    }
    
    return lp;
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
    const displayId = await this.idService.generateId('landingPages');
    const now = new Date().toISOString();
    
    // 自动生成 URL
    const url = data.url || `/lp/${data.slug}`;

    await this.db
      .prepare(`
        INSERT INTO landingPages (
          id, displayId, name, url, slug, status, template, content,
          seo_title, geo_targeting, is_public, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId,
        displayId,
        data.name,
        url,
        data.slug,
        'active',
        data.template || 'betting-comparison',
        data.content ? JSON.stringify(data.content) : null,
        data.seo_title || data.name,
        data.geo_targeting ? JSON.stringify(data.geo_targeting) : null,
        data.is_public ? 1 : 0,
        now,
        now
      )
      .run();

    const lp = await this.findById(displayId);
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
    if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.template !== undefined) { fields.push('template = ?'); values.push(data.template); }
    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(JSON.stringify(data.content));
    }
    if (data.seo_title !== undefined) { fields.push('seo_title = ?'); values.push(data.seo_title); }
    if (data.geo_targeting !== undefined) {
      fields.push('geo_targeting = ?');
      values.push(JSON.stringify(data.geo_targeting));
    }
    if (data.is_public !== undefined) {
      fields.push('is_public = ?');
      values.push(data.is_public ? 1 : 0);
    }
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

  /**
   * 按 slug 查询（公开访问）
   */
  async findBySlug(slug: string): Promise<LandingPage | null> {
    const result = await this.db
      .prepare(`SELECT * FROM landingPages WHERE slug = ? AND is_public = 1 AND status = 'active'`)
      .bind(slug)
      .first();
    
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * Slug 是否存在
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM landingPages WHERE slug = ?';
    const params: unknown[] = [slug];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.prepare(sql).bind(...params).first();
    return !!result;
  }

  /**
   * 记录 Landing Page View
   */
  async recordView(data: {
    landingPageId: string;
    visitor_id: string;
    session_id: string;
    ip_address?: string;
    country?: string;
    referrer?: string;
  }): Promise<void> {
    const id = crypto.randomUUID();
    
    await this.db
      .prepare(`
        INSERT INTO landingPageViews (
          id, landingPageId, visitor_id, session_id,
          ip_address, country, referrer, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        id,
        data.landingPageId,
        data.visitor_id,
        data.session_id,
        data.ip_address || null,
        data.country || null,
        data.referrer || null
      )
      .run();
  }

  /**
   * 获取公开的 Landing Pages
   */
  async findPublic(limit = 50): Promise<LandingPage[]> {
    const { results } = await this.db
      .prepare(`
        SELECT * FROM landingPages
        WHERE is_public = 1 AND status = 'active'
        ORDER BY updatedAt DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();
    
    return results.map(r => this.transform(r as Record<string, unknown>));
  }
}
