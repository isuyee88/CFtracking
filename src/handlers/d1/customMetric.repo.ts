/**
 * @fileoverview 自定义指标数据仓库
 * @description 封装自定义指标相关的所有数据库操作
 * @module handlers/d1/customMetric.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type {
  CustomMetric,
  CreateCustomMetricDTO,
  UpdateCustomMetricDTO,
  CustomMetricListParams,
  CustomMetricListResult,
} from '@/types/customMetric';
import { nanoid } from 'nanoid';

export class CustomMetricRepository extends BaseRepository<CustomMetric> {
  constructor(db: D1Database) {
    super(db, 'customMetrics');
  }

  /**
   * 创建自定义指标
   */
  async create(data: CreateCustomMetricDTO): Promise<CustomMetric> {
    const id = `metric_${nanoid(12)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO customMetrics (
          id, name, displayName, description, type, formula,
          dataType, format, decimals, prefix, suffix,
          status, isSystem, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.name,
        data.displayName,
        data.description || null,
        data.type || 'calculated',
        data.formula,
        data.dataType || 'number',
        data.format || 'number',
        data.decimals || 2,
        data.prefix || null,
        data.suffix || null,
        'active',
        0,
        now,
        now
      )
      .run();

    const metric = await this.findById(id);
    return metric!;
  }

  /**
   * 更新自定义指标
   */
  async update(id: string, data: UpdateCustomMetricDTO): Promise<CustomMetric | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.displayName !== undefined) {
      fields.push('displayName = ?');
      values.push(data.displayName);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.formula !== undefined) {
      fields.push('formula = ?');
      values.push(data.formula);
    }
    if (data.dataType !== undefined) {
      fields.push('dataType = ?');
      values.push(data.dataType);
    }
    if (data.format !== undefined) {
      fields.push('format = ?');
      values.push(data.format);
    }
    if (data.decimals !== undefined) {
      fields.push('decimals = ?');
      values.push(data.decimals);
    }
    if (data.prefix !== undefined) {
      fields.push('prefix = ?');
      values.push(data.prefix);
    }
    if (data.suffix !== undefined) {
      fields.push('suffix = ?');
      values.push(data.suffix);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await this.db
      .prepare(`UPDATE customMetrics SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 获取自定义指标列表
   */
  async findMetrics(params: CustomMetricListParams): Promise<CustomMetricListResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.type) {
      conditions.push('type = ?');
      values.push(params.type);
    }
    if (params.search) {
      conditions.push('(name LIKE ? OR displayName LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 获取总数
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM customMetrics ${whereClause}`)
      .bind(...values)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    // 获取列表
    const listResult = await this.db
      .prepare(`
        SELECT * FROM customMetrics 
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, pageSize, offset)
      .all();

    return {
      list: (listResult.results as unknown as CustomMetric[]) || [],
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据名称查找指标
   */
  async findByName(name: string): Promise<CustomMetric | null> {
    const result = await this.db
      .prepare('SELECT * FROM customMetrics WHERE name = ?')
      .bind(name)
      .first();
    return result as CustomMetric | null;
  }

  /**
   * 获取所有活跃的指标
   */
  async getActiveMetrics(): Promise<CustomMetric[]> {
    const result = await this.db
      .prepare("SELECT * FROM customMetrics WHERE status = 'active' ORDER BY name ASC")
      .all();
    return (result.results as unknown as CustomMetric[]) || [];
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<CustomMetric[]> {
    const result = await this.db
      .prepare("SELECT * FROM customMetrics WHERE isSystem = 1 AND status = 'active'")
      .all();
    return (result.results as unknown as CustomMetric[]) || [];
  }

  /**
   * 检查名称是否已存在
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM customMetrics WHERE name = ?';
    const values: unknown[] = [name];

    if (excludeId) {
      sql += ' AND id != ?';
      values.push(excludeId);
    }

    const result = await this.db
      .prepare(sql)
      .bind(...values)
      .first<{ count: number }>();

    return (result?.count || 0) > 0;
  }
}
