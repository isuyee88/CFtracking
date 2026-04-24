/**
 * @fileoverview 多归因服务核心实现
 * @description 提供5种归因算法的完整实现，支持Last-Click/First-Click/Linear/Position-Based/Time-Decay
 * @module services/attribution/attribution.service
 *
 * 主要功能:
 * - 接收转化事件，查询用户触点旅程
 * - 根据配置的归因模型计算各触点权重
 * - 分配收入和支出到各个触点
 * - 返回完整的归因结果供存储和分析
 *
 * 输入:
 *   - conversionId (转化ID)
 *   - model? (归因模型, 可选, 默认使用配置)
 *
 * 输出:
 *   - AttributionResult (包含所有触点的权重分配)
 *
 * 逻辑交互:
 *   - 被ConversionService或Inbound Postback路由调用
 *   - 内部调用ClickRepository查询clicks表获取触点数据
 *   - 结果写入conversions表或attribution_results表 (由调用方决定)
 *
 * 前后端交互:
 *   - 纯服务端逻辑，无前端直接交互
 *   - 通过D1数据库读取点击历史数据
 *
 * 算法实现:
 * 1. Last-Click: 最后一个触点获得100%权重
 * 2. First-Click: 第一个触点获得100%权重
 * 3. Linear: 所有触点平均分配 (1/n)
 * 4. Position-Based: 首尾40%，中间20%均分
 * 5. Time-Decay: 指数衰减，越近权重越高
 */

import type { D1Database } from '@/handlers/d1';
import type {
  AttributionModel,
  AttributionResult,
  AttributionTouch,
  AttributionConfig,
} from '@/types/attribution';
import { DEFAULT_ATTRIBUTION_CONFIG } from '@/types/attribution';

// ============================================================
// 类型定义
// ============================================================

/**
 * 触点原始数据 (从clicks表查询)
 * @description 归因计算的输入数据，表示用户旅程中的一个点击。
 */
interface TouchPointRaw {
  clickId: string;
  campaignId: string;
  flowId?: string | null;
  offerId?: string | null;
  timestamp: string;
}

// ============================================================
// 主服务类
// ============================================================

/**
 * 多归因服务
 * @description 核心归因引擎，支持5种主流归因算法，
 * 提供灵活的配置选项以适应不同业务场景。
 */
export class AttributionService {
  /** D1数据库实例 */
  private db: D1Database;

  /** 归因配置 */
  private config: AttributionConfig;

  /**
   * 构造函数
   *
   * @param db D1数据库实例 (用于查询clicks表)
   * @param config 归因配置 (可选, 使用默认值)
   *
   * @example
   * ```typescript
   * const service = new AttributionService(env.DB, {
   *   defaultModel: 'position_based',
   *   lookbackDays: 30,
   * });
   * ```
   */
  constructor(db: D1Database, config?: Partial<AttributionConfig>) {
    this.db = db;
    this.config = {
      ...DEFAULT_ATTRIBUTION_CONFIG,
      ...config,
    };
  }

  // ============================================================
  // 🎯 核心公开方法
  // ============================================================

