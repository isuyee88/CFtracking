/**
 * @fileoverview ISP白名单数据库迁移
 * @description 添加ISP白名单表，支持基于ISP名称的流量信任
 * @module schema/migrations/054_add_isp_whitelist
 */

-- ISP白名单表
CREATE TABLE IF NOT EXISTS ispWhitelist (
  id TEXT PRIMARY KEY,
  namePattern TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('isp', 'mobile', 'business', 'education', 'government')),
  country TEXT,
  priority INTEGER DEFAULT 50,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_isp_whitelist_pattern ON ispWhitelist(namePattern);
CREATE INDEX IF NOT EXISTS idx_isp_whitelist_enabled ON ispWhitelist(enabled);
CREATE INDEX IF NOT EXISTS idx_isp_whitelist_priority ON ispWhitelist(priority);

-- 插入预定义的ISP白名单
INSERT OR IGNORE INTO ispWhitelist (id, namePattern, type, priority, enabled)
VALUES 
  -- 美国主要ISP
  ('isp_comcast', 'Comcast', 'isp', 100, 1),
  ('isp_att', 'AT&T', 'isp', 100, 1),
  ('isp_verizon', 'Verizon', 'isp', 100, 1),
  ('isp_timewarner', 'Time Warner', 'isp', 100, 1),
  ('isp_charter', 'Charter', 'isp', 100, 1),
  ('isp_cox', 'Cox', 'isp', 100, 1),
  ('isp_spectrum', 'Spectrum', 'isp', 100, 1),
  
  -- 中国主要运营商
  ('isp_chinatelecom', 'China Telecom', 'isp', 100, 1),
  ('isp_chinaunicom', 'China Unicom', 'isp', 100, 1),
  ('isp_chinamobile', 'China Mobile', 'mobile', 100, 1),
  
  -- 欧洲主要ISP
  ('isp_deutschetelekom', 'Deutsche Telekom', 'isp', 100, 1),
  ('isp_telecomitalia', 'Telecom Italia', 'isp', 100, 1),
  ('isp_bt', 'British Telecom', 'isp', 100, 1),
  ('isp_orange', 'Orange', 'isp', 100, 1),
  ('isp_vodafone', 'Vodafone', 'mobile', 100, 1),
  ('isp_telefonica', 'Telefonica', 'isp', 100, 1),
  ('isp_tmobile', 'T-Mobile', 'mobile', 100, 1),
  
  -- 日本主要ISP
  ('isp_ntt', 'NTT', 'isp', 100, 1),
  ('isp_kddi', 'KDDI', 'isp', 100, 1),
  ('isp_softbank', 'SoftBank', 'mobile', 100, 1),
  ('isp_docomo', 'Docomo', 'mobile', 100, 1),
  
  -- 韩国主要ISP
  ('isp_kt', 'KT', 'isp', 100, 1),
  ('isp_skbroadband', 'SK Broadband', 'isp', 100, 1),
  
  -- 台湾主要ISP
  ('isp_chunghwa', 'Chunghwa Telecom', 'isp', 100, 1),
  
  -- 香港主要ISP
  ('isp_pccw', 'PCCW', 'isp', 100, 1),
  
  -- 新加坡主要ISP
  ('isp_singtel', 'SingTel', 'isp', 100, 1),
  
  -- 澳大利亚主要ISP
  ('isp_telstra', 'Telstra', 'isp', 100, 1),
  ('isp_optus', 'Optus', 'isp', 90, 1),
  
  -- 印度主要ISP
  ('isp_airtel', 'Airtel', 'mobile', 100, 1),
  ('isp_jio', 'Jio', 'mobile', 100, 1);
