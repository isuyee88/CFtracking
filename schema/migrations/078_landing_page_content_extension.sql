-- ============================================
-- Landing Page Content System Extension
-- Migration: 078
-- Date: 2026-10-10
-- Description: 扩展 Landing Page 系统，支持智能内容管理
-- ============================================

-- 扩展 landingPages 表
ALTER TABLE landingPages ADD COLUMN template TEXT DEFAULT 'betting-comparison';
ALTER TABLE landingPages ADD COLUMN content TEXT; -- JSON 格式
ALTER TABLE landingPages ADD COLUMN slug TEXT;
ALTER TABLE landingPages ADD COLUMN seo_title TEXT;
ALTER TABLE landingPages ADD COLUMN seo_description TEXT;
ALTER TABLE landingPages ADD COLUMN seo_keywords TEXT;
ALTER TABLE landingPages ADD COLUMN geo_targeting TEXT; -- JSON: ["US", "UK"]
ALTER TABLE landingPages ADD COLUMN compliance_version TEXT DEFAULT 'v1';
ALTER TABLE landingPages ADD COLUMN is_public INTEGER DEFAULT 0;

-- 为 slug 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_pages_slug ON landingPages(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_pages_public ON landingPages(is_public) WHERE is_public = 1;
CREATE INDEX IF NOT EXISTS idx_landing_pages_template ON landingPages(template);

-- Landing Page 性能统计表
CREATE TABLE IF NOT EXISTS landingPageStats (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- 流量指标
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- 转化指标
  ctr REAL DEFAULT 0,
  cvr REAL DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  
  -- 收入指标
  revenue REAL DEFAULT 0,
  epc REAL DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE,
  UNIQUE(landingPageId, date)
);

CREATE INDEX IF NOT EXISTS idx_lp_stats_date ON landingPageStats(date);
CREATE INDEX IF NOT EXISTS idx_lp_stats_landing_page ON landingPageStats(landingPageId);

-- Landing Page Variants (A/B 测试)
CREATE TABLE IF NOT EXISTS landingPageVariants (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  content TEXT NOT NULL,
  traffic_percentage INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft',
  
  -- 性能缓存
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  cvr REAL DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE,
  UNIQUE(landingPageId, variant_name)
);

CREATE INDEX IF NOT EXISTS idx_lp_variants_landing_page ON landingPageVariants(landingPageId);
CREATE INDEX IF NOT EXISTS idx_lp_variants_status ON landingPageVariants(status);

-- Landing Page Views (详细追踪)
CREATE TABLE IF NOT EXISTS landingPageViews (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  variantId TEXT,
  
  visitor_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  country TEXT,
  city TEXT,
  
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  time_on_page INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lp_views_landing_page ON landingPageViews(landingPageId);
CREATE INDEX IF NOT EXISTS idx_lp_views_date ON landingPageViews(created_at);
CREATE INDEX IF NOT EXISTS idx_lp_views_visitor ON landingPageViews(visitor_id);
CREATE INDEX IF NOT EXISTS idx_lp_views_country ON landingPageViews(country);
