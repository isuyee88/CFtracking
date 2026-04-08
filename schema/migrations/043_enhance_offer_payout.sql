-- Migration: 043_enhance_offer_payout.sql
-- Description: 增强 Offer 支付设置功能
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 添加支付相关字段到 offers 表
-- 2. 创建转化统计表用于跟踪转化上限

-- 添加支付相关字段
ALTER TABLE offers ADD COLUMN conversionCap INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN dailyCap INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN payoutRules TEXT DEFAULT '[]';
ALTER TABLE offers ADD COLUMN minPayout REAL DEFAULT 0;
ALTER TABLE offers ADD COLUMN maxPayout REAL DEFAULT 0;
ALTER TABLE offers ADD COLUMN capStartDate TEXT;
ALTER TABLE offers ADD COLUMN capEndDate TEXT;

-- 创建转化统计表
CREATE TABLE IF NOT EXISTS offer_conversion_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offerId TEXT NOT NULL,
  date TEXT NOT NULL,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (offerId) REFERENCES offers(id) ON DELETE CASCADE,
  UNIQUE(offerId, date)
);

CREATE INDEX IF NOT EXISTS idx_offer_conversion_stats_offer ON offer_conversion_stats(offerId);
CREATE INDEX IF NOT EXISTS idx_offer_conversion_stats_date ON offer_conversion_stats(date);
