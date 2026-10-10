-- 代理检测规则引擎表
-- 创建日期: 2026-04-07
-- 说明: 支持多维度检测、规则组合、Turnstile挑战

-- 代理检测规则表
CREATE TABLE IF NOT EXISTS proxy_detection_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 规则基本信息
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  
  -- 检测条件
  detection_type TEXT NOT NULL CHECK(detection_type IN ('isp_keyword', 'asn', 'ip_reputation', 'geo', 'behavior', 'ua', 'country')),
  detection_operator TEXT NOT NULL CHECK(detection_operator IN ('equals', 'contains', 'regex', 'in_list', 'greater_than', 'less_than', 'in_whitelist', 'not_in_list')),
  detection_value TEXT NOT NULL,
  
  -- 逻辑组合
  logic_operator TEXT DEFAULT 'AND' CHECK(logic_operator IN ('AND', 'OR', 'NOT')),
  parent_rule_id INTEGER,
  
  -- 优先级和动作
  priority INTEGER DEFAULT 100,
  action TEXT NOT NULL CHECK(action IN ('ALLOW', 'CHALLENGE', 'MARK', 'BLOCK', 'REDIRECT')),
  action_config TEXT,
  
  -- 控制开关
  enabled INTEGER DEFAULT 1,
  tags TEXT,
  
  -- 统计
  hit_count INTEGER DEFAULT 0,
  last_hit_at DATETIME,
  
  -- 元数据
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_rules_priority ON proxy_detection_rules(priority, enabled);
CREATE INDEX IF NOT EXISTS idx_detection_rules_type ON proxy_detection_rules(detection_type);

