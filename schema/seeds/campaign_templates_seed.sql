-- 预设 Campaign 模板

-- 模板 1: PropellerAds Push 标准模板
INSERT INTO campaign_templates (
  id, name, platform, config, status, usage_count, success_rate
) VALUES (
  'template-propeller-push-standard',
  'PropellerAds Push 标准模板',
  'propellerads',
  '{
    "bid": 0.05,
    "daily_budget": 50.0,
    "targeting": {
      "geos": ["US", "CA", "UK", "AU"],
      "devices": ["mobile", "desktop"],
      "os": ["android", "ios", "windows", "macos"],
      "connection_types": ["wifi", "carrier"]
    },
    "schedule": {
      "timezone": "America/New_York"
    }
  }',
  'active',
  0,
  0.0
);

-- 模板 2: PropellerAds Push 激进模板（高出价）
INSERT INTO campaign_templates (
  id, name, platform, config, status, usage_count, success_rate
) VALUES (
  'template-propeller-push-aggressive',
  'PropellerAds Push 激进模板',
  'propellerads',
  '{
    "bid": 0.15,
    "daily_budget": 200.0,
    "targeting": {
      "geos": ["US", "CA"],
      "devices": ["mobile"],
      "os": ["android", "ios"],
      "connection_types": ["wifi", "carrier"]
    }
  }',
  'active',
  0,
  0.0
);

-- 模板 3: PropellerAds Push 保守模板（低出价测试）
INSERT INTO campaign_templates (
  id, name, platform, config, status, usage_count, success_rate
) VALUES (
  'template-propeller-push-conservative',
  'PropellerAds Push 保守测试模板',
  'propellerads',
  '{
    "bid": 0.02,
    "daily_budget": 20.0,
    "targeting": {
      "geos": ["US", "CA", "UK"],
      "devices": ["mobile", "desktop"],
      "os": ["android", "ios", "windows"],
      "connection_types": ["wifi"]
    }
  }',
  'active',
  0,
  0.0
);

-- 模板 4: PropellerAds Onclick 标准模板
INSERT INTO campaign_templates (
  id, name, platform, config, status, usage_count, success_rate
) VALUES (
  'template-propeller-onclick-standard',
  'PropellerAds Onclick 标准模板',
  'propellerads',
  '{
    "bid": 0.10,
    "daily_budget": 100.0,
    "targeting": {
      "geos": ["US", "CA", "UK", "AU", "NZ"],
      "devices": ["mobile", "desktop", "tablet"],
      "os": ["android", "ios", "windows", "macos"],
      "browsers": ["chrome", "safari", "firefox", "edge"]
    }
  }',
  'active',
  0,
  0.0
);
