-- Migration: 042_add_campaign_groups.sql
-- Description: 添加 Campaign 分组管理功能
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 创建 campaign_groups 表存储分组信息
-- 2. 添加必要的索引以优化查询性能

-- 创建 Campaign 分组表
CREATE TABLE IF NOT EXISTS campaign_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#1890ff',
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_campaign_groups_name ON campaign_groups(name);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_sort ON campaign_groups(sortOrder);

-- 更新 campaigns 表添加 groupId 字段
ALTER TABLE campaigns ADD COLUMN groupId TEXT REFERENCES campaign_groups(id);

-- 创建 campaigns groupId 索引
CREATE INDEX IF NOT EXISTS idx_campaigns_group ON campaigns(groupId);