-- Turnstile挑战记录表
CREATE TABLE IF NOT EXISTS turnstile_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 会话信息
  session_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  fingerprint TEXT,
  
  -- 挑战信息
  challenge_token TEXT,
  challenge_type TEXT DEFAULT 'managed' CHECK(challenge_type IN ('managed', 'invisible')),
  challenge_status TEXT NOT NULL CHECK(challenge_status IN ('pending', 'passed', 'failed', 'expired')),
  
  -- 时间记录
  challenge_time DATETIME NOT NULL,
  response_time DATETIME,
  passed_at DATETIME,
  
  -- 失败处理
  fail_count INTEGER DEFAULT 0,
  fail_reason TEXT,
  
  -- 信任状态
  trust_level TEXT DEFAULT 'untrusted' CHECK(trust_level IN ('untrusted', 'verified', 'trusted')),
  trust_expires_at DATETIME,
  
  -- 元数据
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_turnstile_session ON turnstile_challenges(session_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_turnstile_ip_status ON turnstile_challenges(ip_address, challenge_status);
CREATE INDEX IF NOT EXISTS idx_turnstile_trust ON turnstile_challenges(trust_expires_at);

-- 检测规则组表
CREATE TABLE IF NOT EXISTS detection_rule_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 规则组信息
  group_name TEXT NOT NULL,
  group_description TEXT,
  
  -- 规则组合
  rule_ids TEXT NOT NULL,
  group_logic TEXT DEFAULT 'OR' CHECK(group_logic IN ('AND', 'OR')),
  
  -- 控制开关
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100,
  
  -- 元数据
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 国家过滤规则表
CREATE TABLE IF NOT EXISTS country_filter (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('allow', 'block', 'challenge')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_country_filter_code ON country_filter(country_code);

-- IP黑名单表
CREATE TABLE IF NOT EXISTS ip_blacklist (
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

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_range ON ip_blacklist(ip_range);

-- IP白名单表
CREATE TABLE IF NOT EXISTS ip_whitelist (
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

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip ON ip_whitelist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_range ON ip_whitelist(ip_range);

-- User-Agent黑名单表
CREATE TABLE IF NOT EXISTS ua_blacklist (
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

CREATE INDEX IF NOT EXISTS idx_ua_blacklist_pattern ON ua_blacklist(pattern);

-- User-Agent白名单表
CREATE TABLE IF NOT EXISTS ua_whitelist (
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

CREATE INDEX IF NOT EXISTS idx_ua_whitelist_pattern ON ua_whitelist(pattern);

-- 设备指纹黑名单表
CREATE TABLE IF NOT EXISTS fingerprint_blacklist (
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

CREATE INDEX IF NOT EXISTS idx_fingerprint_blacklist ON fingerprint_blacklist(fingerprint);

-- 设备指纹白名单表
CREATE TABLE IF NOT EXISTS fingerprint_whitelist (
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

CREATE INDEX IF NOT EXISTS idx_fingerprint_whitelist ON fingerprint_whitelist(fingerprint);

-- 插入默认规则
INSERT INTO proxy_detection_rules (rule_name, rule_description, detection_type, detection_operator, detection_value, priority, action, enabled) VALUES
('ISP黑名单关键词严格拦截', 'ISP名称包含VPN/Proxy/Hosting等关键词直接拦截', 'isp_keyword', 'contains', '["vpn","proxy","tor","hosting","datacenter","vps","cloud"]', 10, 'BLOCK', 1),
('数据中心ASN挑战', '已知数据中心ASN触发Turnstile挑战', 'asn', 'in_list', '[16276,24940,16509,20473,63949]', 20, 'CHALLENGE', 1),
('高威胁分数拦截', 'IP信誉分数超过80直接拦截', 'ip_reputation', 'greater_than', '80', 30, 'BLOCK', 1),
('高风险国家挑战', '高风险国家访问触发挑战', 'country', 'in_list', '["CN","RU","NG","BR"]', 40, 'CHALLENGE', 1),
('ISP白名单放行', '主流运营商ISP直接放行', 'isp_keyword', 'in_whitelist', '["China Telecom","AT&T","Comcast","Verizon","Deutsche Telekom","Vodafone"]', 5, 'ALLOW', 1);

-- 插入默认UA黑名单
INSERT INTO ua_blacklist (id, pattern, pattern_type, reason, severity) VALUES
('ua_bot_1', 'bot', 'contains', 'Bot crawler', 'high'),
('ua_bot_2', 'crawler', 'contains', 'Web crawler', 'high'),
('ua_bot_3', 'spider', 'contains', 'Web spider', 'high'),
('ua_bot_4', 'scraper', 'contains', 'Web scraper', 'high'),
('ua_bot_5', 'curl', 'contains', 'Curl command line', 'medium'),
('ua_bot_6', 'wget', 'contains', 'Wget command line', 'medium'),
('ua_bot_7', 'python-requests', 'contains', 'Python requests library', 'high'),
('ua_bot_8', 'headless', 'contains', 'Headless browser', 'critical');

-- ASN黑名单表
CREATE TABLE IF NOT EXISTS asn_blacklist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  severity TEXT DEFAULT 'high' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asn_blacklist_asn ON asn_blacklist(asn);

-- ASN白名单表
CREATE TABLE IF NOT EXISTS asn_whitelist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asn_whitelist_asn ON asn_whitelist(asn);

-- ASN灰名单表
CREATE TABLE IF NOT EXISTS asn_greylist (
  id TEXT PRIMARY KEY,
  asn INTEGER NOT NULL UNIQUE,
  as_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asn_greylist_asn ON asn_greylist(asn);

-- 国家黑名单表
CREATE TABLE IF NOT EXISTS country_blacklist (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT,
  reason TEXT,
  severity TEXT DEFAULT 'high' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_country_blacklist_code ON country_blacklist(country_code);

-- 国家白名单表
CREATE TABLE IF NOT EXISTS country_whitelist (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT,
  reason TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_country_whitelist_code ON country_whitelist(country_code);

-- 插入默认ASN黑名单（VPN/Proxy/数据中心）
INSERT INTO asn_blacklist (id, asn, as_name, reason, severity) VALUES
('asn_vpn_1', 9009, 'M247 Ltd', 'Known VPN provider', 'critical'),
('asn_vpn_2', 212238, 'Datacamp Limited', 'VPN/Proxy service', 'critical'),
('asn_vpn_3', 62041, 'Contabo GmbH', 'Datacenter/VPS', 'high'),
('asn_vpn_4', 20473, 'AS-CHOOPA', 'VPN provider', 'high'),
('asn_vpn_5', 63949, 'Linode LLC', 'Datacenter/VPS', 'high'),
('asn_vpn_6', 16276, 'OVH SAS', 'Datacenter', 'medium'),
('asn_vpn_7', 24940, 'Hetzner Online GmbH', 'Datacenter', 'medium'),
('asn_vpn_8', 16509, 'Amazon AWS', 'Cloud provider', 'medium');

-- 插入默认ASN白名单（主流运营商）
INSERT INTO asn_whitelist (id, asn, as_name, reason) VALUES
('asn_isp_1', 4134, 'China Telecom', 'Major ISP'),
('asn_isp_2', 4837, 'China Unicom', 'Major ISP'),
('asn_isp_3', 9808, 'China Mobile', 'Major ISP'),
('asn_isp_4', 7018, 'AT&T', 'Major ISP'),
('asn_isp_5', 7922, 'Comcast', 'Major ISP'),
('asn_isp_6', 20001, 'Verizon', 'Major ISP'),
('asn_isp_7', 3320, 'Deutsche Telekom', 'Major ISP'),
('asn_isp_8', 21444, 'Vodafone', 'Major ISP');

-- 插入默认国家黑名单
INSERT INTO country_blacklist (id, country_code, country_name, reason, severity) VALUES
('country_bl_1', 'XX', 'Unknown', 'Unknown country', 'critical'),
('country_bl_2', 'T1', 'Tor Exit Node', 'Tor network', 'critical');

-- 插入默认国家白名单
INSERT INTO country_whitelist (id, country_code, country_name, reason) VALUES
('country_wl_1', 'US', 'United States', 'Trusted region'),
('country_wl_2', 'GB', 'United Kingdom', 'Trusted region'),
('country_wl_3', 'DE', 'Germany', 'Trusted region'),
('country_wl_4', 'JP', 'Japan', 'Trusted region'),
('country_wl_5', 'AU', 'Australia', 'Trusted region'),
('country_wl_6', 'CA', 'Canada', 'Trusted region');