  /**
   * 执行归因计算 (主入口方法)
   *
   * @param conversionId 转化ID
   * @param model 归因模型 (可选, 默认使用config.defaultModel)
   * @returns Promise<AttributionResult> 完整的归因结果
   *
   * @description 完整的归因处理流程:
   * 1. 从conversions表查询转化详情 (获取visitorId、revenue、payout等)
   * 2. 查询该visitor在回溯窗口内的所有点击记录作为触点
   * 3. 根据选择的模型计算每个触点的权重
   * 4. 将revenue和payout按权重分配到各触点
   * 5. 返回完整的AttributionResult
   *
   * @example
   * ```typescript
   * const service = new AttributionService(env.DB);
   * const result = await service.attributeConversion('cnv_123', 'linear');
   * console.log(result.touches); // [{ clickId, weight, attributedRevenue }, ...]
   * ```
   *
   * PRECONDITIONS:
   * - conversionId非空且存在于conversions表
   * - 该转化有关联的visitorId
   * - clicks表中有对应的点击记录
   *
   * POSTCONDITIONS:
   * - 返回完整的归因结果
   * - 所有触点的weight总和=1.0
   * - 所有触点的attributedRevenue总和=totalRevenue
   * - 所有触点的attributedPayout总和=totalPayout
   *
   * SIDE_EFFECTS:
   * - 无副作用 (只读操作)
   */
  async attributeConversion(
    conversionId: string,
    model?: AttributionModel
  ): Promise<AttributionResult> {
    const selectedModel = model || this.config.defaultModel;
    const now = new Date().toISOString();

    console.log(
      `[AttributionService] Starting attribution for ${conversionId}, model=${selectedModel}`
    );

    // 步骤1: 查询转化详情
    const conversionData = await this.queryConversion(conversionId);
    if (!conversionData) {
      throw new Error(`Conversion not found: ${conversionId}`);
    }

    // 步骤2: 查询触点旅程
    const touchPoints = await this.getTouchPoints(
      conversionData.visitorId,
      conversionData.timestamp,
      this.config.lookbackDays
    );

    if (touchPoints.length === 0) {
      console.warn(`[AttributionService] No touch points found for ${conversionId}`);
      return this.buildEmptyResult(conversionId, selectedModel);
    }

    // 步骤3: 根据模型计算权重
    let weights: number[];
    switch (selectedModel) {
      case 'last_click':
        weights = this.lastClick(touchPoints.length);
        break;
      case 'first_click':
        weights = this.firstClick(touchPoints.length);
        break;
      case 'linear':
        weights = this.linear(touchPoints.length);
        break;
      case 'position_based':
        weights = this.positionBased(touchPoints.length);
        break;
      case 'time_decay':
        weights = this.timeDecay(touchPoints, conversionData.timestamp);
        break;
      default:
        throw new Error(`Unsupported attribution model: ${selectedModel}`);
    }

    // 步骤4: 归一化权重 (确保总和=1)
    weights = this.normalizeWeights(weights);

    // 步骤5: 构建归因结果 (分配revenue和payout)
    const touches: AttributionTouch[] = touchPoints.map((tp, index) => {
      const weight = weights[index] ?? 0;
      return {
        clickId: tp.clickId,
        campaignId: tp.campaignId,
        flowId: tp.flowId ?? undefined,
        offerId: tp.offerId ?? undefined,
        timestamp: tp.timestamp,
        attributedRevenue: Math.round(conversionData.revenue * weight * 100) / 100,
        attributedPayout: Math.round(conversionData.payout * weight * 100) / 100,
        weight,
        position: index + 1,
      };
    });

    const result: AttributionResult = {
      conversionId,
      model: selectedModel,
      touches,
      totalRevenue: conversionData.revenue,
      totalPayout: conversionData.payout,
      calculatedAt: now,
    };

    console.log(
      `[AttributionService] Attribution completed: ${conversionId}, ` +
      `model=${selectedModel}, touches=${touches.length}`
    );

    return result;
  }

  // ============================================================
  // 私有方法: 数据查询
  // ============================================================

  /**
   * 查询转化详情
   *
   * @param conversionId 转化ID
   * @returns Promise<转化数据或null>
   *
   * @private 内部方法
   */
  private async queryConversion(conversionId: string): Promise<{
    visitorId: string;
    timestamp: string;
    revenue: number;
    payout: number;
  } | null> {
    try {
      const row = await this.db
        .prepare(
          `SELECT visitor_id, timestamp, revenue, payout
           FROM conversions
           WHERE conversion_id = ?`
        )
        .bind(conversionId)
        .first();

      if (!row) return null;

      return {
        visitorId: row.visitor_id as string,
        timestamp: row.timestamp as string,
        revenue: Number(row.revenue) || 0,
        payout: Number(row.payout) || 0,
      };
    } catch (error) {
      console.error('[AttributionService] queryConversion error:', error);
      return null;
    }
  }

