/**
 * @fileoverview 自动化优化系统类型定义
 * @description Phase 1 自动阻断、ROI计算、安全阀等功能的完整类型系统
 * @module types/auto-optimization
 *
 * 数据流:
 * 1. 预定义规则 → 规则评估 → 操作生成 → 审批流程 → 执行 → 审计记录
 * 2. ROI计算请求 → 缓存查询/实时计算 → 结果返回
 * 3. 安全阀检查 → 通过/拦截 → 记录日志
 */

// ============================================
// 操作相关类型
// ============================================

export type ActionType = 'BLOCK' | 'PAUSE' | 'UNBLOCK' | 'RESUME' | 'ADJUST_BID' | 'ALERT' | 'BUDGET_REALLOC' | 'PROTECT';
export type TargetType = 'campaign' | 'zone' | 'creative' | 'budget';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'expired' | 'executed' | 'rolled_back';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'rollback_success' | 'rollback_failed';
export type TriggerType = 'manual' | 'auto' | 'scheduled';

export interface DecisionContext {
  roi: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  confidence: number;
  triggerReason: string;
  timeOfDay?: number;
  dayOfWeek?: number;
  zoneAgeHours?: number;
  creativeAgeHours?: number;
  epc?: number;
  cpc?: number;
  ctr?: number;
  cr?: number;
}

export interface AutoOperation {
  id: string;
  displayId: number;
  campaignId: string;
  zoneId?: string;
  creativeId?: string;
  ruleId?: string;
  ruleName?: string;
  actionType: ActionType;
  platform: string;
  targetType: TargetType;
  parameters: Record<string, unknown>;
  decisionContext: DecisionContext;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  executionStatus: ExecutionStatus;
  executedAt?: string;
  executionResult?: string;
  executionError?: string;
  rollbackOperationId?: string;
  rollbackedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutoOperationDTO {
  campaignId: string;
  zoneId?: string;
  creativeId?: string;
  ruleId?: string;
  ruleName?: string;
  actionType: ActionType;
  platform: string;
  targetType: TargetType;
  parameters: Record<string, unknown>;
  decisionContext: DecisionContext;
}

// ============================================
// 回滚相关类型
// ============================================

export type RollbackEffectiveness = 'full' | 'partial' | 'failed' | 'pending';

export interface AutoRollbackOperation {
  id: string;
  originalOperationId: string;
  rollbackAction: string;
  rollbackParameters: Record<string, unknown>;
  preRollbackSnapshot: Record<string, unknown>;
  postRollbackMetrics?: Record<string, unknown>;
  rollbackEffectiveness: RollbackEffectiveness;
  effectivenessNote?: string;
  triggerType: TriggerType;
  triggeredBy?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// 安全阀相关类型
// ============================================

export type SafetyValveCategory = 'hard_limits' | 'cooldown' | 'approval' | 'rollback' | 'multi_factor';
export type SafetyValveScope = 'global' | 'campaign';

export interface HardLimitsConfig {
  maxDailySpend: number;
  maxSingleBlockPercent: number;
  maxBidAdjustmentPercent: number;
  minZoneAgeHours: number;
  maxConcurrentActions: number;
}

export interface CooldownConfig {
  afterBlockHours: number;
  afterBidAdjustMinutes: number;
  afterPauseHours: number;
  sameZoneReblockDays: number;
}

export interface ApprovalConfig {
  requireApprovalFor: ActionType[];
  approvalTimeoutMinutes: number;
  autoApproveThreshold: number;
}

export interface RollbackConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  rollbackConditions: {
    roiDidNotImprove: boolean;
    performanceDeclined: boolean;
    revenueDropPercent: number;
  };
  maxRollbacksPerDay: number;
}

export interface MultiFactorConfig {
  factors: {
    dataFreshness: { weight: number; thresholdSeconds: number };
    sampleSize: { weight: number; thresholdClicks: number };
    historicalConsistency: { weight: number; thresholdScore: number };
  };
  minimumScore: number;
}

export interface SafetyValveConfig {
  id: string;
  scope: SafetyValveScope;
  campaignId?: string;
  category: SafetyValveCategory;
  config: HardLimitsConfig | CooldownConfig | ApprovalConfig | RollbackConfig | MultiFactorConfig;
  enabled: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyValveCheckResult {
  passed: boolean;
  category: SafetyValveCategory;
  score?: number;
  reason: string;
  blockingFactor?: string;
}

// ============================================
// 预定义规则相关类型
// ============================================

export type RuleType = 'performance' | 'budget' | 'fraud' | 'time';

export interface RuleCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'in_range';
  value: number | string;
  duration: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface RuleAction {
  type: ActionType;
  platform: string;
  parameters: Record<string, unknown>;
  delay: number;
  retry: number;
}

export interface PredefinedAutoRule {
  id: string;
  ruleCode: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  isSystemRule: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAutoRule {
  id: string;
  campaignId: string;
  predefinedRuleId: string;
  overrideConditions?: RuleCondition[];
  overrideActions?: RuleAction[];
  overridePriority?: number;
  enabled: boolean;
  totalTriggers: number;
  successfulTriggers: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 审批相关类型
// ============================================

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface ApprovalRequest {
  id: string;
  operationId: string;
  status: ApprovalRequestStatus;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decision?: 'approve' | 'reject';
  decisionNote?: string;
  expiresAt: string;
  notificationSent: boolean;
  notificationChannels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequestDTO {
  operationId: string;
  expiresInSeconds?: number;
  notificationChannels?: string[];
}

// ============================================
// ROI计算相关类型
// ============================================

export type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

export interface ROICalculationParams {
  campaignId: string;
  zoneId?: string;
  timeWindow: TimeWindow;
  customStart?: string;
  customEnd?: string;
  dimensions?: string[];
}

export interface ROIMetrics {
  roi: number;
  revenue: number;
  cost: number;
  profit: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cr: number;
  cpc: number;
  epc: number;
  cpa: number;
  avgOrderValue?: number;
}

export interface ROICalculationResult {
  params: ROICalculationParams;
  metrics: ROIMetrics;
  calculatedAt: string;
  dataSource: 'cache' | 'realtime';
  cacheHit?: boolean;
  timeWindowActual: { start: string; end: string };
}

export interface ROICalculationCache {
  id: string;
  cacheKey: string;
  campaignId: string;
  zoneId?: string;
  timeWindow: TimeWindow;
  dimensions: string[];
  result: ROIMetrics;
  calculatedAt: string;
  ttlSeconds: number;
  expiresAt: string;
  hitCount: number;
}

// ============================================
// 规则评估上下文
// ============================================

export interface RuleEvaluationInput {
  campaignId: string;
  zoneId?: string;
  creativeId?: string;
  metrics: ROIMetrics;
  additionalContext: {
    hourOfDay: number;
    dayOfWeek: number;
    zoneAgeHours?: number;
    creativeAgeHours?: number;
  };
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  triggered: boolean;
  matchedConditions: RuleCondition[];
  recommendedActions: RuleAction[];
  confidence: number;
  evaluationTime: string;
}
