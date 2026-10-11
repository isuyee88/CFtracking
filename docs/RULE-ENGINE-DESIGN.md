# 规则引擎系统设计文档

**日期**: 2026-10-11  
**目标**: 实现全自动化的流量优化和 Campaign 管理系统  
**预计时间**: 2-3 天

---

## 🎯 系统目标

### 核心功能
1. **ROI 实时监控**：Zone/PubID/SubID 维度聚合
2. **自动优化决策**：0转化阻止、亏损黑名单、盈利扩量
3. **Campaign 自动化**：自动创建、配置、优化
4. **流量平台集成**：PropellerAds、MaxConv、Monetizer 等

### 触发方式
- **时间触发**: Cron 定时执行（每小时/每天）
- **事件触发**: Conversion/Click/Spend 事件
- **Hook 触发**: Webhook 回调（流量平台通知）

---

## 📊 数据模型设计

### 1. automation_rules 表
```sql
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 规则类型
  type TEXT NOT NULL, -- 'roi_optimization', 'blacklist', 'scale_up', 'campaign_creation', 'creative_generation'
  
  -- 触发配置
  trigger_type TEXT NOT NULL, -- 'cron', 'event', 'webhook'
  trigger_config TEXT, -- JSON: { schedule: '0 * * * *', event: 'conversion', ... }
  
  -- 条件配置
  conditions TEXT NOT NULL, -- JSON: { min_clicks: 100, max_roi: -0.5, ... }
  
  -- 动作配置
  actions TEXT NOT NULL, -- JSON: [{ type: 'disable_zone', platform: 'propeller', ... }]
  
  -- 状态
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'
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
```

### 2. rule_executions 表
```sql
CREATE TABLE IF NOT EXISTS rule_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  
  -- 执行信息
  execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  
  -- 触发上下文
  trigger_context TEXT, -- JSON: { event_data, matched_conditions, ... }
  
  -- 执行结果
  success BOOLEAN NOT NULL,
  actions_taken TEXT, -- JSON: [{ action: 'disable_zone', zone_id: '123', result: 'success' }]
  affected_count INTEGER DEFAULT 0,
  
  -- 错误信息
  errors TEXT,
  
  -- 外键
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id)
);

CREATE INDEX idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX idx_rule_executions_time ON rule_executions(execution_time);
CREATE INDEX idx_rule_executions_success ON rule_executions(success);
```

### 3. optimization_targets 表（Zone/PubID/SubID 监控）
```sql
CREATE TABLE IF NOT EXISTS optimization_targets (
  id TEXT PRIMARY KEY,
  
  -- 目标维度
  platform TEXT NOT NULL, -- 'propellerads', 'maxconv', 'monetizer'
  zone_id TEXT,
  pubid TEXT,
  subid TEXT,
  device TEXT, -- 'mobile', 'desktop', 'tablet'
  geo TEXT, -- 'US', 'UK', 'CA', ...
  
  -- 性能指标
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0.0,
  revenue REAL DEFAULT 0.0,
  roi REAL DEFAULT 0.0,
  cr REAL DEFAULT 0.0,
  epc REAL DEFAULT 0.0,
  
  -- 优化状态
  status TEXT DEFAULT 'active', -- 'active', 'disabled', 'blacklisted'
  optimization_action TEXT, -- 'none', 'increase_bid', 'decrease_bid', 'disable', 'blacklist'
  
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
```

### 4. platform_blacklist 表
```sql
CREATE TABLE IF NOT EXISTS platform_blacklist (
  id TEXT PRIMARY KEY,
  
  -- 黑名单目标
  platform TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'zone', 'pubid', 'subid', 'ip', 'device_combo'
  entity_value TEXT NOT NULL,
  
  -- 黑名单原因
  reason TEXT NOT NULL, -- 'zero_conversion', 'high_loss', 'fraud', 'manual'
  details TEXT, -- JSON: { clicks: 500, conversions: 0, roi: -100%, ... }
  
  -- 状态
  status TEXT DEFAULT 'active', -- 'active', 'removed'
  
  -- 同步状态
  synced_to_platform BOOLEAN DEFAULT FALSE,
  sync_error TEXT,
  
  -- 元数据
  created_by TEXT DEFAULT 'automation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

CREATE INDEX idx_platform_blacklist_platform ON platform_blacklist(platform);
CREATE INDEX idx_platform_blacklist_entity ON platform_blacklist(entity_type, entity_value);
CREATE INDEX idx_platform_blacklist_status ON platform_blacklist(status);
```

---

## 🧠 规则引擎架构

### 核心组件

#### 1. Rule Evaluator（规则评估器）
```typescript
interface RuleEvaluator {
  evaluate(rule: AutomationRule, context: ExecutionContext): Promise<EvaluationResult>;
}

class ConditionMatcher {
  match(conditions: RuleCondition[], data: any): boolean;
}
```

