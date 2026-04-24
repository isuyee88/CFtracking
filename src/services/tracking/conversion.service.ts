/**
 * @fileoverview 转化追踪服务
 * @description 处理转化追踪的业务逻辑，包括DO实时统计、D1持久化、Postback触发
 * @module services/tracking/conversion.service
 *
 * 主要功能:
 * - 处理单个/批量转化请求
 * - 写入DO实时统计 (原有功能)
 * - 写入D1数据库持久化 (✅ 新增)
 * - 触发Postback发送 (✅ 新增)
 *
 * 输入:
 *   - ConversionRequest (转化请求数据)
 *
 * 输出:
 *   - ConversionResult (含conversionId和success状态)
 *
 * 逻辑交互:
 *   - 被Conversion API Handler调用
 *   - 内部调用:
 *     - DOService (实时统计写入)
 *     - ConversionRepository (D1持久化)
 *     - PostbackService (Postback触发)
 *     - ClickRepository (查询点击详情用于构建Postback上下文)
 */

import { DOService } from '@/handlers/do';
import type { Env } from '@/config/env';
import type { ConversionData } from '@/types/tracking';
import type { PostbackContext } from '@/types/postback';
import { generateConversionId } from '@/utils/crypto';

// 延迟导入以避免循环依赖
let ConversionRepository: typeof import('@/handlers/d1/conversion.repo').ConversionRepository | null = null;
let ClickRepository: typeof import('@/handlers/d1/click.repo').ClickRepository | null = null;
let PostbackService: typeof import('@/services/postback/postback.service').PostbackService | null = null;

/**
 * 动态加载依赖模块
 * @private 内部方法
 */
async function loadDependencies() {
  if (!ConversionRepository) {
    const module = await import('@/handlers/d1/conversion.repo');
    ConversionRepository = module.ConversionRepository;
  }
  if (!ClickRepository) {
    const module = await import('@/handlers/d1/click.repo');
    ClickRepository = module.ClickRepository;
  }
  if (!PostbackService) {
    const module = await import('@/services/postback/postback.service');
    PostbackService = module.PostbackService;
  }
}

/**
 * 转化请求接口
 */
export interface ConversionRequest {
  /** 点击ID (必填) */
  clickId: string;
  /** 活动ID (必填) */
  campaignId: string;
  /** Offer ID (必填) */
  offerId: string;
  /** 收入金额 (必填) */
  revenue: number;
  /** 支出金额/payout (可选) */
  payout?: number;
  /** 货币代码 (默认USD) */
  currency?: string;
  /** 转化类型 (默认sale) */
  conversionType?: string;
  /** Offer名称 (可选) */
  offerName?: string;
}

/**
 * 转化结果接口
 */
export interface ConversionResult {
  /** 转化ID */
  conversionId: string;
  /** 是否成功 */
  success: boolean;
}

/**
 * 转化追踪服务
 * @description 协调转化的完整生命周期：接收→验证→存储→触发Postback
 */
export class ConversionService {
  /** DO服务实例 */
  private doService: DOService;

  /** Workers环境变量 */
  private env: Env;

  constructor(env: Env) {
    this.doService = new DOService(env);
    this.env = env;
  }

