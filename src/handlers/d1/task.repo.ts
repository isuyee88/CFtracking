/**
 * @fileoverview Task Queue 数据仓库
 * @description 封装任务队列相关的所有数据库操作
 * @module handlers/d1/task.repo
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  type: string;
  payload: string;
  status: TaskStatus;
  priority: number;
  scheduledAt: string | null;
  executedAt: string | null;
  result: string | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDTO {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
}

export class TaskRepository extends BaseRepository<Task> {
  constructor(db: D1Database) {
    super(db, 'taskQueue');
  }

  /**
   * 创建任务
   */
  async create(data: CreateTaskDTO): Promise<Task> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO taskQueue (id, type, payload, status, priority, scheduledAt, retryCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        data.type,
        JSON.stringify(data.payload),
        'pending',
        data.priority || 0,
        data.scheduledAt || null,
        0,
        now,
        now
      )
      .run();

    const task = await this.findById(id);
    return task!;
  }

  /**
   * 获取待执行的任务
   */
  async getPendingTasks(limit = 10): Promise<Task[]> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        SELECT * FROM taskQueue 
        WHERE status = 'pending' 
        AND (scheduledAt IS NULL OR scheduledAt <= ?)
        ORDER BY priority DESC, createdAt ASC
        LIMIT ?
      `)
      .bind(now, limit)
      .all();
    return (result.results as unknown as Task[]) || [];
  }

  /**
   * 标记任务为运行中
   */
  async markRunning(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE taskQueue SET status = 'running', updatedAt = ? WHERE id = ? AND status = 'pending'")
      .bind(new Date().toISOString(), id)
      .run();
    return result.meta.changes > 0;
  }

  /**
   * 标记任务完成
   */
  async markCompleted(id: string, result: Record<string, unknown>): Promise<void> {
    await this.db
      .prepare(`
        UPDATE taskQueue 
        SET status = 'completed', result = ?, executedAt = ?, updatedAt = ?
        WHERE id = ?
      `)
      .bind(JSON.stringify(result), new Date().toISOString(), new Date().toISOString(), id)
      .run();
  }

  /**
   * 标记任务失败
   */
  async markFailed(id: string, error: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE taskQueue 
        SET status = 'failed', error = ?, retryCount = retryCount + 1, updatedAt = ?
        WHERE id = ?
      `)
      .bind(error, new Date().toISOString(), id)
      .run();
  }

  /**
   * 重试失败的任务
   */
  async retryTask(id: string, maxRetries = 3): Promise<boolean> {
    const task = await this.findById(id);
    if (!task || task.retryCount >= maxRetries) {
      return false;
    }

    await this.db
      .prepare(`
        UPDATE taskQueue 
        SET status = 'pending', updatedAt = ?
        WHERE id = ?
      `)
      .bind(new Date().toISOString(), id)
      .run();

    return true;
  }

  /**
   * 清理已完成的任务
   */
  async cleanCompleted(olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.db
      .prepare("DELETE FROM taskQueue WHERE status = 'completed' AND updatedAt < ?")
      .bind(cutoffDate.toISOString())
      .run();

    return result.meta.changes;
  }
}
