-- Export Tasks Table
-- 用于管理报表导出任务的生命周期
-- Version: 039
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS exportTasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  entityType TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  totalRecords INTEGER DEFAULT 0,
  processedRecords INTEGER DEFAULT 0,
  
  -- 导出配置
  filters TEXT DEFAULT '{}',
  dateRange TEXT,
  fields TEXT DEFAULT '[]',
  
  -- 文件信息
  fileName TEXT,
  fileUrl TEXT,
  fileSize INTEGER DEFAULT 0,
  
  -- 执行信息
  startedAt TEXT,
  completedAt TEXT,
  error TEXT,
  retryCount INTEGER DEFAULT 0,
  
  -- 元数据
  createdBy TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  
  -- 索引优化字段
  expiresAt TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON exportTasks(status);
CREATE INDEX IF NOT EXISTS idx_export_tasks_created_at ON exportTasks(createdAt);
CREATE INDEX IF NOT EXISTS idx_export_tasks_created_by ON exportTasks(createdBy);
CREATE INDEX IF NOT EXISTS idx_export_tasks_entity_type ON exportTasks(entityType);
CREATE INDEX IF NOT EXISTS idx_export_tasks_expires_at ON exportTasks(expiresAt);
