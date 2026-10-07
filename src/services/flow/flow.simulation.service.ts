/**
 * Deterministic, side-effect-free evaluator for Flow rule simulations.
 * Production tracking continues to use FlowEngine; both paths use FlowValidator
 * for the actual rule semantics so simulation cannot silently invent a second
 * filter language.
 */
import { FlowValidator } from './flow.validator';
import type {
  FlowSchema,
  RuleActionConfig,
  RuleValidationResult,
  ValidationContext,
} from '@/types/flow.schema';

export interface FlowSimulationInput {
  schemas: FlowSchema[];
  context: ValidationContext;
  rotation?: 'position' | 'weight';
  /** Trusted risk input only; absent means unknown, never inferred. */
  riskScore?: number | null;
}

export interface FlowSimulationTrace {
  flowId: string;
  flowType: FlowSchema['flow']['type'];
  matched: boolean;
  reason: string;
  ruleResults: RuleValidationResult[];
  matchedRule?: RuleValidationResult;
}

export interface FlowSimulationResult {
  decision: 'flow' | 'default' | 'do_nothing';
  flowId: string | null;
  action: RuleActionConfig;
  matchedRule?: RuleValidationResult;
  trace: FlowSimulationTrace[];
  /** null means the caller did not provide a trusted risk score. */
  riskScore: number | null;
  reason: string;
  latencyMs: number;
}

export class FlowSimulationService {
  async simulate(input: FlowSimulationInput): Promise<FlowSimulationResult> {
    const startedAt = Date.now();
    const active = input.schemas.filter((schema) => schema.flow.status === 'active');
    const forced = active
      .filter((schema) => schema.flow.type === 'forced')
      .sort((a, b) => a.flow.weight - b.flow.weight || a.flow.id.localeCompare(b.flow.id));
    const regular = active.filter((schema) => schema.flow.type === 'regular');
    const defaults = active
      .filter((schema) => schema.flow.type === 'default')
      .sort((a, b) => a.flow.id.localeCompare(b.flow.id));
    const orderedRegular = input.rotation === 'weight'
      ? [...regular].sort((a, b) => b.flow.weight - a.flow.weight || a.flow.id.localeCompare(b.flow.id))
      : regular;
    const trace: FlowSimulationTrace[] = [];

    for (const schema of [...forced, ...orderedRegular]) {
      const validation = this.validate(schema, input.context);
      trace.push({
        flowId: schema.flow.id,
        flowType: schema.flow.type,
        matched: validation.matched,
        reason: validation.reason,
        ruleResults: validation.ruleResults,
        ...(validation.matchedRule ? { matchedRule: validation.matchedRule } : {}),
      });
      if (validation.matched) {
        return {
          decision: 'flow',
          flowId: schema.flow.id,
          action: validation.action,
          ...(validation.matchedRule ? { matchedRule: validation.matchedRule } : {}),
          trace,
          riskScore: input.riskScore ?? null,
          reason: validation.reason,
          latencyMs: Date.now() - startedAt,
        };
      }
    }

    const defaultSchema = defaults[0];
    if (defaultSchema) {
      trace.push({
        flowId: defaultSchema.flow.id,
        flowType: 'default',
        matched: true,
        reason: 'default_flow_fallback',
        ruleResults: [],
      });
      return {
        decision: 'default',
        flowId: defaultSchema.flow.id,
        action: defaultSchema.defaultAction,
        trace,
        riskScore: input.riskScore ?? null,
        reason: 'default_flow_fallback',
        latencyMs: Date.now() - startedAt,
      };
    }

    return {
      decision: 'do_nothing',
      flowId: null,
      action: { type: 'block', blockReason: 'No matching flow' },
      trace,
      riskScore: input.riskScore ?? null,
      reason: 'no_flow_matched',
      latencyMs: Date.now() - startedAt,
    };
  }

  private validate(schema: FlowSchema, context: ValidationContext): {
    matched: boolean;
    action: RuleActionConfig;
    reason: string;
    ruleResults: RuleValidationResult[];
    matchedRule?: RuleValidationResult;
  } {
    if (schema.rules.length === 0) {
      return {
        matched: true,
        action: schema.defaultAction,
        reason: 'no_rules_default_action',
        ruleResults: [],
      };
    }

    const result = FlowValidator.validate(schema, context);
    return {
      matched: result.passed,
      action: result.passed ? result.action : schema.defaultAction,
      reason: result.passed ? 'rule_matched' : 'no_rule_matched',
      ruleResults: result.ruleResults,
      ...(result.matchedRule ? { matchedRule: result.matchedRule } : {}),
    };
  }
}
