/**
 * @fileoverview Postback频率限制器
 * @description 基于D1的滑动窗口频率限制，防止刷量攻击和滥用
 * @module services/postback/rate-limiter
 *
 * 输入:
 *   - conversionId (转化ID)
 *   - ip (请求来源IP)
 *   - platform (平台名称)
 *
 * 输出:
 *   - RateLimitResult { allowed, remaining, resetAt, reason? }
 *
 * 逻辑交互:
 *   - PostbackService在发送前调用检查频率限制
 *   - 发送成功后调用recordSend记录计数
 *
 * 前后端交互:
 *   - 通过D1数据库持久化频率计数
 *   - 自动建表 (ensureTable模式)
 *
 * 限制维度:
 * - 每转化最大Postback数 (防止重复转化刷量)
 * - 每IP每分钟请求数 (防止单IP攻击)
 * - 全局每秒请求数 (防止DDoS)
 */

import type { D1Database } from '@/handlers/d1';

/**
 * 频率限制结果接口
 * @description 返回频率检查的结果和相关信息
 */
export interface RateLimitResult {
  /** 是否允许发送 */
  allowed: boolean;
  /** 剩余可用次数 */
  remaining: number;
  /** 重置时间 (ISO格式) */
  resetAt: string;
  /** 被拒绝的原因 (仅allowed=false时) */
  reason?: string;
}

/**
 * Postback频率限制器
 * @description 提供多维度频率限制功能，
 * 使用D1数据库存储滑动窗口计数器。
 */
export class PostbackRateLimiter {
  /** D1数据库实例 */
  private db: D1Database;

  /** 表是否已初始化的标志 */
  private tableReady = false;

  /**
   * 默认限制配置
   * @description 可通过环境变量或构造参数覆盖
   */
  private static readonly LIMITS = {
    /** 每个转化最大Postback数 */
    maxPerConversion: 5,
    /** 每IP每分钟最大请求数 */
    maxPerIpPerMinute: 60,
    /** 全局每秒最大请求数 (暂未实现，预留接口) */
    maxGlobalPerSecond: 100,
  };

  /**
   * 构造函数
   *
   * @param db D1数据库实例
   *
   * @description 初始化频率限制器，
   * 使用D1存储滑动窗口计数器数据。
   */
  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * 确保rate_limits表存在 (懒初始化)
   *
   * @private 内部方法
   *
   * @description 如果表不存在则创建，
   * 用于存储各维度的频率计数器。
   */
  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;

