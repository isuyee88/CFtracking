/**
 * @fileoverview Realtime autorule engine
 * @description Evaluate campaign/flow-bound autorules in click ingress path.
 * @module services/autorule/realtime-rule-engine.service
 */

import { AutoruleBindingRepository, RuleRepository, getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Condition, Rule, RuleExpressionNode, RuleSetCondition } from '@/types/rule';
import { ListResolverService, type AutoruleVisitContext } from './list-resolver.service';

export interface RealtimeRuleEvaluationInput {
  campaignId: string;
  flowId?: string | null;
  context: AutoruleVisitContext;
}

export interface RealtimeRuleDecision {
  action: 'allow' | 'block' | 'challenge' | 'redirect';
  matched: boolean;
  bound: boolean;
  matchedRuleId?: string;
  matchedLayer?: 'flow' | 'campaign' | 'whitelist' | 'blacklist';
  reason?: string;
  redirectUrl?: string;
}

export class RealtimeRuleEngineService {
  private readonly ruleRepo: RuleRepository;
  private readonly bindingRepo: AutoruleBindingRepository;
  private readonly listResolver: ListResolverService;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.ruleRepo = new RuleRepository(db);
    this.bindingRepo = new AutoruleBindingRepository(db);
    this.listResolver = new ListResolverService(env);
  }

  async evaluate(input: RealtimeRuleEvaluationInput): Promise<RealtimeRuleDecision> {
    const whitelistDecision = await this.resolveDirectListDecision('whitelist', input.context);
    if (whitelistDecision) {
      return whitelistDecision;
    }

    const blacklistDecision = await this.resolveDirectListDecision('blacklist', input.context);
    if (blacklistDecision) {
      return blacklistDecision;
    }

    const bindings = await this.bindingRepo.getEffectiveBindings(input.campaignId, input.flowId || undefined);
    if (bindings.length === 0) {
      return { action: 'allow', matched: false, bound: false, reason: 'not_bound' };
    }

    let unavailableRuleId: string | undefined;

    for (const binding of bindings) {
      const rule = await this.ruleRepo.findById(binding.ruleId);
      if (!rule || !rule.enabled || rule.status !== 'active') {
        unavailableRuleId = binding.ruleId;
        continue;
      }

      const decision = await this.evaluateRule(rule, input.context);
      if (decision.matched || decision.action !== 'allow') {
        return {
          ...decision,
          bound: true,
          matchedLayer: binding.scope,
          matchedRuleId: decision.matched ? (decision.matchedRuleId || rule.id) : undefined,
        };
      }
    }

    return {
      action: 'allow',
      matched: false,
      bound: true,
      matchedLayer: bindings[0]?.scope,
      matchedRuleId: undefined,
      reason: unavailableRuleId ? 'bound_rule_unavailable' : 'no_bound_rule_matched',
    };
  }

  private async resolveDirectListDecision(
    side: 'whitelist' | 'blacklist',
    context: AutoruleVisitContext
  ): Promise<RealtimeRuleDecision | null> {
    const orderedTypes = ['rule', 'ip', 'fingerprint', 'asn', 'country', 'isp', 'user_agent', 'zone', 'sub_id', 'device'];

    for (const listType of orderedTypes) {
      const matched =
        side === 'whitelist'
          ? await this.listResolver.inWhitelist(listType, context)
          : await this.listResolver.inBlacklist(listType, context);

      if (!matched) {
        continue;
      }

      return {
        action: side === 'whitelist' ? 'allow' : 'block',
        matched: true,
        bound: false,
        matchedRuleId: `${side}:${listType}`,
        matchedLayer: side,
        reason: `${side}_${listType}_matched`,
      };
    }

    return null;
  }

  private async evaluateRule(rule: Rule, context: AutoruleVisitContext): Promise<RealtimeRuleDecision> {
    const conditionPayload = rule.conditions as unknown;

    if (this.isRuleSet(conditionPayload)) {
      const sorted = [...conditionPayload.rules].sort((a, b) => b.priority - a.priority);
      for (const entry of sorted) {
        const matched = await this.evaluateExpressionNode(entry.when, context);
        if (!matched) continue;

        return {
          ...this.resolveRuleActionDecision(rule, entry.then?.action),
          matched: true,
          matchedRuleId: entry.id || rule.id,
          reason: entry.then?.reason || 'matched_rule_set_entry',
          bound: true,
        };
      }

      return {
        ...this.resolveRuleActionDecision(rule, conditionPayload.default?.action),
        matched: false,
        bound: true,
        reason: 'rule_set_default',
      };
    }

    if (Array.isArray(conditionPayload)) {
      const matched = this.evaluateLegacyConditions(conditionPayload as Condition[], context);
      if (!matched) {
        return { action: 'allow', matched: false, bound: true, reason: 'legacy_conditions_not_matched' };
      }
      return {
        ...this.resolveRuleActionDecision(rule, (rule.actions || [])[0]?.type),
        matched: true,
        matchedRuleId: rule.id,
        bound: true,
        reason: 'legacy_conditions_matched',
      };
    }

    if (conditionPayload && typeof conditionPayload === 'object') {
      const matched = await this.evaluateExpressionNode(conditionPayload as RuleExpressionNode, context);
      if (!matched) {
        return { action: 'allow', matched: false, bound: true, reason: 'expression_not_matched' };
      }

      return {
        ...this.resolveRuleActionDecision(rule, (rule.actions || [])[0]?.type),
        matched: true,
        matchedRuleId: rule.id,
        bound: true,
        reason: 'expression_matched',
      };
    }

    return { action: 'allow', matched: false, bound: true, reason: 'invalid_rule_payload' };
  }

  private isRuleSet(payload: unknown): payload is RuleSetCondition {
    if (!payload || typeof payload !== 'object') return false;
    const obj = payload as Partial<RuleSetCondition>;
    return Array.isArray(obj.rules);
  }

  private evaluateLegacyConditions(conditions: Condition[], context: AutoruleVisitContext): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) return false;

    return conditions.every((condition) => {
      const actual = this.readByPath(context as unknown as Record<string, unknown>, condition.metric);
      return this.compareLegacy(actual, condition.operator, condition.value);
    });
  }

  private compareLegacy(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case '>':
        return Number(actual) > Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case '>=':
        return Number(actual) >= Number(expected);
      case '<=':
        return Number(actual) <= Number(expected);
      case '!=':
        return String(actual ?? '') !== String(expected ?? '');
      case 'contains':
        return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
      case '==':
      default:
        return String(actual ?? '') === String(expected ?? '');
    }
  }

  private async evaluateExpressionNode(node: RuleExpressionNode, context: AutoruleVisitContext): Promise<boolean> {
    if (!node || typeof node !== 'object') return false;
    const block = node as unknown as Record<string, unknown>;

    if (Array.isArray(block.all)) {
      for (const item of block.all as RuleExpressionNode[]) {
        if (!(await this.evaluateExpressionNode(item, context))) {
          return false;
        }
      }
      return true;
    }

    if (Array.isArray(block.any)) {
      for (const item of block.any as RuleExpressionNode[]) {
        if (await this.evaluateExpressionNode(item, context)) {
          return true;
        }
      }
      return false;
    }

    if (block.not && typeof block.not === 'object') {
      const nested = block.not as RuleExpressionNode;
      return !(await this.evaluateExpressionNode(nested, context));
    }

    if (typeof block.fn === 'string') {
      const fn = String(block.fn);
      const args = Array.isArray(block.args) ? (block.args as unknown[]).map((item) => String(item)) : [];
      const listType = args[0] || '';
      if (!listType) return false;

      if (fn === 'in_blacklist') {
        return this.listResolver.inBlacklist(listType, context);
      }
      if (fn === 'in_whitelist') {
        return this.listResolver.inWhitelist(listType, context);
      }
      return false;
    }

    if (Array.isArray(block.eq) && block.eq.length === 2) {
      const [path, expected] = block.eq as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return String(actual ?? '') === String(expected ?? '');
    }

    if (Array.isArray(block.in) && block.in.length === 2) {
      const [path, list] = block.in as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      if (!Array.isArray(list)) return false;
      return list.map((item) => String(item)).includes(String(actual ?? ''));
    }

    if (Array.isArray(block.contains) && block.contains.length === 2) {
      const [path, needle] = block.contains as [string, string];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return String(actual ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase());
    }

    if (Array.isArray(block.exists) && block.exists.length === 1) {
      const [path] = block.exists as [string];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return actual !== undefined && actual !== null && String(actual).length > 0;
    }

    return false;
  }

  private readByPath(record: Record<string, unknown>, path: string): unknown {
    if (!path) return undefined;

    const normalized = path.startsWith('context.') ? path.slice('context.'.length) : path;
    const segments = normalized.split('.').filter(Boolean);
    let current: unknown = record;

    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private normalizeDecisionAction(action: unknown): 'allow' | 'block' | 'challenge' | 'redirect' {
    const normalized = String(action || '').toLowerCase();
    switch (normalized) {
      case 'block':
        return 'block';
      case 'challenge':
        return 'challenge';
      case 'redirect':
        return 'redirect';
      case 'allow':
      default:
        return 'allow';
    }
  }

  private resolveRuleActionDecision(
    rule: Rule,
    action: unknown
  ): Pick<RealtimeRuleDecision, 'action' | 'redirectUrl'> {
    const normalizedAction = this.normalizeDecisionAction(action);
    return {
      action: normalizedAction,
      redirectUrl: normalizedAction === 'redirect' ? this.extractRedirectUrl(rule) : undefined,
    };
  }

  private extractRedirectUrl(rule: Rule): string | undefined {
    const redirectAction = (rule.actions || []).find(
      (item) => String(item?.type || '').toLowerCase() === 'redirect'
    );
    const parameters = (redirectAction?.parameters || {}) as Record<string, unknown>;
    const candidate =
      parameters.redirectUrl ||
      parameters.url ||
      parameters.targetUrl ||
      parameters.destinationUrl;

    const normalized = String(candidate || '').trim();
    return normalized || undefined;
  }
}
