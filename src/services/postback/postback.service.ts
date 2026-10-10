/**
 * @fileoverview Postback主服务
 * @description 协调Postback全流程: 触发→解析→去重→发送→日志记录
 * @module services/postback/postback.service
 *
 * 输入:
 *   - PostbackContext (转化事件数据，来自ConversionService)
 *
 * 输出:
 *   - PostbackResult[] (每个平台的发送结果数组)
 *
 * 逻辑交互:
 *   - ConversionService调用onConversion()作为入口点
 *   - 内部协调:
 *     - UrlTemplateEngine (URL宏替换)
 *     - HmacService (HMAC签名)
 *     - PostbackSender (HTTP请求执行)
 *     - PlatformAdapters (平台特定逻辑)
 *     - PostbackLogRepository (日志持久化)
 *     - KV存储 (幂等性检查)
 *
 * 核心流程:
 * 1. 接收转化事件 (PostbackContext)
 * 2. 获取Postback配置 (从TrafficSource/AffiliateNetwork)
 * 3. 过滤状态 (只处理sendOnlyStatuses中指定的状态)
 * 4. 构建任务列表 (每个配置一个任务)
 * 5. 幂等性检查 (KV防止重复发送)
 * 6. 执行发送 (通过PostbackSender)
 * 7. 记录日志 (D1持久化)
 * 8. 返回结果
 */

import type { Env } from '@/config/env';
import type {
  PostbackContext,
  PostbackTask,
  PostbackLog,
  PostbackResult,
  PostbackSendConfig,
  PostbackHistoryQuery,
  PostbackPlatformAdapter,
  ConversionStatus,
} from '@/types/postback';
import { UrlTemplateEngine } from './url-template.engine';
import { PostbackSender } from './postback.sender';
import { PostbackLogRepository } from '@/handlers/d1/postback.repo';
import { PostbackIdempotencyRepository } from '@/handlers/d1/postback-idempotency.repo';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { generateUUID } from '@/utils/crypto';
import type { ConversionData } from '@/types/tracking';

type ConversionDataWithStatus = ConversionData & { status?: string };

/**
 * Postback主服务
 * @description 核心协调器，管理完整的Postback生命周期
 */
export class PostbackService {
  /** URL模板引擎 */
  private urlEngine: UrlTemplateEngine;

  /** HTTP发送器 */
  private sender: PostbackSender;

  /** 环境变量 */
  private env: Env;

  /** 平台适配器注册表 */
  private adapters: Map<string, PostbackPlatformAdapter> = new Map();

  /** D1幂等性数据仓库 (替代KV存储) */
  private idempotencyRepo: PostbackIdempotencyRepository | null = null;

  /**
   * 构造函数
   *
   * @param env Workers环境变量
   *
   * @description 初始化PostbackService的所有依赖:
   * - URL模板引擎
   * - HTTP发送器
   * - 幂等性数据仓库 (D1，替代KV)
   * - 默认平台适配器
   */
  constructor(env: Env) {
    this.env = env;
    this.urlEngine = new UrlTemplateEngine();
    this.sender = new PostbackSender();

    // 初始化D1幂等性仓库 (如果DB可用)
    if (env.DB) {
      this.idempotencyRepo = new PostbackIdempotencyRepository(env.DB);
    }

    // 注册默认的平台适配器 (后续可通过registerAdapter动态添加)
    this.registerDefaultAdapters();
  }

