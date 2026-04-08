/**
 * @fileoverview Postback HTTP发送器
 * @description 负责实际的HTTP请求发送，支持重试机制和并发控制
 * @module services/postback/postback.sender
 *
 * 输入:
 *   - PostbackTask (含解析后的URL、方法、payload等)
 *
 * 输出:
 *   - PostbackResult (含状态码、延迟、错误信息等)
 *
 * 逻辑交互:
 *   - 被PostbackService调用执行实际HTTP请求
 *   - 使用fetch API (Cloudflare Workers标准API)
 *   - 实现指数退避 + 随机抖动重试机制
 *
 * 技术特性:
 *   - 支持GET/POST两种HTTP方法
 *   - 自动重试 (最多3次，指数退避)
 *   - 随机抖动防惊群效应 (thundering herd)
 *   - 请求超时控制 (默认10秒)
 *   - 并发控制 (批量发送时最多5个同时)
 */

import type { PostbackTask, PostbackResult } from '@/types/postback';

/**
 * Postback HTTP发送器
 * @description 负责执行实际的Postback HTTP请求，包含完整的重试机制
 */
export class PostbackSender {
  /** 默认请求超时时间 (毫秒) */
  private static readonly DEFAULT_TIMEOUT_MS = 10000; // 10秒

  /** 重试基数延迟 (毫秒) */
  private static readonly RETRY_BASE_DELAY_MS = 1000; // 1秒

  /** 最大重试延迟 (毫秒) */
  private static readonly RETRY_MAX_DELAY_MS = 30000; // 30秒

  /** 抖动因子 (0-1之间，用于随机化延迟) */
  private static readonly JITTER_FACTOR = 0.5;

  /** 批量发送最大并发数 */
  private static readonly MAX_CONCURRENT_REQUESTS = 5;

  /**
   * 发送单个Postback请求 (含自动重试)
   *
   * @param task Postback任务对象 (必须包含解析后的URL)
   * @returns Promise<PostbackResult> 发送结果
   *
   * @example
   * ```typescript
   * const sender = new PostbackSender();
   * const result = await sender.send({
   *   id: 'task-123',
   *   postbackUrl: 'https://postback.example.com?clickid=clk_123',
   *   method: 'GET',
   *   maxRetries: 3,
   *   retryCount: 0,
   *   ...
   * });
   * ```
   *
   * PRECONDITIONS:
   * - task.postbackUrl非空且为有效URL
   * - task.method为'GET'或'POST'
   * - task.retryCount <= task.maxRetries
   *
   * POSTCONDITIONS:
   * - 返回结果包含success状态
   * - 失败时会尝试重试 (如果未达上限)
   * - 结果包含statusCode或errorMessage
   *
   * SIDE_EFFECTS:
   * - 发出HTTP请求到外部服务器
   * - 可能产生网络I/O
   */
  async send(task: PostbackTask): Promise<PostbackResult> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;
    let currentRetryCount = task.retryCount;

