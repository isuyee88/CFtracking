/**
 * @fileoverview Flow Rule 类型定义
 * @description 定义 Flow 复杂规则相关的类型
 * @module types/flowRule
 */

export interface FlowConditionGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: (FlowFilter | FlowConditionGroup)[];
}

export interface FlowFilter {
  id: string;
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'notin' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex';
  value: string | string[] | number;
}

export interface FlowRule {
  id: string;
  flowId: string;
  name: string;
  description?: string;
  conditions: FlowConditionGroup;
  logic: 'AND' | 'OR';
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleMatchResult {
  matched: boolean;
  matchedRule?: FlowRule;
  matchedFlow?: Flow;
  executionTime: number;
  debugInfo?: Record<string, unknown>;
}

export interface Flow {
  id: string;
  name: string;
  campaignId: string;
  filters: FlowFilter[];
  filterLogic: 'AND' | 'OR';
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleTestContext {
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
  referrer?: string;
  customParams?: Record<string, string>;
}
