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
import { ExportService, type ExportRequest, type ExportResult } from '@/services/export/export.service';
import { createDashboardQueryService } from '@/services/analytics/dashboard-query.service';
import type { ReportDimension, ReportFilter, ReportMetric } from '@/handlers/d1/traffic.repo';
import { getD1Connection } from '@/handlers/d1';
import { convertToCSV, convertToJSON, getContentType, getFileExtension } from '@/utils/export.formatter';
import type {
  ExportTask,
  CreateExportTaskDTO,
  ExportTaskListParams,
  ExportTaskListResult,
  ExportEntityType,
  ExportFormat,
} from '@/types/exportTask';

interface NormalizedTaskPayload {
  fields: string[];
  filters: Record<string, unknown>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

interface TaskExportResult extends ExportResult {
  totalRecords: number;
}

export class ExportTaskService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * 创建导出任务
   */
  async createTask(data: CreateExportTaskDTO, scheduleExecution = true): Promise<ExportTask> {
    const db = getD1Connection(this.env);
    const repo = new ExportTaskRepository(db);
    
    // 创建任务记录
    const task = await repo.create(data);
    
    if (scheduleExecution) {
      this.executeTaskAsync(task.id).catch(error => {
        console.error('Export task execution failed:', error);
      });
    }
    
    return task;
  }

