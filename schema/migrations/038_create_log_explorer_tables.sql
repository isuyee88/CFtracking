-- Migration: 038_create_log_explorer_tables.sql
-- Description: 创建 Log Explorer 功能相关表
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 创建统一日志表 unified_logs
-- 2. 创建日志导出任务表 log_export_tasks
-- 3. 添加必要的索引以优化查询性能
-- 4. 支持多种日志类型的统一查询

-- 创建统一日志表
CREATE TABLE IF NOT EXISTS unified_logs (
  id TEXT PRIMARY KEY,
  logType TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  campaignId TEXT,
  flowId TEXT,
  offerId TEXT,
  landingPageId TEXT,
  visitorId TEXT,
  clickId TEXT,
  conversionId TEXT,
  ip TEXT,
  userAgent TEXT,
  country TEXT,
  city TEXT,
  deviceType TEXT,
  browser TEXT,
  os TEXT,
  data TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_unified_logs_type ON unified_logs(logType);
CREATE INDEX IF NOT EXISTS idx_unified_logs_timestamp ON unified_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_logs_campaign ON unified_logs(campaignId);
CREATE INDEX IF NOT EXISTS idx_unified_logs_flow ON unified_logs(flowId);
CREATE INDEX IF NOT EXISTS idx_unified_logs_offer ON unified_logs(offerId);
CREATE INDEX IF NOT EXISTS idx_unified_logs_visitor ON unified_logs(visitorId);
CREATE INDEX IF NOT EXISTS idx_unified_logs_click ON unified_logs(clickId);
CREATE INDEX IF NOT EXISTS idx_unified_logs_country ON unified_logs(country);
CREATE INDEX IF NOT EXISTS idx_unified_logs_device ON unified_logs(deviceType);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_unified_logs_type_timestamp ON unified_logs(logType, timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_logs_campaign_timestamp ON unified_logs(campaignId, timestamp);

-- 创建日志导出任务表
CREATE TABLE IF NOT EXISTS log_export_tasks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  logType TEXT NOT NULL,
  filters TEXT,
  format TEXT DEFAULT 'csv',
  status TEXT DEFAULT 'pending',
  totalRecords INTEGER DEFAULT 0,
  processedRecords INTEGER DEFAULT 0,
  filePath TEXT,
  fileSize INTEGER DEFAULT 0,
  error TEXT,
  startedAt TEXT,
  completedAt TEXT,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- 创建导出任务索引
CREATE INDEX IF NOT EXISTS idx_log_export_tasks_user ON log_export_tasks(userId);
CREATE INDEX IF NOT EXISTS idx_log_export_tasks_status ON log_export_tasks(status);
CREATE INDEX IF NOT EXISTS idx_log_export_tasks_type ON log_export_tasks(logType);
CREATE INDEX IF NOT EXISTS idx_log_export_tasks_expires ON log_export_tasks(expiresAt);

-- 创建日志查询缓存表
CREATE TABLE IF NOT EXISTS log_query_cache (
  id TEXT PRIMARY KEY,
  queryHash TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  resultCount INTEGER DEFAULT 0,
  resultData TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- 创建查询缓存索引
CREATE INDEX IF NOT EXISTS idx_log_query_cache_hash ON log_query_cache(queryHash);
CREATE INDEX IF NOT EXISTS idx_log_query_cache_expires ON log_query_cache(expiresAt);
