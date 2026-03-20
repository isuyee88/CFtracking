/**
 * @fileoverview Flow 验证器
 * @description 验证 Flow Schema 和规则匹配逻辑
 * @module services/flow/flow.validator
 * @input FlowSchema, ValidationContext
 * @output FlowValidationResult
 * @logic 递归验证过滤器组和规则，返回匹配结果
 * @frontend 无
 * @backend FlowService, TrackingService 使用
 */

import type {
  FlowSchema,
  FlowRule,
  FlowFilter,
  FilterGroup,
  ValidationContext,
  FlowValidationResult,
  RuleValidationResult,
  FilterValidationResult,
  RuleActionConfig,
} from '@/types/flow.schema';
import { executeFilter, getContextValue } from '@/utils/flow.filters';

/**
 * Flow 验证器类
 */
export class FlowValidator {
  /**
   * 验证 Flow Schema 是否有效
   * @param schema - Flow Schema
   * @returns 是否有效
   */
  static validateSchema(schema: FlowSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 Flow 基本信息
    if (!schema.flow?.id) {
      errors.push('Flow ID is required');
    }
    if (!schema.flow?.campaignId) {
      errors.push('Campaign ID is required');
    }
    if (!schema.flow?.name) {
      errors.push('Flow name is required');
    }

    // 验证规则
    if (!Array.isArray(schema.rules)) {
      errors.push('Rules must be an array');
    } else {
      schema.rules.forEach((rule, index) => {
        const ruleErrors = this.validateRule(rule);
        if (ruleErrors.length > 0) {
          errors.push(`Rule ${index + 1} (${rule.name || 'unnamed'}): ${ruleErrors.join(', ')}`);
        }
      });
    }

    // 验证默认动作
    if (!schema.defaultAction) {
      errors.push('Default action is required');
    } else {
      const actionErrors = this.validateAction(schema.defaultAction);
      if (actionErrors.length > 0) {
        errors.push(`Default action: ${actionErrors.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证单个规则
   * @param rule - Flow 规则
   * @returns 错误列表
   */
  private static validateRule(rule: FlowRule): string[] {
    const errors: string[] = [];

    if (!rule.id) {
      errors.push('Rule ID is required');
    }
    if (!rule.name) {
      errors.push('Rule name is required');
    }
    if (!rule.flowId) {
      errors.push('Flow ID is required');
    }
    if (typeof rule.priority !== 'number') {
      errors.push('Priority must be a number');
    }
    if (!rule.condition) {
      errors.push('Condition is required');
    } else {
      const conditionErrors = this.validateFilterGroup(rule.condition);
      if (conditionErrors.length > 0) {
        errors.push(...conditionErrors);
      }
    }
    if (!rule.action) {
      errors.push('Action is required');
    } else {
      const actionErrors = this.validateAction(rule.action);
      if (actionErrors.length > 0) {
        errors.push(...actionErrors);
      }
    }

    return errors;
  }

  /**
   * 验证过滤器组
   * @param group - 过滤器组
   * @returns 错误列表
   */
  private static validateFilterGroup(group: FilterGroup): string[] {
    const errors: string[] = [];

    if (!group.id) {
      errors.push('Group ID is required');
    }
    if (!group.logic || !['AND', 'OR'].includes(group.logic)) {
      errors.push('Logic must be AND or OR');
    }
    if (!Array.isArray(group.filters)) {
      errors.push('Filters must be an array');
    } else {
      group.filters.forEach((filter, index) => {
        const filterErrors = this.validateFilter(filter);
        if (filterErrors.length > 0) {
          errors.push(`Filter ${index + 1}: ${filterErrors.join(', ')}`);
        }
      });
    }

    // 递归验证子组
    if (group.groups) {
      group.groups.forEach((subGroup, index) => {
        const subGroupErrors = this.validateFilterGroup(subGroup);
        if (subGroupErrors.length > 0) {
          errors.push(`Sub-group ${index + 1}: ${subGroupErrors.join(', ')}`);
        }
      });
    }

    return errors;
  }

  /**
   * 验证单个过滤器
   * @param filter - 过滤器
   * @returns 错误列表
   */
  private static validateFilter(filter: FlowFilter): string[] {
    const errors: string[] = [];

    if (!filter.id) {
      errors.push('Filter ID is required');
    }
    if (!filter.target) {
      errors.push('Target is required');
    }
    if (!filter.operator) {
      errors.push('Operator is required');
    }

    const validOperators = [
      'equals', 'notEquals', 'contains', 'notContains',
      'startsWith', 'endsWith', 'regex', 'in', 'notIn',
      'greaterThan', 'lessThan', 'greaterOrEquals', 'lessOrEquals',
      'between', 'exists', 'notExists',
    ];

    if (filter.operator && !validOperators.includes(filter.operator)) {
      errors.push(`Invalid operator: ${filter.operator}`);
    }

    // 某些操作符不需要值
    const noValueOperators = ['exists', 'notExists'];
    if (!noValueOperators.includes(filter.operator) && filter.value === undefined) {
      errors.push('Value is required for this operator');
    }

    return errors;
  }

  /**
   * 验证动作配置
   * @param action - 动作配置
   * @returns 错误列表
   */
  private static validateAction(action: RuleActionConfig): string[] {
    const errors: string[] = [];

    if (!action.type) {
      errors.push('Action type is required');
    }

    const validTypes = ['allow', 'block', 'redirect', 'showPage', 'showOffer'];
    if (action.type && !validTypes.includes(action.type)) {
      errors.push(`Invalid action type: ${action.type}`);
    }

    // redirect 需要 redirectUrl
    if (action.type === 'redirect' && !action.redirectUrl) {
      errors.push('Redirect URL is required for redirect action');
    }

    // showPage 需要 targetId
    if (action.type === 'showPage' && !action.targetId) {
      errors.push('Target ID is required for showPage action');
    }

    // showOffer 需要 targetId
    if (action.type === 'showOffer' && !action.targetId) {
      errors.push('Target ID is required for showOffer action');
    }

    return errors;
  }

  /**
   * 执行 Flow 验证
   * @param schema - Flow Schema
   * @param context - 验证上下文
   * @returns 验证结果
   */
  static validate(schema: FlowSchema, context: ValidationContext): FlowValidationResult {
    const startTime = Date.now();
    const ruleResults: RuleValidationResult[] = [];

    // 按优先级排序规则（数字越小优先级越高）
    const sortedRules = [...schema.rules]
      .filter(rule => rule.status === 'active')
      .sort((a, b) => a.priority - b.priority);

    // 验证每个规则
    for (const rule of sortedRules) {
      const result = this.validateRuleAgainstContext(rule, context);
      ruleResults.push(result);

      // 如果匹配，立即返回（优先级最高的匹配规则）
      if (result.matched) {
        const durationMs = Date.now() - startTime;
        return {
          passed: true,
          matchedRule: result,
          action: result.action!,
          ruleResults,
          validatedAt: new Date().toISOString(),
          durationMs,
        };
      }
    }

    // 没有规则匹配，使用默认动作
    const durationMs = Date.now() - startTime;
    return {
      passed: true,
      action: schema.defaultAction,
      ruleResults,
      validatedAt: new Date().toISOString(),
      durationMs,
    };
  }

  /**
   * 验证规则是否匹配上下文
   * @param rule - Flow 规则
   * @param context - 验证上下文
   * @returns 规则验证结果
   */
  private static validateRuleAgainstContext(
    rule: FlowRule,
    context: ValidationContext
  ): RuleValidationResult {
    const matchedFilters: FilterValidationResult[] = [];

    // 验证根过滤器组
    const isMatched = this.validateFilterGroupAgainstContext(
      rule.condition,
      context,
      matchedFilters
    );

    return {
      matched: isMatched,
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
      matchedFilters: isMatched ? matchedFilters : undefined,
      priority: rule.priority,
    };
  }

  /**
   * 验证过滤器组是否匹配上下文
   * @param group - 过滤器组
   * @param context - 验证上下文
   * @param matchedFilters - 匹配的过滤器列表（用于收集）
   * @returns 是否匹配
   */
  private static validateFilterGroupAgainstContext(
    group: FilterGroup,
    context: ValidationContext,
    matchedFilters: FilterValidationResult[]
  ): boolean {
    if (!group.enabled) {
      return true; // 禁用的组视为匹配
    }

    const results: boolean[] = [];

    // 验证组内的过滤器
    for (const filter of group.filters) {
      if (!filter.enabled) {
        results.push(true); // 禁用的过滤器视为匹配
        continue;
      }

      const isMatched = this.validateFilterAgainstContext(filter, context);
      results.push(isMatched);

      if (isMatched) {
        matchedFilters.push({
          valid: true,
          matchedFilterId: filter.id,
          matchedValue: getContextValue(filter.target, context),
        });
      }
    }

    // 递归验证子组
    if (group.groups) {
      for (const subGroup of group.groups) {
        const isMatched = this.validateFilterGroupAgainstContext(subGroup, context, matchedFilters);
        results.push(isMatched);
      }
    }

    // 应用逻辑操作符
    if (group.logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * 验证单个过滤器是否匹配上下文
   * @param filter - 过滤器
   * @param context - 验证上下文
   * @returns 是否匹配
   */
  private static validateFilterAgainstContext(
    filter: FlowFilter,
    context: ValidationContext
  ): boolean {
    const contextValue = getContextValue(filter.target, context);
    return executeFilter(filter.operator, contextValue, filter.value, context);
  }

  /**
   * 从请求构建验证上下文
   * @param request - HTTP 请求
   * @param visitData - 访问数据
   * @returns 验证上下文
   */
  static buildContext(
    request: Request,
    visitData: {
      source?: string;
      medium?: string;
      campaign?: string;
      subId?: string;
      clickId?: string;
      referrer?: string;
      visitsCount?: number;
      firstVisit?: boolean;
      returning?: boolean;
    } = {}
  ): ValidationContext {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const cf = (request as Request & { cf?: Record<string, unknown> }).cf;

    // 获取当前时间信息
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const timestamp = now.getTime();

    // 从 CF 获取地理位置信息
    const country = cf?.country as string | undefined;
    const region = cf?.region as string | undefined;
    const city = cf?.city as string | undefined;
    const isp = cf?.asn?.toString();

    // 从请求头获取 IP
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';

    // 从 User Agent 解析设备信息
    const deviceType = this.parseDeviceType(userAgent);
    const os = this.parseOS(userAgent);
    const browser = this.parseBrowser(userAgent);
    const language = request.headers.get('accept-language')?.split(',')[0] || '';

    return {
      visitor: {
        ip,
        country,
        region,
        city,
        isp,
        connection: cf?.httpProtocol as string | undefined,
        deviceType,
        os,
        browser,
        language,
        userAgent,
      },
      visit: {
        referrer: visitData.referrer || request.headers.get('referer') || '',
        source: visitData.source || url.searchParams.get('source') || url.searchParams.get('utm_source') || '',
        medium: visitData.medium || url.searchParams.get('medium') || url.searchParams.get('utm_medium') || '',
        campaign: visitData.campaign || url.searchParams.get('campaign') || url.searchParams.get('utm_campaign') || '',
        subId: visitData.subId || url.searchParams.get('sub_id') || '',
        clickId: visitData.clickId || '',
        timestamp,
        hourOfDay,
        dayOfWeek,
        visitsCount: visitData.visitsCount || 1,
        firstVisit: visitData.firstVisit ?? true,
        returning: visitData.returning ?? false,
      },
    };
  }

  /**
   * 解析设备类型
   */
  private static parseDeviceType(ua: string): string {
    if (/iPhone|Android.*Mobile|Windows Phone/i.test(ua)) {
      return 'mobile';
    }
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * 解析操作系统
   */
  private static parseOS(ua: string): string {
    if (/Windows NT 10/.test(ua)) return 'Windows 10';
    if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6.2/.test(ua)) return 'Windows 8';
    if (/Windows NT 6.1/.test(ua)) return 'Windows 7';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad/.test(ua)) return 'iOS';
    return 'Unknown';
  }

  /**
   * 解析浏览器
   */
  private static parseBrowser(ua: string): string {
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Edge/.test(ua)) return 'Edge';
    if (/Opera|OPR/.test(ua)) return 'Opera';
    if (/MSIE|Trident/.test(ua)) return 'IE';
    return 'Unknown';
  }
}

/**
 * 快速验证函数（静态方法包装）
 */
export function validateFlow(
  schema: FlowSchema,
  context: ValidationContext
): FlowValidationResult {
  return FlowValidator.validate(schema, context);
}

/**
 * 验证 Schema 有效性
 */
export function validateFlowSchema(schema: FlowSchema): { valid: boolean; errors: string[] } {
  return FlowValidator.validateSchema(schema);
}

/**
 * 从请求构建上下文
 */
export function buildValidationContext(
  request: Request,
  visitData?: Parameters<typeof FlowValidator.buildContext>[1]
): ValidationContext {
  return FlowValidator.buildContext(request, visitData);
}