  /**
   * 🎯 核心方法: 处理转化事件，触发Postback发送
   *
   * @param context 转化上下文数据 (包含转化信息+点击详情)
   * @returns Promise<PostbackResult[]> 每个平台的发送结果数组
   *
   * @description 这是ConversionService调用的入口点，
   * 完整的Postback流程在此方法内协调完成。
   *
   * @example
   * ```typescript
   * const postbackService = new PostbackService(env);
   * const results = await postbackService.onConversion({
   *   conversionId: 'cnv_123',
   *   clickId: 'clk_456',
   *   campaignId: 'camp-789',
   *   offerId: 'offer-abc',
   *   revenue: 10.00,
   *   payout: 5.50,
   *   status: 'approved',
   *   timestamp: new Date().toISOString(),
   * });
   * // results: [{ success: true, platform: 'taboola', ... }, ...]
   * ```
   *
   * PRECONDITIONS:
   * - context.conversionId非空
   * - context.clickId非空
   * - context.campaignId非空
   * - env.POSTBACK_KV已绑定 (可选，未绑定时跳过幂等检查)
   * - env.DB已绑定 (可选，未绑定时跳过日志记录)
   *
   * POSTCONDITIONS:
   * - 返回所有平台的发送结果
   * - 成功的Postback已标记到KV (防重复)
   * - 所有Postback已记录到D1日志
   *
   * SIDE_EFFECTS:
   * - 发出HTTP POST/GET请求到外部服务器
   * - 写入KV存储 (幂等性标记)
   * - 写入D1数据库 (日志记录)
   */
  async onConversion(context: PostbackContext): Promise<PostbackResult[]> {
    const startTime = Date.now();
    console.log(`[PostbackService] Processing conversion: ${context.conversionId}`);

    try {
      // 步骤1: 获取Postback配置列表
      const configs = await this.getPostbackConfigs(context.campaignId, context.offerId);

      if (configs.length === 0) {
        console.log('[PostbackService] No postback configs found for this campaign/offer');
        return [];
      }

      // 步骤2: 过滤状态 (只处理允许的状态)
      const filteredConfigs = configs.filter(config =>
        config.sendOnlyStatuses.includes(context.status)
      );

      if (filteredConfigs.length === 0) {
        console.log(
          `[PostbackService] Conversion status "${context.status}" not in sendOnlyStatuses, skipping`
        );
        return [];
      }

      // 步骤3: 构建Postback任务列表
      const tasks = await this.buildTasks(context, filteredConfigs);

      if (tasks.length === 0) {
        console.log('[PostbackService] No tasks to send after filtering');
        return [];
      }

      // 步骤4: 幂等性检查 + 执行发送
      const results: PostbackResult[] = [];

      for (const task of tasks) {
        try {
          // 检查是否已发送过 (幂等性)
          const alreadySent = await this.checkIdempotency(context.conversionId, task.platform);
          if (alreadySent) {
            console.log(
              `[PostbackService] Already sent for ${context.conversionId}/${task.platform}, skipping`
            );
            results.push({
              success: true,
              taskId: task.id,
              platform: task.platform,
              url: task.postbackUrl,
              statusCode: 200, // 视为成功 (已发送过)
              latencyMs: 0,
              retryCount: 0,
              errorMessage: 'Already sent (idempotent)',
              willRetry: false,
            });
            continue;
          }

          // 执行发送前先抢占 delivery lease；并发请求只能有一个进入外部网络。
          const claimed = await this.claimDelivery(context.conversionId, task.platform);
          if (!claimed) {
            results.push({
              success: false,
              taskId: task.id,
              platform: task.platform,
              url: task.postbackUrl,
              statusCode: 409,
              latencyMs: 0,
              retryCount: 0,
              errorMessage: 'Delivery is already in-flight or dead-lettered',
              willRetry: true,
            });
            continue;
          }

          // 执行发送
          const result = await this.sender.send(task);
          if (result.success) {
            await this.markSent(context.conversionId, task.platform, result.statusCode, task.id);
          } else {
            await this.recordFailedDelivery(task, result);
          }
          results.push(result);

          // 记录日志
          await this.logPostback(this.buildLogFromResult(task, result));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[PostbackService] Error processing task ${task.id}:`,
            errorMessage
          );

          const failedResult: PostbackResult = {
            success: false,
            taskId: task.id,
            platform: task.platform,
            url: task.postbackUrl,
            latencyMs: Date.now() - startTime,
            retryCount: 0,
            errorMessage,
            willRetry: false,
          };
          try {
            await this.recordFailedDelivery(task, failedResult);
          } catch (deliveryStateError) {
            console.error(
              '[PostbackService] Failed to persist delivery failure state:',
              deliveryStateError instanceof Error ? deliveryStateError.message : deliveryStateError,
            );
          }
          results.push(failedResult);

          // 记录失败的日志
          await this.logPostback(this.buildErrorLog(task, errorMessage));
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log(
        `[PostbackService] Completed in ${totalDuration}ms. ` +
        `Sent: ${results.filter(r => r.success).length}/${results.length}`
      );

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PostbackService] onConversion error:', errorMessage);

      // 返回空结果而不是抛出异常 (保证不影响主流程)
      return [];
    }
  }

  /**
   * 从TrafficSource/AffiliateNetwork获取Postback配置
   *
   * @param campaignId 活动ID
   * @param offerId Offer ID
   * @returns PostbackSendConfig数组
   *
   * @description 从数据库查询真实的Postback配置:
   * 1. 先从TrafficSource表查询该campaignId关联的postback配置
   * 2. 再从AffiliateNetwork表查询该offerId关联的postback配置
   * 3. 合并去重后返回
   *
   * 这是Postback能否正常发送的关键方法！
   * 原实现返回空数组导致Postback永远不会真正发送。
   */
  private async getPostbackConfigs(
    campaignId: string,
    offerId: string
  ): Promise<PostbackSendConfig[]> {
    try {
      const configs: PostbackSendConfig[] = [];

      // ============================================================
      // 策略1: 从TrafficSource获取配置 (基于campaignId)
      // ============================================================
      const trafficSourceConfigs = await this.getConfigsFromTrafficSource(campaignId);
      configs.push(...trafficSourceConfigs);

      // ============================================================
      // 策略2: 从AffiliateNetwork获取配置 (基于offerId)
      // ============================================================
      const affiliateNetworkConfigs = await this.getConfigsFromAffiliateNetwork(offerId);
      configs.push(...affiliateNetworkConfigs);

      if (configs.length > 0) {
        console.log(
          `[PostbackService] Found ${configs.length} postback config(s) for campaign=${campaignId}, offer=${offerId}`
        );
        return configs;
      }

      console.log(
        `[PostbackService] No postback configs found for campaign=${campaignId}, offer=${offerId}`
      );
      return [];
    } catch (error) {
      console.error('[PostbackService] getPostbackConfigs error:', error);
      return []; // 出错时返回空数组，避免阻塞主流程
    }
  }

  /**
   * 从TrafficSource表查询Postback配置
   *
   * @param campaignId 活动ID
   * @returns PostbackSendConfig数组
   *
   * @private 内部方法
   *
   * @description 走正向关系链 campaigns.trafficSource → trafficSources.id
   * （与 click.repo JOIN 口径一致），并按 name 兜底匹配历史数据。
   * 旧实现用 findBy('campaign_id') 反查 trafficSources——该表根本没有
   * campaign_id 列，D1 必然抛 no such column 导致出站回传静默失效。
   */
  private async getConfigsFromTrafficSource(campaignId: string): Promise<PostbackSendConfig[]> {
    if (!this.env.DB) {
      return [];
    }

    try {
      // 第一步：从 campaign 拿到关联的流量源标识（存的是 trafficSources.id）
      const campaignRow = await this.env.DB
        .prepare('SELECT trafficSource FROM campaigns WHERE id = ?')
        .bind(campaignId)
        .first<{ trafficSource: string | null }>();

      const tsKey = campaignRow?.trafficSource?.trim();
      if (!tsKey) {
        return [];
      }

      // 第二步：按 ID 优先、name 兜底定位流量源（历史数据可能存名字而非 ID）
      const tsRow = await this.env.DB
        .prepare('SELECT * FROM trafficSources WHERE id = ? OR name = ? LIMIT 1')
        .bind(tsKey, tsKey)
        .first<Record<string, unknown>>();

      if (!tsRow) {
        return [];
      }

      // 过滤出有postback_url配置的记录并转换为PostbackSendConfig
      const ts = tsRow as any;
      const configs: PostbackSendConfig[] = [ts]
        .filter((ts) => ts.postbackUrl || ts.postback_url)
        .map((ts: any) => ({
          enabled: ts.postbackEnabled ?? ts.postback_enabled ?? true,
          urlTemplate: ts.postbackUrl || ts.postback_url || '',
          method: (ts.postbackMethod || ts.postback_method || 'GET').toUpperCase() as 'GET' | 'POST',
          sendOnlyStatuses: this.parseStatuses(ts.sendOnlyStatuses || ts.send_only_statuses || 'approved,pending'),
          hmacSecret: ts.hmacSecret || ts.hmac_secret || undefined,
          timeoutMs: ts.timeoutMs || ts.timeout_ms || 10000,
          maxRetries: ts.maxRetries || ts.max_retries || 3,
          platform: ts.platform || this.extractPlatformFromUrl(ts.postbackUrl || ts.postback_url || ''),
        }))
        .filter((config: PostbackSendConfig) => config.urlTemplate && config.enabled);

      return configs;
    } catch (error) {
      console.error('[PostbackService] getConfigsFromTrafficSource error:', error);
      return [];
    }
  }

  /**
   * 从AffiliateNetwork表查询Postback配置
   *
   * @param offerId Offer ID
   * @returns PostbackSendConfig数组
   *
   * @private 内部方法
   *
   * @description 走正向关系链 offers.network → affiliateNetworks（id 优先，
   * name 兜底）。旧实现用 findBy('offer_id') 反查 affiliateNetworks——
   * 该表没有 offer_id 列，D1 必然抛 no such column 导致配置永远为空。
   */
  private async getConfigsFromAffiliateNetwork(offerId: string): Promise<PostbackSendConfig[]> {
    if (!this.env.DB) {
      return [];
    }

    try {
      // 第一步：从 offer 拿到关联的联盟平台标识
      const offerRow = await this.env.DB
        .prepare('SELECT network FROM offers WHERE id = ?')
        .bind(offerId)
        .first<{ network: string | null }>();

      const anKey = offerRow?.network?.trim();
      if (!anKey) {
        return [];
      }

      // 第二步：按 ID 优先、name 兜底定位联盟网络
      const anRow = await this.env.DB
        .prepare('SELECT * FROM affiliateNetworks WHERE id = ? OR name = ? LIMIT 1')
        .bind(anKey, anKey)
        .first<Record<string, unknown>>();

      if (!anRow) {
        return [];
      }

      // 过滤出有postback_url配置的记录并转换为PostbackSendConfig
      const an = anRow as any;
      const configs: PostbackSendConfig[] = [an]
        .filter((an) => an.postbackUrl || an.postback_url)
        .map((an: any) => ({
          enabled: an.postbackEnabled ?? an.postback_enabled ?? true,
          urlTemplate: an.postbackUrl || an.postback_url || '',
          method: (an.postbackMethod || an.postback_method || 'GET').toUpperCase() as 'GET' | 'POST',
          sendOnlyStatuses: this.parseStatuses(an.sendOnlyStatuses || an.send_only_statuses || 'approved,pending'),
          hmacSecret: an.hmacSecret || an.hmac_secret || undefined,
          timeoutMs: an.timeoutMs || an.timeout_ms || 10000,
          maxRetries: an.maxRetries || an.max_retries || 3,
          platform: an.platform || an.name || this.extractPlatformFromUrl(an.postbackUrl || an.postback_url || ''),
        }))
        .filter((config: PostbackSendConfig) => config.urlTemplate && config.enabled);

      return configs;
    } catch (error) {
      console.error('[PostbackService] getConfigsFromAffiliateNetwork error:', error);
      return [];
    }
  }

  /**
   * 解析状态字符串为ConversionStatus数组
   *
   * @param statusesStr 逗号分隔的状态字符串 (如 "approved,pending")
   * @returns ConversionStatus数组 (过滤掉无效值)
   *
   * @private 内部方法
   */
  private parseStatuses(statusesStr: string): ConversionStatus[] {
    const validStatuses: ConversionStatus[] = ['approved', 'pending', 'rejected'];
    return statusesStr
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is ConversionStatus => validStatuses.includes(s as ConversionStatus));
  }

  /**
   * 从URL中提取平台名称
   *
   * @param url Postback URL
   * @returns 平台名称 (如 "taboola", "facebook")
   *
   * @private 内部方法
   *
   * @description 通过URL域名匹配已知平台列表，
   * 如果无法匹配则返回 "generic"。
   */
  private extractPlatformFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const platformMap: Record<string, string> = {
        'taboola.com': 'taboola',
        'facebook.com': 'facebook',
        'fb.com': 'facebook',
        'revcontent.com': 'revcontent',
        'outbrain.com': 'outbrain',
        'rumble.com': 'rumble',
      };

      for (const [domain, platform] of Object.entries(platformMap)) {
        if (hostname.includes(domain)) {
          return platform;
        }
      }

      // 未命中已知平台时回退为端点主机名而非固定 'generic'：
      // 幂等键 (conversionId, platform) 依赖 platform 区分不同回传端点，
      // 一律 'generic' 会让多个自定义端点互相顶掉（第二条被静默跳过）。
      return hostname;
    } catch {
      return 'generic';
    }
  }

  /**
   * 构建Postback任务列表
   *
   * @param context 转化上下文数据
   * @param configs Postback配置列表
   * @returns PostbackTask数组
   *
   * @description 为每个配置构建一个任务对象，
   * 使用对应的平台适配器进行URL和payload构建。
   */
  private async buildTasks(
    context: PostbackContext,
    configs: PostbackSendConfig[]
  ): Promise<PostbackTask[]> {
    const now = new Date().toISOString();
    const tasks: PostbackTask[] = [];

    for (const config of configs) {
      try {
        // 按配置的 platform 名查找专属适配器；未注册的自定义端点回退 generic 构建器。
        // 旧实现误用 config.urlTemplate 作为查找键，任何配置都命中不了专属适配器，
        // 导致 task.platform 恒为 'generic'（幂等撞键的根因之一）。
        const adapter = this.adapters.get(config.platform);

        // 如果没有找到特定适配器，使用Generic适配器
        const platformAdapter = adapter || this.adapters.get('generic');

        if (!platformAdapter) {
          console.warn(`[PostbackService] No adapter found for config, skipping`);
          continue;
        }

        // 使用适配器构建URL
        let postbackUrl: string;
        let payload: Record<string, string> | undefined;

        if (typeof platformAdapter.buildUrl === 'function') {
          postbackUrl = await platformAdapter.buildUrl(context, config);
        } else {
          // 回退到通用URL构建
          postbackUrl = this.urlEngine.buildBaseUrl(config, context);
        }

        // 如果是POST方法且适配器支持buildPayload
        if (config.method === 'POST' && typeof platformAdapter.buildPayload === 'function') {
          payload = platformAdapter.buildPayload(context, config);
        }

        // 创建任务对象
        // platform 取 config.platform 优先：幂等键 (conversionId, platform) 需要
        // 端点维度——若统一用适配器名（generic），TS 与 AN 两条配置会互相顶掉，
        // 第二条被幂等拦截静默跳过。
        const task: PostbackTask = {
          id: generateUUID(),
          conversionId: context.conversionId,
          clickId: context.clickId,
          campaignId: context.campaignId,
          offerId: context.offerId,
          platform: config.platform || platformAdapter.platformName,
          postbackUrl,
          rawUrlTemplate: config.urlTemplate,
          payload,
          method: config.method,
          status: 'pending',
          retryCount: 0,
          maxRetries: config.maxRetries || 3,
          createdAt: now,
          updatedAt: now,
        };

        tasks.push(task);
      } catch (error) {
        console.error(
          `[PostbackService] Error building task for config:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return tasks;
  }

  /**
   * 幂等性检查 (D1数据库，防止重复发送)
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   * @returns 是否已发送过
   *
   * @description 使用D1数据库检查该转化是否已向指定平台发送过Postback。
   * 替代原有的KV存储方案，避免免费账户KV写入限制(1000次/天)。
   *
   * PRECONDITIONS:
   * - conversionId非空字符串
   * - platform非空字符串
   *
   * POSTCONDITIONS:
   * - 返回该转化+平台组合是否已存在记录
   * - 出错时返回false (允许发送，宁可重复也不能丢失)
   */
  private async checkIdempotency(conversionId: string, platform: string): Promise<boolean> {
    // 优先使用D1实现
    if (this.idempotencyRepo) {
      try {
        return await this.idempotencyRepo.isSent(conversionId, platform);
      } catch (error) {
        console.error('[PostbackService] D1 idempotency check error:', error);
        // D1失败时回退到允许发送
        return false;
      }
    }

    // 回退到KV存储 (向后兼容)
    if (!this.env.POSTBACK_KV) {
      // 未绑定KV时，跳过幂等性检查 (允许重复发送)
      console.warn('[PostbackService] No idempotency store available, skipping check');
      return false;
    }

    try {
      const kvKey = `pb:${conversionId}:${platform}`;
      const value = await this.env.POSTBACK_KV.get(kvKey);
      return value !== null;
    } catch (error) {
      console.error('[PostbackService] KV idempotency check error:', error);
      return false; // 出错时允许发送 (宁可重复也不能丢失)
    }
  }

  private async claimDelivery(conversionId: string, platform: string): Promise<boolean> {
    if (!this.idempotencyRepo) return true;

    await this.idempotencyRepo.markAsPending(conversionId, platform);
    return this.idempotencyRepo.markAsSending(conversionId, platform);
  }

  private async recordFailedDelivery(
    task: PostbackTask,
    result: PostbackResult,
  ): Promise<void> {
    if (!this.idempotencyRepo) return;

    const errorMessage = result.errorMessage || `HTTP ${result.statusCode ?? 'unknown'}`;
    if (result.retryCount >= task.maxRetries) {
        await this.idempotencyRepo.markDeadLetter(
        task.conversionId,
        task.platform,
        errorMessage,
        result.statusCode,
        task.id,
      );
      result.willRetry = false;
      return;
    }

    await this.idempotencyRepo.markAsRetry(
      task.conversionId,
      task.platform,
      errorMessage,
      result.retryCount + 1,
      undefined,
      result.statusCode,
      task.id,
    );
    result.willRetry = true;
  }

  /**
   * 标记已发送 (幂等性写入)
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   *
   * @description 在成功发送后写入D1数据库，设置唯一约束防止重复。
   * 替代原有的KV存储方案。
   */
  private async markSent(
    conversionId: string,
    platform: string,
    statusCode?: number,
    requestId?: string,
  ): Promise<void> {
    // 优先使用D1实现
    if (this.idempotencyRepo) {
      try {
        await this.idempotencyRepo.markAsSent(conversionId, platform, statusCode, requestId);
        return;
      } catch (error) {
        console.error('[PostbackService] D1 markSent error:', error);
        // D1失败时回退到KV
      }
    }

    // 回退到KV存储 (向后兼容)
    if (!this.env.POSTBACK_KV) {
      return; // 未绑定KV时跳过
    }

    try {
      const kvKey = `pb:${conversionId}:${platform}`;
      // 设置TTL为30天 (30 * 24 * 60 * 60 = 2592000秒)
      await this.env.POSTBACK_KV.put(kvKey, 'sent', { expirationTtl: 2592000 });
    } catch (error) {
      console.error('[PostbackService] KV markSent error:', error);
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 记录Postback日志到D1
   *
   * @param log Postback日志对象
   *
   * @description 将Postback发送结果持久化到D1数据库，
   * 用于历史查询、统计分析和问题排查。
   */
  private async logPostback(log: PostbackLog): Promise<void> {
    if (!this.env.DB) {
      // 未绑定DB时跳过日志记录
      return;
    }

    try {
      const repo = new PostbackLogRepository(this.env.DB);
      await repo.saveLog(log);
    } catch (error) {
      console.error('[PostbackService] logPostback error:', error);
      // 不抛出异常，避免影响主流程
    }
  }

  async retryDuePostbacks(limit = 100): Promise<{
    inspected: number;
    claimed: number;
    sent: number;
    retried: number;
    deadLettered: number;
    skipped: number;
  }> {
    const summary = { inspected: 0, claimed: 0, sent: 0, retried: 0, deadLettered: 0, skipped: 0 };
    if (!this.idempotencyRepo) return summary;

    const dueRetries = await this.idempotencyRepo.listDueRetries(limit);
    summary.inspected = dueRetries.length;

    for (const row of dueRetries) {
      const conversionId = String(row.conversion_id ?? row.conversionId ?? '');
      const platform = String(row.platform ?? '');
      const attemptCount = Number(row.attempt_count ?? row.attemptCount ?? 0);
      if (!conversionId || !platform) {
        summary.skipped++;
        continue;
      }

      const claimed = await this.idempotencyRepo.markAsSending(conversionId, platform);
      if (!claimed) {
        summary.skipped++;
        continue;
      }
      summary.claimed++;

      const context = await this.getConversionForRetry(conversionId);
      if (!context) {
        await this.idempotencyRepo.markDeadLetter(
          conversionId,
          platform,
          'Conversion could not be rebuilt for due postback retry',
          undefined,
          undefined,
        );
        summary.deadLettered++;
        continue;
      }

      try {
        const configs = (await this.getPostbackConfigs(context.campaignId, context.offerId))
          .filter((config) => config.platform === platform);
        const tasks = await this.buildTasks(context, configs);
        const task = tasks[0];
        if (!task) {
          await this.idempotencyRepo.markDeadLetter(
            conversionId,
            platform,
            'Postback configuration could not be rebuilt for due retry',
            undefined,
            undefined,
          );
          summary.deadLettered++;
          continue;
        }

        task.retryCount = attemptCount;
        const result = await this.sender.send(task);
        if (result.success) {
          await this.markSent(conversionId, platform, result.statusCode, task.id);
          summary.sent++;
        } else {
          await this.recordFailedDelivery(task, result);
          if (result.willRetry) summary.retried++;
          else summary.deadLettered++;
        }
        await this.logPostback(this.buildLogFromResult(task, result));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.idempotencyRepo.markAsRetry(
          conversionId,
          platform,
          message,
          attemptCount + 1,
          undefined,
          undefined,
          undefined,
        );
        summary.retried++;
      }
    }

    return summary;
  }

  private async getConversionForRetry(conversionId: string): Promise<PostbackContext | null> {
    if (!this.env.DB) return null;
    const conversion = await new ConversionRepository(this.env.DB).findByConversionId(conversionId);
    if (!conversion) return null;
    return {
      conversionId: conversion.conversionId,
      clickId: conversion.clickId,
      campaignId: conversion.campaignId,
      offerId: conversion.offerId,
      revenue: conversion.revenue,
      payout: conversion.payout,
      currency: conversion.currency,
      conversionType: conversion.conversionType,
      status: ((conversion as ConversionDataWithStatus).status as ConversionStatus) || 'approved',
      timestamp: conversion.timestamp,
      offerName: conversion.offerName ?? undefined,
    };
  }

  /**
   * 手动重发失败的Postback
   *
   * @param conversionId 可选的转化ID筛选
   * @param platform 可选的平台筛选
   * @returns 重发结果数组
   *
   * @description 用于管理员手动触发重试，
   * 或定时任务自动重试失败的Postback。
   */
  async retryFailedPostbacks(
    conversionId?: string,
    platform?: string,
  ): Promise<PostbackResult[]> {
    if (!this.env.DB || !this.idempotencyRepo) return [];

    const retryRecord = conversionId && platform
      ? await this.idempotencyRepo.findRetry(conversionId, platform)
      : null;
    const dueRetries = retryRecord
      ? [retryRecord]
      : await this.idempotencyRepo.listDueRetries(100);
    const candidates = dueRetries.filter((row) =>
      (!conversionId || String(row.conversion_id) === conversionId)
      && (!platform || String(row.platform) === platform),
    );
    const results: PostbackResult[] = [];

    for (const row of candidates) {
      const currentConversionId = String(row.conversion_id ?? '');
      const currentPlatform = String(row.platform ?? '');
      const attemptCount = Number(row.attempt_count ?? 0);
      if (!currentConversionId || !currentPlatform) continue;

      const claimed = await this.idempotencyRepo.markAsSending(currentConversionId, currentPlatform);
      if (!claimed) continue;

      const context = await this.getConversionForRetry(currentConversionId);
      if (!context) {
        await this.idempotencyRepo.markDeadLetter(
          currentConversionId,
          currentPlatform,
          'Conversion could not be rebuilt for manual postback retry',
        );
        continue;
      }

      try {
        const configs = (await this.getPostbackConfigs(context.campaignId, context.offerId))
          .filter((config) => config.platform === currentPlatform);
        const task = (await this.buildTasks(context, configs))[0];
        if (!task) {
          await this.idempotencyRepo.markDeadLetter(
            currentConversionId,
            currentPlatform,
            'Postback configuration could not be rebuilt for manual retry',
          );
          continue;
        }

        task.retryCount = attemptCount;
        const result = await this.sender.send(task);
        if (result.success) {
          await this.markSent(currentConversionId, currentPlatform, result.statusCode, task.id);
        } else {
          await this.recordFailedDelivery(task, result);
        }
        await this.logPostback(this.buildLogFromResult(task, result));
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.idempotencyRepo.markAsRetry(
          currentConversionId,
          currentPlatform,
          message,
          attemptCount + 1,
        );
        results.push({
          success: false,
          taskId: '',
          platform: currentPlatform,
          url: '',
          latencyMs: 0,
          retryCount: attemptCount + 1,
          errorMessage: message,
          willRetry: true,
        });
      }
    }

    return results;
  }

  /**
   * 查询Postback发送历史
   *
   * @param params 查询参数
   * @returns 分页的Postback日志列表
   *
   * @description 提供Postback历史的查询接口，
   * 支持分页、多维度筛选。
   */
  async getPostbackHistory(params: PostbackHistoryQuery): Promise<{
    logs: PostbackLog[];
    total: number;
  }> {
    if (!this.env.DB) {
      return { logs: [], total: 0 };
    }

    try {
      const repo = new PostbackLogRepository(this.env.DB);
      const {
        page = 1,
        pageSize = 20,
        ...filterParams
      } = params;

      const offset = (page - 1) * pageSize;
      return repo.findLogs({
        ...filterParams,
        limit: pageSize,
        offset,
      });
    } catch (error) {
      console.error('[PostbackService] getPostbackHistory error:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * 注册平台适配器
   *
   * @param adapter 平台适配器实例
   *
   * @description 动态注册新的平台适配器，
   * 支持运行时扩展支持的平台列表。
   */
  registerAdapter(adapter: PostbackPlatformAdapter): void {
    this.adapters.set(adapter.platformName, adapter);
    console.log(`[PostbackService] Registered adapter: ${adapter.platformName}`);
  }

  /**
   * 注册默认的平台适配器
   *
   * @private 内部方法
   *
   * @description 在构造函数中调用，注册所有内置的适配器。
   */
  private registerDefaultAdapters(): void {
    // 动态导入并注册适配器 (避免循环依赖)
    import('@/services/postback/adapters').then(({ getPlatformAdapter }) => {
      const platforms = ['generic', 'taboola', 'facebook', 'revcontent', 'outbrain', 'rumble', 'oddbytes'];
      for (const platform of platforms) {
        const adapter = getPlatformAdapter(platform);
        this.registerAdapter(adapter);
      }
    }).catch(error => {
      console.error('[PostbackService] Failed to load default adapters:', error);
    });
  }

  /**
   * 从结果构建日志对象
   *
   * @param task 原始任务
   * @param result 发送结果
   * @returns PostbackLog对象
   *
   * @private 内部方法
   */
  private buildLogFromResult(task: PostbackTask, result: PostbackResult): PostbackLog {
    return {
      id: generateUUID(),
      taskId: task.id,
      conversionId: task.conversionId,
      clickId: task.clickId,
      campaignId: task.campaignId,
      platform: task.platform,
      url: this.sanitizeUrl(task.postbackUrl), // 脱敏处理
      method: task.method,
      statusCode: result.statusCode || 0,
      responseBody: undefined, // 可选，暂不记录响应体
      latencyMs: result.latencyMs,
      success: result.success,
      errorMessage: result.errorMessage,
      retryCount: result.retryCount,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 构建错误日志对象
   *
   * @param task 原始任务
   * @param errorMessage 错误消息
   * @returns PostbackLog对象
   *
   * @private 内部方法
   */
  private buildErrorLog(task: PostbackTask, errorMessage: string): PostbackLog {
    return {
      id: generateUUID(),
      taskId: task.id,
      conversionId: task.conversionId,
      clickId: task.clickId,
      campaignId: task.campaignId,
      platform: task.platform,
      url: this.sanitizeUrl(task.postbackUrl),
      method: task.method,
      statusCode: 0,
      latencyMs: 0,
      success: false,
      errorMessage,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * URL脱敏处理 (隐藏敏感信息)
   *
   * @param url 原始URL
   * @returns 脱敏后的URL
   *
   * @description 隐藏token、secret、api_key等敏感参数值，
   * 只保留参数名用于调试。
   *
   * @private 内部方法
   */
  private sanitizeUrl(url: string): string {
    try {
      const sensitiveParams = ['token', 'secret', 'api_key', 'access_token', 'signature', 'key'];
      let sanitizedUrl = url;

      for (const param of sensitiveParams) {
        const regex = new RegExp(`(${param}=)[^&]*`, 'gi');
        sanitizedUrl = sanitizedUrl.replace(regex, '$1***');
      }

      return sanitizedUrl;
    } catch {
      return url; // 出错时返回原始URL
    }
  }
}

/**
 * 创建PostbackService实例的工厂函数
 *
 * @param env Workers环境变量
 * @returns PostbackService实例
 */
export function createPostbackService(env: Env): PostbackService {
  return new PostbackService(env);
}
