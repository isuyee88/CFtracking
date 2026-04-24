/**
 * @fileoverview Rule 类型定义
 * @description 定义规则引擎相关类型
 * @module types/rule
 */

export type RuleType =
  | 'performance'
  | 'budget'
  | 'fraud'
  | 'time'
  | 'campaign'
  | 'platform'
  | 'flow';
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
  | 'include_zone'
  | 'allow'
  | 'block'
  | 'challenge'
  | 'redirect';

export type AutoruleDecisionAction = 'allow' | 'block' | 'challenge' | 'redirect';

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

export interface FunctionCondition {
  fn: 'in_blacklist' | 'in_whitelist';
  args: string[];
}

export interface EqCondition {
  eq: [string, string | number | boolean | null];
}

export interface InCondition {
  in: [string, Array<string | number | boolean>];
}

export interface ContainsCondition {
  contains: [string, string];
}

export interface ExistsCondition {
  exists: [string];
}

export interface NotCondition {
  not: RuleExpressionNode;
}

export interface AllCondition {
  all: RuleExpressionNode[];
}

export interface AnyCondition {
  any: RuleExpressionNode[];
}

export type RuleExpressionNode =
  | FunctionCondition
  | EqCondition
  | InCondition
  | ContainsCondition
  | ExistsCondition
  | NotCondition
  | AllCondition
  | AnyCondition;

export interface RuleSetRuleNode {
  id: string;
  priority: number;
  when: RuleExpressionNode;
  then: {
    action: AutoruleDecisionAction;
    reason?: string;
  };
}

export interface RuleSetCondition {
  version: '1.0';
  name?: string;
  mode?: 'first_match';
  rules: RuleSetRuleNode[];
  default?: {
    action: AutoruleDecisionAction;
  };
}

export interface Rule {
  id: string;
  displayId?: string;
  campaignId?: string;
  name: string;
  description: string | null;
  type: RuleType;
  conditions: Condition[] | RuleSetCondition | RuleExpressionNode;
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
  conditions: Condition[] | RuleSetCondition | RuleExpressionNode;
  actions: Action[];
  priority?: number;
  enabled?: boolean;
}

export interface UpdateRuleDTO {
  name?: string;
  description?: string;
  type?: RuleType;
  conditions?: Condition[] | RuleSetCondition | RuleExpressionNode;
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
