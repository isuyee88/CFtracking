/**
 * @fileoverview 规则 API 路由
 * @description 处理规则相关的 HTTP 请求
 * @module services/rule/rule.routes
 */

import { Hono } from 'hono';
import { RuleRepository } from '@/handlers/d1/rule.repo';
import { RuleEngine } from './engine';
import { success, error } from '@/utils/response';
import { validateRequired, validatePagination } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { Action, Condition, CreateRuleDTO, Rule, UpdateRuleDTO } from '@/types/rule';

interface RuleConflict {
  type: 'duplicate_priority' | 'condition_overlap' | 'action_conflict';
  severity: 'high' | 'medium';
  priority: number;
  ruleIds: string[];
  ruleNames: string[];
  details: string;
  conditionSignature?: string;
}

interface RuleTestBenchPayload {
  context?: Record<string, unknown>;
  includeDisabled?: boolean;
  includePaused?: boolean;
  ruleIds?: string[];
}

interface RuleConditionCheck {
  metric: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  matched: boolean;
}

interface RuleTestBenchRuleResult {
  ruleId: string;
  ruleName: string;
  priority: number;
  enabled: boolean;
  status: string;
  skipped: boolean;
  matched: boolean;
  reason?: string;
  conditionChecks: RuleConditionCheck[];
  actionSummary: string;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function normalizeConditionSignature(conditions: Condition[]): string {
  return conditions
    .map((condition) =>
      [
        condition.metric,
        condition.operator,
        stableStringify(condition.value),
        condition.duration || '',
        condition.aggregation || '',
      ].join('|')
    )
    .sort()
    .join('&&');
}

function normalizeConditionBlocks(conditions: Rule['conditions']): Condition[] {
  if (!Array.isArray(conditions)) {
    return [];
  }
  return conditions as Condition[];
}

function normalizeActionSignature(actions: Action[]): string {
  return actions
    .map((action) => [action.type, action.platform, stableStringify(action.parameters)].join('|'))
    .sort()
    .join('&&');
}

function summarizeActions(actions: Action[]): string {
  if (!Array.isArray(actions) || actions.length === 0) {
    return 'No actions';
  }
  return actions.map((action) => `${action.type}${action.platform ? ` (${action.platform})` : ''}`).join(', ');
}

function detectRuleConflicts(rules: Rule[]): RuleConflict[] {
  const activeRules = rules.filter((rule) => rule.status === 'active' && rule.enabled);
  const conflicts: RuleConflict[] = [];

  const priorityBuckets = new Map<string, Rule[]>();
  for (const rule of activeRules) {
    const key = `${rule.type}:${rule.priority}`;
    const bucket = priorityBuckets.get(key) || [];
    bucket.push(rule);
    priorityBuckets.set(key, bucket);
  }

  for (const [key, bucket] of priorityBuckets.entries()) {
    if (bucket.length <= 1) continue;
    const [, priorityRaw] = key.split(':');
    const priority = Number(priorityRaw || 0);
    conflicts.push({
      type: 'duplicate_priority',
      severity: 'medium',
      priority,
      ruleIds: bucket.map((rule) => rule.id),
      ruleNames: bucket.map((rule) => rule.name),
      details: `Multiple active rules share priority ${priority}.`,
    });
  }

  const conditionBuckets = new Map<string, Rule[]>();
  for (const rule of activeRules) {
    const signature = normalizeConditionSignature(normalizeConditionBlocks(rule.conditions));
    const bucket = conditionBuckets.get(signature) || [];
    bucket.push(rule);
    conditionBuckets.set(signature, bucket);
  }

  for (const [conditionSignature, bucket] of conditionBuckets.entries()) {
    if (bucket.length <= 1) continue;
    const priorities = bucket.map((rule) => rule.priority);
    const topPriority = Math.max(...priorities);
    const actionSignatures = new Set(bucket.map((rule) => normalizeActionSignature(rule.actions || [])));

    conflicts.push({
      type: 'condition_overlap',
      severity: 'medium',
      priority: topPriority,
      ruleIds: bucket.map((rule) => rule.id),
      ruleNames: bucket.map((rule) => rule.name),
      details: 'Rules have identical condition blocks and may race by priority.',
      conditionSignature,
    });

    if (actionSignatures.size > 1) {
      conflicts.push({
        type: 'action_conflict',
        severity: 'high',
        priority: topPriority,
        ruleIds: bucket.map((rule) => rule.id),
        ruleNames: bucket.map((rule) => rule.name),
        details: 'Rules with identical conditions trigger different actions.',
        conditionSignature,
      });
    }
  }

  return conflicts.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'high' ? -1 : 1;
    }
    return right.priority - left.priority;
  });
}

function getValueByPath(record: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean);
  let current: unknown = record;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compareCondition(actual: unknown, condition: Condition): boolean {
  const expected = condition.value;
  switch (condition.operator) {
    case '>': {
      const a = toNumber(actual);
      const b = toNumber(expected);
      return a !== null && b !== null ? a > b : false;
    }
    case '<': {
      const a = toNumber(actual);
      const b = toNumber(expected);
      return a !== null && b !== null ? a < b : false;
    }
    case '>=': {
      const a = toNumber(actual);
      const b = toNumber(expected);
      return a !== null && b !== null ? a >= b : false;
    }
    case '<=': {
      const a = toNumber(actual);
      const b = toNumber(expected);
      return a !== null && b !== null ? a <= b : false;
    }
    case '!=':
      return String(actual ?? '') !== String(expected ?? '');
    case 'contains': {
      if (Array.isArray(actual)) {
        return actual.map((item) => String(item)).includes(String(expected ?? ''));
      }
      return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    }
    case '==':
    default:
      return String(actual ?? '') === String(expected ?? '');
  }
}

