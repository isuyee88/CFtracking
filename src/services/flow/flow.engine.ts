/**
 * @fileoverview Flow 执行引擎
 * @description 实现 Keitaro 风格的 Flow 流量分发逻辑
 * @module services/flow/flow.engine
 * 
 * 输入: FlowExecutionContext（包含请求、Flows、Campaign 配置）
 * 输出: FlowExecutionResult（选中的 Flow、Action、目标 URL）
 * 逻辑交互: 
 *   - 调用 FlowValidator 验证 Flow 规则
 *   - 使用 KV 存储访问者绑定关系
 *   - 被 ClickService 调用来选择 Flow
 * 前后端交互: 无直接交互，纯后端逻辑
 */

import type { Env } from '@/config/env';
import type { Flow } from '@/types/flow';
import type { Campaign } from '@/types/campaign';
import type { 
  FlowSchema, 
  ValidationContext, 
  RuleActionConfig,
  RuleValidationResult
} from '@/types/flow.schema';
import { FlowValidator } from './flow.validator';

// Define ClickRequest locally to avoid circular dependency
export interface ClickRequest {
  ip: string;
  userAgent: string;
  referer?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  isp?: string;
  connectionType?: string;
  campaignId: string;
  subIds: Record<string, string>;
  timestamp: string;
}

/**
 * Flow 执行上下文
 */
export interface FlowExecutionContext {
  /** 点击请求 */
  request: ClickRequest;
  /** 验证上下文 */
  validationContext: ValidationContext;
  /** 访客 ID */
  visitorId: string;
  /** Campaign 配置 */
  campaign: Campaign;
  /** 所有 Flows */
  flows: Flow[];
  /** 环境变量 */
  env: Env;
}

/**
 * Flow 执行结果
 */
export interface FlowExecutionResult {
  /** 选中的 Flow */
  flow: Flow | null;
  /** 执行的动作 */
  action: RuleActionConfig;
  /** 是否使用了访问者绑定 */
  usedBinding: boolean;
  /** 绑定的 Flow ID（如果有） */
  boundFlowId: string | null;
  /** 执行详情 */
  details: {
    /** 执行的步骤 */
    steps: string[];
    /** 匹配的规则 */
    matchedRule: RuleValidationResult | null;
    /** 执行耗时（毫秒） */
    durationMs: number;
  };
}

/**
 * 访问者绑定数据
 */
interface VisitorBinding {
  flowId: string;
  landingPageId?: string;
  offerId?: string;
  timestamp: string;
  expiresAt: string;
}

/**
 * 生成访客 ID
 */