  /**
   * 获取用户的触点旅程 (所有相关点击)
   *
   * @param visitorId 访客ID
   * @param conversionTimestamp 转化时间戳
   * @param lookbackDays 回溯窗口天数
   * @returns Promise<TouchPointRaw[]> 触点数组 (按时间升序)
   *
   * @description 从clicks表查询指定访客在回溯窗口内的所有点击记录，
   * 这些点击构成用户的"触点旅程"，用于归因分析。
   *
   * @private 内部方法
   */
  private async getTouchPoints(
    visitorId: string,
    conversionTimestamp: string,
    lookbackDays: number
  ): Promise<TouchPointRaw[]> {
    try {
      // 计算回溯起始时间
      const lookbackStart = new Date(
        new Date(conversionTimestamp).getTime() - lookbackDays * 86400000
      ).toISOString();

      // 查询该访客的所有点击 (在回溯窗口内且在转化之前)
      const rows = await this.db
        .prepare(
          `SELECT click_id, campaign_id, flow_id, offer_id, timestamp
           FROM clicks
           WHERE visitor_id = ?
             AND timestamp >= ?
             AND timestamp <= ?
           ORDER BY timestamp ASC`
        )
        .bind(visitorId, lookbackStart, conversionTimestamp)
        .all();

      if (!rows.results || rows.results.length === 0) {
        return [];
      }

      return (rows.results as Array<Record<string, unknown>>).map((row) => ({
        clickId: row.click_id as string,
        campaignId: row.campaign_id as string,
        flowId: row.flow_id as string | null | undefined,
        offerId: row.offer_id as string | null | undefined,
        timestamp: row.timestamp as string,
      }));
    } catch (error) {
      console.error('[AttributionService] getTouchPoints error:', error);
      return [];
    }
  }

  // ============================================================
  // 私有方法: 归因算法实现
  // ============================================================

  /**
   * Last-Click归因算法
   * @description 最后一个触点获得100%权重，其余为0
   *
   * @param count 触点数量
   * @returns 权重数组
   *
   * @example
   * lastClick(3) → [0, 0, 1]
   * lastClick(5) → [0, 0, 0, 0, 1]
   *
   * @private 内部方法
   */
  private lastClick(count: number): number[] {
    const weights = new Array(count).fill(0);
    weights[count - 1] = 1; // 最后一个触点获得全部权重
    return weights;
  }

  /**
   * First-Click归因算法
   * @description 第一个触点获得100%权重，其余为0
   *
   * @param count 触点数量
   * @returns 权重数组
   *
   * @example
   * firstClick(3) → [1, 0, 0]
   * firstClick(5) → [1, 0, 0, 0, 0]
   *
   * @private 内部方法
   */
  private firstClick(count: number): number[] {
    const weights = new Array(count).fill(0);
    weights[0] = 1; // 第一个触点获得全部权重
    return weights;
  }

  /**
   * Linear归因算法 (线性/均匀)
   * @description 所有触点平均分配权重
   *
   * @param count 触点数量
   * @returns 权重数组 (每个元素=1/count)
   *
   * @example
   * linear(3) → [0.333, 0.333, 0.333]
   * linear(5) → [0.2, 0.2, 0.2, 0.2, 0.2]
   *
   * @private 内部方法
   */
  private linear(count: number): number[] {
    const weight = 1 / count;
    return new Array(count).fill(weight);
  }

