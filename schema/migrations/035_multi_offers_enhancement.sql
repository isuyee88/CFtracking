-- Migration: 035_multi_offers_enhancement.sql
-- Description: 增强 flowOffers 表以支持 Multi-offers 功能
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 为 flowOffers 表添加多 Offer 分配所需的字段
-- 2. 支持权重、优先级、分配策略等配置
-- 3. 支持转化限制和唯一性检查
-- 4. 创建 Multi-offer 统计表

-- 1. 增强 flowOffers 表 - 添加列
ALTER TABLE flowOffers ADD COLUMN priority INTEGER DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN allocationStrategy TEXT DEFAULT 'weight';
ALTER TABLE flowOffers ADD COLUMN conversionLimit INTEGER DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN uniqueCheck INTEGER DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN share REAL DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN conversions INTEGER DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN clicks INTEGER DEFAULT 0;
ALTER TABLE flowOffers ADD COLUMN enabled INTEGER DEFAULT 1;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_flow_offers_priority ON flowOffers(flowId, priority);
CREATE INDEX IF NOT EXISTS idx_flow_offers_strategy ON flowOffers(flowId, allocationStrategy);

-- 3. 创建 Multi-offer 统计表
CREATE TABLE IF NOT EXISTS multiOfferStats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowOfferId INTEGER NOT NULL,
  date TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  UNIQUE(flowOfferId, date),
  FOREIGN KEY (flowOfferId) REFERENCES flowOffers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_multi_offer_stats_date ON multiOfferStats(date);
CREATE INDEX IF NOT EXISTS idx_multi_offer_stats_flow_offer ON multiOfferStats(flowOfferId);

-- 4. 创建 Multi-offer 访问记录表（用于唯一性检查）
CREATE TABLE IF NOT EXISTS multiOfferVisitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowOfferId INTEGER NOT NULL,
  visitorId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  UNIQUE(flowOfferId, visitorId),
  FOREIGN KEY (flowOfferId) REFERENCES flowOffers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_multi_offer_visitors_visitor ON multiOfferVisitors(visitorId);
CREATE INDEX IF NOT EXISTS idx_multi_offer_visitors_expires ON multiOfferVisitors(expiresAt);