  async startTaskExecution(taskId: string): Promise<void> {
    await this.executeTaskAsync(taskId);
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
    const exportService = new ExportService(this.env);

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
      const payload = this.normalizeTaskPayload(task);
      const result = await this.executeTaskExport(task, payload, exportService);

      // 保存文件到 R2
      const fileName = result.filename;
      const fileKey = `${taskId}/${fileName}`;
      let fileUrl = '';
      let fileSize = new TextEncoder().encode(result.data).length;

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
        totalRecords: result.totalRecords,
      });

    } catch (error) {
      console.error('Export task failed:', error);
      await repo.markFailed(taskId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 处理待执行的任务(由定时任务调用)
   */
  private normalizeTaskPayload(task: ExportTask): NormalizedTaskPayload {
    return {
      fields: this.parseStringArray(task.fields),
      filters: this.parseJsonRecord(task.filters),
      dateRange: this.parseDateRange(task.dateRange),
    };
  }

  private async executeTaskExport(
    task: ExportTask,
    payload: NormalizedTaskPayload,
    exportService: ExportService
  ): Promise<TaskExportResult> {
    if (task.entityType === 'reports') {
      return this.exportReportTask(task, payload);
    }

    const request: ExportRequest = {
      entityType: task.entityType as Exclude<ExportEntityType, 'reports'>,
      format: task.format,
      fields: payload.fields.length > 0 ? payload.fields : undefined,
      filters: Object.keys(payload.filters).length > 0 ? payload.filters : undefined,
      dateRange: payload.dateRange,
    };

    const result = await this.executeEntityExport(request, exportService);
    return {
      ...result,
      totalRecords: 0,
    };
  }

  private async executeEntityExport(request: ExportRequest, exportService: ExportService): Promise<ExportResult> {
    switch (request.entityType) {
      case 'campaigns':
        return exportService.exportCampaigns(request);
      case 'landing-pages':
        return exportService.exportLandingPages(request);
      case 'offers':
        return exportService.exportOffers(request);
      case 'traffic-sources':
        return exportService.exportTrafficSources(request);
      case 'affiliate-networks':
        return exportService.exportAffiliateNetworks(request);
      case 'clicks':
        return exportService.exportClicks(request);
      case 'conversions':
        return exportService.exportConversions(request);
      case 'flows':
        return exportService.exportFlows(request);
      default:
        throw new Error(`Unsupported export entity type: ${request.entityType}`);
    }
  }

  private async exportReportTask(task: ExportTask, payload: NormalizedTaskPayload): Promise<TaskExportResult> {
    if (!payload.dateRange?.startDate || !payload.dateRange?.endDate) {
      throw new Error('Report export requires startDate and endDate');
    }

    const reportType = this.parseReportType(payload.filters.reportType);
    const groupBy = this.parseStringArray(payload.filters.groupBy) as ReportDimension[];
    const metrics = this.parseStringArray(payload.filters.metrics) as ReportMetric[];
    const filters = this.parseReportFilters(payload.filters.filters);
    const columns = payload.fields.length > 0 ? payload.fields : this.parseStringArray(payload.filters.columns);
    const limit = this.parsePositiveInt(payload.filters.limit, 10000);
    const sortByCandidate = String(payload.filters.sortBy || metrics[0] || groupBy[0] || 'clicks');
    const sortBy = sortByCandidate as ReportDimension | ReportMetric;
    const sortOrder = payload.filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const dashboardQuery = createDashboardQueryService(this.env);
    const reportData = await dashboardQuery.getReport(reportType, {
      startDate: payload.dateRange.startDate,
      endDate: payload.dateRange.endDate,
      groupBy: groupBy.length > 0 ? groupBy : ['campaign'],
      metrics: metrics.length > 0 ? metrics : undefined,
      filters,
      limit,
      sortBy,
      sortOrder,
    });

    const rows = Array.isArray(reportData) ? (reportData as Record<string, unknown>[]) : [];
    const formattedData = this.formatReportExportData(rows, columns, task.format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return {
      data: formattedData,
      contentType: getContentType(task.format),
      filename: `${reportType}-report-${timestamp}.${getFileExtension(task.format)}`,
      format: task.format,
      totalRecords: rows.length,
    };
  }

  private formatReportExportData(data: Record<string, unknown>[], columns: string[], format: ExportFormat): string {
    const selectedColumns = columns.length > 0 ? columns : Object.keys(data[0] || {});

    switch (format) {
      case 'json':
        return convertToJSON(data, selectedColumns);
      case 'csv':
      case 'excel':
        return convertToCSV(data, selectedColumns, { includeHeaders: true });
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private parseJsonRecord(value: unknown): Record<string, unknown> {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }

    return typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private parseStringArray(value: unknown): string[] {
    if (!value) {
      return [];
    }

    const parseArray = (candidate: unknown): string[] =>
      Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parseArray(parsed);
      } catch {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return parseArray(value);
  }

  private parseDateRange(value: unknown): { startDate: string; endDate: string } | undefined {
    if (!value) {
      return undefined;
    }

    const parseObject = (candidate: unknown) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return undefined;
      }

      const range = candidate as { startDate?: unknown; endDate?: unknown };
      if (typeof range.startDate !== 'string' || typeof range.endDate !== 'string') {
        return undefined;
      }

      return {
        startDate: range.startDate,
        endDate: range.endDate,
      };
    };

    if (typeof value === 'string') {
      try {
        return parseObject(JSON.parse(value));
      } catch {
        return undefined;
      }
    }

    return parseObject(value);
  }

  private parseReportType(value: unknown): 'traffic' | 'conversion' | 'financial' | 'roi' {
    const candidate = typeof value === 'string' ? value : 'traffic';
    if (candidate === 'conversion' || candidate === 'financial' || candidate === 'roi') {
      return candidate;
    }
    return 'traffic';
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private parseReportFilters(value: unknown): ReportFilter[] {
    let source: unknown = value;
    if (typeof value === 'string') {
      try {
        source = JSON.parse(value);
      } catch {
        source = [];
      }
    }

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const candidate = item as Partial<ReportFilter>;
        if (
          typeof candidate.field !== 'string' ||
          typeof candidate.operator !== 'string' ||
          (typeof candidate.value !== 'string' && typeof candidate.value !== 'number')
        ) {
          return null;
        }

        return {
          field: candidate.field,
          operator: candidate.operator,
          value: candidate.value,
        } as ReportFilter;
      })
      .filter((item): item is ReportFilter => item !== null);
  }

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

    if (typeof task.fileUrl === 'string' && task.fileUrl.startsWith('data:')) {
      const matches = task.fileUrl.match(/^data:([^,]*),(.*)$/);
      if (!matches) {
        return null;
      }

      const [, metadata, rawPayload] = matches;
      const metadataParts = (metadata || '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);
      const contentType = metadataParts[0] || 'application/octet-stream';
      const isBase64 = metadataParts.some((part) => part.toLowerCase() === 'base64');
      const encoded = rawPayload || '';

      const binary = isBase64
        ? Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(encoded));
      return {
        data: binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer,
        contentType,
        fileName: task.fileName || 'export',
      };
    }

    return null;
  }
}

export function createExportTaskService(env: Env): ExportTaskService {
  return new ExportTaskService(env);
}
