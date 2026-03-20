/**
 * @fileoverview Rule 类型定义
 * @description 定义规则引擎相关类型
 * @module types/rule
 */

export type RuleType = 'performance' | 'budget' | 'fraud' | 'time';
export type RuleStatus = 'active' | 'paused' | 'deleted';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains';
export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count';
export type ActionType =
  | 'pause_campaign'
  | 'start_campaign'
  | 'adjust_bid'
  | 'send_alert'
  | 'adjust_budget'
  | 'exclude_zone'
  | 'include_zone';

export interface Condition {
  metric: string;
  operator: ComparisonOperator;
  value: number | string;
  duration: string;
  aggregation: AggregationType;
}

export interface Action {
  type: ActionType;
  platform: string;
  parameters: Record<string, unknown>;
  delay: number;
  retry: number;
}

export interface Rule {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  type: RuleType;
  conditions: Condition[];
  actions: Action[];
  priority: number;
  enabled: boolean;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDTO {
  name: string;
  description?: string;
  type: RuleType;
  conditions: Condition[];
  actions: Action[];
  priority?: number;
  enabled?: boolean;
}

export interface UpdateRuleDTO {
  name?: string;
  description?: string;
  type?: RuleType;
  conditions?: Condition[];
  actions?: Action[];
  priority?: number;
  enabled?: boolean;
  status?: RuleStatus;
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  campaignId: string;
  timestamp: string;
  conditions: Condition[];
  actions: Action[];
  executionResult: {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  };
  triggeredBy: Record<string, unknown>;
}