export function createRuleRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      type: c.req.query('type'),
      status: c.req.query('status'),
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const repo = new RuleRepository(c.env.DB);
    const result = await repo.findList({ page, pageSize, type: query.type, status: query.status });

    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total,
    }));
  });

  router.get('/enabled', async (c) => {
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findEnabled();
    return c.json(success(rules));
  });

  router.get('/type/:type', async (c) => {
    const type = c.req.param('type');
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findByType(type);
    return c.json(success(rules));
  });

  router.get('/conflicts', async (c) => {
    const repo = new RuleRepository(c.env.DB);
    const result = await repo.findList({ page: 1, pageSize: 500, status: 'active' });
    const conflicts = detectRuleConflicts(result.list);

    return c.json(
      success({
        totalRules: result.list.length,
        conflictCount: conflicts.length,
        highSeverityCount: conflicts.filter((conflict) => conflict.severity === 'high').length,
        conflicts,
      })
    );
  });

  router.post('/test-bench', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as RuleTestBenchPayload;
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    const includeDisabled = body.includeDisabled === true;
    const includePaused = body.includePaused === true;
    const requestedRuleIds = Array.isArray(body.ruleIds)
      ? new Set(body.ruleIds.map((ruleId) => String(ruleId)).filter(Boolean))
      : null;

    const repo = new RuleRepository(c.env.DB);
    const listResult = await repo.findList({ page: 1, pageSize: 500 });
    const sortedRules = [...listResult.list].sort((left, right) => {
      if (left.priority === right.priority) {
        return left.createdAt.localeCompare(right.createdAt);
      }
      return right.priority - left.priority;
    });

    const ruleResults: RuleTestBenchRuleResult[] = [];
    let winner: Rule | null = null;

    for (const rule of sortedRules) {
      if (requestedRuleIds && !requestedRuleIds.has(rule.id)) {
        continue;
      }

      const skippedBecauseDisabled = !includeDisabled && !rule.enabled;
      const skippedBecausePaused = !includePaused && rule.status !== 'active';
      if (skippedBecauseDisabled || skippedBecausePaused) {
        ruleResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          priority: rule.priority,
          enabled: rule.enabled,
          status: rule.status,
          skipped: true,
          matched: false,
          reason: skippedBecauseDisabled ? 'Rule is disabled' : 'Rule is not active',
          conditionChecks: [],
          actionSummary: summarizeActions(rule.actions || []),
        });
        continue;
      }

      const conditionChecks = normalizeConditionBlocks(rule.conditions).map((condition) => {
        const actual = getValueByPath(context, condition.metric);
        return {
          metric: condition.metric,
          operator: condition.operator,
          expected: condition.value,
          actual,
          matched: compareCondition(actual, condition),
        } as RuleConditionCheck;
      });

      const matched = conditionChecks.every((check) => check.matched);
      if (!winner && matched) {
        winner = rule;
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        enabled: rule.enabled,
        status: rule.status,
        skipped: false,
        matched,
        reason: matched ? 'Matched all conditions' : 'Condition mismatch',
        conditionChecks,
        actionSummary: summarizeActions(rule.actions || []),
      });
    }

    return c.json(
      success({
        evaluatedAt: new Date().toISOString(),
        context,
        winner: winner
          ? {
              ruleId: winner.id,
              ruleName: winner.name,
              priority: winner.priority,
              actionSummary: summarizeActions(winner.actions || []),
            }
          : null,
        ruleResults,
      })
    );
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.findById(id);

    if (!rule) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    return c.json(success(rule));
  });

  router.get('/:id/history', async (c) => {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    const repo = new RuleRepository(c.env.DB);
    const history = await repo.getExecutionHistory(id, limit);
    return c.json(success(history));
  });

  router.post('/', async (c) => {
    const body = await c.req.json() as CreateRuleDTO;

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const typeValidation = validateRequired(body.type, 'type');
    if (!typeValidation.valid) {
      return c.json(error(typeValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const hasConditions = Array.isArray(body.conditions)
      ? body.conditions.length > 0
      : Boolean(body.conditions && typeof body.conditions === 'object');

    if (!hasConditions) {
      return c.json(error('At least one condition is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const isRuleSetPayload = Boolean(
      body.conditions &&
      typeof body.conditions === 'object' &&
      Array.isArray((body.conditions as unknown as Record<string, unknown>).rules)
    );
    const normalizedActions = Array.isArray(body.actions) ? body.actions : [];

    if (normalizedActions.length === 0 && !isRuleSetPayload) {
      return c.json(error('At least one action is required', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.create({
      ...body,
      actions: normalizedActions,
    });
    return c.json(success(rule), HTTP_STATUS.CREATED);
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as UpdateRuleDTO;
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, body);
    return c.json(success(rule));
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    await repo.update(id, { status: 'deleted' });
    return c.json(success({ deleted: true }));
  });

  router.post('/:id/enable', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, { enabled: true });
    return c.json(success(rule));
  });

  router.post('/:id/disable', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);

    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const rule = await repo.update(id, { enabled: false });
    return c.json(success(rule));
  });

  router.post('/:id/evaluate', async (c) => {
    const id = c.req.param('id');
    const repo = new RuleRepository(c.env.DB);
    const engine = new RuleEngine(c.env);

    const rule = await repo.findById(id);
    if (!rule) {
      return c.json(error('Rule not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const triggered = await engine.evaluateRule(rule);
    return c.json(success({ triggered }));
  });

  router.post('/evaluate-all', async (c) => {
    const engine = new RuleEngine(c.env);
    await engine.evaluateAllRules();
    return c.json(success({ message: 'All rules evaluated' }));
  });

  return router;
}