  /**
   * Position-Based归因算法 (U型/位置加权)
   * @description 首尾触点获得较高权重 (默认40%)，中间触点均分剩余权重 (20%)
   *
   * @param count 触点数量
   * @returns 权重数组
   *
   * @example
   * positionBased(3) → [0.4, 0.2, 0.4]
   * positionBased(5) → [0.4, 0.1, 0.0, 0.1, 0.4]
   * positionBased(4) → [0.4, 0.1, 0.1, 0.4]
   *
   * @private 内部方法
   */
  private positionBased(count: number): number[] {
    const positionWeights = this.config.positionWeights || [0.4, 0.2, 0.4];
    const [firstWeight, , lastWeight] = positionWeights;

    if (count === 1) {
      return [1]; // 单个触点获得100%
    }

    if (count === 2) {
      // 两个触点: 首尾平分
      return [0.5, 0.5];
    }

    const weights = new Array(count).fill(0);

    // 首位权重
    weights[0] = firstWeight;

    // 末位权重
    weights[count - 1] = lastWeight;

    // 中间权重 (均分剩余部分)
    const middleCount = count - 2; // 减去首尾
    if (middleCount > 0) {
      const middleTotal = 1 - firstWeight - lastWeight;
      const eachMiddle = middleCount === 1 ? middleTotal : middleTotal / middleCount;

      for (let i = 1; i < count - 1; i++) {
        weights[i] = eachMiddle;
      }
    }

    return weights;
  }

  /**
   * Time Decay归因算法 (时间衰减)
   * @description 使用指数衰减函数，越接近转化时间的触点权重越高
   *
   * 公式: weight = exp(-ln(2) / halfLifeHours * timeDiffHours)
   * 其中 timeDiffHours = (conversionTime - touchTime) / (1000 * 60 * 60)
   *
   * @param touchPoints 触点数组 (需要timestamp计算时间差)
   * @param conversionTimestamp 转化时间戳
   * @returns 权重数组 (未归一化)
   *
   * @example
   * 假设半衰期7天, 3个触点分别在转化前1天、5天、10天:
   * timeDecay(...) → [0.9, 0.6, 0.3] (近似值)
   *
   * @private 内部方法
   */
  private timeDecay(
    touchPoints: TouchPointRaw[],
    conversionTimestamp: string
  ): number[] {
    const halfLifeHours = this.config.decayHalfLifeHours || 168; // 默认7天
    const conversionTime = new Date(conversionTimestamp).getTime();
    const decayConstant = Math.LN2 / halfLifeHours; // ln(2)/halfLife

    return touchPoints.map((tp) => {
      const touchTime = new Date(tp.timestamp).getTime();
      const timeDiffHours = (conversionTime - touchTime) / (1000 * 60 * 60);

      // 指数衰减公式
      const weight = Math.exp(-decayConstant * timeDiffHours);

      // 防止数值下溢 (极小值设为0)
      return weight < 1e-10 ? 0 : weight;
    });
  }

  // ============================================================
  // 私有方法: 辅助工具
  // ============================================================

  /**
   * 归一化权重数组
   * @description 使所有权重的总和等于1.0
   *
   * @param weights 原始权重数组
   * @returns 归一化后的权重数组
   *
   * @example
   * normalizeWeights([2, 3, 5]) → [0.2, 0.3, 0.5]
   * normalizeWeights([0.9, 0.6, 0.3]) → [0.5, 0.33, 0.17] (近似)
   *
   * @private 内部方法
   */
  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((acc, w) => acc + w, 0);

    if (sum === 0) {
      // 所有权重都为0时，平均分配
      const avg = 1 / weights.length;
      return new Array(weights.length).fill(avg);
    }

    return weights.map((w) => w / sum);
  }

  /**
   * 构建空归因结果 (无触点时使用)
   *
   * @param conversionId 转化ID
   * @param model 使用的模型
   * @returns 空的归因结果
   *
   * @private 内部方法
   */
  private buildEmptyResult(
    conversionId: string,
    model: AttributionModel
  ): AttributionResult {
    return {
      conversionId,
      model,
      touches: [],
      totalRevenue: 0,
      totalPayout: 0,
      calculatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建AttributionService实例的工厂函数
 *
 * @param db D1数据库实例
 * @param config 归因配置 (可选)
 * @returns AttributionService实例
 *
 * @example
 * ```typescript
 * const service = createAttributionService(env.DB, {
 *   defaultModel: 'time_decay',
 *   decayHalfLifeHours: 72, // 3天半衰期
 * });
 * ```
 */
export function createAttributionService(
  db: D1Database,
  config?: Partial<AttributionConfig>
): AttributionService {
  return new AttributionService(db, config);
}
