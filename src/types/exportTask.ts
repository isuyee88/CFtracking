/**
 * @fileoverview 导出任务类型定义
 * @description 定义报表导出任务相关的数据类型
 * @module types/exportTask
 */

export type ExportTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ExportEntityType = 
  | 'campaigns' 
  | 'landing-pages' 
  | 'offers' 
  | 'traffic-sources' 
  | 'affiliate-networks' 
  | 'clicks' 
  | 'conversions' 
  | 'flows'
  | 'reports';

export type ExportFormat = 'csv' | 'excel' | 'json';

export interface ExportTask {
  id: string;
  name: string;
  entityType: ExportEntityType;
  format: ExportFormat;
  status: ExportTaskStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  
  // 导出配置
  filters: Record<string, unknown>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  fields: string[];
  
  // 文件信息
  fileName?: string;
  fileUrl?: string;
  fileSize: number;
  
  // 执行信息
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  
  // 元数据
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateExportTaskDTO {
  name: string;
  entityType: ExportEntityType;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  fields?: string[];
  createdBy?: string;
}

export interface UpdateExportTaskDTO {
  status?: ExportTaskStatus;
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount?: number;
}

export interface ExportTaskListParams {
  status?: ExportTaskStatus;
  entityType?: ExportEntityType;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ExportTaskListResult {
  list: ExportTask[];
  total: number;
  page: number;
  pageSize: number;
}
