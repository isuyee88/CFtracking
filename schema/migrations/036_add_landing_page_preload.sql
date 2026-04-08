-- Migration: 036_add_landing_page_preload.sql
-- Description: 添加 Landing Page 预加载功能支持
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 为 landingPages 表添加预加载相关字段
-- 2. 创建 lpPreloadCache 表存储预加载内容
-- 3. 添加必要的索引以优化查询性能

-- 创建预加载内容缓存表
CREATE TABLE IF NOT EXISTS lpPreloadCache (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  content TEXT NOT NULL,
  contentType TEXT DEFAULT 'text/html',
  contentSize INTEGER DEFAULT 0,
  fetchStatus TEXT DEFAULT 'pending',
  lastFetchedAt TEXT,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lp_preload_landing_page ON lpPreloadCache(landingPageId);
CREATE INDEX IF NOT EXISTS idx_lp_preload_expires ON lpPreloadCache(expiresAt);
CREATE INDEX IF NOT EXISTS idx_lp_preload_status ON lpPreloadCache(fetchStatus);

-- 添加预加载统计表
CREATE TABLE IF NOT EXISTS lpPreloadStats (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  cacheHits INTEGER DEFAULT 0,
  cacheMisses INTEGER DEFAULT 0,
  totalRequests INTEGER DEFAULT 0,
  avgResponseTime INTEGER DEFAULT 0,
  lastResetAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

-- 创建统计索引
CREATE INDEX IF NOT EXISTS idx_lp_preload_stats_lp ON lpPreloadStats(landingPageId);
