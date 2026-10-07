/**
 * @fileoverview Report 类型定义
 * @description 定义报告系统相关的类型
 * @module types/report
 */

export type ReportType = 
  | 'traffic' 
  | 'conversion' 
  | 'financial' 
  | 'roi' 
  | 'funnel' 
  | 'cohort' 
  | 'retention'
  | 'comparison';

export type ReportGroupBy = 
  | 'campaign' 
  | 'offer' 
  | 'landing_page' 
  | 'traffic_source' 
  | 'country' 
  | 'device' 
  | 'browser' 
  | 'os' 
  | 'day' 
  | 'week' 
  | 'month';

export interface ReportConfig {
  type: ReportType;
  startDate: string;
  endDate: string;
  /**
   * 分组维度数组（多维组合）。后端按白名单映射到安全 SQL 表达式，
   * 未知 key 会被拒绝（防注入），支持 campaign/offer/flow/landing_page/
   * traffic_source/country/city/device/browser/os/isp/day/week/month/hour/
   * utm 系列/sub1..sub10/is_unique/is_bot 及 id 后缀原始值维度。
   */
  groupBy?: string[];
  filters?: ReportFilter[];
  metrics?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  compare?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'notin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'notcontains';
  value: string | string[] | number;
}

export interface FunnelStep {
  name: string;
  condition: ReportFilter;
}

export interface FunnelReportConfig extends ReportConfig {
  type: 'funnel';
  steps: FunnelStep[];
}

export interface FunnelStepData {
  step: string;
  count: number;
  dropoff: number;
  conversionRate: number;
}

export interface FunnelReport {
  steps: FunnelStepData[];
  totalUsers: number;
  completedUsers: number;
}

export interface CohortReportConfig extends ReportConfig {
  type: 'cohort';
  cohortBy: 'day' | 'week' | 'month';
  periods: number;
}

export interface CohortPeriod {
  period: number;
  users: number;
  retention: number;
  revenue: number;
}

export interface CohortReport {
  cohortDate: string;
  totalUsers: number;
  periods: CohortPeriod[];
}

export interface ComparisonReportConfig extends ReportConfig {
  type: 'comparison';
  baselineStart: string;
  baselineEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
}

export interface ComparisonReport {
  baseline: ReportData;
  comparison: ReportData;
  diff: ReportDiff;
}

export interface ReportData {
  metrics: Record<string, number>;
  rows: ReportRow[];
}

export interface ReportRow {
  /** 多维分组时按 groupBy 顺序用 ' / ' 连接的显示标签 */
  dimension: string;
  /** 各维度 key → 值的映射（多维组合消费端按 key 取值） */
  dimensions?: Record<string, string>;
  metrics: Record<string, number>;
}

export interface ReportDiff {
  absolute: Record<string, number>;
  percentage: Record<string, number>;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  config: ReportConfig;
  schedule: string;
  recipients: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 保存的报表预设（Keitaro 式报表组合快照，含维度/过滤/指标/排序配置） */
export interface ReportPreset {
  id: string;
  name: string;
  reportType: string;
  config: Partial<ReportConfig>;
  createdAt: string;
  updatedAt: string;
}
