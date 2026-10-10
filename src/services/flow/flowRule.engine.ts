/**
 * @fileoverview Flow Rule 引擎
 * @description 处理 Flow 复杂条件规则匹配
 * @module services/flow/flowRule.engine
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  FlowConditionGroup,
  FlowFilter,
  FlowRule,
  RuleMatchResult,
  RuleTestContext,
} from '@/types/flowRule';
import { nanoid } from 'nanoid';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class FlowRuleEngine {
  private db: D1Database;

  constructor(env: Env) {
    this.db = getD1Connection(env);
  }

  evaluateConditionGroup(
    group: FlowConditionGroup,
    context: RuleTestContext
  ): boolean {
    const results: boolean[] = [];

    for (const condition of group.conditions) {
      if ('logic' in condition) {
        results.push(this.evaluateConditionGroup(condition as FlowConditionGroup, context));
      } else {
        results.push(this.evaluateCondition(condition as FlowFilter, context));
      }
    }

    if (results.length === 0) return true;

    return group.logic === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  evaluateCondition(
    filter: FlowFilter,
    context: RuleTestContext
  ): boolean {
    const value = this.getContextValue(filter.field, context);
    if (value === undefined) return false;

    const filterValue = filter.value;

    switch (filter.operator) {
      case 'eq':
        return value === String(filterValue);
      case 'neq':
        return value !== String(filterValue);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'notin':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      case 'contains':
        return value.includes(String(filterValue));
      case 'gt':
        return parseFloat(value) > parseFloat(String(filterValue));
      case 'lt':
        return parseFloat(value) < parseFloat(String(filterValue));
      case 'gte':
        return parseFloat(value) >= parseFloat(String(filterValue));
      case 'lte':
        return parseFloat(value) <= parseFloat(String(filterValue));
      case 'regex':
        try {
          return new RegExp(String(filterValue)).test(value);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getContextValue(field: string, context: RuleTestContext): string | undefined {
    switch (field.toLowerCase()) {
      case 'ip':
        return context.ip;
      case 'country':
        return context.country;
      case 'city':
        return context.city;
      case 'device':
        return context.device;
      case 'browser':
        return context.browser;
      case 'os':
        return context.os;
      case 'useragent':
      case 'user_agent':
        return context.userAgent;
      case 'referrer':
        return context.referrer;
      default:
        return context.customParams?.[field];
    }
  }

  async matchFlow(
    flowId: string,
    context: RuleTestContext
  ): Promise<RuleMatchResult> {
    const startTime = Date.now();

    const rules = await this.getFlowRules(flowId);
    const sortedRules = rules.filter(r => r.enabled).sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const conditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions as unknown as string) 
        : rule.conditions;
      
      if (this.evaluateConditionGroup(conditions, context)) {
        return {
          matched: true,
          matchedRule: rule,
          executionTime: Date.now() - startTime,
        };
      }
    }

    return {
      matched: false,
      executionTime: Date.now() - startTime,
    };
  }

  async testRule(
    ruleId: string,
    testData: RuleTestContext
  ): Promise<RuleMatchResult> {
    const startTime = Date.now();

    const rule = await this.getRuleById(ruleId);
    if (!rule) {
      return {
        matched: false,
        executionTime: Date.now() - startTime,
      };
    }

    const conditions = typeof rule.conditions === 'string'
      ? JSON.parse(rule.conditions as unknown as string)
      : rule.conditions;

    const matched = this.evaluateConditionGroup(conditions, testData);

    return {
      matched,
      matchedRule: matched ? rule : undefined,
      executionTime: Date.now() - startTime,
    };
  }

  async getFlowRules(flowId: string): Promise<FlowRule[]> {
    const results = await this.db
      .prepare('SELECT * FROM flow_rules WHERE flowId = ? ORDER BY priority DESC')
      .bind(flowId)
      .all<FlowRule>();

    return (results.results || []).map(r => ({
      ...r,
      conditions: JSON.parse(r.conditions as unknown as string),
    }));
  }

  async getRuleById(id: string): Promise<FlowRule | null> {
    const result = await this.db
      .prepare('SELECT * FROM flow_rules WHERE id = ?')
      .bind(id)
      .first<FlowRule>();

    if (!result) return null;

    return {
      ...result,
      conditions: JSON.parse(result.conditions as unknown as string),
    };
  }

  async createRule(flowId: string, rule: Omit<FlowRule, 'id' | 'flowId' | 'createdAt' | 'updatedAt'>): Promise<FlowRule> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO flow_rules (id, flowId, name, description, conditions, logic, priority, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        flowId,
        rule.name,
        rule.description || null,
        JSON.stringify(rule.conditions),
        rule.logic || 'AND',
        rule.priority || 0,
        rule.enabled !== false ? 1 : 0,
        now,
        now
      )
      .run();

    return (await this.getRuleById(id))!;
  }

  async updateRule(id: string, updates: Partial<FlowRule>): Promise<FlowRule> {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }
    if (updates.conditions !== undefined) {
      setClauses.push('conditions = ?');
      values.push(JSON.stringify(updates.conditions));
    }
    if (updates.logic !== undefined) {
      setClauses.push('logic = ?');
      values.push(updates.logic);
    }
    if (updates.priority !== undefined) {
      setClauses.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (setClauses.length > 0) {
      setClauses.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db
        .prepare(`UPDATE flow_rules SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return (await this.getRuleById(id))!;
  }

  async deleteRule(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM flow_rules WHERE id = ?').bind(id).run();
  }
}

export function createFlowRuleEngine(env: Env): FlowRuleEngine {
  return new FlowRuleEngine(env);
}
