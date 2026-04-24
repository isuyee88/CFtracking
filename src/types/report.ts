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
  groupBy?: ReportGroupBy[];
  filters?: ReportFilter[];
  metrics?: string[];
  compare?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'notin' | 'gt' | 'lt' | 'gte' | 'lte';
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
  dimension: string;
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
