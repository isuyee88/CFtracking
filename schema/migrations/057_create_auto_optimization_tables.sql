-- Phase 1: 自动化优化系统核心表
-- 包含: 操作记录、回滚管理、安全阀配置、审批流程

-- ============================================
-- 1. 自动化操作记录表 (auto_operations)
-- 记录所有规则触发的自动化操作（Block/Pause/Adjust等）
-- ============================================
CREATE TABLE IF NOT EXISTS auto_operations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  display_id INTEGER NOT NULL DEFAULT (SELECT IFNULL(MAX(display_id), 0) + 1 FROM auto_operations),

  -- 关联信息
  campaign_id TEXT NOT NULL,
  zone_id TEXT,
  creative_id TEXT,
  rule_id TEXT,  -- 触发此操作的规则ID（如果是规则触发）
  rule_name TEXT,

  -- 操作信息
  action_type TEXT NOT NULL CHECK(action_type IN ('BLOCK', 'PAUSE', 'UNBLOCK', 'RESUME', 'ADJUST_BID', 'ALERT', 'BUDGET_REALLOC')),
  platform TEXT NOT NULL,  -- 执行平台: propellerads, oddbytes, etc.
  target_type TEXT NOT NULL CHECK(target_type IN ('campaign', 'zone', 'creative', 'budget')),

  -- 操作参数 (JSON)
  parameters TEXT NOT NULL DEFAULT '{}',

  -- 决策上下文
  decision_context TEXT NOT NULL DEFAULT '{}',
  -- JSON格式示例:
  -- {
  --   "roi": -0.85,
  --   "clicks": 150,
  --   "conversions": 2,
  --   "cost": 45.50,
  --   "revenue": 6.80,
  --   "confidence": 0.95,
  --   "trigger_reason": "Hard stop: ROI < -80%"
  -- }

  -- 审批状态
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'auto_approved', 'expired', 'executed', 'rolled_back')),
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,

  -- 执行状态
  execution_status TEXT NOT NULL DEFAULT 'pending' CHECK(execution_status IN ('pending', 'running', 'success', 'failed', 'rollback_success', 'rollback_failed')),
  executed_at TEXT,
  execution_result TEXT,  -- 平台API返回结果
  execution_error TEXT,

  -- 回滚信息
  rollback_operation_id TEXT,
  rollbacked_at TEXT,

  -- 元数据
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- 外键约束
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_auto_ops_campaign ON auto_operations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_auto_ops_status ON auto_operations(approval_status, execution_status);
CREATE INDEX IF NOT EXISTS idx_auto_ops_action_type ON auto_operations(action_type);
CREATE INDEX IF NOT EXISTS idx_auto_ops_created ON auto_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_ops_rule ON auto_operations(rule_id);

-- ============================================
-- 2. 回滚操作表 (auto_rollback_operations)
-- 记录所有回滚操作及其效果验证
-- ============================================
CREATE TABLE IF NOT EXISTS auto_rollback_operations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 关联的原操作
  original_operation_id TEXT NOT NULL,

  -- 回滚操作信息
  rollback_action TEXT NOT NULL,  -- 原操作的逆向动作
  rollback_parameters TEXT NOT NULL DEFAULT '{}',

  -- 回滚前快照 (用于验证回滚效果)
  pre_rollback_snapshot TEXT NOT NULL DEFAULT '{}',

  -- 回滚后状态验证
  post_rollback_metrics TEXT,
  rollback_effectiveness TEXT CHECK(rollback_effectiveness IN ('full', 'partial', 'failed', 'pending')),
  effectiveness_note TEXT,

  -- 触发方式
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK(trigger_type IN ('manual', 'auto', 'scheduled')),
  triggered_by TEXT,  -- 用户ID或'system'

  -- 时间戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,

  FOREIGN KEY (original_operation_id) REFERENCES auto_operations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rollback_original ON auto_rollback_operations(original_operation_id);
CREATE INDEX IF NOT EXISTS idx_rollback_effectiveness ON auto_rollback_operations(rollback_effectiveness);

