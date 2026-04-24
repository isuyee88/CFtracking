/**
 * @fileoverview ASN黑名单数据库迁移
 * @description 添加ASN黑名单表，支持基于ASN的智能流量过滤
 * @module schema/migrations/053_add_asn_blacklist
 */

-- ASN黑名单表
CREATE TABLE IF NOT EXISTS asnBlacklist (
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

CREATE INDEX IF NOT EXISTS idx_asn_blacklist_asn ON asnBlacklist(asn);
CREATE INDEX IF NOT EXISTS idx_asn_blacklist_category ON asnBlacklist(category);
CREATE INDEX IF NOT EXISTS idx_asn_blacklist_type ON asnBlacklist(type);
CREATE INDEX IF NOT EXISTS idx_asn_blacklist_enabled ON asnBlacklist(enabled);
CREATE INDEX IF NOT EXISTS idx_asn_blacklist_risk ON asnBlacklist(riskScore);

-- 插入预定义的ASN黑名单
INSERT OR IGNORE INTO asnBlacklist (id, asn, asName, category, type, riskScore, reason, source, enabled)
VALUES 
  -- 已知Bot网络
  ('asn_16276', 16276, 'OVH SAS', 'blacklist', 'bot', 95, 'Known bot network', 'builtin', 1),
  ('asn_50837', 50837, 'CSL', 'blacklist', 'bot', 95, 'Known malicious ASN', 'builtin', 1),
  
  -- VPN服务商
  ('asn_212238', 212238, 'Datacamp Limited', 'blacklist', 'vpn', 90, 'VPN provider', 'builtin', 1),
  ('asn_62041', 62041, 'Private Layer', 'blacklist', 'vpn', 90, 'VPN provider', 'builtin', 1),
  ('asn_44477', 44477, 'Stark Industries', 'blacklist', 'vpn', 90, 'VPN provider', 'builtin', 1),
  ('asn_62240', 62240, 'Quadranet', 'blacklist', 'vpn', 85, 'VPN/Proxy provider', 'builtin', 1),
  
  -- 代理服务商
  ('asn_9009', 9009, 'M247 Ltd', 'blacklist', 'proxy', 85, 'Proxy provider', 'builtin', 1),
  ('asn_34610', 34610, 'NForce Entertainment', 'blacklist', 'proxy', 85, 'Proxy provider', 'builtin', 1),
  ('asn_61317', 61317, 'Digital Energy Technologies', 'blacklist', 'proxy', 90, 'High abuse rate', 'builtin', 1),
  
  -- 数据中心 (灰名单)
  ('asn_8075', 8075, 'Microsoft Corporation', 'greylist', 'datacenter', 60, 'Datacenter - likely bots/crawlers', 'builtin', 1),
  ('asn_15169', 15169, 'Google LLC', 'greylist', 'datacenter', 55, 'Google Cloud - verify if legitimate', 'builtin', 1),
  ('asn_16509', 16509, 'Amazon.com Inc.', 'greylist', 'datacenter', 60, 'AWS - high proxy/VPN usage', 'builtin', 1),
  ('asn_14618', 14618, 'Amazon.com Inc.', 'greylist', 'datacenter', 60, 'AWS - high proxy/VPN usage', 'builtin', 1),
  
  -- 托管服务 (灰名单)
  ('asn_24940', 24940, 'Hetzner Online GmbH', 'greylist', 'hosting', 70, 'Hosting provider, high bot activity', 'builtin', 1),
  ('asn_20473', 20473, 'Vultr Holdings', 'greylist', 'hosting', 75, 'VPS provider - high abuse rate', 'builtin', 1),
  ('asn_63949', 63949, 'Linode LLC', 'greylist', 'hosting', 70, 'VPS provider', 'builtin', 1),
  ('asn_14061', 14061, 'DigitalOcean', 'greylist', 'hosting', 70, 'VPS provider', 'builtin', 1),
  ('asn_51167', 51167, 'Contabo GmbH', 'greylist', 'hosting', 70, 'Budget hosting - high abuse', 'builtin', 1),
  
  -- CDN (需要特殊处理)
  ('asn_13335', 13335, 'Cloudflare Inc', 'greylist', 'hosting', 40, 'CDN - verify actual visitor', 'builtin', 1),
  ('asn_54113', 54113, 'Fastly', 'greylist', 'hosting', 40, 'CDN - verify actual visitor', 'builtin', 1),
  
  -- 主要ISP (白名单)
  ('asn_7922', 7922, 'Comcast Cable', 'whitelist', 'isp', 10, 'Major US ISP', 'builtin', 1),
  ('asn_7018', 7018, 'AT&T', 'whitelist', 'isp', 10, 'Major US ISP', 'builtin', 1),
  ('asn_4134', 4134, 'China Telecom', 'whitelist', 'isp', 15, 'Major China ISP', 'builtin', 1),
  ('asn_4837', 4837, 'China Unicom', 'whitelist', 'isp', 15, 'Major China ISP', 'builtin', 1),
  ('asn_9808', 9808, 'China Mobile', 'whitelist', 'mobile', 15, 'Major China Mobile', 'builtin', 1),
  ('asn_3320', 3320, 'Deutsche Telekom', 'whitelist', 'isp', 10, 'Major EU ISP', 'builtin', 1),
  ('asn_4713', 4713, 'NTT Communications', 'whitelist', 'isp', 10, 'Major Japan ISP', 'builtin', 1);