export function generateVisitorId(request: ClickRequest): string {
  const data = `${request.ip}:${request.userAgent}:${Date.now()}`;
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

/**
 * Flow 执行引擎
 * 
 * 执行流程（按 Keitaro 文档）：
 * 1. 检查访问者绑定（如果启用）
 * 2. 执行 Forced Flows（按权重排序，顺序检查）
 * 3. 执行 Regular Flows（Weight 或 Position 模式）
 * 4. 使用 Default Flow 回退
 * 5. 触发 Do Nothing（无匹配）
 */
export class FlowEngine {
  private kv: KVNamespace | null = null;

  constructor(env: Env) {
    this.kv = (env as any).VISITOR_BINDINGS || null;
  }

  /**
   * 执行 Flow 选择
   */
  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const startTime = Date.now();
    const steps: string[] = [];

    // 1. 检查访问者绑定
    const binding = await this.getVisitorBinding(context);
    if (binding && binding.flowId) {
      const boundFlow = context.flows.find(f => f.id === binding.flowId);
      if (boundFlow && boundFlow.status === 'active') {
        steps.push(`Using visitor binding: ${binding.flowId}`);
        return {
          flow: boundFlow,
          action: { type: 'allow', weight: 100 },
          usedBinding: true,
          boundFlowId: binding.flowId,
          details: {
            steps,
            matchedRule: null,
            durationMs: Date.now() - startTime,
          },
        };
      }
    }

    // 分离不同类型的 Flows
    const forcedFlows = context.flows
      .filter(f => f.type === 'forced' && f.status === 'active')
      .sort((a, b) => a.weight - b.weight); // 权重小的优先

    const regularFlows = context.flows
      .filter(f => f.type === 'regular' && f.status === 'active');

    const defaultFlows = context.flows
      .filter(f => f.type === 'default' && f.status === 'active');

    steps.push(`Found ${forcedFlows.length} forced, ${regularFlows.length} regular, ${defaultFlows.length} default flows`);

    // 2. 执行 Forced Flows
    const forcedResult = await this.executeForcedFlows(forcedFlows, context.validationContext, context);
    if (forcedResult) {
      steps.push(`Matched forced flow: ${forcedResult.flow.id}`);
      await this.updateVisitorBinding(context, forcedResult.flow.id);
      return {
        flow: forcedResult.flow,
        action: forcedResult.action,
        usedBinding: false,
        boundFlowId: null,
        details: {
          steps,
          matchedRule: forcedResult.matchedRule,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // 3. 执行 Regular Flows
    const regularResult = await this.executeRegularFlows(
      regularFlows, 
      context.validationContext, 
      context,
      context.campaign.flowRotation || 'position'
    );
    if (regularResult) {
      steps.push(`Matched regular flow: ${regularResult.flow.id}`);
      await this.updateVisitorBinding(context, regularResult.flow.id);
      return {
        flow: regularResult.flow,
        action: regularResult.action,
        usedBinding: false,
        boundFlowId: null,
        details: {
          steps,
          matchedRule: regularResult.matchedRule,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // 4. 使用 Default Flow 回退
    if (defaultFlows.length > 0) {
      const defaultFlow = defaultFlows[0]!;
      steps.push(`Using default flow: ${defaultFlow.id}`);
      return {
        flow: defaultFlow,
        action: { type: 'allow', weight: 100 },
        usedBinding: false,
        boundFlowId: null,
        details: {
          steps,
          matchedRule: null,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // 5. 无匹配，触发 Do Nothing
    steps.push('No matching flow - triggering do nothing');
    return {
      flow: null,
      action: { type: 'block', blockReason: 'No matching flow' },
      usedBinding: false,
      boundFlowId: null,
      details: {
        steps,
        matchedRule: null,
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * 执行 Forced Flows
   * 按权重排序，顺序检查，第一个匹配的立即返回
   */
  private async executeForcedFlows(
    forcedFlows: Flow[],
    validationContext: ValidationContext,
    _context: FlowExecutionContext
  ): Promise<{ flow: Flow; action: RuleActionConfig; matchedRule: RuleValidationResult | null } | null> {
    for (const flow of forcedFlows) {
      // 获取 Flow 的 Schema（包含规则）
      const schema = await this.getFlowSchema(flow);
      if (!schema || schema.rules.length === 0) {
        // 没有规则的 Forced Flow 直接匹配
        return { flow, action: schema?.defaultAction || { type: 'allow' }, matchedRule: null };
      }

      // 验证规则
      const result = FlowValidator.validate(schema, validationContext);
      if (result.passed && result.matchedRule) {
        return { 
          flow, 
          action: result.action,
          matchedRule: result.matchedRule
        };
      }
    }
    return null;
  }

  /**
   * 执行 Regular Flows
   * 根据 flowRotation 决定执行方式：
   * - position: 按顺序检查规则匹配
   * - weight: 按权重随机选择
   */
  private async executeRegularFlows(
    regularFlows: Flow[],
    validationContext: ValidationContext,
    _context: FlowExecutionContext,
    rotation: string
  ): Promise<{ flow: Flow; action: RuleActionConfig; matchedRule: RuleValidationResult | null } | null> {
    if (regularFlows.length === 0) {
      return null;
    }

    if (rotation === 'weight') {
      // Weight 模式：按权重随机选择
      const selectedFlow = this.selectFlowByWeight(regularFlows);
      if (selectedFlow) {
        const schema = await this.getFlowSchema(selectedFlow);
        if (schema && schema.rules.length > 0) {
          const result = FlowValidator.validate(schema, validationContext);
          if (result.passed) {
            return {
            flow: selectedFlow,
            action: result.action,
            matchedRule: result.matchedRule || null
          };
          }
        } else {
          // 没有规则的 Flow 直接匹配
          return { 
            flow: selectedFlow, 
            action: { type: 'allow' },
            matchedRule: null
          };
        }
      }
    } else {
      // Position 模式：按顺序检查规则匹配
      for (const flow of regularFlows) {
        const schema = await this.getFlowSchema(flow);
        if (!schema || schema.rules.length === 0) {
          return { flow, action: { type: 'allow' }, matchedRule: null };
        }

        const result = FlowValidator.validate(schema, validationContext);
        if (result.passed && result.matchedRule) {
          return { 
            flow, 
            action: result.action,
            matchedRule: result.matchedRule || null
          };
        }
      }
    }

    return null;
  }

  /**
   * 按权重随机选择 Flow
   */
  private selectFlowByWeight(flows: Flow[]): Flow | null {
    if (flows.length === 0) return null;
    if (flows.length === 1) return flows[0] || null;

    // 过滤掉权重为 0 的 Flow
    const validFlows = flows.filter(f => f.weight > 0);
    if (validFlows.length === 0) return null;

    const totalWeight = validFlows.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;

    for (const flow of validFlows) {
      random -= flow.weight;
      if (random <= 0) {
        return flow;
      }
    }

    return validFlows[validFlows.length - 1] || null;
  }

  /**
   * 获取访问者绑定
   */
  private async getVisitorBinding(context: FlowExecutionContext): Promise<VisitorBinding | null> {
    if (!this.kv || context.campaign.visitorBinding === 'none') {
      return null;
    }

    const key = `binding:${context.campaign.id}:${context.visitorId}`;
    try {
      const binding = await this.kv.get(key, 'json') as VisitorBinding | null;
      if (binding) {
        // 检查是否过期
        if (new Date(binding.expiresAt) > new Date()) {
          return binding;
        }
      }
    } catch (err) {
      console.error('Failed to get visitor binding:', err);
    }
    return null;
  }

  /**
   * 更新访问者绑定
   */
  private async updateVisitorBinding(context: FlowExecutionContext, flowId: string): Promise<void> {
    if (!this.kv || context.campaign.visitorBinding === 'none') {
      return;
    }

    const ttl = context.campaign.uniquenessTTL || 86400;
    const binding: VisitorBinding = {
      flowId,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };

    const key = `binding:${context.campaign.id}:${context.visitorId}`;
    try {
      await this.kv.put(key, JSON.stringify(binding), { expirationTtl: ttl });
    } catch (err) {
      console.error('Failed to update visitor binding:', err);
    }
  }

  /**
   * 获取 Flow Schema（简化版，实际应从数据库获取）
   */
  private async getFlowSchema(flow: Flow): Promise<FlowSchema | null> {
    // TODO: 从数据库获取 Flow 的完整 Schema
    // 这里返回简化版，只包含 Flow 基本信息
    return {
      flow: {
        id: flow.id,
        campaignId: flow.campaignId,
        name: flow.name,
        type: flow.type,
        weight: flow.weight,
        status: flow.status,
      },
      rules: [], // 实际应从 flowRules 表获取
      defaultAction: { type: 'allow' },
      version: '1.0',
      updatedAt: flow.updatedAt,
    };
  }
}

/**
 * 创建 FlowEngine 实例的工厂函数
 */
export function createFlowEngine(env: Env): FlowEngine {
  return new FlowEngine(env);
}