  /**
   * 🎯 核心方法: 处理转化请求
   *
   * @param request 转化请求数据
   * @returns Promise<ConversionResult> 转化结果 (含conversionId)
   *
   * @description 完整的转化处理流程:
   * 1. 生成唯一转化ID
   * 2. 写入DO实时统计 (保留原有逻辑)
   * 3. 写入D1数据库持久化 (✅ 新增 - 解决DEF-001)
   * 4. 触发Postback发送 (✅ 新增 - 解决DEF-002)
   * 5. 更新Campaign计数器 (保留原有逻辑)
   * 6. 返回结果
   *
   * @example
   * ```typescript
   * const service = new ConversionService(env);
   * const result = await service.handleConversion({
   *   clickId: 'clk_1234567890123',
   *   campaignId: 'camp-abc',
   *   offerId: 'offer-xyz',
   *   revenue: 10.00,
   *   payout: 5.50,
   * });
   * // result: { conversionId: 'cnv_1677...', success: true }
   * ```
   *
   * PRECONDITIONS:
   * - request.clickId非空且为有效格式
   * - request.campaignId非空
   * - request.offerId非空
   * - request.revenue >= 0
   *
   * POSTCONDITIONS:
   * - 返回唯一的conversionId
   * - DO中已更新统计数据
   * - D1中已保存转化记录 (如果DB可用)
   * - Postback已触发 (如果POSTBACK_KV可用且有配置)
   *
   * SIDE_EFFECTS:
   * - 写入Durable Object存储
   * - 写入D1数据库
   * - 可能发出HTTP Postback请求
   * - 写入KV存储 (幂等性标记)
   */
  async handleConversion(request: ConversionRequest): Promise<ConversionResult> {
    const conversionId = generateConversionId();
    const now = new Date().toISOString();

    console.log(
      `[ConversionService] Processing conversion: ${conversionId} ` +
      `for click: ${request.clickId}, campaign: ${request.campaignId}`
    );

    try {
      // ============================================================
      // 步骤1: 写入DO实时统计 (保留原有逻辑)
      // ============================================================
      await this.doService.trackConversion({
        clickId: request.clickId,
        revenue: request.revenue
      });

      // ============================================================
      // 步骤2: 写入D1持久化 (✅ 新增 - 解决DEF-001)
      // ============================================================
      const conversionData: ConversionData = {
        conversionId,
        clickId: request.clickId,
        campaignId: request.campaignId,
        offerId: request.offerId,
        timestamp: now,
        revenue: request.revenue,
        payout: request.payout ?? 0,
        currency: request.currency ?? 'USD',
        conversionType: request.conversionType ?? 'sale',
        offerName: request.offerName ?? null,
      };

      if (this.env.DB) {
        try {
          await loadDependencies();
          if (ConversionRepository && ClickRepository) {
            const conversionRepo = new ConversionRepository(this.env.DB);
            await conversionRepo.saveConversion(conversionData);
            console.log(`[ConversionService] D1 persistence successful: ${conversionId}`);
          }
        } catch (error) {
          // D1写入失败不影响主流程，只记录错误日志
          console.error(
            `[ConversionService] D1 persistence failed for ${conversionId}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // ============================================================
      // 步骤3: 触发Postback发送 (✅ 新增 - 解决DEF-002)
      // ============================================================
      // 修改: 使用DB作为触发条件 (替代POSTBACK_KV)
      // 因为PostbackService已支持D1幂等性检查，不再依赖KV
      if (this.env.DB) {
        try {
          await loadDependencies();
          if (PostbackService) {
            // 构建Postback上下文 (需从clicks表获取额外信息)
            const context = await this.buildPostbackContext(request, conversionData);

            // 创建PostbackService并触发
            const postbackService = new PostbackService(this.env);
            const postbackResults = await postbackService.onConversion(context);

            if (postbackResults.length > 0) {
              const successCount = postbackResults.filter(r => r.success).length;
              console.log(
                `[ConversionService] Postback triggered: ${successCount}/${postbackResults.length} succeeded`
              );
            }
          }
        } catch (error) {
          // Postback失败不影响主流程，只记录错误日志
          console.error(
            `[ConversionService] Postback trigger failed for ${conversionId}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // ============================================================
      // 步骤4: 更新Campaign计数器 (保留原有逻辑)
      // ============================================================
      await this.doService.incrementCounter(`campaign:${request.campaignId}:today`, {
        conversions: 1,
        revenue: request.revenue,
      });

      console.log(`[ConversionService] Conversion completed successfully: ${conversionId}`);

      return {
        conversionId,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ConversionService] Conversion failed: ${errorMessage}`);

      // 即使出错也返回conversionId (便于排查)
      return {
        conversionId,
        success: false,
      };
    }
  }

  /**
   * 批量处理转化请求
   *
   * @param requests 转化请求数组
   * @returns Promise<ConversionResult[]> 所有转化的结果数组
   *
   * @description 逐个处理每个转化请求，
   * 单个失败不影响其他请求的处理。
   */
  async handleBatchConversions(requests: ConversionRequest[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.handleConversion(request);
        results.push(result);
      } catch (error) {
        console.error('[ConversionService] Batch conversion error:', error);
        results.push({
          conversionId: '',
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * 构建Postback上下文数据
   *
   * @param request 原始转化请求
   * @param conversionData 已保存的转化数据
   * @returns Promise<PostbackContext> 完整的Postback上下文
   *
   * @description 从clicks表查询点击详情以获取：
   * - IP地址、国家、设备等地理位置信息
   * - subId1-subId5 追踪参数
   * - UTM参数
   * - 浏览器、操作系统等设备信息
   *
   * 这些信息对于某些平台的Postback是必需的。
   *
   * @private 内部方法
   */
  private async buildPostbackContext(
    request: ConversionRequest,
    conversionData: ConversionData
  ): Promise<PostbackContext> {
    // 初始化基础上下文 (来自请求和转化数据)
    const context: PostbackContext = {
      conversionId: conversionData.conversionId,
      clickId: request.clickId,
      campaignId: request.campaignId,
      offerId: request.offerId,
      offerName: request.offerName,
      revenue: request.revenue,
      payout: request.payout ?? 0,
      currency: request.currency ?? 'USD',
      conversionType: request.conversionType ?? 'sale',
      status: 'approved', // 默认状态，后续可根据业务规则调整
      timestamp: conversionData.timestamp,
    };

    // 从clicks表查询点击详情 (如果DB可用)
    if (this.env.DB) {
      try {
        await loadDependencies();
        if (ClickRepository) {
          const clickRepo = new ClickRepository(this.env.DB);
          const clickData = await clickRepo.findByClickId(request.clickId);

          if (clickData) {
            // 补充来自ClickData的详细信息
            context.ip = clickData.ip || undefined;
            context.country = clickData.country || undefined;
            context.device = clickData.device || undefined;
            context.browser = clickData.browser || undefined;
            context.os = clickData.os || undefined;
            context.subId1 = clickData.subId1 || undefined;
            context.subId2 = clickData.subId2 || undefined;
            context.subId3 = clickData.subId3 || undefined;
            context.subId4 = clickData.subId4 || undefined;
            context.subId5 = clickData.subId5 || undefined;
            context.utmSource = clickData.utmSource || undefined;
            context.utmMedium = clickData.utmMedium || undefined;
            context.utmCampaign = clickData.utmCampaign || undefined;
            context.cfRayId = clickData.cfRayId || undefined;
          }
        }
      } catch (error) {
        console.warn('[ConversionService] Failed to fetch click data for Postback context:', error);
        // 查询失败不阻塞，使用基础上下文继续
      }
    }

    return context;
  }

  /**
   * 获取转化的点击详情
   *
   * @param _conversionId 转化ID
   * @returns Promise<ConversionData | null> 转化详情或null
   *
   * @deprecated 使用ConversionRepository.findByConversionId替代
   */
  async getConversionClickDetails(_conversionId: string): Promise<ConversionData | null> {
    // TODO: 从D1查询完整转化记录 (包含关联的click信息)
    return null; // 暂未实现
  }
}

/**
 * 创建ConversionService实例的工厂函数
 *
 * @param env Workers环境变量
 * @returns ConversionService实例
 */
export function createConversionService(env: Env): ConversionService {
  return new ConversionService(env);
}
