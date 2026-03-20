/**
 * @fileoverview Flow Schema 类型定义
 * @description 定义 Flow 规则、过滤器和条件的完整类型系统
 * @module types/flow.schema
 * @input 无
 * @output Flow Schema 相关类型定义
 * @logic 定义过滤器、条件、规则的结构和类型约束
 * @frontend 无
 * @backend FlowService, FlowValidator 使用
 */

// ==================== 基础类型 ====================

/** 过滤器操作符类型 */
export type FilterOperator =
  | 'equals'           // 等于
  | 'notEquals'        // 不等于
  | 'contains'         // 包含
  | 'notContains'      // 不包含
  | 'startsWith'       // 以...开头
  | 'endsWith'         // 以...结尾
  | 'regex'            // 正则匹配
  | 'in'               // 在列表中
  | 'notIn'            // 不在列表中
  | 'greaterThan'      // 大于
  | 'lessThan'         // 小于
  | 'greaterOrEquals'  // 大于等于
  | 'lessOrEquals'     // 小于等于
  | 'between'          // 在范围内
  | 'exists'           // 存在
  | 'notExists';       // 不存在

/** 逻辑操作符类型 */
export type LogicalOperator = 'AND' | 'OR';

/** 过滤器目标类型 - 指定要过滤的数据来源 */
export type FilterTarget =
  | 'visitor.ip'           // 访问者 IP
  | 'visitor.country'      // 访问者国家
  | 'visitor.region'       // 访问者地区
  | 'visitor.city'         // 访问者城市
  | 'visitor.isp'          // 访问者 ISP
  | 'visitor.connection'   // 连接类型
  | 'visitor.deviceType'   // 设备类型
  | 'visitor.os'           // 操作系统
  | 'visitor.browser'      // 浏览器
  | 'visitor.language'     // 语言
  | 'visitor.userAgent'    // User Agent
  | 'visit.referrer'       // 来源页面
  | 'visit.source'         // 流量来源
  | 'visit.medium'         // 流量媒介
  | 'visit.campaign'       // 广告系列
  | 'visit.subId'          // Sub ID
  | 'visit.clickId'        // Click ID
  | 'visit.timestamp'      // 访问时间
  | 'visit.hourOfDay'      // 访问小时
  | 'visit.dayOfWeek'      // 访问星期
  | 'visit.landingPage'    // 落地页
  | 'visit.offer'          // Offer
  | 'visit.conversion'     // 是否转化
  | 'visit.revenue'        // 收益
  | 'visit.visitsCount'    // 访问次数
  | 'visit.firstVisit'     // 是否首次访问
  | 'visit.returning';     // 是否回访

// ==================== 过滤器定义 ====================

