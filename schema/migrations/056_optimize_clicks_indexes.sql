-- Migration: Optimize Clicks indexes for query performance
-- Created: 2026-04-07
-- Description: Add composite indexes and FTS5 full-text search for clicks table

-- ============================================================
-- 复合索引优化
-- 覆盖高频查询组合，减少全表扫描
-- ============================================================

-- 访客+时间范围查询（访客轨迹分析）
CREATE INDEX IF NOT EXISTS idx_clicks_visitor_timestamp
  ON clicks(visitorId, timestamp DESC);

-- Offer+时间范围查询（Offer转化分析）
CREATE INDEX IF NOT EXISTS idx_clicks_offer_timestamp
  ON clicks(offerId, timestamp DESC);

-- Flow+时间范围查询（Flow效果分析）
CREATE INDEX IF NOT EXISTS idx_clicks_flow_timestamp
  ON clicks(flowId, timestamp DESC);

-- 国家+时间范围查询（地区分布分析）
CREATE INDEX IF NOT EXISTS idx_clicks_country_timestamp
  ON clicks(country, timestamp DESC);

-- 设备+时间范围查询（设备类型分析）
CREATE INDEX IF NOT EXISTS idx_clicks_device_timestamp
  ON clicks(device, timestamp DESC);

-- 唯一性+时间范围查询（去重统计）
CREATE INDEX IF NOT EXISTS idx_clicks_unique_timestamp
  ON clicks(isUnique, timestamp DESC);

-- Campaign+国家+时间（多维度筛选）
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_country_time
  ON clicks(campaignId, country, timestamp DESC);

-- ============================================================
-- FTS5 全文搜索引擎
-- 替代 LIKE '%keyword%' 查询，性能提升10倍+
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS clicks_fts USING fts5(
  clickId,
  ip,
  visitorId,
  userAgent,
  content='clicks',
  content_rowid='rowid'
);

-- ============================================================
-- FTS5 同步触发器
-- 保持 clicks_fts 与 clicks 表数据一致
-- ============================================================

-- INSERT 触发器
CREATE TRIGGER IF NOT EXISTS clicks_fts_insert AFTER INSERT ON clicks BEGIN
  INSERT INTO clicks_fts(rowid, clickId, ip, visitorId, userAgent)
  VALUES (new.rowid, new.clickId, new.ip, new.visitorId, new.userAgent);
END;

-- UPDATE 触发器
CREATE TRIGGER IF NOT EXISTS clicks_fts_update AFTER UPDATE ON clicks BEGIN
  DELETE FROM clicks_fts WHERE rowid = old.rowid;
  INSERT INTO clicks_fts(rowid, clickId, ip, visitorId, userAgent)
  VALUES (new.rowid, new.clickId, new.ip, new.visitorId, new.userAgent);
END;

-- DELETE 触发器
CREATE TRIGGER IF NOT EXISTS clicks_fts_delete AFTER DELETE ON clicks BEGIN
  DELETE FROM clicks_fts WHERE rowid = old.rowid;
END;

-- ============================================================
-- 初始化 FTS 数据
-- 从已有 clicks 数据填充 FTS 索引
-- ============================================================

INSERT INTO clicks_fts(rowid, clickId, ip, visitorId, userAgent)
SELECT rowid, clickId, ip, visitorId, userAgent FROM clicks;
