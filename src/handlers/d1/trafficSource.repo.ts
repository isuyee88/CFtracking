/**
 * @fileoverview Traffic Source 数据仓库
 * @description 封装 Traffic Source 相关的所有数据库操作
 * @module handlers/d1/trafficSource.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { TrafficSource, CreateTrafficSourceDTO, UpdateTrafficSourceDTO } from '@/types/trafficSource';
import { IdService } from '@/services/id.service';

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

  async findByDisplayId(displayId: string): Promise<TrafficSource | null> {
    const result = await this.db
      .prepare(`SELECT * FROM trafficSources WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 创建 Traffic Source
   */
  async create(data: CreateTrafficSourceDTO): Promise<TrafficSource> {
    const id = crypto.randomUUID();
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
        id,
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

    const ts = await this.findById(id);
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
   * 按模板ID查询
   */
  async findByTemplate(templateId: string): Promise<TrafficSource[]> {
    return this.findBy('templateId', templateId);
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
  async getStats(trafficSourceId: string): Promise<{ clicks: number; conversions: number; revenue: number; cost: number }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(spend), 0) as cost
        FROM trafficSummary
        WHERE campaignId IN (
          SELECT id FROM campaigns WHERE trafficSource = ?
        )
      `)
      .bind(trafficSourceId)
      .first<{ clicks: number; conversions: number; revenue: number; cost: number }>();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0,
      cost: result?.cost || 0,
    };
  }
}
