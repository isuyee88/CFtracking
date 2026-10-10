/**
 * @fileoverview Realtime autorule engine
 * @description Evaluate layered autorules in click ingress path.
 * @module services/autorule/realtime-rule-engine.service
 */

import { AutoruleBindingRepository, AutoruleScopeRepository, ClickRepository, RuleRepository, getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { Condition, Rule, RuleExpressionNode, RuleSetCondition } from '@/types/rule';
import type { AutoruleScopeConfig, AutoruleScopeType, EffectiveAutoruleScopeResolution } from '@/types/autoruleScope';
import { ListResolverService, type AutoruleVisitContext } from './list-resolver.service';
import {
  matchBuiltinAggressiveCategoryBlock,
  matchBuiltinAllowBias,
  matchBuiltinExactBlock,
  matchBuiltinSuspiciousSignal,
} from './aggressive-traffic-policy';

const WHITELIST_EXACT_TYPES = [
  'rule',
  'ip',
  'fingerprint',
  'visitor_id',
  'asn',
  'country',
  'isp',
  'user_agent',
  'zone',
  'sub_id',
  'device',
] as const;

const BLACKLIST_EXACT_TYPES = [
  'rule',
  'ip',
  'fingerprint',
  'visitor_id',
  'user_agent',
  'asn',
  'country',
  'isp',
  'zone',
  'sub_id',
  'device',
] as const;

const CATEGORY_BLOCK_TYPES = ['org_exact', 'org_keyword', 'isp_type', 'network_tag'] as const;
const ALLOW_BIAS_TYPES = ['allow_bias_org', 'allow_bias_isp_type'] as const;

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
  matchedLayer?:
    | 'flow'
    | 'campaign'
    | 'traffic_source'
    | 'global'
    | 'whitelist'
    | 'blacklist'
    | 'allow_exact'
    | 'allow_verified_bot'
    | 'block_exact'
    | 'block_category_aggressive'
    | 'allow_bias'
    | 'suspicious_queue';
  effectiveScopeType?: 'campaign' | 'traffic_source' | 'global';
  reason?: string;
  redirectUrl?: string;
}

