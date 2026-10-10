-- ============================================================================
-- cf-tracking D1 Schema Baseline (2026-09-23)
-- ============================================================================
-- 用途：新环境权威初始化 / 生产结构比对基准。
-- 来源：本地 D1（cf-tracking-db）导出——该库已通过 Keitaro 对标全链路
--       端到端验证（点击→转化→出入站回传→报表），并包含 flowOffers
--       id TEXT 重建（069）与治理列等修复。
-- 为什么需要基线：001-068 迁移链存在不可重放项（016 只建索引不建列、
--       017/018/033 为 SELECT 1 假修复、027-029 使用 TEMPORARY TABLE 触发
--       D1 SQLITE_AUTH），全新环境按迁移链搭建会失败。基线快照一次性
--       收敛该问题；旧迁移仅作历史档案保留，不再用于新环境初始化。
-- 使用：wrangler d1 execute cf-tracking-db --local --file=schema/baselines/baseline-2026-09-23.sql
-- 注意：应用前向 d1_migrations 插入 001-070 的已应用标记，
--       使后续增量迁移从 071 起正常滚动。
--       （2026-09-23 生产已执行 069 flowOffers TEXT PK + 070 clicks 瘦身至 75 列
--       并补齐 4 治理列；本基线如用于新环境，应用后需追加执行
--       migrations/070_clicks_slim_and_governance.sql 以对齐生产结构。）
-- ============================================================================

-- ==================== TABLES ====================

CREATE TABLE abTestVariants (
  id TEXT PRIMARY KEY,
  testId TEXT NOT NULL,
  name TEXT NOT NULL,
  landingPageId TEXT,
  landingPageName TEXT,
  offerId TEXT,
  offerName TEXT,
  weight INTEGER DEFAULT 50,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  isWinner INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE abTests (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'landing',
  status TEXT DEFAULT 'draft',
  trafficAllocation TEXT DEFAULT 'equal',
  winnerCriteria TEXT DEFAULT 'conversion_rate',
  minSampleSize INTEGER DEFAULT 1000,
  minConfidence REAL DEFAULT 95,
  autoSelectWinner INTEGER DEFAULT 0,
  startDate TEXT,
  endDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  createdBy TEXT
);

CREATE TABLE affiliateNetworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'api',
  status TEXT DEFAULT 'active',
  apiUrl TEXT,
  apiKey TEXT,
  postbackUrl TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, displayId TEXT, offerParameters TEXT, apiSecret TEXT, postbackMethod TEXT, sendOnlyStatuses TEXT, hmacSecret TEXT, timeoutMs INTEGER, maxRetries INTEGER, platform TEXT, offer_id TEXT, templateId TEXT);

CREATE TABLE antiFraudSettings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config TEXT NOT NULL,
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE asnBlacklist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  asName TEXT,
  category TEXT NOT NULL CHECK(category IN ('blacklist', 'greylist', 'whitelist', 'unknown')),
  type TEXT NOT NULL CHECK(type IN ('bot', 'datacenter', 'vpn', 'proxy', 'hosting', 'isp', 'mobile', 'business', 'education', 'government')),
  riskScore INTEGER DEFAULT 50 CHECK(riskScore >= 0 AND riskScore <= 100),
  hostname TEXT,
  reason TEXT DEFAULT '',
  source TEXT DEFAULT 'manual' CHECK(source IN ('builtin', 'api', 'manual', 'import')),
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE asn_blacklist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  severity TEXT DEFAULT 'high' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asn_greylist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asn_whitelist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE autorule_scope_bindings (id TEXT PRIMARY KEY, scopeConfigId TEXT NOT NULL, ruleId TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);

CREATE TABLE autorule_scope_configs (id TEXT PRIMARY KEY, scopeType TEXT NOT NULL CHECK(scopeType IN ('global','traffic_source','campaign')), scopeId TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'inherit', enabled INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);

CREATE TABLE blacklist (
    id TEXT PRIMARY KEY,
    trafficSourceId TEXT NOT NULL,
    type TEXT NOT NULL, 
    value TEXT NOT NULL, 
    name TEXT, 
    reason TEXT, 
    status TEXT NOT NULL DEFAULT 'active', 
    synced INTEGER NOT NULL DEFAULT 0, 
    syncedAt TEXT,
    campaignId TEXT, 
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL, ipMatchMode TEXT, uaMatchMode TEXT, syncToPlatform INTEGER DEFAULT 1, conditionMode TEXT, conditionsJson TEXT,
    FOREIGN KEY (trafficSourceId) REFERENCES trafficSources(id) ON DELETE CASCADE
);

CREATE TABLE botDetectionRules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  pattern TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  score INTEGER DEFAULT 2,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE campaign_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaignId TEXT NOT NULL,
    extCampaignId TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'propellerads',
    date TEXT NOT NULL,
    spend REAL NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    syncedAt TEXT NOT NULL,
    UNIQUE(campaignId, extCampaignId, date)
);

