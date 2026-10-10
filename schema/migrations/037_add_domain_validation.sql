-- Migration: 037_add_domain_validation.sql
-- Description: 添加 Domains 实时校验功能支持
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 为 domains 表添加校验相关字段
-- 2. 创建 domainValidationHistory 表存储校验历史
-- 3. 添加必要的索引以优化查询性能

-- 创建校验历史表
CREATE TABLE IF NOT EXISTS domainValidationHistory (
  id TEXT PRIMARY KEY,
  domainId TEXT NOT NULL,
  zoneStatus TEXT DEFAULT 'unknown',
  sslStatus TEXT DEFAULT 'unknown',
  dnsStatus TEXT DEFAULT 'unknown',
  zoneId TEXT,
  errors TEXT,
  validatedAt TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (domainId) REFERENCES domains(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_domain_validation_history_domain ON domainValidationHistory(domainId);
CREATE INDEX IF NOT EXISTS idx_domain_validation_history_time ON domainValidationHistory(validatedAt);
