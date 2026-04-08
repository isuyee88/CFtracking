/**
 * @fileoverview 归因模型类型定义
 * @description 定义多归因系统的所有核心类型接口和枚举
 * @module types/attribution
 *
 * 主要类型:
 * - AttributionModel: 归因模型联合类型 (5种算法)
 * - AttributionResult: 归因结果 (包含所有触点的分配)
 * - AttributionTouch: 单个触点信息 (含权重和位置)
 * - AttributionConfig: 归因配置 (默认模型、回溯窗口等)
 *
 * 使用场景:
 * - AttributionService 进行归因计算时使用
 * - 转化记录存储归因结果到D1
 * - 前端展示归因分析报告
 *
 * 算法说明:
 * - last_click: 最后点击获得100%功劳 (传统模式)
 * - first_click: 首次点击获得100%功劳
 * - linear: 所有触点平均分配功劳
 * - position_based: 首尾40%，中间20%均分
 * - time_decay: 指数衰减，越近的触点权重越高
 */

// ============================================================
// 归因模型枚举
// ============================================================

/**
 * 支持的归因模型类型
 * @description 定义5种主流归因算法:
 *
 * | 模型 | 说明 | 适用场景 |
 * |------|------|----------|
 * | last_click | 最后点击100% | 传统CPA/CPS广告 |
 * | first_click | 首次点击100% | 品牌认知类广告 |
 * | linear | 平均分配 | 公平评估全渠道 |
 * | position_based | 首尾重中间轻 | 漏斗两端重要场景 |
 * | time_decay | 时间衰减 | 考虑转化周期的场景 |
 */
export type AttributionModel =
  | 'last_click'
  | 'first_click'
  | 'linear'
  | 'position_based'
  | 'time_decay';

// ============================================================
// 归因结果接口
// ============================================================

/**
 * 单个归因触点
 * @description 表示用户旅程中的一个交互触点，
 * 包含该触点获得的归因权重和分配的收入/支出。
 */
export interface AttributionTouch {
  /** 点击ID */
  clickId: string;
  /** 关联的活动ID */
  campaignId: string;
  /** 关联的流量ID (可选) */
  flowId?: string | null;
  /** 关联的Offer ID (可选) */
  offerId?: string | null;
  /** 触点发生时间 (ISO格式) */
  timestamp: string;
  /** 该触点分配到的收入金额 */
  attributedRevenue: number;
  /** 该触点分配到的支出/payout金额 */
  attributedPayout: number;
  /** 归因权重 (0-1, 所有触点总和=1) */
  weight: number;
  /** 在触点序列中的位置 (从1开始) */
  position: number;
}

/**
 * 归因计算结果
 * @description 包含一次转化的完整归因分析结果，
 * 记录使用的模型、所有触点及其分配情况。
 */
export interface AttributionResult {
  /** 转化ID */
  conversionId: string;
  /** 使用的归因模型 */
  model: AttributionModel;
  /** 所有参与归因的触点数组 */
  touches: AttributionTouch[];
  /** 总收入 (所有触点attributedRevenue之和) */
  totalRevenue: number;
  /** 总支出 (所有触点attributedPayout之和) */
  totalPayout: number;
  /** 归因计算时间 (ISO格式) */
  calculatedAt: string;
}

// ============================================================
// 归因配置接口
// ============================================================

/**
 * 归因系统配置
 * @description 定义归因计算的默认参数和行为配置。
 */
export interface AttributionConfig {
  /** 默认归因模型 (默认last_click) */
  defaultModel: AttributionModel;
  /** 回溯窗口天数 (默认30天，只考虑此时间范围内的触点) */
  lookbackDays: number;
  /**
   * Position-Based模型的权重配置
   * @description 默认首尾各40%，中间20%
   * 格式: [首位权重, 中间权重, 末位权重]
   * 示例: [0.4, 0.2, 0.4] 表示首尾各40%，中间均分剩余20%
   */
  positionWeights?: [number, number, number];
  /**
   * Time Decay模型的半衰期 (小时)
   * @description 权权衰减到一半所需的时间
   * 默认168小时 (7天)，值越小衰减越快
   */
  decayHalfLifeHours?: number;
}

// ============================================================
// 默认配置常量
// ============================================================

/**
 * 默认归因配置
 * @description 提供合理的默认值供系统初始化使用。
 */
export const DEFAULT_ATTRIBUTION_CONFIG: AttributionConfig = {
  defaultModel: 'last_click',
  lookbackDays: 30,
  positionWeights: [0.4, 0.2, 0.4],
  decayHalfLifeHours: 168, // 7天半衰期
};

// ============================================================
// 平台参数映射类型
// ============================================================

/**
 * Inbound Postback平台参数映射
 * @description 不同平台的Postback参数名称不同，
 * 此类型定义统一的参数提取规则。
 */
export interface PlatformParamMapping {
  /** clickid参数名 */
  clickIdParam: string;
  /** payout/revenue参数名 */
  payoutParam: string;
  /** status/action_type参数名 */
  statusParam: string;
}

/**
 * 各平台参数映射表
 * @description 预定义的主流平台参数名映射关系。
 */
export const PLATFORM_PARAM_MAPS: Record<string, PlatformParamMapping> = {
  propellerads: {
    clickIdParam: 'clickid',
    payoutParam: 'payout',
    statusParam: 'status',
  },
  taboola: {
    clickIdParam: 'click-id',
    payoutParam: 'revenue',
    statusParam: 'action_type',
  },
  facebook: {
    clickIdParam: 'event_id',
    payoutParam: 'value',
    statusParam: 'event_name',
  },
  generic: {
    clickIdParam: 'clickid',
    payoutParam: 'payout',
    statusParam: 'status',
  },
};
