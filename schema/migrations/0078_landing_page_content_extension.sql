-- ============================================
-- Landing Page Content System Extension
-- ============================================

-- 扩展 landingPages 表
ALTER TABLE landingPages ADD COLUMN template TEXT DEFAULT 'betting-comparison';
ALTER TABLE landingPages ADD COLUMN content TEXT; -- JSON 格式
ALTER TABLE landingPages ADD COLUMN slug TEXT;
-- SQLite 不允许通过 ALTER TABLE 直接添加 UNIQUE 列；用唯一索引保持同等约束。
ALTER TABLE landingPages ADD COLUMN seo_title TEXT;
ALTER TABLE landingPages ADD COLUMN seo_description TEXT;
ALTER TABLE landingPages ADD COLUMN seo_keywords TEXT;
ALTER TABLE landingPages ADD COLUMN geo_targeting TEXT; -- JSON: ["US", "UK"]
ALTER TABLE landingPages ADD COLUMN compliance_version TEXT DEFAULT 'v1';
ALTER TABLE landingPages ADD COLUMN is_public BOOLEAN DEFAULT 0;

-- 为 slug 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_pages_slug ON landingPages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_public ON landingPages(is_public);

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
  ctr REAL DEFAULT 0,              -- Click-Through Rate
  cvr REAL DEFAULT 0,              -- Conversion Rate
  bounce_rate REAL DEFAULT 0,      -- 跳出率
  avg_time_on_page INTEGER DEFAULT 0, -- 平均停留时间（秒）

  -- 收入指标
  revenue REAL DEFAULT 0,
  epc REAL DEFAULT 0,              -- Earnings Per Click

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
  variant_name TEXT NOT NULL,      -- 'A', 'B', 'C'
  content TEXT NOT NULL,           -- JSON 格式
  traffic_percentage INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft',     -- draft, active, paused, archived

  -- 性能指标（缓存）
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

  -- 访问信息
  visitor_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- 地理位置
  country TEXT,
  city TEXT,

  -- 来源
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- 行为数据
  time_on_page INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,   -- 0-100
  clicked BOOLEAN DEFAULT 0,
  converted BOOLEAN DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE,
  FOREIGN KEY (variantId) REFERENCES landingPageVariants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lp_views_landing_page ON landingPageViews(landingPageId);
CREATE INDEX IF NOT EXISTS idx_lp_views_date ON landingPageViews(created_at);
CREATE INDEX IF NOT EXISTS idx_lp_views_visitor ON landingPageViews(visitor_id);
