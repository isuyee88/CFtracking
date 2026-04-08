/**
 * @fileoverview 导出任务服务
 * @description 处理报表导出任务的业务逻辑
 * @module services/exportTask/exportTask.service
 * 
 * Input: 导出任务创建请求
 * Output: 导出任务状态和文件下载
 * Logic Interaction: 
 *   - 使用 ExportTaskRepository 管理任务状态
 *   - 使用 ExportService 执行实际导出
 *   - 使用 R2 存储导出文件
 * Frontend-Backend: 为 Exported Reports 页面提供 API
 */

import type { Env } from '@/config/env';
import { ExportTaskRepository } from '@/handlers/d1/exportTask.repo';
import { ExportService } from '@/services/export/export.service';
import { getD1Connection } from '@/handlers/d1';
import type {
  ExportTask,
  CreateExportTaskDTO,
  ExportTaskListParams,
  ExportTaskListResult,
} from '@/types/exportTask';

export class ExportTaskService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * 创建导出任务
   */
  async createTask(data: CreateExportTaskDTO): Promise<ExportTask> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    // 创建任务记录
    const task = await repo.create(data);
    
    // 异步执行导出任务
    this.executeTaskAsync(task.id).catch(error => {
      console.error('Export task execution failed:', error);
    });
    
    return task;
  }

  /**
   * 获取任务列表
   */
  async getTasks(params: ExportTaskListParams): Promise<ExportTaskListResult> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    return repo.findTasks(params);
  }

  /**
   * 获取任务详情
   */
  async getTask(id: string): Promise<ExportTask | null> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    return repo.findById(id);
  }

  /**
   * 取消任务
   */
  async cancelTask(id: string): Promise<boolean> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    return repo.cancel(id);
  }

  /**
   * 重试失败的任务
   */
  async retryTask(id: string): Promise<boolean> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    const task = await repo.findById(id);
    if (!task || task.status !== 'failed') {
      return false;
    }

    // 重置任务状态
    await repo.update(id, {
      status: 'pending',
      error: undefined,
      retryCount: task.retryCount,
    });

    // 异步执行
    this.executeTaskAsync(id).catch(error => {
      console.error('Export task retry failed:', error);
    });

    return true;
  }

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<boolean> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    const task = await repo.findById(id);
    if (!task) {
      return false;
    }

    // 如果有文件,先删除 R2 中的文件
    if (task.fileUrl && this.env.EXPORTS_BUCKET) {
      try {
        const key = task.fileUrl.split('/').pop();
        if (key) {
          await this.env.EXPORTS_BUCKET.delete(key);
        }
      } catch (error) {
        console.error('Failed to delete export file:', error);
      }
    }

    await repo.deleteById(id);
    return true;
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
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    return repo.getStats();
  }

  /**
   * 异步执行导出任务
   */
  private async executeTaskAsync(taskId: string): Promise<void> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    const exportService = new ExportService();

    try {
      // 标记为运行中
      const marked = await repo.markRunning(taskId);
      if (!marked) {
        return;
      }

      // 获取任务详情
      const task = await repo.findById(taskId);
      if (!task) {
        return;
      }

      // 执行导出
      const exportRequest = {
        entityType: task.entityType as any,
        format: task.format,
        fields: task.fields,
        filters: task.filters,
        dateRange: task.dateRange,
      };

      const result = await exportService.exportCampaigns(exportRequest);

      // 保存文件到 R2
      const fileName = result.filename;
      const fileKey = `${taskId}/${fileName}`;
      let fileUrl = '';
      let fileSize = result.data.length;

      if (this.env.EXPORTS_BUCKET) {
        await this.env.EXPORTS_BUCKET.put(fileKey, result.data, {
          httpMetadata: {
            contentType: result.contentType,
          },
        });
        fileUrl = `/api/export-tasks/${taskId}/download`;
      } else {
        // 如果没有 R2,使用 base64 编码存储在数据库中(仅用于测试)
        fileUrl = `data:${result.contentType};base64,${btoa(result.data)}`;
      }

      // 标记完成
      await repo.markCompleted(taskId, {
        fileName,
        fileUrl,
        fileSize,
        totalRecords: 0, // TODO: 从实际导出结果中获取
      });

    } catch (error) {
      console.error('Export task failed:', error);
      await repo.markFailed(taskId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 处理待执行的任务(由定时任务调用)
   */
  async processPendingTasks(): Promise<void> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    const tasks = await repo.getPendingTasks(5);
    
    for (const task of tasks) {
      await this.executeTaskAsync(task.id);
    }
  }

  /**
   * 清理过期任务
   */
  async cleanExpiredTasks(): Promise<number> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    return repo.cleanExpired();
  }

  /**
   * 下载导出文件
   */
  async downloadFile(taskId: string): Promise<{
    data: ArrayBuffer;
    contentType: string;
    fileName: string;
  } | null> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    const task = await repo.findById(taskId);
    if (!task || !task.fileUrl || task.status !== 'completed') {
      return null;
    }

    if (this.env.EXPORTS_BUCKET) {
      const key = `${taskId}/${task.fileName}`;
      const object = await this.env.EXPORTS_BUCKET.get(key);
      
      if (!object) {
        return null;
      }

      return {
        data: await object.arrayBuffer(),
        contentType: object.httpMetadata?.contentType || 'application/octet-stream',
        fileName: task.fileName || 'export',
      };
    }

    return null;
  }
}

export function createExportTaskService(env: Env): ExportTaskService {
  return new ExportTaskService(env);
}
