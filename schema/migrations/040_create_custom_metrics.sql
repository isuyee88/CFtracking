-- Custom Metrics Table
-- 用于存储用户自定义指标定义和计算公式
-- Version: 040
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS customMetrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  description TEXT,
  
  -- 指标类型
  type TEXT NOT NULL DEFAULT 'calculated',
  
  -- 计算公式
  formula TEXT NOT NULL,
  
  -- 数据类型
  dataType TEXT DEFAULT 'number',
  
  -- 格式化配置
  format TEXT DEFAULT 'number',
  decimals INTEGER DEFAULT 2,
  prefix TEXT,
  suffix TEXT,
  
  -- 可用性
  status TEXT DEFAULT 'active',
  isSystem INTEGER DEFAULT 0,
  
  -- 元数据
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_custom_metrics_name ON customMetrics(name);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_status ON customMetrics(status);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_type ON customMetrics(type);
