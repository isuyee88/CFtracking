/**
 * @fileoverview Campaign 数据仓库
 * @description 封装 Campaign 相关的所有数据库操作
 * @module handlers/d1/campaign.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { Campaign, CreateCampaignDTO, UpdateCampaignDTO, CampaignListQuery } from '@/types/campaign';
import { generateApiToken } from '@/utils/crypto';
import { IdService } from '@/services/id.service';

export class CampaignRepository extends BaseRepository<Campaign> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'campaigns');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): Campaign {
    return {
      ...row,
      id: row.displayId || row.id,
      parameters: row.parameters ? JSON.parse(row.parameters as string) : {},
    } as Campaign;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  async findByDisplayId(displayId: string): Promise<Campaign | null> {
    const result = await this.db
      .prepare(`SELECT * FROM campaigns WHERE displayId = ?`)
      .bind(displayId)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  async findByApiToken(apiToken: string): Promise<Campaign | null> {
    const result = await this.db
      .prepare(`SELECT * FROM campaigns WHERE apiToken = ? LIMIT 1`)
      .bind(apiToken)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  /**
   * 重新生成 apiToken
   */
  async regenerateApiToken(id: string): Promise<string> {
    const apiToken = generateApiToken();
    await this.db
      .prepare(`UPDATE campaigns SET apiToken = ?, updatedAt = ? WHERE id = ?`)
      .bind(apiToken, new Date().toISOString(), id)
      .run();
    return apiToken;
  }

  /**
   * 创建 Campaign
   */
  async create(data: CreateCampaignDTO): Promise<Campaign> {
    const displayId = await this.idService.generateId('campaigns');
    const now = new Date().toISOString();
    const apiToken = generateApiToken();
    const parameters = data.parameters ? JSON.stringify(data.parameters) : '{}';

    await this.db
      .prepare(`
        INSERT INTO campaigns (
          id, displayId, name, alias, domain, "group", trafficSource, 
          flowRotation, costModel, costValue, currency, trafficLoss, 
          uniquenessMethod, uniquenessParameter, uniquenessTTL, 
          visitorBinding, apiToken, parameters, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId,
        displayId,
        data.name,
        data.alias,
        data.domain,
        data.group || null,
        data.trafficSource || null,
        data.flowRotation || 'position',
        data.costModel || 'cpc',
        data.costValue || 0,
        data.currency || 'USD',
        data.trafficLoss || 0,
        data.uniquenessMethod || 'none',
        data.uniquenessParameter || null,
        data.uniquenessTTL || 86400,
        data.visitorBinding || 'none',
        apiToken,
        parameters,
        'active',
        now,
        now
      )
      .run();

    const campaign = await this.findById(displayId);
    return campaign!;
  }

  /**
   * 更新 Campaign
   */
  async update(id: string, data: UpdateCampaignDTO): Promise<Campaign | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.alias !== undefined) { fields.push('alias = ?'); values.push(data.alias); }
    if (data.domain !== undefined) { fields.push('domain = ?'); values.push(data.domain); }
    if (data.group !== undefined) { fields.push('"group" = ?'); values.push(data.group); }
    if (data.trafficSource !== undefined) { fields.push('trafficSource = ?'); values.push(data.trafficSource); }
    if (data.flowRotation !== undefined) { fields.push('flowRotation = ?'); values.push(data.flowRotation); }
    if (data.costModel !== undefined) { fields.push('costModel = ?'); values.push(data.costModel); }
    if (data.costValue !== undefined) { fields.push('costValue = ?'); values.push(data.costValue); }
    if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
    if (data.trafficLoss !== undefined) { fields.push('trafficLoss = ?'); values.push(data.trafficLoss); }
    if (data.uniquenessMethod !== undefined) { fields.push('uniquenessMethod = ?'); values.push(data.uniquenessMethod); }
    if (data.uniquenessParameter !== undefined) { fields.push('uniquenessParameter = ?'); values.push(data.uniquenessParameter); }
    if (data.uniquenessTTL !== undefined) { fields.push('uniquenessTTL = ?'); values.push(data.uniquenessTTL); }
    if (data.visitorBinding !== undefined) { fields.push('visitorBinding = ?'); values.push(data.visitorBinding); }
    if (data.parameters !== undefined) { fields.push('parameters = ?'); values.push(JSON.stringify(data.parameters)); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 按 alias 查询
   */
  async findByAlias(alias: string): Promise<Campaign | null> {
    return this.findOneBy('alias', alias);
  }

  /**
   * 按 status 查询列表
   */
  async findByStatus(status: string, limit = 100, offset = 0): Promise<Campaign[]> {
    const result = await this.db
      .prepare(`SELECT * FROM campaigns WHERE status = ? LIMIT ? OFFSET ?`)
      .bind(status, limit, offset)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }

  /**
   * 查询列表（支持搜索和过滤）
   */
  async findList(query: CampaignListQuery): Promise<{ list: Campaign[]; total: number }> {
    const { page = 1, pageSize = 20, status, search } = query;
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM campaigns WHERE 1=1';
    let listSql = 'SELECT * FROM campaigns WHERE 1=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (status) {
      countSql += ' AND status = ?';
      listSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR alias LIKE ?)';
      listSql += ' AND (name LIKE ? OR alias LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
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
   * 检查 alias 是否已存在
   */
  async aliasExists(alias: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM campaigns WHERE alias = ?';
    const params: unknown[] = [alias];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }
}
