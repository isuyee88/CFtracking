-- Migration: 069_fix_flow_offers_id_type.sql
-- Purpose: flowOffers.id 从 INTEGER AUTOINCREMENT 重建为 TEXT PRIMARY KEY。
--          multi-offer.repo 生成 crypto.randomUUID()（TEXT）写入 INTEGER 列，
--          D1 返回 SQLITE_MISMATCH，multi-offer 挂载全部失败。
--          multiOfferStats/multiOfferVisitors 虽以 flowOfferId 引用本表，
--          但当前无任何代码读写（035 遗留），不做重建以最小化 DDL 风险；
--          SQLite 动态类型下其 INTEGER 列可容纳 TEXT 值，语义不受影响。

PRAGMA defer_foreign_keys = ON;

-- 1. 重建 flowOffers（保留 035 全部增强列与存量数据）
CREATE TABLE flowOffers_new (
  id TEXT PRIMARY KEY,
  flowId TEXT NOT NULL,
  offerId TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  priority INTEGER DEFAULT 0,
  allocationStrategy TEXT DEFAULT 'weight',
  conversionLimit INTEGER DEFAULT 0,
  uniqueCheck INTEGER DEFAULT 0,
  share REAL DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (offerId) REFERENCES offers(id) ON DELETE CASCADE
);

INSERT INTO flowOffers_new (id, flowId, offerId, weight, priority, allocationStrategy, conversionLimit, uniqueCheck, share, conversions, clicks, enabled, createdAt)
SELECT
  CAST(id AS TEXT),
  flowId,
  offerId,
  COALESCE(weight, 100),
  COALESCE(priority, 0),
  COALESCE(allocationStrategy, 'weight'),
  COALESCE(conversionLimit, 0),
  COALESCE(uniqueCheck, 0),
  COALESCE(share, 0),
  COALESCE(conversions, 0),
  COALESCE(clicks, 0),
  COALESCE(enabled, 1),
  createdAt
FROM flowOffers;

DROP TABLE flowOffers;
ALTER TABLE flowOffers_new RENAME TO flowOffers;

-- 2. 恢复 flowOffers 索引（035 定义）
CREATE INDEX IF NOT EXISTS idx_flow_offers_priority ON flowOffers(flowId, priority);
CREATE INDEX IF NOT EXISTS idx_flow_offers_strategy ON flowOffers(flowId, allocationStrategy);