/** 单个过滤器定义 */
export interface FlowFilter {
  /** 过滤器唯一标识 */
  id: string;
  /** 过滤器名称（用于展示） */
  name?: string;
  /** 目标字段 */
  target: FilterTarget;
  /** 操作符 */
  operator: FilterOperator;
  /** 比较值 */
  value?: string | string[] | number | number[] | boolean | null;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/** 过滤器组（条件组合） */
export interface FilterGroup {
  /** 组唯一标识 */
  id: string;
  /** 组名称 */
  name?: string;
  /** 逻辑操作符 */
  logic: LogicalOperator;
  /** 过滤器列表 */
  filters: FlowFilter[];
  /** 嵌套子组 */
  groups?: FilterGroup[];
  /** 是否启用 */
  enabled: boolean;
}

// ==================== 规则定义 ====================

/** 规则动作类型 */
export type RuleAction =
  | 'allow'      // 允许通过
  | 'block'      // 阻止
  | 'redirect'   // 重定向
  | 'showPage'   // 显示指定页面
  | 'showOffer'; // 显示指定 Offer

/** 规则动作配置 */
export interface RuleActionConfig {
  /** 动作类型 */
  type: RuleAction;
  /** 目标 ID（如页面 ID、Offer ID） */
  targetId?: string;
  /** 重定向 URL */
  redirectUrl?: string;
  /** 阻止原因 */
  blockReason?: string;
  /** 权重（用于多个匹配时的选择） */
  weight?: number;
}

/** Flow 规则定义 */
export interface FlowRule {
  /** 规则唯一标识 */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 所属 Flow ID */
  flowId: string;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 根过滤器组 */
  condition: FilterGroup;
  /** 匹配后的动作 */
  action: RuleActionConfig;
  /** 规则状态 */
  status: 'active' | 'paused' | 'deleted';
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ==================== Flow Schema ====================

/** Flow 完整 Schema（包含规则） */
export interface FlowSchema {
  /** Flow 基本信息 */
  flow: {
    id: string;
    campaignId: string;
    name: string;
    type: 'regular' | 'forced' | 'default';
    weight: number;
    status: 'active' | 'paused' | 'deleted';
  };
  /** 规则列表（按优先级排序） */
  rules: FlowRule[];
  /** 默认动作（无规则匹配时） */
  defaultAction: RuleActionConfig;
  /** Schema 版本 */
  version: string;
  /** 最后更新时间 */
  updatedAt: string;
}

// ==================== DTO 类型 ====================

/** 创建过滤器 DTO */
export interface CreateFlowFilterDTO {
  target: FilterTarget;
  operator: FilterOperator;
  value?: string | string[] | number | number[] | boolean | null;
  name?: string;
}

/** 更新过滤器 DTO */
export interface UpdateFlowFilterDTO {
  target?: FilterTarget;
  operator?: FilterOperator;
  value?: string | string[] | number | number[] | boolean | null;
  name?: string;
  enabled?: boolean;
}

/** 创建过滤器组 DTO */
export interface CreateFilterGroupDTO {
  name?: string;
  logic: LogicalOperator;
  filters: CreateFlowFilterDTO[];
  groups?: CreateFilterGroupDTO[];
}

/** 创建规则 DTO */
export interface CreateFlowRuleDTO {
  name: string;
  description?: string;
  flowId: string;
  priority?: number;
  condition: CreateFilterGroupDTO;
  action: RuleActionConfig;
}

/** 更新规则 DTO */
export interface UpdateFlowRuleDTO {
  name?: string;
  description?: string;
  priority?: number;
  condition?: CreateFilterGroupDTO;
  action?: RuleActionConfig;
  status?: 'active' | 'paused' | 'deleted';
}

// ==================== 验证结果类型 ====================

/** 过滤器验证结果 */
export interface FilterValidationResult {
  /** 是否通过 */
  valid: boolean;
  /** 匹配的过滤器 ID */
  matchedFilterId?: string;
  /** 匹配的值 */
  matchedValue?: unknown;
  /** 失败原因 */
  reason?: string;
}

/** 规则验证结果 */
export interface RuleValidationResult {
  /** 是否匹配 */
  matched: boolean;
  /** 匹配的规则 ID */
  ruleId?: string;
  /** 规则名称 */
  ruleName?: string;
  /** 执行的动作 */
  action?: RuleActionConfig;
  /** 匹配的过滤器详情 */
  matchedFilters?: FilterValidationResult[];
  /** 优先级 */
  priority?: number;
}

/** Flow 验证结果 */
export interface FlowValidationResult {
  /** 是否通过验证 */
  passed: boolean;
  /** 匹配的规则 */
  matchedRule?: RuleValidationResult;
  /** 执行的动作 */
  action: RuleActionConfig;
  /** 所有规则验证结果 */
  ruleResults: RuleValidationResult[];
  /** 验证时间 */
  validatedAt: string;
  /** 验证耗时（毫秒） */
  durationMs: number;
}

// ==================== 上下文数据类型 ====================

/** 访问者信息 */
export interface VisitorContext {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  connection?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  language?: string;
  userAgent: string;
}

/** 访问信息 */
export interface VisitContext {
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  subId?: string;
  clickId?: string;
  timestamp: number;
  hourOfDay: number;
  dayOfWeek: number;
  landingPage?: string;
  offer?: string;
  conversion?: boolean;
  revenue?: number;
  visitsCount: number;
  firstVisit: boolean;
  returning: boolean;
}

/** 验证上下文（传入验证器的数据） */
export interface ValidationContext {
  visitor: VisitorContext;
  visit: VisitContext;
}
