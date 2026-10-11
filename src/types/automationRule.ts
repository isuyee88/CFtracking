/**
 * @fileoverview 自动化规则类型定义
 */

export type RuleType = 
  | 'roi_optimization'
  | 'blacklist'
  | 'scale_up'
  | 'campaign_creation'
  | 'creative_generation';

export type TriggerType = 'cron' | 'event' | 'webhook';
export type RuleStatus = 'active' | 'paused' | 'archived';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  
  type: RuleType;
  
  trigger_type: TriggerType;
  trigger_config?: TriggerConfig;
  
  conditions: RuleConditions;
  actions: RuleAction[];
  
  status: RuleStatus;
  priority: number;
  
  total_executions: number;
  successful_executions: number;
  last_executed_at?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TriggerConfig {
  // Cron 触发
  schedule?: string; // '0 * * * *'
  
  // 事件触发
  event?: string; // 'conversion', 'click', 'spend_threshold'
  threshold?: number;
  
  // Webhook 触发
  webhook_url?: string;
  webhook_secret?: string;
}

export interface RuleConditions {
  // 通用条件
  min_clicks?: number;
  min_conversions?: number;
  min_spend?: number;
  min_revenue?: number;
  
  max_clicks?: number;
  max_conversions?: number;
  max_spend?: number;
  
  // ROI 条件
  min_roi?: number;
  max_roi?: number;
  
  // CR 条件
  min_cr?: number;
  max_cr?: number;
  
  // EPC 条件
  min_epc?: number;
  max_epc?: number;
  
  // 时间窗口
  window_hours?: number;
  window_days?: number;
  
  // 平台筛选
  platforms?: string[];
  
  // 地理位置
  geos?: string[];
  
  // 设备类型
  devices?: string[];
  
  // 其他条件
  offer_status?: string;
  offer_payout?: { min?: number; max?: number };
}

export type RuleAction = 
  | DisableZoneAction
  | AddBlacklistAction
  | IncreaseBidAction
  | DecreaseBidAction
  | IncreaseBudgetAction
  | CreateCampaignAction
  | PauseCampaignAction
  | GenerateCreativeAction
  | SendNotificationAction;

export interface DisableZoneAction {
  type: 'disable_zone';
  platform: string;
  zone_id?: string; // 如果为空，则禁用匹配条件的所有 zone
}

export interface AddBlacklistAction {
  type: 'add_blacklist';
  platform: string;
  entity_type: 'zone' | 'pubid' | 'subid' | 'ip' | 'device_combo';
  reason: string;
  sync_to_platform?: boolean;
}

export interface IncreaseBidAction {
  type: 'increase_bid';
  platform: string;
  campaign_id?: string;
  percentage?: number;
  amount?: number;
}

export interface DecreaseBidAction {
  type: 'decrease_bid';
  platform: string;
  campaign_id?: string;
  percentage?: number;
  amount?: number;
}

export interface IncreaseBudgetAction {
  type: 'increase_budget';
  platform: string;
  campaign_id?: string;
  percentage?: number;
  amount?: number;
}

export interface CreateCampaignAction {
  type: 'create_campaign';
  platform: string;
  template_id?: string;
  config?: CampaignConfig;
}

export interface PauseCampaignAction {
  type: 'pause_campaign';
  platform: string;
  campaign_id: string;
}

export interface GenerateCreativeAction {
  type: 'generate_creative';
  count: number;
  template?: string;
}

export interface SendNotificationAction {
  type: 'send_notification';
  channel: 'feishu' | 'email' | 'slack';
  message?: string;
}

export interface CampaignConfig {
  name?: string;
  daily_budget?: number;
  bid?: number;
  targeting?: {
    geos?: string[];
    devices?: string[];
    os?: string[];
  };
}

// 规则执行记录
export interface RuleExecution {
  id: string;
  rule_id: string;
  
  execution_time: string;
  duration_ms: number;
  
  trigger_context?: any;
  
  success: boolean;
  actions_taken: ActionResult[];
  affected_count: number;
  
  errors?: string;
}

export interface ActionResult {
  action: string;
  target?: string;
  result: 'success' | 'failed' | 'skipped';
  details?: any;
  error?: string;
}

// 优化目标
export interface OptimizationTarget {
  id: string;
  
  platform: string;
  zone_id?: string;
  pubid?: string;
  subid?: string;
  device?: string;
  geo?: string;
  
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roi: number;
  cr: number;
  epc: number;
  
  status: 'active' | 'disabled' | 'blacklisted';
  optimization_action?: string;
  
  window_start: string;
  window_end: string;
  
  created_at: string;
  updated_at: string;
}

// 平台黑名单
export interface PlatformBlacklist {
  id: string;
  
  platform: string;
  entity_type: 'zone' | 'pubid' | 'subid' | 'ip' | 'device_combo';
  entity_value: string;
  
  reason: string;
  details?: any;
  
  status: 'active' | 'removed';
  
  synced_to_platform: boolean;
  sync_error?: string;
  last_synced_at?: string;
  
  created_by: string;
  created_at: string;
  removed_at?: string;
}

// Campaign 模板
export interface CampaignTemplate {
  id: string;
  name: string;
  platform: string;
  
  config: any;
  
  status: 'active' | 'archived';
  
  usage_count: number;
  success_rate: number;
  
  created_at: string;
  updated_at: string;
}

// 执行上下文
export interface ExecutionContext {
  trigger_type: TriggerType;
  trigger_data?: any;
  simulation_mode?: boolean;
}