-- ============================================
-- 3. 安全阀配置表 (safety_valves_config)
-- 存储全局和Campaign级别的安全阀配置
-- ============================================
CREATE TABLE IF NOT EXISTS safety_valves_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 配置范围
  scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global', 'campaign')),
  campaign_id TEXT,  -- scope='campaign'时必填

  -- 配置类别
  category TEXT NOT NULL CHECK(category IN ('hard_limits', 'cooldown', 'approval', 'rollback', 'multi_factor')),

  -- 配置内容 (JSON)
  config JSON NOT NULL,

  -- 启用状态
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- 元数据
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_safety_valves_scope ON safety_valves_config(scope, campaign_id);
CREATE INDEX IF NOT EXISTS idx_safety_valves_category ON safety_valves_config(category);

-- 插入默认的全局安全阀配置
INSERT OR IGNORE INTO safety_valves_config (id, scope, category, config, enabled, created_at) VALUES
  ('sv-hard-limits-global-001', 'global', 'hard_limits', json_object(
    'max_daily_spend', 500,
    'max_single_block_percent', 20,
    'max_bid_adjustment_percent', 30,
    'min_zone_age_hours', 24,
    'max_concurrent_actions', 3
  ), TRUE, datetime('now')),

  ('sv-cooldown-global-001', 'global', 'cooldown', json_object(
    'after_block_hours', 24,
    'after_bid_adjust_minutes', 60,
    'after_pause_hours', 12,
    'same_zone_reblock_days', 7
  ), TRUE, datetime('now')),

  ('sv-approval-global-001', 'global', 'approval', json_object(
    'require_approval_for', json_array('BLOCK', 'PAUSE'),
    'approval_timeout_minutes', 30,
    'auto_approve_threshold', 0.95
  ), TRUE, datetime('now')),

  ('sv-rollback-global-001', 'global', 'rollback', json_object(
    'enabled', TRUE,
    'check_interval_minutes', 30,
    'rollback_conditions', json_object(
      'roi_did_not_improve', TRUE,
      'performance_declined', TRUE,
      'revenue_drop_percent', 10
    ),
    'max_rollbacks_per_day', 3
  ), TRUE, datetime('now')),

  ('sv-multifactor-global-001', 'global', 'multi_factor', json_object(
    'factors', json_object(
      'data_freshness', json_object('weight', 0.2, 'threshold_seconds', 300),
      'sample_size', json_object('weight', 0.25, 'threshold_clicks', 100),
      'historical_consistency', json_object('weight', 0.2, 'threshold_score', 0.7)
    ),
    'minimum_score', 0.65
  ), TRUE, datetime('now'));

