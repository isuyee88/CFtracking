/**
 * @fileoverview Log Explorer 类型定义
 * @description 定义 Log Explorer 相关的类型和接口
 * @module types/logExplorer
 * 
 * 数据流:
 * 1. 多种日志类型写入 unified_logs 表
 * 2. 支持 Filters Builder 构建复杂查询
 * 3. 支持异步导出任务
 */

export type LogType = 'click' | 'conversion' | 'visitor' | 'impression' | 'event' | 'error';
export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
export type SortOrder = 'asc' | 'desc';

export interface UnifiedLog {
  id: string;
  logType: LogType;
  timestamp: string;
  campaignId: string | null;
  flowId: string | null;
  offerId: string | null;
  landingPageId: string | null;
  visitorId: string | null;
  clickId: string | null;
  conversionId: string | null;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface LogFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | null | string[];
}

export type FilterOperator = 
  | 'eq' 
  | 'ne' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

export interface LogQuery {
  logType: LogType;
  filters?: LogFilter[];
  sort?: Array<{ field: string; order: SortOrder }>;
  page?: number;
  pageSize?: number;
  exportFormat?: ExportFormat;
}

export interface LogQueryResult {
  logs: UnifiedLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LogStats {
  total: number;
  byTime: Record<string, number>;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byOS: Record<string, number>;
}

export interface LogExportTask {
  id: string;
  userId: string;
  logType: LogType;
  filters: LogFilter[] | null;
  format: ExportFormat;
  status: ExportStatus;
  totalRecords: number;
  processedRecords: number;
  filePath: string | null;
  fileSize: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExportTaskDTO {
  logType: LogType;
  filters?: LogFilter[];
  format?: ExportFormat;
}

export interface ExportTaskProgress {
  taskId: string;
  status: ExportStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  downloadUrl?: string;
  error?: string;
}

export interface LogFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  filterable: boolean;
  sortable: boolean;
  displayName: string;
  description?: string;
}

export const LOG_FIELDS: LogFieldDefinition[] = [
  { name: 'logType', type: 'string', filterable: true, sortable: true, displayName: 'Log Type' },
  { name: 'timestamp', type: 'date', filterable: true, sortable: true, displayName: 'Timestamp' },
  { name: 'campaignId', type: 'string', filterable: true, sortable: true, displayName: 'Campaign' },
  { name: 'flowId', type: 'string', filterable: true, sortable: true, displayName: 'Flow' },
  { name: 'offerId', type: 'string', filterable: true, sortable: true, displayName: 'Offer' },
  { name: 'landingPageId', type: 'string', filterable: true, sortable: true, displayName: 'Landing Page' },
  { name: 'visitorId', type: 'string', filterable: true, sortable: true, displayName: 'Visitor' },
  { name: 'clickId', type: 'string', filterable: true, sortable: true, displayName: 'Click' },
  { name: 'conversionId', type: 'string', filterable: true, sortable: true, displayName: 'Conversion' },
  { name: 'ip', type: 'string', filterable: true, sortable: true, displayName: 'IP' },
  { name: 'country', type: 'string', filterable: true, sortable: true, displayName: 'Country' },
  { name: 'city', type: 'string', filterable: true, sortable: true, displayName: 'City' },
  { name: 'deviceType', type: 'string', filterable: true, sortable: true, displayName: 'Device Type' },
  { name: 'browser', type: 'string', filterable: true, sortable: true, displayName: 'Browser' },
  { name: 'os', type: 'string', filterable: true, sortable: true, displayName: 'OS' },
];

export const FILTER_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'in', label: 'In List' },
  { value: 'notIn', label: 'Not In List' },
  { value: 'isNull', label: 'Is Null' },
  { value: 'isNotNull', label: 'Is Not Null' },
];