CREATE TABLE campaign_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#1890ff',
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE campaign_rule_binding_entries (id TEXT PRIMARY KEY, campaignId TEXT NOT NULL, ruleId TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT (datetime('now')), updatedAt TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  "group" TEXT,
  trafficSource TEXT,
  flowRotation TEXT DEFAULT 'position',
  costModel TEXT DEFAULT 'cpc',
  trafficLoss REAL DEFAULT 0,
  uniquenessTTL INTEGER DEFAULT 86400,
  visitorBinding TEXT DEFAULT 'none',
  apiToken TEXT UNIQUE,
  parameters TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, displayId TEXT, uniquenessMethod TEXT DEFAULT 'none', uniquenessParameter TEXT, costValue REAL DEFAULT 0, currency TEXT DEFAULT 'USD', groupId TEXT REFERENCES campaign_groups(id));

CREATE TABLE clicks (
  id TEXT PRIMARY KEY,
  clickId TEXT NOT NULL UNIQUE,
  campaignId TEXT NOT NULL,
  flowId TEXT,
  landingPageId TEXT,
  offerId TEXT,
  timestamp TEXT NOT NULL,
  ip TEXT NOT NULL,
  userAgent TEXT NOT NULL,
  referer TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  isp TEXT,
  connectionType TEXT,
  visitorId TEXT NOT NULL,
  subId1 TEXT,
  subId2 TEXT,
  subId3 TEXT,
  cost REAL DEFAULT 0,
  isUnique INTEGER DEFAULT 1,
  redirectUrl TEXT,
  createdAt TEXT NOT NULL
, isBot INTEGER DEFAULT 0, riskScore REAL DEFAULT 0, isSuspicious INTEGER DEFAULT 0, riskReasons TEXT, fingerprint TEXT, subId4 TEXT, subId5 TEXT, subId6 TEXT, subId7 TEXT, subId8 TEXT, subId9 TEXT, subId10 TEXT, subId11 TEXT, subId12 TEXT, subId13 TEXT, subId14 TEXT, subId15 TEXT, subId16 TEXT, subId17 TEXT, subId18 TEXT, subId19 TEXT, subId20 TEXT, subId21 TEXT, subId22 TEXT, subId23 TEXT, subId24 TEXT, subId25 TEXT, subId26 TEXT, subId27 TEXT, subId28 TEXT, subId29 TEXT, subId30 TEXT, utmSource TEXT, utmMedium TEXT, utmCampaign TEXT, utmTerm TEXT, utmContent TEXT, cfRayId TEXT, cfBotScore INTEGER, cfCountry TEXT, cfRegion TEXT, cfCity TEXT, cfASN INTEGER, cfASName TEXT, serverFingerprint TEXT, clientFingerprint TEXT, ja3Hash TEXT, ja4 TEXT, ruleMatched TEXT, ruleBlocked TEXT, governanceAction TEXT, governanceReason TEXT);

CREATE VIRTUAL TABLE clicks_fts USING fts5(
  clickId,
  ip,
  visitorId,
  userAgent,
  content='clicks',
  content_rowid='rowid'
);

CREATE TABLE cohort_results (
  id TEXT PRIMARY KEY,
  cohortType TEXT NOT NULL,  
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  result TEXT NOT NULL,  
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);