export class RealtimeRuleEngineService {
  private readonly ruleRepo: RuleRepository;
  private readonly bindingRepo: AutoruleBindingRepository;
  private readonly scopeRepo: AutoruleScopeRepository;
  private readonly clickRepo: ClickRepository;
  private readonly listResolver: ListResolverService;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.ruleRepo = new RuleRepository(db);
    this.bindingRepo = new AutoruleBindingRepository(db);
    this.scopeRepo = new AutoruleScopeRepository(db);
    this.clickRepo = new ClickRepository(db);
    this.listResolver = new ListResolverService(env);
  }

  async evaluate(input: RealtimeRuleEvaluationInput): Promise<RealtimeRuleDecision> {
    const whitelistDecision = await this.resolveDirectListDecision('whitelist', input.context, [...WHITELIST_EXACT_TYPES]);
    if (whitelistDecision) {
      return whitelistDecision;
    }

    const builtinExactBlock = matchBuiltinExactBlock(input.context);
    if (builtinExactBlock) {
      return this.buildBuiltinDecision('block', builtinExactBlock.layer, builtinExactBlock.reason);
    }

    const blacklistDecision = await this.resolveDirectListDecision('blacklist', input.context, [...BLACKLIST_EXACT_TYPES]);
    if (blacklistDecision) {
      return blacklistDecision;
    }

    const builtinCategoryBlock = matchBuiltinAggressiveCategoryBlock(input.context);
    if (builtinCategoryBlock) {
      return this.buildBuiltinDecision('block', builtinCategoryBlock.layer, builtinCategoryBlock.reason);
    }

    const categoryBlockDecision = await this.resolveDirectListDecision('blacklist', input.context, [...CATEGORY_BLOCK_TYPES]);
    if (categoryBlockDecision) {
      return categoryBlockDecision;
    }

    if (input.context.verifiedBot) {
      return {
        action: 'allow',
        matched: true,
        bound: false,
        matchedRuleId: 'greylist:verified_bot',
        matchedLayer: 'suspicious_queue',
        reason: 'verified_bot_observe',
      };
    }

    const builtinSuspicious = matchBuiltinSuspiciousSignal(input.context);
    if (builtinSuspicious) {
      const allowBias = await this.resolveAllowBiasDecision(input.context);
      if (allowBias) {
        return {
          ...allowBias,
          reason: `${allowBias.reason}:${builtinSuspicious.reason}`,
        };
      }

      return this.buildBuiltinDecision('allow', builtinSuspicious.layer, builtinSuspicious.reason);
    }

    const suspiciousDecision = await this.resolveDirectListDecision('blacklist', input.context, ['suspicious_reason']);
    if (suspiciousDecision) {
      const allowBias = await this.resolveAllowBiasDecision(input.context);
      if (allowBias) {
        return {
          ...allowBias,
          reason: `${allowBias.reason}:${suspiciousDecision.reason}`,
        };
      }

      return suspiciousDecision;
    }

    const scopeResolution = await this.resolveScopeResolution(input);

    if (!scopeResolution.effectiveConfig) {
      if (!scopeResolution.hasExplicitConfig && input.flowId) {
        const legacyBindings = await this.bindingRepo.getFlowBindings(input.flowId);
        const legacyDecision = await this.evaluateBoundRules(legacyBindings, input.context, 'flow');
        if (legacyDecision) {
          return legacyDecision;
        }
      }

      return {
        action: 'allow',
        matched: false,
        bound: scopeResolution.hasExplicitConfig,
        reason: scopeResolution.hasExplicitConfig
          ? 'scope_inherit_without_effective_config'
          : scopeResolution.scannedScopeTypes.length === 0
            ? 'scope_schema_unavailable'
            : 'not_bound',
      };
    }

    if (scopeResolution.effectiveConfig.mode === 'off') {
      return {
        action: 'allow',
        matched: false,
        bound: true,
        matchedLayer: scopeResolution.effectiveConfig.scopeType,
        effectiveScopeType: scopeResolution.effectiveConfig.scopeType,
        reason: 'scope_off',
      };
    }

    if (scopeResolution.effectiveConfig.mode === 'whitelist_gate') {
      return {
        action: 'challenge',
        matched: false,
        bound: true,
        matchedLayer: scopeResolution.effectiveConfig.scopeType,
        effectiveScopeType: scopeResolution.effectiveConfig.scopeType,
        reason: 'whitelist_gate_unmatched',
      };
    }

    const scopeDecision = await this.evaluateScopeConfig(scopeResolution.effectiveConfig, input.context);
    if (scopeDecision) {
      return scopeDecision;
    }

    return {
      action: 'allow',
      matched: false,
      bound: true,
      matchedLayer: scopeResolution.effectiveConfig.scopeType,
      effectiveScopeType: scopeResolution.effectiveConfig.scopeType,
      reason: 'no_bound_rule_matched',
    };
  }

  private async resolveAllowBiasDecision(context: AutoruleVisitContext): Promise<RealtimeRuleDecision | null> {
    const builtinAllowBias = matchBuiltinAllowBias(context);
    if (builtinAllowBias) {
      return this.buildBuiltinDecision('allow', builtinAllowBias.layer, builtinAllowBias.reason);
    }

    return this.resolveDirectListDecision('whitelist', context, [...ALLOW_BIAS_TYPES]);
  }

  private async resolveScopeResolution(
    input: RealtimeRuleEvaluationInput
  ): Promise<EffectiveAutoruleScopeResolution> {
    try {
      return await this.scopeRepo.resolveEffectiveScopeConfig(
        input.campaignId,
        input.context.trafficSourceId
      );
    } catch (error) {
      if (!this.isMissingAutoruleScopeSchemaError(error)) {
        throw error;
      }

      console.warn('[RealtimeRuleEngineService] Autorule scope schema unavailable, falling back to legacy bindings', {
        campaignId: input.campaignId,
        trafficSourceId: input.context.trafficSourceId || null,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        effectiveConfig: null,
        hasExplicitConfig: false,
        scannedScopeTypes: [],
      };
    }
  }

  private isMissingAutoruleScopeSchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '');
    return (
      message.includes('no such table') &&
      (message.includes('autorule_scope_configs') || message.includes('autorule_scope_bindings'))
    );
  }

  private async evaluateScopeConfig(
    config: AutoruleScopeConfig,
    context: AutoruleVisitContext
  ): Promise<RealtimeRuleDecision | null> {
    if (config.mode !== 'rules') {
      return null;
    }

    return this.evaluateBoundRules(
      config.bindings.map((binding) => ({
        ...binding,
        scope: config.scopeType,
      })),
      context,
      config.scopeType
    );
  }

  private async evaluateBoundRules(
    bindings: Array<{ ruleId: string; priority: number; scope: 'flow' | AutoruleScopeType }>,
    context: AutoruleVisitContext,
    scopeType: 'flow' | AutoruleScopeType
  ): Promise<RealtimeRuleDecision | null> {
    if (bindings.length === 0) {
      return null;
    }

    const rules = await this.ruleRepo.findManyByIds(bindings.map((binding) => binding.ruleId));
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    let unavailableRuleId: string | undefined;

    for (const binding of [...bindings].sort((left, right) => left.priority - right.priority)) {
      const rule =
        rulesById.get(binding.ruleId) ||
        rules.find((item) => item.displayId === binding.ruleId);
      if (!rule || !rule.enabled || rule.status !== 'active') {
        unavailableRuleId = binding.ruleId;
        continue;
      }

      const decision = await this.evaluateRule(rule, context);
      if (decision.matched || decision.action !== 'allow') {
        return {
          ...decision,
          bound: true,
          matchedLayer: scopeType,
          effectiveScopeType: scopeType === 'flow' ? undefined : scopeType,
          matchedRuleId: decision.matched ? (decision.matchedRuleId || rule.id) : undefined,
        };
      }
    }

    return unavailableRuleId
      ? {
          action: 'allow',
          matched: false,
          bound: true,
          matchedLayer: scopeType,
          effectiveScopeType: scopeType === 'flow' ? undefined : scopeType,
          matchedRuleId: undefined,
          reason: 'bound_rule_unavailable',
        }
      : null;
  }

  private async resolveDirectListDecision(
    side: 'whitelist' | 'blacklist',
    context: AutoruleVisitContext,
    orderedTypes?: string[]
  ): Promise<RealtimeRuleDecision | null> {
    const typesToCheck = orderedTypes || ['rule', 'ip', 'fingerprint', 'asn', 'country', 'isp', 'user_agent', 'zone', 'sub_id', 'device'];

    for (const listType of typesToCheck) {
      const matched =
        side === 'whitelist'
          ? await this.listResolver.inWhitelist(listType, context)
          : await this.listResolver.inBlacklist(listType, context);

      if (!matched) {
        continue;
      }

      return {
        action: this.mapDecisionAction(side, listType),
        matched: true,
        bound: false,
        matchedRuleId: this.mapDecisionRuleId(side, listType),
        matchedLayer: this.mapDecisionLayer(side, listType),
        effectiveScopeType: undefined,
        reason: this.mapDecisionReason(side, listType),
      };
    }

    return null;
  }

  private buildBuiltinDecision(
    action: 'allow' | 'block',
    layer: RealtimeRuleDecision['matchedLayer'],
    reason: string
  ): RealtimeRuleDecision {
    return {
      action,
      matched: true,
      bound: false,
      matchedRuleId: layer || undefined,
      matchedLayer: layer,
      effectiveScopeType: undefined,
      reason,
    };
  }

  private mapDecisionAction(side: 'whitelist' | 'blacklist', listType: string): RealtimeRuleDecision['action'] {
    if (side === 'whitelist') {
      return 'allow';
    }

    return listType === 'suspicious_reason' ? 'allow' : 'block';
  }

  private mapDecisionLayer(side: 'whitelist' | 'blacklist', listType: string): RealtimeRuleDecision['matchedLayer'] {
    if (side === 'whitelist') {
      if (ALLOW_BIAS_TYPES.includes(listType as (typeof ALLOW_BIAS_TYPES)[number])) {
        return 'allow_bias';
      }
      return 'allow_exact';
    }

    if (listType === 'suspicious_reason') {
      return 'suspicious_queue';
    }

    if (CATEGORY_BLOCK_TYPES.includes(listType as (typeof CATEGORY_BLOCK_TYPES)[number])) {
      return 'block_category_aggressive';
    }

    return 'block_exact';
  }

  private mapDecisionRuleId(side: 'whitelist' | 'blacklist', listType: string): string {
    const layer = this.mapDecisionLayer(side, listType);
    return `${layer}:${listType}`;
  }

  private mapDecisionReason(side: 'whitelist' | 'blacklist', listType: string): string {
    const layer = this.mapDecisionLayer(side, listType);
    return `${layer}_${listType}_matched`;
  }

  private async evaluateRepeatWindowExceeded(args: string[], context: AutoruleVisitContext): Promise<boolean> {
    const [subjectRaw, minCountRaw, minCampaignsRaw, lookbackHoursRaw] = args;
    const subject = String(subjectRaw || 'either').trim().toLowerCase();
    const minCount = Number(minCountRaw);
    const minCampaigns = Number(minCampaignsRaw);
    const lookbackHours = Number(lookbackHoursRaw);

    if (!['visitor', 'ip', 'either'].includes(subject)) {
      return false;
    }
    if (!Number.isFinite(minCount) || !Number.isFinite(minCampaigns) || !Number.isFinite(lookbackHours)) {
      return false;
    }

    const includeVisitor = subject === 'visitor' || subject === 'either';
    const includeIp = subject === 'ip' || subject === 'either';
    if ((!includeVisitor || !context.visitorId) && (!includeIp || !context.ip)) {
      return false;
    }

    const metrics = await this.clickRepo.getRecentVisitMetrics({
      visitorId: includeVisitor ? context.visitorId : undefined,
      ip: includeIp ? context.ip : undefined,
      lookbackHours,
    });

    const repeatCount = subject === 'visitor'
      ? metrics.visitorRepeat
      : subject === 'ip'
        ? metrics.ipRepeat
        : Math.max(metrics.visitorRepeat, metrics.ipRepeat);

    return repeatCount >= minCount && metrics.campaignCount >= minCampaigns;
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
      if (fn === 'repeat_window_exceeded') {
        return this.evaluateRepeatWindowExceeded(args, context);
      }
      return false;
    }

    if (Array.isArray(block.eq) && block.eq.length === 2) {
      const [path, expected] = block.eq as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareScalar(actual, expected, 'eq');
    }

    if (Array.isArray(block.ne) && block.ne.length === 2) {
      const [path, expected] = block.ne as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareScalar(actual, expected, 'ne');
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

    if (Array.isArray(block.not_contains) && block.not_contains.length === 2) {
      const [path, needle] = block.not_contains as [string, string];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return !String(actual ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase());
    }

    if (Array.isArray(block.gt) && block.gt.length === 2) {
      const [path, expected] = block.gt as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareNumeric(actual, expected, 'gt');
    }

    if (Array.isArray(block.gte) && block.gte.length === 2) {
      const [path, expected] = block.gte as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareNumeric(actual, expected, 'gte');
    }

    if (Array.isArray(block.lt) && block.lt.length === 2) {
      const [path, expected] = block.lt as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareNumeric(actual, expected, 'lt');
    }

    if (Array.isArray(block.lte) && block.lte.length === 2) {
      const [path, expected] = block.lte as [string, unknown];
      const actual = this.readByPath(context as unknown as Record<string, unknown>, path);
      return this.compareNumeric(actual, expected, 'lte');
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

  private compareScalar(actual: unknown, expected: unknown, operator: 'eq' | 'ne'): boolean {
    const actualValue = String(actual ?? '');
    const expectedValue = String(expected ?? '');
    return operator === 'eq' ? actualValue === expectedValue : actualValue !== expectedValue;
  }

  private compareNumeric(actual: unknown, expected: unknown, operator: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      return false;
    }

    switch (operator) {
      case 'gt':
        return actualNumber > expectedNumber;
      case 'gte':
        return actualNumber >= expectedNumber;
      case 'lt':
        return actualNumber < expectedNumber;
      case 'lte':
        return actualNumber <= expectedNumber;
      default:
        return false;
    }
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
