/**
 * @fileoverview 导出任务数据仓库
 * @description 封装导出任务相关的所有数据库操作
 * @module handlers/d1/exportTask.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type {
  ExportTask,
  CreateExportTaskDTO,
  UpdateExportTaskDTO,
  ExportTaskListParams,
  ExportTaskListResult,
} from '@/types/exportTask';
import { nanoid } from 'nanoid';

export class ExportTaskRepository extends BaseRepository<ExportTask> {
  constructor(db: D1Database) {
    super(db, 'exportTasks');
  }

  /**
   * 创建导出任务
   */
  async create(data: CreateExportTaskDTO): Promise<ExportTask> {
    const id = `export_${nanoid(12)}`;
    const now = new Date().toISOString();
    
    // 设置过期时间(7天后)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db
      .prepare(`
        INSERT INTO exportTasks (
          id, name, entityType, format, status, progress,
          filters, dateRange, fields, retryCount,
          createdBy, createdAt, updatedAt, expiresAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.name,
        data.entityType,
        data.format,
        'pending',
        0,
        JSON.stringify(data.filters || {}),
        data.dateRange ? JSON.stringify(data.dateRange) : null,
        JSON.stringify(data.fields || []),
        0,
        data.createdBy || null,
        now,
        now,
        expiresAt.toISOString()
      )
      .run();

    const task = await this.findById(id);
    return task!;
  }

  /**
   * 更新导出任务
   */
  async update(id: string, data: UpdateExportTaskDTO): Promise<ExportTask | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.progress !== undefined) {
      fields.push('progress = ?');
      values.push(data.progress);
    }
    if (data.totalRecords !== undefined) {
      fields.push('totalRecords = ?');
      values.push(data.totalRecords);
    }
    if (data.processedRecords !== undefined) {
      fields.push('processedRecords = ?');
      values.push(data.processedRecords);
    }
    if (data.fileName !== undefined) {
      fields.push('fileName = ?');
      values.push(data.fileName);
    }
    if (data.fileUrl !== undefined) {
      fields.push('fileUrl = ?');
      values.push(data.fileUrl);
    }
    if (data.fileSize !== undefined) {
      fields.push('fileSize = ?');
      values.push(data.fileSize);
    }
    if (data.startedAt !== undefined) {
      fields.push('startedAt = ?');
      values.push(data.startedAt);
    }
    if (data.completedAt !== undefined) {
      fields.push('completedAt = ?');
      values.push(data.completedAt);
    }
    if (data.error !== undefined) {
      fields.push('error = ?');
      values.push(data.error);
    }
    if (data.retryCount !== undefined) {
      fields.push('retryCount = ?');
      values.push(data.retryCount);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await this.db
      .prepare(`UPDATE exportTasks SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  /**
   * 获取导出任务列表
   */
  async findTasks(params: ExportTaskListParams): Promise<ExportTaskListResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.entityType) {
      conditions.push('entityType = ?');
      values.push(params.entityType);
    }
    if (params.createdBy) {
      conditions.push('createdBy = ?');
      values.push(params.createdBy);
    }
    if (params.startDate) {
      conditions.push('createdAt >= ?');
      values.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push('createdAt <= ?');
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 获取总数
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM exportTasks ${whereClause}`)
      .bind(...values)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    // 获取列表
    const listResult = await this.db
      .prepare(`
        SELECT * FROM exportTasks 
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, pageSize, offset)
      .all();

    return {
      list: (listResult.results as unknown as ExportTask[]) || [],
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取待处理的任务
   */
  async getPendingTasks(limit = 10): Promise<ExportTask[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM exportTasks 
        WHERE status = 'pending'
        ORDER BY createdAt ASC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    return (result.results as unknown as ExportTask[]) || [];
  }

  /**
   * 标记任务为运行中
   */
  async markRunning(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        UPDATE exportTasks 
        SET status = 'running', startedAt = ?, updatedAt = ?
        WHERE id = ? AND status = 'pending'
      `)
      .bind(now, now, id)
      .run();

    return result.meta.changes > 0;
  }

  /**
   * 标记任务完成
   */
  async markCompleted(
    id: string,
    data: {
      fileName: string;
      fileUrl: string;
      fileSize: number;
      totalRecords: number;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE exportTasks 
        SET status = 'completed', 
            progress = 100,
            fileName = ?,
            fileUrl = ?,
            fileSize = ?,
            totalRecords = ?,
            processedRecords = ?,
            completedAt = ?,
            updatedAt = ?
        WHERE id = ?
      `)
      .bind(
        data.fileName,
        data.fileUrl,
        data.fileSize,
        data.totalRecords,
        data.totalRecords,
        now,
        now,
        id
      )
      .run();
  }

  /**
   * 标记任务失败
   */
  async markFailed(id: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE exportTasks 
        SET status = 'failed', error = ?, retryCount = retryCount + 1, updatedAt = ?
        WHERE id = ?
      `)
      .bind(error, now, id)
      .run();
  }

  /**
   * 取消任务
   */
  async cancel(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        UPDATE exportTasks 
        SET status = 'cancelled', updatedAt = ?
        WHERE id = ? AND status IN ('pending', 'running')
      `)
      .bind(now, id)
      .run();

    return result.meta.changes > 0;
  }

  /**
   * 清理过期任务
   */
  async cleanExpired(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare('DELETE FROM exportTasks WHERE expiresAt < ?')
      .bind(now)
      .run();

    return result.meta.changes;
  }

  /**
   * 获取任务统计
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM exportTasks
      `)
      .first();

    return result as any;
  }
}