#### 2. Action Executor（动作执行器）
```typescript
interface ActionExecutor {
  execute(action: RuleAction, context: ExecutionContext): Promise<ActionResult>;
}

// 动作类型
type RuleAction = 
  | { type: 'disable_zone'; platform: string; zone_id: string }
  | { type: 'add_blacklist'; platform: string; entity: string }
  | { type: 'increase_bid'; platform: string; campaign_id: string; amount: number }
  | { type: 'create_campaign'; platform: string; template: CampaignTemplate }
  | { type: 'pause_campaign'; platform: string; campaign_id: string };
```

#### 3. Trigger Handler（触发器处理器）
```typescript
class TriggerHandler {
  // Cron 触发
  async handleCron(schedule: string): Promise<void>;
  
  // 事件触发
  async handleEvent(eventType: string, eventData: any): Promise<void>;
  
  // Webhook 触发
  async handleWebhook(platform: string, payload: any): Promise<void>;
}
```

---

## 📜 预定义规则示例

### 规则 1: 0 转化阻止投放
```json
{
  "name": "零转化组合自动禁用",
  "type": "roi_optimization",
  "trigger_type": "cron",
  "trigger_config": { "schedule": "0 */6 * * *" },
  "conditions": {
    "min_clicks": 100,
    "conversions": 0,
    "window_hours": 24
  },
  "actions": [
    { "type": "disable_zone", "platform": "propellerads" },
    { "type": "add_blacklist", "reason": "zero_conversion" },
    { "type": "send_notification", "channel": "feishu" }
  ]
}
```

### 规则 2: 亏损组合黑名单
```json
{
  "name": "高亏损组合加入黑名单",
  "type": "blacklist",
  "trigger_type": "cron",
  "trigger_config": { "schedule": "0 0 * * *" },
  "conditions": {
    "min_spend": 10,
    "max_roi": -0.5,
    "window_hours": 24
  },
  "actions": [
    { "type": "disable_zone", "platform": "all" },
    { "type": "add_blacklist", "reason": "high_loss" },
    { "type": "sync_blacklist_to_platform" }
  ]
}
```

### 规则 3: 盈利组合自动扩量
```json
{
  "name": "盈利组合自动扩量",
  "type": "scale_up",
  "trigger_type": "event",
  "trigger_config": { "event": "conversion", "threshold": 5 },
  "conditions": {
    "min_conversions": 5,
    "min_roi": 1.0,
    "window_hours": 24
  },
  "actions": [
    { "type": "increase_bid", "percentage": 20 },
    { "type": "increase_budget", "percentage": 50 },
    { "type": "duplicate_campaign", "variants": 3 }
  ]
}
```

### 规则 4: Campaign 自动创建
```json
{
  "name": "新 Offer 自动创建 Campaign",
  "type": "campaign_creation",
  "trigger_type": "webhook",
  "trigger_config": { "event": "offer_approved" },
  "conditions": {
    "offer_status": "approved",
    "offer_payout": { "min": 1.0 }
  },
  "actions": [
    { "type": "create_campaign", "template": "standard_push", "platforms": ["propellerads", "maxconv"] },
    { "type": "generate_creatives", "count": 5 },
    { "type": "set_initial_bid", "strategy": "conservative" }
  ]
}
```

---

## 🚀 实施计划

### Phase 6.1: 规则引擎基础架构（Day 1）
- [ ] 创建数据库迁移
- [ ] 实现 Rule Evaluator
- [ ] 实现 Condition Matcher
- [ ] 实现 Action Executor
- [ ] 单元测试

### Phase 6.2: ROI 监控服务（Day 1）
- [ ] optimization_targets 数据聚合
- [ ] ROI 计算逻辑
- [ ] 性能指标追踪
- [ ] 报表生成

### Phase 6.3: 自动优化规则（Day 2）
- [ ] 0 转化检测和禁用
- [ ] 亏损组合黑名单
- [ ] 盈利组合扩量
- [ ] 流量平台 API 集成

### Phase 6.4: Campaign 自动化（Day 2）
- [ ] Campaign 模板管理
- [ ] 自动创建逻辑
- [ ] 流量平台同步
- [ ] 状态追踪

### Phase 6.5: 测试和部署（Day 3）
- [ ] 集成测试
- [ ] 模拟模式验证
- [ ] 生产部署
- [ ] 监控告警

---

## 📈 预期成果

### 自动化效率
- **减少手动操作**: 95%
- **响应速度**: 从小时级到分钟级
- **决策准确性**: 基于数据，0 主观误差

### ROI 提升
- **减少亏损**: 自动禁用低效流量
- **扩大盈利**: 自动增加高 ROI 投放
- **优化速度**: 24/7 自动监控优化

---

**立即开始 Phase 6.1: 规则引擎基础架构实施**
