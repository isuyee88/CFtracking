-- Migration 081: 规则引擎系统
-- 自动化规则、执行记录、优化目标、黑名单管理

-- 1. 自动化规则表
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 规则类型
  type TEXT NOT NULL CHECK(type IN ('roi_optimization', 'blacklist', 'scale_up', 'campaign_creation', 'creative_generation')),
  
  -- 触发配置
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('cron', 'event', 'webhook')),
  trigger_config TEXT, -- JSON
  
  -- 条件配置（JSON）
  conditions TEXT NOT NULL,
  
  -- 动作配置（JSON）
  actions TEXT NOT NULL,
  
  -- 状态
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'archived')),
  priority INTEGER DEFAULT 0,
  
  -- 执行统计
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  
  -- 元数据
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_rules_type ON automation_rules(type);
CREATE INDEX idx_automation_rules_status ON automation_rules(status);
CREATE INDEX idx_automation_rules_trigger_type ON automation_rules(trigger_type);

-- 2. 规则执行记录表
CREATE TABLE IF NOT EXISTS rule_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  
  -- 执行信息
  execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  
  -- 触发上下文（JSON）
  trigger_context TEXT,
  
  -- 执行结果
  success INTEGER NOT NULL CHECK(success IN (0, 1)),
  actions_taken TEXT, -- JSON
  affected_count INTEGER DEFAULT 0,
  
  -- 错误信息
  errors TEXT,
  
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX idx_rule_executions_time ON rule_executions(execution_time);
CREATE INDEX idx_rule_executions_success ON rule_executions(success);

-- 3. 优化目标表（Zone/PubID/SubID 监控）
CREATE TABLE IF NOT EXISTS optimization_targets (
  id TEXT PRIMARY KEY,
  
  -- 目标维度
  platform TEXT NOT NULL,
  zone_id TEXT,
  pubid TEXT,
  subid TEXT,
  device TEXT,
  geo TEXT,
  
  -- 性能指标
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0.0,
  revenue REAL DEFAULT 0.0,
  roi REAL DEFAULT 0.0,
  cr REAL DEFAULT 0.0,
  epc REAL DEFAULT 0.0,
  
  -- 优化状态
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled', 'blacklisted')),
  optimization_action TEXT,
  
  -- 时间窗口
  window_start TIMESTAMP,
  window_end TIMESTAMP,
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_optimization_targets_platform ON optimization_targets(platform);
CREATE INDEX idx_optimization_targets_status ON optimization_targets(status);
CREATE INDEX idx_optimization_targets_roi ON optimization_targets(roi);
CREATE INDEX idx_optimization_targets_window ON optimization_targets(window_start, window_end);
CREATE INDEX idx_optimization_targets_combo ON optimization_targets(platform, zone_id, pubid, subid);

-- 4. 流量平台黑名单表
CREATE TABLE IF NOT EXISTS platform_blacklist (
  id TEXT PRIMARY KEY,
  
  -- 黑名单目标
  platform TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('zone', 'pubid', 'subid', 'ip', 'device_combo')),
  entity_value TEXT NOT NULL,
  
  -- 黑名单原因
  reason TEXT NOT NULL,
  details TEXT, -- JSON
  
  -- 状态
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'removed')),
  
  -- 同步状态
  synced_to_platform INTEGER DEFAULT 0 CHECK(synced_to_platform IN (0, 1)),
  sync_error TEXT,
  last_synced_at TIMESTAMP,
  
  -- 元数据
  created_by TEXT DEFAULT 'automation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

CREATE INDEX idx_platform_blacklist_platform ON platform_blacklist(platform);
CREATE INDEX idx_platform_blacklist_entity ON platform_blacklist(entity_type, entity_value);
CREATE INDEX idx_platform_blacklist_status ON platform_blacklist(status);
CREATE INDEX idx_platform_blacklist_synced ON platform_blacklist(synced_to_platform);
CREATE UNIQUE INDEX idx_platform_blacklist_unique ON platform_blacklist(platform, entity_type, entity_value) WHERE status = 'active';

-- 5. Campaign 自动化模板表
CREATE TABLE IF NOT EXISTS campaign_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  
  -- 模板配置（JSON）
  config TEXT NOT NULL,
  
  -- 状态
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_templates_platform ON campaign_templates(platform);
CREATE INDEX idx_campaign_templates_status ON campaign_templates(status);
