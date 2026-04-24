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
import { generateUUID } from '@/utils/crypto';

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

          // 执行发送
          const result = await this.sender.send(task);
          results.push(result);

          // 标记为已发送 (无论成功失败都标记，避免重复尝试)
          await this.markSent(context.conversionId, task.platform);

          // 记录日志
          await this.logPostback(this.buildLogFromResult(task, result));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[PostbackService] Error processing task ${task.id}:`,
            errorMessage
          );

          results.push({
            success: false,
            taskId: task.id,
            platform: task.platform,
            url: task.postbackUrl,
            latencyMs: Date.now() - startTime,
            retryCount: 0,
            errorMessage,
            willRetry: false,
          });

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
   * @description 查询traffic_sources表中与该campaignId关联的记录，
   * 提取postback_url、postback_method等字段构建配置对象。
   */
  private async getConfigsFromTrafficSource(campaignId: string): Promise<PostbackSendConfig[]> {
    if (!this.env.DB) {
      return [];
    }

    try {
      // 动态导入避免循环依赖
      const { TrafficSourceRepository } = await import('@/handlers/d1/trafficSource.repo');
      const repo = new TrafficSourceRepository(this.env.DB);

      // 查询使用该campaignId的所有流量源
      const trafficSources = await repo.findBy('campaign_id', campaignId);

      // 过滤出有postback_url配置的记录并转换为PostbackSendConfig
      const configs: PostbackSendConfig[] = trafficSources
        .filter((ts: any) => ts.postbackUrl || ts.postback_url)
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
   * @description 查询affiliate_networks表中与该offerId关联的记录，
   * 提取postback相关字段构建配置对象。
   */
  private async getConfigsFromAffiliateNetwork(offerId: string): Promise<PostbackSendConfig[]> {
    if (!this.env.DB) {
      return [];
    }

    try {
      // 动态导入避免循环依赖
      const { AffiliateNetworkRepository } = await import('@/handlers/d1/affiliateNetwork.repo');
      const repo = new AffiliateNetworkRepository(this.env.DB);

      // 查询使用该offerId的所有联盟网络
      const networks = await repo.findBy('offer_id', offerId);

      // 过滤出有postback_url配置的记录并转换为PostbackSendConfig
      const configs: PostbackSendConfig[] = networks
        .filter((an: any) => an.postbackUrl || an.postback_url)
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

      return 'generic';
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
        // 获取对应的平台适配器
        const adapter = this.adapters.get(config.urlTemplate); // TODO: 需要从config获取platform标识

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
        const task: PostbackTask = {
          id: generateUUID(),
          conversionId: context.conversionId,
          clickId: context.clickId,
          campaignId: context.campaignId,
          offerId: context.offerId,
          platform: platformAdapter.platformName,
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

  /**
   * 标记已发送 (写入D1防止重复)
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   *
   * @description 在成功发送后写入D1数据库，设置唯一约束防止重复。
   * 替代原有的KV存储方案。
   */
  private async markSent(conversionId: string, platform: string): Promise<void> {
    // 优先使用D1实现
    if (this.idempotencyRepo) {
      try {
        await this.idempotencyRepo.markAsSent(conversionId, platform);
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
    platform?: string
  ): Promise<PostbackResult[]> {
    console.log(
      `[PostbackService] Retrying failed postbacks` +
      `${conversionId ? ` for conversion: ${conversionId}` : ''}` +
      `${platform ? ` for platform: ${platform}` : ''}`
    );

    // TODO: 实现重试逻辑
    // 1. 从D1查询失败的日志
    // 2. 重新构建任务
    // 3. 执行发送
    // 4. 更新日志状态

    return [];
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
