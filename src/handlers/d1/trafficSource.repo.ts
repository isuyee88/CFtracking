/**
 * @fileoverview Traffic Source 数据仓库
 * @description 封装 Traffic Source 相关的所有数据库操作
 * @module handlers/d1/trafficSource.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { TrafficSource, CreateTrafficSourceDTO, UpdateTrafficSourceDTO } from '@/types/trafficSource';
import { IdService } from '@/services/id.service';

export const GENERAL_TRAFFIC_SOURCE_ID = 'general';
export const GENERAL_TRAFFIC_SOURCE_NAME = 'General Traffic Source';

export class TrafficSourceRepository extends BaseRepository<TrafficSource> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'trafficSources');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): TrafficSource {
    const result: TrafficSource = {
      ...row,
      id: row.displayId || row.id,
    } as TrafficSource;
    if (row.parameters && typeof row.parameters === 'string') {
      result.parameters = JSON.parse(row.parameters as string);
    }
    if (row.postbackConfig && typeof row.postbackConfig === 'string') {
      result.postbackConfig = JSON.parse(row.postbackConfig as string);
    }
    if (row.apiConfig && typeof row.apiConfig === 'string') {
      result.apiConfig = JSON.parse(row.apiConfig as string);
    }
    return result;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  async findByDisplayId(displayId: string): Promise<TrafficSource | null> {
    const result = await this.db
      .prepare(`SELECT * FROM trafficSources WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  async resolveStorageId(identifier: string): Promise<string | null> {
    const result = await this.db
      .prepare(`SELECT id FROM trafficSources WHERE id = ? OR displayId = ? LIMIT 1`)
      .bind(identifier, identifier)
      .first<{ id: string }>();

    return result?.id || null;
  }

  async findByIdentifierWithStorageId(
    identifier: string
  ): Promise<{ trafficSource: TrafficSource; storageId: string } | null> {
    const result = await this.db
      .prepare(`SELECT * FROM trafficSources WHERE id = ? OR displayId = ? LIMIT 1`)
      .bind(identifier, identifier)
      .first<Record<string, unknown>>();

    if (!result || typeof result.id !== 'string') {
      return null;
    }

    return {
      trafficSource: this.transform(result),
      storageId: result.id,
    };
  }

  async ensureGeneralTrafficSource(): Promise<{ trafficSource: TrafficSource; storageId: string }> {
    const existing = await this.findByIdentifierWithStorageId(GENERAL_TRAFFIC_SOURCE_ID);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    await this.db
      .prepare(`
        INSERT OR IGNORE INTO trafficSources (
          id, name, type, status, postbackUrl, costModel, costValue, currency, parameters, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        GENERAL_TRAFFIC_SOURCE_ID,
        GENERAL_TRAFFIC_SOURCE_NAME,
        'other',
        'active',
        null,
        'cpc',
        0,
        'USD',
        '{}',
        now,
        now
      )
      .run();

    const ensured = await this.findByIdentifierWithStorageId(GENERAL_TRAFFIC_SOURCE_ID);
    if (!ensured) {
      throw new Error('Failed to create general traffic source');
    }

    return ensured;
  }

  /**
   * 创建 Traffic Source
   */
  async create(data: CreateTrafficSourceDTO): Promise<TrafficSource> {
    const displayId = await this.idService.generateId('trafficSources');
    const now = new Date().toISOString();

    // Convert complex objects to JSON strings
    const apiConfigStr = data.apiConfig ? JSON.stringify(data.apiConfig) : null;
    const parametersStr = data.parameters ? JSON.stringify(data.parameters) : null;
    const postbackConfigStr = data.postbackConfig ? JSON.stringify(data.postbackConfig) : null;

    await this.db
      .prepare(`
        INSERT INTO trafficSources (
          id, displayId, name, type, status, postbackUrl, costModel, costValue, currency, 
          parameters, postbackConfig, apiConfig, templateId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId,
        displayId,
        data.name,
        data.type || 'other',
        'active',
        data.postbackUrl || null,
        data.costModel || 'cpc',
        data.costValue || 0,
        data.currency || 'USD',
        parametersStr,
        postbackConfigStr,
        apiConfigStr,
        data.templateId || null,
        now,
        now
      )
      .run();

    const ts = await this.findById(displayId);
    return ts!;
  }

  /**
   * 更新 Traffic Source
   */
  async update(id: string, data: UpdateTrafficSourceDTO): Promise<TrafficSource | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.postbackUrl !== undefined) { fields.push('postbackUrl = ?'); values.push(data.postbackUrl); }
    if (data.costModel !== undefined) { fields.push('costModel = ?'); values.push(data.costModel); }
    if (data.costValue !== undefined) { fields.push('costValue = ?'); values.push(data.costValue); }
    if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.templateId !== undefined) { fields.push('templateId = ?'); values.push(data.templateId); }
    
    if (data.parameters !== undefined) { 
      fields.push('parameters = ?'); 
      values.push(data.parameters ? JSON.stringify(data.parameters) : null); 
    }
    
    if (data.postbackConfig !== undefined) { 
      fields.push('postbackConfig = ?'); 
      values.push(data.postbackConfig ? JSON.stringify(data.postbackConfig) : null); 
    }
    
    if (data.apiConfig !== undefined) { 
      fields.push('apiConfig = ?'); 
      values.push(data.apiConfig ? JSON.stringify(data.apiConfig) : null); 
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE trafficSources SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按状态查询
   */
  async findByStatus(status: string): Promise<TrafficSource[]> {
    return this.findBy('status', status);
  }

  /**
   * 按类型查询
   */
  async findByType(type: string): Promise<TrafficSource[]> {
    return this.findBy('type', type);
  }

  /**
   * 按模板 ID 查询
   */
  async findByTemplate(templateId: string): Promise<TrafficSource[]> {
    return this.findBy('templateId', templateId);
  }

  /**
   * 查询列表（支持分页和过滤）
   */
  async findList(page = 1, pageSize = 20, status?: string): Promise<{ list: TrafficSource[]; total: number }> {
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM trafficSources WHERE 1=1';
    let listSql = 'SELECT * FROM trafficSources WHERE 1=1';
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
   * 获取关联的 Campaign 数量
   */
  async getCampaignCount(trafficSourceId: string): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM campaigns
        WHERE trafficSource = ?
      `)
      .bind(trafficSourceId)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * 获取 Traffic Source 统计数据
   */
  async getStats(
    trafficSourceId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ clicks: number; conversions: number; revenue: number; cost: number }> {
    let sql = `
      SELECT 
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(spend), 0) as cost
      FROM trafficSummary
      WHERE campaignId IN (
        SELECT id FROM campaigns WHERE trafficSource = ?
      )
    `;
    const params: unknown[] = [trafficSourceId];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    const result = await this.db
      .prepare(sql)
      .bind(...params)
      .first<{ clicks: number; conversions: number; revenue: number; cost: number }>();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0,
      cost: result?.cost || 0,
    };
  }
}
