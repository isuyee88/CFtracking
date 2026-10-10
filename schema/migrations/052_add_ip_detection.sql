/**
 * @fileoverview IP检测功能数据库迁移
 * @description 添加IP检测结果缓存表、代理/VPN黑名单表、服务商配置表
 * @module schema/migrations/052_add_ip_detection
 */

-- IP检测结果缓存表
CREATE TABLE IF NOT EXISTS ipDetectionCache (
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

CREATE INDEX IF NOT EXISTS idx_ip_detection_cache_ip ON ipDetectionCache(ip);
CREATE INDEX IF NOT EXISTS idx_ip_detection_cache_expires ON ipDetectionCache(expiresAt);
CREATE INDEX IF NOT EXISTS idx_ip_detection_cache_risk ON ipDetectionCache(riskScore);

-- 代理/VPN黑名单表
CREATE TABLE IF NOT EXISTS proxyVpnBlacklist (
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

CREATE INDEX IF NOT EXISTS idx_proxy_vpn_blacklist_ip ON proxyVpnBlacklist(ip);
CREATE INDEX IF NOT EXISTS idx_proxy_vpn_blacklist_type ON proxyVpnBlacklist(type);
CREATE INDEX IF NOT EXISTS idx_proxy_vpn_blacklist_expires ON proxyVpnBlacklist(expiresAt);

-- IP检测服务配置表
CREATE TABLE IF NOT EXISTS ipDetectionProviders (
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

CREATE INDEX IF NOT EXISTS idx_ip_detection_providers_enabled ON ipDetectionProviders(enabled);
CREATE INDEX IF NOT EXISTS idx_ip_detection_providers_priority ON ipDetectionProviders(priority);

-- 插入默认服务商配置
INSERT OR IGNORE INTO ipDetectionProviders (id, name, displayName, apiEndpoint, enabled, priority, dailyLimit, config)
VALUES 
  ('provider_ipapi', 'ip-api', 'IP-API.com', 'http://ip-api.com/json', 1, 1, 64800, '{"fields":"status,message,country,city,isp,proxy,hosting","timeout":5000}'),
  ('provider_proxycheck', 'proxycheck', 'ProxyCheck.io', 'https://proxycheck.io/v2', 0, 2, 1000, '{"vpn":1,"asn":1,"timeout":5000}'),
  ('provider_iphub', 'iphub', 'IPHub.info', 'https://v2.api.iphub.info/ip', 0, 3, 1000, '{"timeout":5000}');

-- 扩展antiFraudSettings配置
UPDATE antiFraudSettings 
SET config = json_set(
  config,
  '$.rules.proxyVpnDetection',
  json('{"enabled":true,"action":"block","riskThreshold":50,"cacheTTL":86400}')
)
WHERE id = 'default';
