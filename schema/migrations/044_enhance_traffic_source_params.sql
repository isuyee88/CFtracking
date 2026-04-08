-- Migration: 044_enhance_traffic_source_params.sql
-- Description: 增强 Traffic Source 参数映射功能
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 创建流量源模板表
-- 2. 支持参数映射配置

-- 创建流量源模板表
CREATE TABLE IF NOT EXISTS traffic_source_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  type TEXT NOT NULL,
  parameters TEXT NOT NULL,
  postbackUrl TEXT,
  postbackMacros TEXT,
  isCustom INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_traffic_source_templates_type ON traffic_source_templates(type);
CREATE INDEX IF NOT EXISTS idx_traffic_source_templates_category ON traffic_source_templates(category);

-- 插入预定义模板
INSERT OR IGNORE INTO traffic_source_templates (id, name, category, type, parameters, postbackUrl, postbackMacros) VALUES
  ('tpl-google', 'Google Ads', 'search', 'google', '[{"sourceParam":"gclid","targetParam":"clickid","required":true},{"sourceParam":"keyword","targetParam":"keyword"},{"sourceParam":"matchtype","targetParam":"match_type"},{"sourceParam":"device","targetParam":"device"},{"sourceParam":"loc_physical","targetParam":"location"}]', null, '{"clickid":"{gclid}","keyword":"{keyword}","cost":"{cost}"}'),
  ('tpl-facebook', 'Facebook Ads', 'social', 'facebook', '[{"sourceParam":"fbclid","targetParam":"clickid","required":true},{"sourceParam":"ad_id","targetParam":"ad_id"},{"sourceParam":"adset_id","targetParam":"adset_id"},{"sourceParam":"campaign_id","targetParam":"campaign_id"},{"sourceParam":"placement","targetParam":"placement"}]', null, '{"clickid":"{fbclid}","ad_id":"{ad_id}","cost":"{cost}"}'),
  ('tpl-tiktok', 'TikTok Ads', 'social', 'tiktok', '[{"sourceParam":"ttclid","targetParam":"clickid","required":true},{"sourceParam":"campaign_id","targetParam":"campaign_id"},{"sourceParam":"adgroup_id","targetParam":"adgroup_id"},{"sourceParam":"ad_id","targetParam":"ad_id"}]', null, '{"clickid":"{ttclid}","cost":"{cost}"}'),
  ('tpl-native', 'Native Advertising', 'native', 'generic', '[{"sourceParam":"subid","targetParam":"clickid","required":true},{"sourceParam":"source","targetParam":"source"},{"sourceParam":"campaign","targetParam":"campaign_id"}]', null, '{"clickid":"{subid}","cost":"{cost}"}');