    try {
      // 执行请求 (含重试循环)
      while (currentRetryCount <= task.maxRetries) {
        try {
          const { statusCode } = await this.executeRequest(task);

          // 计算总耗时
          const totalLatencyMs = Date.now() - startTime;

          // 判断是否成功 (2xx状态码视为成功)
          const success = statusCode >= 200 && statusCode < 300;

          return {
            success,
            taskId: task.id,
            platform: task.platform,
            url: task.postbackUrl,
            statusCode,
            latencyMs: totalLatencyMs,
            retryCount: currentRetryCount,
            willRetry: false,
          };
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';

          // 检查是否可以重试
          if (currentRetryCount < task.maxRetries) {
            currentRetryCount++;

            // 计算下次重试时间并等待
            const nextRetryDelay = this.calculateNextRetry(currentRetryCount);
            console.warn(
              `[PostbackSender] Request failed (attempt ${currentRetryCount}/${task.maxRetries}), ` +
              `retrying in ${nextRetryDelay}ms. Error: ${lastError}`
            );

            // 等待重试延迟
            await this.sleep(nextRetryDelay);
          } else {
            // 已达到最大重试次数
            break;
          }
        }
      }

      // 所有重试都失败
      return {
        success: false,
        taskId: task.id,
        platform: task.platform,
        url: task.postbackUrl,
        statusCode: lastStatusCode,
        latencyMs: Date.now() - startTime,
        retryCount: currentRetryCount,
        errorMessage: lastError || 'Max retries exceeded',
        willRetry: false,
      };
    } catch (error) {
      // 未预期的异常
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
      console.error('[PostbackSender] Unexpected error:', errorMessage);

      return {
        success: false,
        taskId: task.id,
        platform: task.platform,
        url: task.postbackUrl,
        latencyMs: Date.now() - startTime,
        retryCount: currentRetryCount,
        errorMessage,
        willRetry: false,
      };
    }
  }

  /**
   * 批量发送Postback (并发控制)
   *
   * @param tasks Postback任务数组
   * @returns Promise<PostbackResult[]> 所有任务的发送结果数组
   *
   * @description 使用分批并发控制，避免同时发出过多请求
   * 默认最多5个请求同时进行
   *
   * @example
   * ```typescript
   * const results = await sender.sendBatch([task1, task2, task3]);
   * ```
   *
   * PRECONDITIONS:
   * - tasks数组非空
   * - 每个task都符合send()方法的 Preconditions
   *
   * POSTCONDITIONS:
   * - 返回结果数组长度与输入tasks长度相同
   * - 结果顺序与输入顺序一致
   *
   * SIDE_EFFECTS:
   * - 并发发出多个HTTP请求
   */
  async sendBatch(tasks: PostbackTask[]): Promise<PostbackResult[]> {
    if (tasks.length === 0) {
      return [];
    }

    const results: PostbackResult[] = new Array(tasks.length);

    // 分批处理以控制并发数
    for (let i = 0; i < tasks.length; i += PostbackSender.MAX_CONCURRENT_REQUESTS) {
      const batch = tasks.slice(i, i + PostbackSender.MAX_CONCURRENT_REQUESTS);

      // 并行执行当前批次的所有请求
      const batchPromises = batch.map(async (task, batchIndex) => {
        const globalIndex = i + batchIndex;
        results[globalIndex] = await this.send(task);
      });

      // 等待当前批次全部完成
      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * 计算下次重试的延迟时间 (指数退避 + 随机抖动)
   *
   * @param retryCount 当前重试次数 (从1开始)
   * @returns 延迟时间 (毫秒)
   *
   * @description 算法:
   * baseDelay = min(RETRY_BASE_DELAY_MS * 2^(retryCount-1), RETRY_MAX_DELAY_MS)
   * jitter = random(0, baseDelay * JITTER_FACTOR)
   * finalDelay = baseDelay + jitter
   *
   * 示例:
   * - 第1次重试: 1000ms + [0, 500ms] = 1000-1500ms
   * - 第2次重试: 2000ms + [0, 1000ms] = 2000-3000ms
   * - 第3次重试: 4000ms + [0, 2000ms] = 4000-6000ms
   *
   * @private 内部方法
   */
  private calculateNextRetry(retryCount: number): number {
    // 指数退避计算基础延迟
    const exponentialDelay = Math.min(
      PostbackSender.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1),
      PostbackSender.RETRY_MAX_DELAY_MS
    );

    // 添加随机抖动 (防止惊群效应)
    const jitter = Math.random() * exponentialDelay * PostbackSender.JITTER_FACTOR;

    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * 执行单次HTTP请求
   *
   * @param task Postback任务对象
   * @returns Promise<{statusCode, body, latencyMs}> 请求结果
   * @throws Error 当请求失败时抛出异常
   *
   * @private 内部方法
   */
  private async executeRequest(
    task: PostbackTask
  ): Promise<{ statusCode: number; body: string; latencyMs: number }> {
    const startTime = Date.now();

    try {
      // 构建fetch选项
      const fetchOptions: RequestInit = {
        method: task.method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CFtracking-Postback/1.0',
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(PostbackSender.DEFAULT_TIMEOUT_MS),
      };

      // POST请求添加body
      if (task.method === 'POST' && task.payload && Object.keys(task.payload).length > 0) {
        const bodyString = Object.entries(task.payload)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        fetchOptions.body = bodyString;
      }

      // 发起HTTP请求
      const response = await fetch(task.postbackUrl, fetchOptions);
      const latencyMs = Date.now() - startTime;

      // 读取响应体
      const responseBody = await response.text();

      // 截断响应体至500字符 (避免日志过大)
      const truncatedBody = responseBody.length > 500
        ? responseBody.substring(0, 500) + '...[truncated]'
        : responseBody;

      return {
        statusCode: response.status,
        body: truncatedBody,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // 区分不同类型的错误
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error(`Request timeout after ${latencyMs}ms`);
      } else if (error instanceof TypeError) {
        // 网络错误、DNS解析失败等
        throw new Error(`Network error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 异步睡眠工具函数
   *
   * @param ms 睡眠时间 (毫秒)
   * @returns Promise<void>
   *
   * @private 内部方法
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