-- ============================================
-- 4. 预定义自动规则表 (predefined_auto_rules)
-- 存储6条硬规则的默认定义
-- ============================================
CREATE TABLE IF NOT EXISTS predefined_auto_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 规则标识
  rule_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- 规则类型和优先级
  rule_type TEXT NOT NULL DEFAULT 'performance' CHECK(rule_type IN ('performance', 'budget', 'fraud', 'time')),
  priority INTEGER NOT NULL DEFAULT 50,

  -- 条件定义 (JSON数组)
  conditions JSON NOT NULL DEFAULT json_array(),
  -- 示例: [{"metric": "roi", "operator": "<", "value": -0.8, "duration": "24h"}]

  -- 动作定义 (JSON数组)
  actions JSON NOT NULL DEFAULT json_array(),
  -- 示例: [{"type": "BLOCK", "platform": "propellerads", "parameters": {"duration_hours": 24}}]

  -- 默认配置
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_rule BOOLEAN NOT NULL DEFAULT TRUE,  -- 系统预定义规则不可删除

  -- 版本控制
  version INTEGER NOT NULL DEFAULT 1,

  -- 元数据
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 插入6条预定义硬规则
INSERT OR IGNORE INTO predefined_auto_rules (rule_code, name, description, rule_type, priority, conditions, actions, enabled, is_system_rule, version, created_at) VALUES
  -- 规则1: 硬止损
  ('HARD_STOP_LOSS', '硬止损规则', 'ROI低于-80%且点击量充足时立即阻断', 'performance', 100,
   json_array(json_object('metric', 'roi', 'operator', '<', 'value', -0.8, 'duration', '24h', 'aggregation', 'avg'),
               json_object('metric', 'clicks', 'operator', '>', 'value', 100, 'duration', '24h', 'aggregation', 'sum')),
   json_array(json_object('type', 'BLOCK', 'platform', 'propellerads', 'parameters', json_object('duration_hours', 24, 'reason', 'Hard stop: ROI < -80%'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now')),

  -- 规则2: 软止损
  ('SOFT_STOP_LOSS', '软止损规则', 'ROI低于-50%且趋势持续恶化时暂停', 'performance', 90,
   json_array(json_object('metric', 'roi', 'operator', '<', 'value', -0.5, 'duration', '24h', 'aggregation', 'avg'),
               json_object('metric', 'clicks', 'operator', '>', 'value', 200, 'duration', '24h', 'aggregation', 'sum')),
   json_array(json_object('type', 'PAUSE', 'platform', 'propellerads', 'parameters', json_object('duration_hours', 12, 'reason', 'Soft stop: ROI < -50% with declining trend'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now')),

  -- 规则3: 凌晨低质量时段
  ('NIGHT_TIME_PAUSE', '凌晨时段暂停', '凌晨2-5点且ROI为负且EPC极低时暂停', 'time', 80,
   json_array(json_object('metric', 'hour_of_day', 'operator', 'in_range', 'value', '[2,5]', 'duration', '1h'),
               json_object('metric', 'roi', 'operator', '<', 'value', 0, 'duration', '6h', 'aggregation', 'avg'),
               json_object('metric', 'epc', 'operator', '<', 'value', 0.01, 'duration', '6h', 'aggregation', 'avg')),
   json_array(json_object('type', 'PAUSE', 'platform', 'propellerads', 'parameters', json_object('duration_hours', 6, 'reason', 'Night time low quality period'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now')),

  -- 规则4: 新Zone保护期
  ('NEW_ZONE_PROTECTION', '新Zone保护期', '新Zone在24小时内或点击量<50时不执行阻断操作', 'performance', 95,
   json_array(json_object('metric', 'zone_age_hours', 'operator', '<', 'value', 24, 'duration', 'current'),
               json_object('metric', 'clicks', 'operator', '<', 'value', 50, 'duration', '24h', 'aggregation', 'sum')),
   json_array(json_object('type', 'PROTECT', 'platform', 'system', 'parameters', json_object('reason', 'New zone protection: insufficient data'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now')),

  -- 规则5: 创意疲劳警报
  ('CREATIVE_FATIGUE', '创意疲劳检测', '创意使用超过72小时且CTR下降超过30%时发出警报', 'performance', 70,
   json_array(json_object('metric', 'creative_age_hours', 'operator', '>', 'value', 72, 'duration', 'current'),
               json_object('metric', 'ctr_decline_percent', 'operator', '>', 'value', 30, 'duration', '72h', 'aggregation', 'avg')),
   json_array(json_object('type', 'ALERT', 'platform', 'system', 'parameters', json_object('alert_level', 'warning', 'reason', 'Creative fatigue detected: CTR declined >30%'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now')),

  -- 规则6: 异常检测
  ('ANOMALY_INVESTIGATION', '异常检测告警', 'CTR或转化率偏离正常范围超过2个标准差时告警', 'fraud', 85,
   json_array(json_object('metric', 'ctr_deviation_std', 'operator', '>', 'value', 2, 'duration', '24h'),
               json_object('metric', 'conversion_rate_deviation_std', 'operator', '>', 'value', 2, 'duration', '24h')),
   json_array(json_object('type', 'ALERT', 'platform', 'system', 'parameters', json_object('alert_level', 'high', 'reason', 'Anomaly detected: metric deviation > 2 std'), 'delay', 0, 'retry', 0)),
   TRUE, TRUE, 1, datetime('now'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_predefined_rules_code ON predefined_auto_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_predefined_rules_enabled ON predefined_auto_rules(enabled);

-- ============================================
-- 5. Campaign级别的规则关联表 (campaign_auto_rules)
-- 将预定义规则关联到具体Campaign，支持自定义覆盖
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_auto_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  campaign_id TEXT NOT NULL,
  predefined_rule_id TEXT NOT NULL,

  -- 覆盖配置（可选，为null时使用预定义规则的默认值）
  override_conditions JSON,  -- 自定义条件覆盖
  override_actions JSON,     -- 自定义动作覆盖
  override_priority INTEGER,  -- 自定义优先级覆盖

  -- 启用状态（可针对特定Campaign禁用某条规则）
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- 统计数据
  total_triggers INTEGER NOT NULL DEFAULT 0,
  successful_triggers INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TEXT,

  -- 元数据
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (predefined_rule_id) REFERENCES predefined_auto_rules(id) ON DELETE CASCADE,

  -- 确保每个Campaign+规则组合唯一
  UNIQUE(campaign_id, predefined_rule_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_rules_campaign ON campaign_auto_rules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_rules_rule ON campaign_auto_rules(predefined_rule_id);
CREATE INDEX IF NOT EXISTS idx_campaign_rules_enabled ON campaign_auto_rules(enabled);

-- ============================================
-- 6. 审批请求表 (approval_requests)
-- 记录需要人工审批的操作请求
-- ============================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 关联的操作
  operation_id TEXT NOT NULL,

  -- 请求状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),

  -- 审批人信息
  requested_by TEXT NOT NULL DEFAULT 'system',  -- 'system' 或用户ID
  reviewed_by TEXT,
  reviewed_at TEXT,

  -- 决策信息
  decision TEXT CHECK(decision IN ('approve', 'reject')),
  decision_note TEXT,

  -- 超时设置
  expires_at TEXT NOT NULL,  -- 审批过期时间（通常30分钟后）

  -- 通知状态
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_channels JSON NOT NULL DEFAULT json_array(),

  -- 元数据
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (operation_id) REFERENCES auto_operations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_operation ON approval_requests(operation_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_expires ON approval_requests(expires_at);

-- ============================================
-- 7. ROI计算缓存表 (roi_calculation_cache)
-- 缓存ROI计算结果以提升查询性能
-- ============================================
CREATE TABLE IF NOT EXISTS roi_calculation_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 缓存键（唯一标识一个计算请求）
  cache_key TEXT NOT NULL UNIQUE,

  -- 计算参数
  campaign_id TEXT NOT NULL,
  zone_id TEXT,
  time_window TEXT NOT NULL,  -- 1h, 6h, 24h, 7d, 30d
  dimensions JSON NOT NULL DEFAULT json_array(),  -- 分维度的字段列表

  -- 计算结果 (JSON)
  result JSON NOT NULL,
  -- 示例:
  -- {
  --   "roi": -0.85,
  --   "revenue": 150.00,
  --   "cost": 276.92,
  --   "profit": -126.92,
  --   "clicks": 1250,
  --   "conversions": 15,
  --   "ctr": 2.5,
  --   "cr": 1.2,
  --   "cpc": 0.22,
  --   "epc": 0.12,
  --   "cpa": 18.46
  -- }

  -- 缓存元数据
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  ttl_seconds INTEGER NOT NULL DEFAULT 300,  -- 默认5分钟TTL
  expires_at TEXT NOT NULL,  -- 过期时间 = calculated_at + ttl_seconds

  -- 统计
  hit_count INTEGER NOT NULL DEFAULT 0,  -- 缓存命中次数

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roi_cache_key ON roi_calculation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_roi_cache_campaign ON roi_calculation_cache(campaign_id, time_window);
CREATE INDEX IF NOT EXISTS idx_roi_cache_expires ON roi_calculation_cache(expires_at);

-- ============================================
-- 完成
-- ============================================

-- 输出迁移完成日志
SELECT 'Phase 1 Auto Optimization Tables migration completed successfully!' as message,
       (SELECT COUNT(*) FROM predefined_auto_rules) as predefined_rules_count,
       (SELECT COUNT(*) FROM safety_valves_config) as safety_valves_count;
