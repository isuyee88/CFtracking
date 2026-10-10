-- Migration: 071_add_report_presets.sql
-- Purpose: 报表预设表——保存报表组合（分组维度/过滤/指标/排序），
--          对齐 Keitaro 的 saved reports 能力，避免每次手动重配。

CREATE TABLE IF NOT EXISTS report_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reportType TEXT NOT NULL DEFAULT 'traffic',
  config TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_presets_type_created
  ON report_presets(reportType, createdAt DESC);
