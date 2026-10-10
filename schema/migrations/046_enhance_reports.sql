-- Migration: 046_enhance_reports.sql
-- Description: 增强报告系统
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 创建报告缓存表
-- 2. 创建定时报告表

-- 创建报告缓存表
CREATE TABLE IF NOT EXISTS report_cache (
  id TEXT PRIMARY KEY,
  reportType TEXT NOT NULL,
  config TEXT NOT NULL,
  result TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_cache_type ON report_cache(reportType);
CREATE INDEX IF NOT EXISTS idx_report_cache_expires ON report_cache(expiresAt);

-- 创建定时报告表
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reportType TEXT NOT NULL,
  config TEXT NOT NULL,
  schedule TEXT NOT NULL,
  recipients TEXT NOT NULL,
  lastRunAt TEXT,
  nextRunAt TEXT,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_enabled ON scheduled_reports(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(nextRunAt);
