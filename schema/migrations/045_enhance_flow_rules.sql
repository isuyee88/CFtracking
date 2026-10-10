-- Migration: 045_enhance_flow_rules.sql
-- Description: 增强 Flow 复杂条件规则
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 扩展 flows 表支持复杂规则
-- 2. 创建 flow_rules 表存储规则配置

-- 扩展 flows 表
ALTER TABLE flows ADD COLUMN filterLogic TEXT DEFAULT 'AND';
ALTER TABLE flows ADD COLUMN priority INTEGER DEFAULT 0;

-- 创建复杂规则表
CREATE TABLE IF NOT EXISTS flow_rules (
  id TEXT PRIMARY KEY,
  flowId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions TEXT NOT NULL,
  logic TEXT DEFAULT 'AND',
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flow_rules_flow ON flow_rules(flowId);
CREATE INDEX IF NOT EXISTS idx_flow_rules_priority ON flow_rules(priority);
CREATE INDEX IF NOT EXISTS idx_flow_rules_enabled ON flow_rules(enabled);
