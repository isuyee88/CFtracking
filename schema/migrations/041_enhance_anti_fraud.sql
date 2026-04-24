-- Migration: 041_enhance_anti_fraud.sql
-- Description: 增强防欺诈规则 - Bot检测、IP黑名单、异常流量识别
-- Version: 1.0.0
-- Created: 2026-04-07
-- 
-- 功能说明:
-- 1. 创建 IP 黑名单表
-- 2. 创建 Bot 检测规则表
-- 3. 创建异常流量模式表
-- 4. 创建欺诈检测日志表

-- 1. 创建 IP 黑名单表
CREATE TABLE IF NOT EXISTS ipBlacklist (
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

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ipBlacklist(ip);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_range ON ipBlacklist(ipRange);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ipBlacklist(expiresAt);

-- 2. 创建 Bot 检测规则表
CREATE TABLE IF NOT EXISTS botDetectionRules (
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

CREATE INDEX IF NOT EXISTS idx_bot_rules_type ON botDetectionRules(type);
CREATE INDEX IF NOT EXISTS idx_bot_rules_enabled ON botDetectionRules(enabled);

-- 3. 创建异常流量模式表
CREATE TABLE IF NOT EXISTS trafficAnomalyPatterns (
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

CREATE INDEX IF NOT EXISTS idx_anomaly_patterns_type ON trafficAnomalyPatterns(patternType);
CREATE INDEX IF NOT EXISTS idx_anomaly_patterns_enabled ON trafficAnomalyPatterns(enabled);

-- 4. 创建欺诈检测日志表
CREATE TABLE IF NOT EXISTS fraudDetectionLogs (
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

CREATE INDEX IF NOT EXISTS idx_fraud_logs_campaign ON fraudDetectionLogs(campaignId);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_ip ON fraudDetectionLogs(ip);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_status ON fraudDetectionLogs(status);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_timestamp ON fraudDetectionLogs(timestamp);

-- 5. 创建防欺诈配置表
CREATE TABLE IF NOT EXISTS antiFraudSettings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config TEXT NOT NULL,
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- 6. 插入默认 Bot 检测规则
INSERT OR IGNORE INTO botDetectionRules (id, name, type, pattern, description, severity, score, enabled) VALUES
  ('bot-ua-001', 'Known Bot User Agents', 'user_agent', 'bot|crawler|spider|robot|slurp|crawling|scraper', 'Detect known bot user agents', 'high', 4, 1),
  ('bot-ua-002', 'HTTP Libraries', 'user_agent', 'axios|curl|wget|python-requests|http-client|node-fetch|got|superagent', 'Detect HTTP library user agents', 'high', 4, 1),
  ('bot-ua-003', 'Headless Browsers', 'user_agent', 'headless|phantom|selenium|puppeteer|playwright|webdriver', 'Detect headless browser user agents', 'high', 4, 1),
  ('bot-ua-004', 'Data Center IPs', 'user_agent', '', 'Detect data center IP ranges', 'medium', 2, 1),
  ('bot-ua-005', 'Empty User Agent', 'user_agent', '^$', 'Detect empty user agent', 'high', 4, 1),
  ('bot-js-001', 'JS Detection Failed', 'js_detection', 'js_failed', 'JS challenge failed', 'high', 3, 1),
  ('bot-cf-001', 'Cloudflare Bot Score Low', 'cf_bot_score', '<30', 'Cloudflare bot score below 30', 'high', 4, 1),
  ('bot-cf-002', 'Cloudflare Bot Score Medium', 'cf_bot_score', '30-50', 'Cloudflare bot score between 30-50', 'medium', 2, 1);

-- 7. 插入默认异常流量模式
INSERT OR IGNORE INTO trafficAnomalyPatterns (id, name, patternType, conditions, threshold, windowMinutes, severity, score, enabled) VALUES
  ('anomaly-001', 'High Click Rate', 'velocity', '{"type":"click_rate","minClicks":10}', 0.9, 5, 'high', 3, 1),
  ('anomaly-002', 'Conversion Rate Anomaly', 'conversion', '{"type":"conversion_rate","minConversions":5}', 0.95, 60, 'medium', 2, 1),
  ('anomaly-003', 'Geographic Impossibility', 'geo', '{"type":"geo_speed","maxDistanceKm":500}', 0.8, 60, 'high', 4, 1),
  ('anomaly-004', 'Device Fingerprint Change', 'device', '{"type":"fingerprint_change","maxChanges":3}', 0.7, 1440, 'medium', 2, 1),
  ('anomaly-005', 'Referrer Pattern', 'referrer', '{"type":"referrer_check","requireReferrer":true}', 0.6, 5, 'low', 1, 1);

-- 8. 插入默认防欺诈配置
INSERT OR IGNORE INTO antiFraudSettings (id, config) VALUES (
  'default',
  '{"enabled":true,"thresholds":{"suspicious":2,"fraudulent":4,"block":6},"rules":{"ipVelocity":{"enabled":true,"maxClicksPerMinute":10,"maxClicksPerHour":100},"duplicateCheck":{"enabled":true,"windowMinutes":5},"botDetection":{"enabled":true,"userAgentCheck":true,"behaviorAnalysis":true,"cfBotManagement":true,"jsDetection":true},"geographic":{"enabled":false,"blockedCountries":[]},"ipBlacklist":{"enabled":true,"action":"block"},"anomalyDetection":{"enabled":true,"sensitivity":"medium"}},"actions":{"suspicious":"log","fraudulent":"flag","block":"block"}}'
);