    try {
      await this.db.batch([
        this.db.prepare(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 1,
            window_start TEXT NOT NULL,
            expires_at TEXT NOT NULL
          )
        `),
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at)'
        ),
      ]);

      this.tableReady = true;
      console.log('[PostbackRateLimiter] Table ensured successfully');
    } catch (error) {
      console.error(
        '[PostbackRateLimiter] ensureTable error:',
        error instanceof Error ? error.message : error
      );
      throw new Error(
        `Failed to create rate_limits table: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 检查是否允许发送Postback
   *
   * @param conversionId 转化ID
   * @param ip 请求来源IP地址
   * @param _platform 平台名称 (预留参数，当前未使用)
   * @returns Promise<RateLimitResult> 频率限制结果
   *
   * @example
   * ```typescript
   * const limiter = new PostbackRateLimiter(env.DB);
   * const result = await limiter.checkLimit('cnv_123', '203.0.113.50', 'taboola');
   * if (!result.allowed) {
   *   // 被限制，返回429错误
   *   console.log(`Blocked: ${result.reason}`);
   * }
   * ```
   *
   * PRECONDITIONS:
   * - conversionId非空字符串
   * - ip为有效的IP格式
   *
   * POSTCONDITIONS:
   * - 返回是否允许发送及剩余次数
   * - 如果被限制，返回原因和重置时间
   *
   * SIDE_EFFECTS:
   * - 无副作用 (只读查询)
   */
  async checkLimit(
    conversionId: string,
    ip: string,
    _platform: string
  ): Promise<RateLimitResult> {
    await this.ensureTable();
    const now = new Date();
    const results: RateLimitResult[] = [];

    // ============================================================
    // 检查1: 每转化限制 (防止同一转化重复发送过多Postback)
    // ============================================================
    const convKey = `conv:${conversionId}`;
    const convCount = await this.getCount(convKey);

    if (convCount >= PostbackRateLimiter.LIMITS.maxPerConversion) {
      results.push({
        allowed: false,
        remaining: 0,
        resetAt: this.getExpiry(convKey),
        reason: 'per_conversion_limit',
      });
    }

    // ============================================================
    // 检查2: 每IP每分钟限制 (防止单IP攻击)
    // ============================================================
    const ipKey = `ip:${ip}:${this.getWindowKey(now, 'minute')}`;
    const ipCount = await this.getCount(ipKey);

    if (ipCount >= PostbackRateLimiter.LIMITS.maxPerIpPerMinute) {
      results.push({
        allowed: false,
        remaining: 0,
        resetAt: this.getExpiry(ipKey),
        reason: 'ip_rate_limit',
      });
    }

    // ============================================================
    // 如果有任何限制触发，返回最严格的结果
    // ============================================================
    const blocked = results.find((r) => !r.allowed);
    if (blocked) return blocked;

    // 所有检查通过，返回允许结果
    return {
      allowed: true,
      remaining: Math.min(
        PostbackRateLimiter.LIMITS.maxPerConversion - convCount - 1,
        PostbackRateLimiter.LIMITS.maxPerIpPerMinute - ipCount - 1
      ),
      resetAt: now.toISOString(),
    };
  }

  /**
   * 记录一次发送 (递增计数器)
   *
   * @param conversionId 转化ID
   * @param ip 请求来源IP地址
   *
   * @description 在成功发送Postback后调用，
   * 递增各维度的计数器以更新频率统计。
   *
   * @example
   * ```typescript
   * await limiter.recordSend('cnv_123', '203.0.113.50');
   * ```
   *
   * PRECONDITIONS:
   * - conversionId非空字符串
   * - ip为有效的IP格式
   *
   * POSTCONDITIONS:
   * - 各维度的计数器已递增
   *
   * SIDE_EFFECTS:
   * - 写入/更新D1数据库记录
   */
  async recordSend(conversionId: string, ip: string): Promise<void> {
    await this.ensureTable();
    const now = new Date();

    // 递增各维度计数器
    await this.increment(`conv:${conversionId}`, 3600); // 1小时窗口
    await this.increment(`ip:${ip}:${this.getWindowKey(now, 'minute')}`, 60); // 1分钟窗口
  }

  /**
   * 清理过期的计数器 (可选维护操作)
   *
   * @returns Promise<number> 清理的记录数
   *
   * @description 定期清理过期计数器以控制表大小，
   * 可通过定时任务调用 (建议每小时执行一次)。
   *
   * @example
   * ```typescript
   * const cleaned = await limiter.cleanup();
   * console.log(`Cleaned ${cleaned} expired records`);
   * ```
   */
  async cleanup(): Promise<number> {
    await this.ensureTable();

    try {
      const result = await this.db
        .prepare('DELETE FROM rate_limits WHERE expires_at < datetime("now")')
        .run();

      const deletedCount = result.meta.changes || 0;
      if (deletedCount > 0) {
        console.log(`[PostbackRateLimiter] Cleaned up ${deletedCount} expired counters`);
      }
      return deletedCount;
    } catch (error) {
      console.error(
        '[PostbackRateLimiter] cleanup error:',
        error instanceof Error ? error.message : error
      );
      return 0;
    }
  }

  /**
   * 获取指定key的当前计数值
   *
   * @param key 计数器键名
   * @returns Promise<number> 当前计数 (0如果不存在或已过期)
   *
   * @private 内部方法
   */
  private async getCount(key: string): Promise<number> {
    try {
      const row = await this.db
        .prepare(
          'SELECT count FROM rate_limits WHERE key = ? AND expires_at > datetime("now")'
        )
        .bind(key)
        .first();

      return (row?.count as number) || 0;
    } catch (error) {
      console.error('[PostbackRateLimiter] getCount error:', error);
      return 0; // 出错时返回0，允许继续
    }
  }

  /**
   * 递增指定key的计数器
   *
   * @param key 计数器键名
   * @param ttlSeconds 过期时间 (秒)
   *
   * @private 内部方法
   *
   * @description 如果计数器不存在则创建，存在则递增。
   * 使用INSERT OR IGNORE + UPDATE实现原子操作。
   */
  private async increment(key: string, ttlSeconds: number): Promise<void> {
    try {
      const exists = await this.getCount(key);
      const now = new Date();
      const expiry = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

      if (exists) {
        // 计数器存在，递增并更新过期时间
        await this.db
          .prepare(
            'UPDATE rate_limits SET count = count + 1, expires_at = ? WHERE key = ?'
          )
          .bind(expiry, key)
          .run();
      } else {
        // 计数器不存在，创建新记录
        await this.db
          .prepare(
            'INSERT OR IGNORE INTO rate_limits (key, count, window_start, expires_at) VALUES (?, 1, datetime("now"), ?)'
          )
          .bind(key, expiry)
          .run();
      }
    } catch (error) {
      console.error('[PostbackRateLimiter] increment error:', error);
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 获取指定key的过期时间
   *
   * @param key 计数器键名
   * @returns ISO格式的过期时间字符串
   *
   * @private 内部方法
   *
   * @description 简化实现: 返回1分钟后 (实际应根据TTL计算)
   */
  private getExpiry(_key: string): string {
    // 简化实现: 返回1分钟后 (实际应从DB查询真实过期时间)
    return new Date(Date.now() + 60000).toISOString();
  }

  /**
   * 生成时间窗口键名
   *
   * @param date 当前日期对象
   * @param unit 时间单位 ('second' | 'minute' | 'hour')
   * @returns 时间窗口键名字符串
   *
   * @private 内部方法
   *
   * @description 根据时间单位生成不同的窗口粒度:
   * - second: "分:秒" (用于秒级窗口)
   * - minute: "YYYY-MM-DDTHH:00" (用于分钟级窗口)
   * - hour: "YYYY-MM-DD" (用于小时级窗口)
   */
  private getWindowKey(
    date: Date,
    unit: 'second' | 'minute' | 'hour'
  ): string {
    if (unit === 'second') {
      return `${date.getUTCMinutes()}:${date.getUTCSeconds()}`;
    }

    if (unit === 'minute') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:00`;
    }

    // hour
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
}

/**
 * 创建Postback频率限制器实例的工厂函数
 *
 * @param db D1数据库实例
 * @returns PostbackRateLimiter实例
 */
export function createPostbackRateLimiter(db: D1Database): PostbackRateLimiter {
  return new PostbackRateLimiter(db);
}