CREATE TABLE conversions (
  id TEXT PRIMARY KEY,
  conversionId TEXT NOT NULL UNIQUE,
  clickId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  offerId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  revenue REAL DEFAULT 0,
  payout REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  conversionType TEXT DEFAULT 'lead',
  offerName TEXT,
  status TEXT DEFAULT 'approved',
  ip TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  source TEXT,
  subId1 TEXT,
  subId2 TEXT,
  subId3 TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE country_blacklist (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT,
  reason TEXT,
  severity TEXT DEFAULT 'high' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE country_filter (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('allow', 'block', 'challenge')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE country_whitelist (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customMetrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  description TEXT,
  
  
  type TEXT NOT NULL DEFAULT 'calculated',
  
  
  formula TEXT NOT NULL,
  
  
  dataType TEXT DEFAULT 'number',
  
  
  format TEXT DEFAULT 'number',
  decimals INTEGER DEFAULT 2,
  prefix TEXT,
  suffix TEXT,
  
  
  status TEXT DEFAULT 'active',
  isSystem INTEGER DEFAULT 0,
  
  
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE detection_rule_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  
  group_name TEXT NOT NULL,
  group_description TEXT,
  
  
  rule_ids TEXT NOT NULL,
  group_logic TEXT DEFAULT 'OR' CHECK(group_logic IN ('AND', 'OR')),
  
  
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100,
  
  
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE domainValidationHistory (
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

CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  displayId TEXT UNIQUE,
  hostname TEXT NOT NULL UNIQUE,
  usage TEXT NOT NULL DEFAULT 'tracking',
  status TEXT NOT NULL DEFAULT 'pending',
  sslStatus TEXT NOT NULL DEFAULT 'pending',
  dnsProvider TEXT NOT NULL DEFAULT 'cloudflare',
  registrar TEXT,
  cloudflareZoneId TEXT,
  cloudflareProxyEnabled INTEGER NOT NULL DEFAULT 0,
  defaultCampaignId TEXT,
  defaultLandingPageId TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (defaultCampaignId) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (defaultLandingPageId) REFERENCES landingPages(id) ON DELETE SET NULL
);

CREATE TABLE exportTasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  entityType TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  totalRecords INTEGER DEFAULT 0,
  processedRecords INTEGER DEFAULT 0,
  
  
  filters TEXT DEFAULT '{}',
  dateRange TEXT,
  fields TEXT DEFAULT '[]',
  
  
  fileName TEXT,
  fileUrl TEXT,
  fileSize INTEGER DEFAULT 0,
  
  
  startedAt TEXT,
  completedAt TEXT,
  error TEXT,
  retryCount INTEGER DEFAULT 0,
  
  
  createdBy TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  
  
  expiresAt TEXT
);

CREATE TABLE fingerprint_blacklist (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  fingerprint_type TEXT DEFAULT 'browser' CHECK(fingerprint_type IN ('browser', 'canvas', 'webgl', 'audio', 'font', 'combined')),
  reason TEXT,
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  related_ips TEXT,
  enabled INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fingerprint_whitelist (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  fingerprint_type TEXT DEFAULT 'browser' CHECK(fingerprint_type IN ('browser', 'canvas', 'webgl', 'audio', 'font', 'combined')),
  reason TEXT,
  trust_level TEXT DEFAULT 'verified' CHECK(trust_level IN ('verified', 'trusted')),
  expires_at DATETIME,
  enabled INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flowLandingPages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowId TEXT NOT NULL,
  landingPageId TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

CREATE TABLE flowOffers (id TEXT PRIMARY KEY, flowId TEXT NOT NULL, offerId TEXT NOT NULL, weight INTEGER DEFAULT 100, priority INTEGER DEFAULT 0, allocationStrategy TEXT DEFAULT 'random', conversionLimit INTEGER DEFAULT 0, uniqueCheck INTEGER DEFAULT 0, share INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, createdAt TEXT NOT NULL);

CREATE TABLE flow_rule_binding_entries (id TEXT PRIMARY KEY, flowId TEXT NOT NULL, ruleId TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT (datetime('now')), updatedAt TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE, FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE);

CREATE TABLE flow_rules (
  id TEXT PRIMARY KEY,
  flowId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions TEXT NOT NULL,
  logic TEXT DEFAULT 'AND',
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE
);

CREATE TABLE flows (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'regular',
  weight INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL, filters TEXT DEFAULT '[]', action_type TEXT DEFAULT 'redirect', action_config TEXT DEFAULT '{}', displayId TEXT, actionType TEXT DEFAULT 'redirect', actionConfig TEXT DEFAULT '{}', filterLogic TEXT DEFAULT 'AND', priority INTEGER DEFAULT 0,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE fraudDetectionLogs (
  id TEXT PRIMARY KEY,
  campaignId TEXT,
  ip TEXT NOT NULL,
  userAgent TEXT,
  eventType TEXT DEFAULT 'click',
  totalScore INTEGER DEFAULT 0,
  status TEXT DEFAULT 'clean',
  reasons TEXT,
  details TEXT,
  botScore INTEGER,
  cfBotManagement TEXT,
  action TEXT DEFAULT 'allow',
  blocked INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE funnel_results (
  id TEXT PRIMARY KEY,
  funnelId TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  result TEXT NOT NULL,  
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  FOREIGN KEY (funnelId) REFERENCES funnel_steps(id) ON DELETE CASCADE
);

CREATE TABLE funnel_steps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,  
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE idCounters (
  tableName TEXT PRIMARY KEY,
  currentNumber INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE ipBlacklist (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  ipRange TEXT,
  reason TEXT DEFAULT 'manual',
  source TEXT DEFAULT 'manual',
  severity TEXT DEFAULT 'high',
  autoExpire INTEGER DEFAULT 0,
  expiresAt TEXT,
  notes TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ipDetectionCache (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  isProxy INTEGER DEFAULT 0,
  isVpn INTEGER DEFAULT 0,
  isTor INTEGER DEFAULT 0,
  isDatacenter INTEGER DEFAULT 0,
  riskScore INTEGER DEFAULT 0,
  provider TEXT NOT NULL,
  isp TEXT,
  country TEXT,
  city TEXT,
  asn TEXT,
  details TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ipDetectionProviders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  displayName TEXT,
  apiKey TEXT,
  apiEndpoint TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 1,
  dailyLimit INTEGER DEFAULT 1000,
  dailyUsed INTEGER DEFAULT 0,
  lastResetDate TEXT,
  config TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ip_blacklist (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  ip_range TEXT,
  reason TEXT,
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'auto_detected', 'api', 'import')),
  expires_at DATETIME,
  enabled INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ip_whitelist (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  ip_range TEXT,
  reason TEXT,
  source TEXT DEFAULT 'manual',
  expires_at DATETIME,
  enabled INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ispWhitelist (
  id TEXT PRIMARY KEY,
  namePattern TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('isp', 'mobile', 'business', 'education', 'government')),
  country TEXT,
  priority INTEGER DEFAULT 50,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE landingPages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, displayId TEXT);

CREATE TABLE log_export_tasks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  logType TEXT NOT NULL,
  filters TEXT,
  format TEXT DEFAULT 'csv',
  status TEXT DEFAULT 'pending',
  totalRecords INTEGER DEFAULT 0,
  processedRecords INTEGER DEFAULT 0,
  filePath TEXT,
  fileSize INTEGER DEFAULT 0,
  error TEXT,
  startedAt TEXT,
  completedAt TEXT,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE log_query_cache (
  id TEXT PRIMARY KEY,
  queryHash TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  resultCount INTEGER DEFAULT 0,
  resultData TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE lpPreloadCache (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  content TEXT NOT NULL,
  contentType TEXT DEFAULT 'text/html',
  contentSize INTEGER DEFAULT 0,
  fetchStatus TEXT DEFAULT 'pending',
  lastFetchedAt TEXT,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

CREATE TABLE lpPreloadStats (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  cacheHits INTEGER DEFAULT 0,
  cacheMisses INTEGER DEFAULT 0,
  totalRequests INTEGER DEFAULT 0,
  avgResponseTime INTEGER DEFAULT 0,
  lastResetAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

CREATE TABLE multiOfferStats (
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

CREATE TABLE multiOfferVisitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowOfferId INTEGER NOT NULL,
  visitorId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  UNIQUE(flowOfferId, visitorId),
  FOREIGN KEY (flowOfferId) REFERENCES flowOffers(id) ON DELETE CASCADE
);

CREATE TABLE offer_conversion_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offerId TEXT NOT NULL,
  date TEXT NOT NULL,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (offerId) REFERENCES offers(id) ON DELETE CASCADE,
  UNIQUE(offerId, date)
);

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  payout REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, displayId TEXT, payoutType TEXT DEFAULT 'fixed', network TEXT DEFAULT '', "group" TEXT DEFAULT '', redirectType TEXT DEFAULT 'http', conversionCap INTEGER DEFAULT 0, dailyCap INTEGER DEFAULT 0, payoutRules TEXT DEFAULT '[]', minPayout REAL DEFAULT 0, maxPayout REAL DEFAULT 0, capStartDate TEXT, capEndDate TEXT, actionType TEXT, countries TEXT);

CREATE TABLE platformConfigs (
  id TEXT PRIMARY KEY,
  platformId TEXT NOT NULL UNIQUE,
  config TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE postback_idempotency (
            id TEXT PRIMARY KEY,
            conversion_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'sent',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(conversion_id, platform)
          );

CREATE TABLE proxyVpnBlacklist (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  ipRange TEXT,
  type TEXT NOT NULL CHECK(type IN ('proxy', 'vpn', 'tor', 'datacenter', 'mixed')),
  reason TEXT DEFAULT 'manual',
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'auto_detected', 'api', 'import')),
  severity TEXT DEFAULT 'high' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  autoExpire INTEGER DEFAULT 0,
  expiresAt TEXT,
  notes TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE proxy_detection_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  
  
  detection_type TEXT NOT NULL CHECK(detection_type IN ('isp_keyword', 'asn', 'ip_reputation', 'geo', 'behavior', 'ua', 'country')),
  detection_operator TEXT NOT NULL CHECK(detection_operator IN ('equals', 'contains', 'regex', 'in_list', 'greater_than', 'less_than', 'in_whitelist', 'not_in_list')),
  detection_value TEXT NOT NULL,
  
  
  logic_operator TEXT DEFAULT 'AND' CHECK(logic_operator IN ('AND', 'OR', 'NOT')),
  parent_rule_id INTEGER,
  
  
  priority INTEGER DEFAULT 100,
  action TEXT NOT NULL CHECK(action IN ('ALLOW', 'CHALLENGE', 'MARK', 'BLOCK', 'REDIRECT')),
  action_config TEXT,
  
  
  enabled INTEGER DEFAULT 1,
  tags TEXT,
  
  
  hit_count INTEGER DEFAULT 0,
  last_hit_at DATETIME,
  
  
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 1,
            window_start TEXT NOT NULL,
            expires_at TEXT NOT NULL
          );

CREATE TABLE report_cache (
  id TEXT PRIMARY KEY,
  reportType TEXT NOT NULL,
  config TEXT NOT NULL,
  result TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);

CREATE TABLE ruleExecutions (
  id TEXT PRIMARY KEY,
  ruleId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  executionResult TEXT NOT NULL,
  triggeredBy TEXT NOT NULL,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE TABLE rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, displayId TEXT);

CREATE TABLE scheduled_reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reportType TEXT NOT NULL,
  config TEXT NOT NULL,
  schedule TEXT NOT NULL,
  recipients TEXT NOT NULL,
  lastRunAt TEXT,
  nextRunAt TEXT,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE secret_store (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,                 
    kind TEXT NOT NULL DEFAULT 'api',       
    label TEXT NOT NULL DEFAULT '',         
    cipher TEXT NOT NULL,                   
    masked TEXT NOT NULL,                   
    expires_at TEXT,                        
    status TEXT NOT NULL DEFAULT 'active',  
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE taskQueue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  scheduledAt TEXT,
  executedAt TEXT,
  result TEXT,
  error TEXT,
  retryCount INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE trafficAnomalyPatterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  patternType TEXT NOT NULL,
  conditions TEXT NOT NULL,
  threshold REAL DEFAULT 0.8,
  windowMinutes INTEGER DEFAULT 60,
  severity TEXT DEFAULT 'medium',
  score INTEGER DEFAULT 2,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE trafficSources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  status TEXT DEFAULT 'active',
  postbackUrl TEXT,
  costModel TEXT DEFAULT 'cpc',
  costValue REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  parameters TEXT DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
, apiConfig TEXT, displayId TEXT, campaign_id TEXT, postbackMethod TEXT, sendOnlyStatuses TEXT, hmacSecret TEXT, timeoutMs INTEGER, maxRetries INTEGER, platform TEXT, postbackEnabled INTEGER, postbackConfig TEXT, templateId TEXT);

CREATE TABLE trafficSummary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaignId TEXT NOT NULL,
  date TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  country TEXT,
  device TEXT,
  browser TEXT,
  offerId TEXT,
  createdAt TEXT NOT NULL, flowId TEXT, landingPageId TEXT,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE traffic_source_templates (
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

CREATE TABLE turnstile_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  
  session_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  fingerprint TEXT,
  
  
  challenge_token TEXT,
  challenge_type TEXT DEFAULT 'managed' CHECK(challenge_type IN ('managed', 'invisible')),
  challenge_status TEXT NOT NULL CHECK(challenge_status IN ('pending', 'passed', 'failed', 'expired')),
  
  
  challenge_time DATETIME NOT NULL,
  response_time DATETIME,
  passed_at DATETIME,
  
  
  fail_count INTEGER DEFAULT 0,
  fail_reason TEXT,
  
  
  trust_level TEXT DEFAULT 'untrusted' CHECK(trust_level IN ('untrusted', 'verified', 'trusted')),
  trust_expires_at DATETIME,
  
  
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ua_blacklist (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'contains' CHECK(pattern_type IN ('exact', 'contains', 'regex')),
  reason TEXT,
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  enabled INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ua_whitelist (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'contains' CHECK(pattern_type IN ('exact', 'contains', 'regex')),
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE unified_logs (
  id TEXT PRIMARY KEY,
  logType TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  campaignId TEXT,
  flowId TEXT,
  offerId TEXT,
  landingPageId TEXT,
  visitorId TEXT,
  clickId TEXT,
  conversionId TEXT,
  ip TEXT,
  userAgent TEXT,
  country TEXT,
  city TEXT,
  deviceType TEXT,
  browser TEXT,
  os TEXT,
  data TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_first_visits (
  id TEXT PRIMARY KEY,
  visitorId TEXT NOT NULL UNIQUE,
  firstVisitDate TEXT NOT NULL,
  source TEXT,
  campaignId TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE whitelist (
    id TEXT PRIMARY KEY,
    trafficSourceId TEXT NOT NULL,
    type TEXT NOT NULL, 
    value TEXT NOT NULL, 
    name TEXT, 
    reason TEXT, 
    status TEXT NOT NULL DEFAULT 'active', 
    synced INTEGER NOT NULL DEFAULT 0, 
    syncedAt TEXT,
    campaignId TEXT, 
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL, ipMatchMode TEXT, uaMatchMode TEXT, syncToPlatform INTEGER DEFAULT 1, conditionMode TEXT, conditionsJson TEXT,
    FOREIGN KEY (trafficSourceId) REFERENCES trafficSources(id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================

CREATE INDEX idx_ab_test_variants_test ON abTestVariants(testId);

CREATE INDEX idx_ab_tests_campaign ON abTests(campaignId);

CREATE INDEX idx_ab_tests_created_at ON abTests(createdAt);

CREATE INDEX idx_ab_tests_status ON abTests(status);

CREATE INDEX idx_ab_tests_type ON abTests(type);

CREATE INDEX idx_affiliate_networks_display_id ON affiliateNetworks(displayId);

CREATE INDEX idx_affiliate_networks_status ON affiliateNetworks(status);

CREATE INDEX idx_affiliate_networks_type ON affiliateNetworks(type);

CREATE INDEX idx_anomaly_patterns_enabled ON trafficAnomalyPatterns(enabled);

CREATE INDEX idx_anomaly_patterns_type ON trafficAnomalyPatterns(patternType);

CREATE INDEX idx_asn_blacklist_asn ON asnBlacklist(asn);

CREATE INDEX idx_asn_blacklist_category ON asnBlacklist(category);

CREATE INDEX idx_asn_blacklist_enabled ON asnBlacklist(enabled);

CREATE INDEX idx_asn_blacklist_risk ON asnBlacklist(riskScore);

CREATE INDEX idx_asn_blacklist_type ON asnBlacklist(type);

CREATE INDEX idx_asn_greylist_asn ON asn_greylist(asn);

CREATE INDEX idx_asn_whitelist_asn ON asn_whitelist(asn);

CREATE INDEX idx_blacklist_campaignId ON blacklist(campaignId);

CREATE INDEX idx_blacklist_ipMatchMode ON blacklist(ipMatchMode);

CREATE INDEX idx_blacklist_status ON blacklist(status);

CREATE INDEX idx_blacklist_synced ON blacklist(synced);

CREATE INDEX idx_blacklist_trafficSourceId ON blacklist(trafficSourceId);

CREATE INDEX idx_blacklist_type ON blacklist(type);

CREATE INDEX idx_blacklist_uaMatchMode ON blacklist(uaMatchMode);

CREATE INDEX idx_blacklist_value ON blacklist(trafficSourceId, type, value);

CREATE INDEX idx_bot_rules_enabled ON botDetectionRules(enabled);

CREATE INDEX idx_bot_rules_type ON botDetectionRules(type);

CREATE INDEX idx_campaign_costs_campaign ON campaign_costs(campaignId, date);

CREATE INDEX idx_campaign_groups_name ON campaign_groups(name);

CREATE INDEX idx_campaign_groups_sort ON campaign_groups(sortOrder);

CREATE UNIQUE INDEX idx_campaign_rule_binding_entries_unique ON campaign_rule_binding_entries(campaignId, ruleId);

CREATE INDEX idx_campaigns_alias ON campaigns(alias);

CREATE INDEX idx_campaigns_display_id ON campaigns(displayId);

CREATE INDEX idx_campaigns_group ON campaigns(groupId);

CREATE INDEX idx_campaigns_status ON campaigns(status);

CREATE INDEX idx_campaigns_uniqueness ON campaigns(uniquenessMethod);

CREATE INDEX idx_clicks_browser ON clicks(browser);

CREATE INDEX idx_clicks_campaignId ON clicks(campaignId);

CREATE INDEX idx_clicks_campaign_country_time
  ON clicks(campaignId, country, timestamp DESC);

CREATE INDEX idx_clicks_campaign_timestamp ON clicks(campaignId, timestamp);

CREATE INDEX idx_clicks_cfRayId ON clicks(cfRayId);

CREATE INDEX idx_clicks_clientFingerprint ON clicks(clientFingerprint);

CREATE INDEX idx_clicks_country ON clicks(country);

CREATE INDEX idx_clicks_country_timestamp
  ON clicks(country, timestamp DESC);

CREATE INDEX idx_clicks_device ON clicks(device);

CREATE INDEX idx_clicks_device_timestamp
  ON clicks(device, timestamp DESC);

CREATE INDEX idx_clicks_fingerprint ON clicks(fingerprint);

CREATE INDEX idx_clicks_flowId ON clicks(flowId);

CREATE INDEX idx_clicks_flow_timestamp
  ON clicks(flowId, timestamp DESC);

CREATE INDEX idx_clicks_ip ON clicks(ip);

CREATE INDEX idx_clicks_isBot ON clicks(isBot);

CREATE INDEX idx_clicks_isSuspicious ON clicks(isSuspicious);

CREATE INDEX idx_clicks_isUnique ON clicks(isUnique);

CREATE INDEX idx_clicks_ja3Hash ON clicks(ja3Hash);

CREATE INDEX idx_clicks_offerId ON clicks(offerId);

CREATE INDEX idx_clicks_offer_timestamp
  ON clicks(offerId, timestamp DESC);

CREATE INDEX idx_clicks_riskScore ON clicks(riskScore);

CREATE INDEX idx_clicks_serverFingerprint ON clicks(serverFingerprint);

CREATE INDEX idx_clicks_timestamp ON clicks(timestamp);

CREATE INDEX idx_clicks_unique_timestamp
  ON clicks(isUnique, timestamp DESC);

CREATE INDEX idx_clicks_utmCampaign ON clicks(utmCampaign);

CREATE INDEX idx_clicks_utmSource ON clicks(utmSource);

CREATE INDEX idx_clicks_visitorId ON clicks(visitorId);

CREATE INDEX idx_clicks_visitor_timestamp
  ON clicks(visitorId, timestamp DESC);

CREATE INDEX idx_conversions_campaignId ON conversions(campaignId);

CREATE INDEX idx_conversions_campaign_timestamp ON conversions(campaignId, timestamp);

CREATE INDEX idx_conversions_clickId ON conversions(clickId);

CREATE INDEX idx_conversions_country ON conversions(country);

CREATE INDEX idx_conversions_offerId ON conversions(offerId);

CREATE INDEX idx_conversions_status ON conversions(status);

CREATE INDEX idx_conversions_timestamp ON conversions(timestamp);

CREATE INDEX idx_country_blacklist_code ON country_blacklist(country_code);

CREATE UNIQUE INDEX idx_country_filter_code ON country_filter(country_code);

CREATE INDEX idx_country_whitelist_code ON country_whitelist(country_code);

CREATE INDEX idx_custom_metrics_name ON customMetrics(name);

CREATE INDEX idx_custom_metrics_status ON customMetrics(status);

CREATE INDEX idx_custom_metrics_type ON customMetrics(type);

CREATE INDEX idx_detection_rules_priority ON proxy_detection_rules(priority, enabled);

CREATE INDEX idx_detection_rules_type ON proxy_detection_rules(detection_type);

CREATE INDEX idx_domain_validation_history_domain ON domainValidationHistory(domainId);

CREATE INDEX idx_domain_validation_history_time ON domainValidationHistory(validatedAt);

CREATE INDEX idx_domains_display_id ON domains(displayId);

CREATE INDEX idx_domains_hostname ON domains(hostname);

CREATE INDEX idx_domains_status ON domains(status);

CREATE INDEX idx_domains_usage ON domains(usage);

CREATE INDEX idx_export_tasks_created_at ON exportTasks(createdAt);

CREATE INDEX idx_export_tasks_created_by ON exportTasks(createdBy);

CREATE INDEX idx_export_tasks_entity_type ON exportTasks(entityType);

CREATE INDEX idx_export_tasks_expires_at ON exportTasks(expiresAt);

CREATE INDEX idx_export_tasks_status ON exportTasks(status);

CREATE INDEX idx_fingerprint_blacklist ON fingerprint_blacklist(fingerprint);

CREATE INDEX idx_fingerprint_whitelist ON fingerprint_whitelist(fingerprint);

CREATE INDEX idx_flow_landing_pages_flow ON flowLandingPages(flowId);

CREATE INDEX idx_flow_rule_binding_entries_priority ON flow_rule_binding_entries(flowId, priority);

CREATE UNIQUE INDEX idx_flow_rule_binding_entries_unique ON flow_rule_binding_entries(flowId, ruleId);

CREATE INDEX idx_flow_rules_enabled ON flow_rules(enabled);

CREATE INDEX idx_flow_rules_flow ON flow_rules(flowId);

CREATE INDEX idx_flow_rules_priority ON flow_rules(priority);

CREATE INDEX idx_flows_action_type ON flows(actionType);

CREATE INDEX idx_flows_campaign ON flows(campaignId);

CREATE INDEX idx_flows_display_id ON flows(displayId);

CREATE INDEX idx_flows_status ON flows(status);

CREATE INDEX idx_fraud_logs_campaign ON fraudDetectionLogs(campaignId);

CREATE INDEX idx_fraud_logs_ip ON fraudDetectionLogs(ip);

CREATE INDEX idx_fraud_logs_status ON fraudDetectionLogs(status);

CREATE INDEX idx_fraud_logs_timestamp ON fraudDetectionLogs(timestamp);

CREATE INDEX idx_funnel_results_expires ON funnel_results(expiresAt);

CREATE INDEX idx_funnel_results_funnel ON funnel_results(funnelId);

CREATE INDEX idx_id_counters_table ON idCounters(tableName);

CREATE INDEX idx_ip_blacklist_expires ON ipBlacklist(expiresAt);

CREATE INDEX idx_ip_blacklist_ip ON ipBlacklist(ip);

CREATE INDEX idx_ip_blacklist_range ON ipBlacklist(ipRange);

CREATE INDEX idx_ip_detection_cache_expires ON ipDetectionCache(expiresAt);

CREATE INDEX idx_ip_detection_cache_ip ON ipDetectionCache(ip);

CREATE INDEX idx_ip_detection_cache_risk ON ipDetectionCache(riskScore);

CREATE INDEX idx_ip_detection_providers_enabled ON ipDetectionProviders(enabled);

CREATE INDEX idx_ip_detection_providers_priority ON ipDetectionProviders(priority);

CREATE INDEX idx_ip_whitelist_ip ON ip_whitelist(ip_address);

CREATE INDEX idx_ip_whitelist_range ON ip_whitelist(ip_range);

CREATE INDEX idx_isp_whitelist_enabled ON ispWhitelist(enabled);

CREATE INDEX idx_isp_whitelist_pattern ON ispWhitelist(namePattern);

CREATE INDEX idx_isp_whitelist_priority ON ispWhitelist(priority);

CREATE INDEX idx_landing_pages_display_id ON landingPages(displayId);

CREATE INDEX idx_log_export_tasks_expires ON log_export_tasks(expiresAt);

CREATE INDEX idx_log_export_tasks_status ON log_export_tasks(status);

CREATE INDEX idx_log_export_tasks_type ON log_export_tasks(logType);

CREATE INDEX idx_log_export_tasks_user ON log_export_tasks(userId);

CREATE INDEX idx_log_query_cache_expires ON log_query_cache(expiresAt);

CREATE INDEX idx_log_query_cache_hash ON log_query_cache(queryHash);

CREATE INDEX idx_lp_preload_expires ON lpPreloadCache(expiresAt);

CREATE INDEX idx_lp_preload_landing_page ON lpPreloadCache(landingPageId);

CREATE INDEX idx_lp_preload_stats_lp ON lpPreloadStats(landingPageId);

CREATE INDEX idx_lp_preload_status ON lpPreloadCache(fetchStatus);

CREATE INDEX idx_multi_offer_stats_date ON multiOfferStats(date);

CREATE INDEX idx_multi_offer_stats_flow_offer ON multiOfferStats(flowOfferId);

CREATE INDEX idx_multi_offer_visitors_expires ON multiOfferVisitors(expiresAt);

CREATE INDEX idx_multi_offer_visitors_visitor ON multiOfferVisitors(visitorId);

CREATE INDEX idx_offer_conversion_stats_date ON offer_conversion_stats(date);

CREATE INDEX idx_offer_conversion_stats_offer ON offer_conversion_stats(offerId);

CREATE INDEX idx_offers_display_id ON offers(displayId);

CREATE INDEX idx_pidempotency_conversion ON postback_idempotency(conversion_id);

CREATE INDEX idx_pidempotency_platform ON postback_idempotency(platform);

CREATE INDEX idx_proxy_vpn_blacklist_expires ON proxyVpnBlacklist(expiresAt);

CREATE INDEX idx_proxy_vpn_blacklist_ip ON proxyVpnBlacklist(ip);

CREATE INDEX idx_proxy_vpn_blacklist_type ON proxyVpnBlacklist(type);

CREATE INDEX idx_rate_limits_expiry ON rate_limits(expires_at);

CREATE INDEX idx_report_cache_expires ON report_cache(expiresAt);

CREATE INDEX idx_report_cache_type ON report_cache(reportType);

CREATE INDEX idx_rule_executions_campaign ON ruleExecutions(campaignId);

CREATE INDEX idx_rule_executions_rule ON ruleExecutions(ruleId);

CREATE INDEX idx_rules_display_id ON rules(displayId);

CREATE INDEX idx_rules_enabled ON rules(enabled);

CREATE INDEX idx_rules_status ON rules(status);

CREATE INDEX idx_scheduled_reports_enabled ON scheduled_reports(enabled);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(nextRunAt);

CREATE UNIQUE INDEX idx_secret_store_active
    ON secret_store(platform) WHERE status = 'active';

CREATE INDEX idx_secret_store_platform_status
    ON secret_store(platform, status);

CREATE INDEX idx_task_queue_scheduled ON taskQueue(scheduledAt);

CREATE INDEX idx_task_queue_status ON taskQueue(status);

CREATE INDEX idx_traffic_source_templates_category ON traffic_source_templates(category);

CREATE INDEX idx_traffic_source_templates_type ON traffic_source_templates(type);

CREATE INDEX idx_traffic_sources_display_id ON trafficSources(displayId);

CREATE INDEX idx_traffic_sources_status ON trafficSources(status);

CREATE INDEX idx_traffic_sources_type ON trafficSources(type);

CREATE INDEX idx_traffic_summary_campaign ON trafficSummary(campaignId);

CREATE INDEX idx_traffic_summary_campaign_date_flow ON trafficSummary(campaignId, date, flowId);

CREATE INDEX idx_traffic_summary_campaign_landing ON trafficSummary(campaignId, landingPageId, date);

CREATE INDEX idx_traffic_summary_date ON trafficSummary(date);

CREATE INDEX idx_traffic_summary_landing_page ON trafficSummary(landingPageId);

CREATE INDEX idx_turnstile_ip_status ON turnstile_challenges(ip_address, challenge_status);

CREATE INDEX idx_turnstile_session ON turnstile_challenges(session_id, ip_address);

CREATE INDEX idx_turnstile_trust ON turnstile_challenges(trust_expires_at);

CREATE INDEX idx_ua_blacklist_pattern ON ua_blacklist(pattern);

CREATE INDEX idx_ua_whitelist_pattern ON ua_whitelist(pattern);

CREATE INDEX idx_unified_logs_campaign ON unified_logs(campaignId);

CREATE INDEX idx_unified_logs_campaign_timestamp ON unified_logs(campaignId, timestamp);

CREATE INDEX idx_unified_logs_click ON unified_logs(clickId);

CREATE INDEX idx_unified_logs_country ON unified_logs(country);

CREATE INDEX idx_unified_logs_device ON unified_logs(deviceType);

CREATE INDEX idx_unified_logs_flow ON unified_logs(flowId);

CREATE INDEX idx_unified_logs_offer ON unified_logs(offerId);

CREATE INDEX idx_unified_logs_timestamp ON unified_logs(timestamp);

CREATE INDEX idx_unified_logs_type ON unified_logs(logType);

CREATE INDEX idx_unified_logs_type_timestamp ON unified_logs(logType, timestamp);

CREATE INDEX idx_unified_logs_visitor ON unified_logs(visitorId);

CREATE INDEX idx_user_first_visits_date ON user_first_visits(firstVisitDate);

CREATE INDEX idx_user_first_visits_visitor ON user_first_visits(visitorId);

CREATE INDEX idx_whitelist_campaignId ON whitelist(campaignId);

CREATE INDEX idx_whitelist_conditionMode ON whitelist(conditionMode);

CREATE INDEX idx_whitelist_ipMatchMode ON whitelist(ipMatchMode);

CREATE INDEX idx_whitelist_status ON whitelist(status);

CREATE INDEX idx_whitelist_synced ON whitelist(synced);

CREATE INDEX idx_whitelist_trafficSourceId ON whitelist(trafficSourceId);

CREATE INDEX idx_whitelist_type ON whitelist(type);

CREATE INDEX idx_whitelist_uaMatchMode ON whitelist(uaMatchMode);

CREATE INDEX idx_whitelist_value ON whitelist(trafficSourceId, type, value);

CREATE TRIGGER clicks_fts_delete AFTER DELETE ON clicks BEGIN
  DELETE FROM clicks_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER clicks_fts_insert AFTER INSERT ON clicks BEGIN
  INSERT INTO clicks_fts(rowid, clickId, ip, visitorId, userAgent)
  VALUES (new.rowid, new.clickId, new.ip, new.visitorId, new.userAgent);
END;

CREATE TRIGGER clicks_fts_update AFTER UPDATE ON clicks BEGIN
  DELETE FROM clicks_fts WHERE rowid = old.rowid;
  INSERT INTO clicks_fts(rowid, clickId, ip, visitorId, userAgent)
  VALUES (new.rowid, new.clickId, new.ip, new.visitorId, new.userAgent);
END;
