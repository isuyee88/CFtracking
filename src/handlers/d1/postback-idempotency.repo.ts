/**
 * @fileoverview Postback幂等性数据仓库
 * @description 使用D1数据库替代KV存储进行Postback幂等性检查，避免免费账户KV写入限制(1000次/天)
 * @module handlers/d1/postback-idempotency.repo
 *
 * 输入:
 *   - conversionId (转化ID)
 *   - platform (平台名称)
 *
 * 输出:
 *   - 是否已发送 (boolean)
 *
 * 逻辑交互:
 *   - PostbackService调用进行幂等性检查和标记
 *   - 替代原有的KV存储方案，解决KV写入限制问题
 *
 * 前后端交互:
 *   - 通过D1数据库持久化
 *   - 自动建表 (ensureTable模式)
 *
 * 表结构 (postback_idempotency):
 * - id: TEXT PRIMARY KEY (UUID)
 * - conversionId: TEXT NOT NULL (转化ID)
 * - platform: TEXT NOT NULL (平台名称)
 * - status: TEXT NOT NULL DEFAULT 'sent' (状态标记)
 * - createdAt: TEXT NOT NULL (创建时间)
 * - UNIQUE(conversionId, platform) (唯一约束防止重复)
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';

/**
 * Postback幂等性数据仓库
 * @description 管理Postback的幂等性检查和标记，使用D1数据库替代KV存储
 */
export class PostbackIdempotencyRepository extends BaseRepository<{
  id: string;
  conversion_id: string;
  platform: string;
  status: string;
  created_at: string;
}> {
  constructor(db: D1Database) {
    super(db, 'postback_idempotency');
  }

  /** 表是否已初始化的标志 */
  private tableReady = false;

  /**
   * 确保表存在 (懒初始化)
   *
   * @description 如果表不存在则创建，确保后续操作可正常执行。
   * 使用"懒初始化"模式，在首次操作时检查并创建表。
   * 包含唯一约束 UNIQUE(conversion_id, platform) 防止重复记录。
   *
   * PRECONDITIONS:
   * - D1数据库连接有效
   *
   * POSTCONDITIONS:
   * - postback_idempotency表存在且结构正确
   * - 相关索引已创建以优化查询性能
   *
   * SIDE_EFFECTS:
   * - 可能创建新表和索引 (DDL操作)
   */
  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;

    try {
      await this.db.batch([
        this.db.prepare(`
          CREATE TABLE IF NOT EXISTS postback_idempotency (
            id TEXT PRIMARY KEY,
            conversion_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(conversion_id, platform)
          )
        `),
      ]);

      // Older deployments created this table lazily before delivery state was
      // formalized. Add only missing columns so the upgrade is non-destructive.
      for (const statement of [
        'ALTER TABLE postback_idempotency ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE postback_idempotency ADD COLUMN next_attempt_at TEXT',
        'ALTER TABLE postback_idempotency ADD COLUMN last_error TEXT',
        'ALTER TABLE postback_idempotency ADD COLUMN last_status_code INTEGER',
        'ALTER TABLE postback_idempotency ADD COLUMN request_id TEXT',
      ]) {
        try {
          await this.db.prepare(statement).bind().run();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/duplicate column name/i.test(message)) throw error;
        }
      }

      await this.db.batch([
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_pidempotency_conversion ON postback_idempotency(conversion_id)'
        ),
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_pidempotency_platform ON postback_idempotency(platform)'
        ),
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_postback_idempotency_retry ON postback_idempotency(status, next_attempt_at)'
        ),
      ]);

      this.tableReady = true;
      console.log('[PostbackIdempotencyRepository] Table ensured successfully');
    } catch (error) {
      console.error(
        '[PostbackIdempotencyRepository] ensureTable error:',
        error instanceof Error ? error.message : error
      );
      throw new Error(
        `Failed to create postback_idempotency table: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 检查指定转化+平台组合是否已发送过Postback
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   * @returns Promise<boolean> true=已发送, false=未发送
   *
   * @example
   * ```typescript
   * const repo = new PostbackIdempotencyRepository(env.DB);
   * const alreadySent = await repo.isSent('cnv_123', 'taboola');
   * // 如果已发送过，返回true，跳过本次发送
   * ```
   *
   * PRECONDITIONS:
   * - conversionId非空字符串
   * - platform非空字符串
   *
   * POSTCONDITIONS:
   * - 返回该转化+平台组合是否已存在记录
   *
   * SIDE_EFFECTS:
   * - 无副作用 (只读查询)
   */
  async isSent(conversionId: string, platform: string): Promise<boolean> {
    await this.ensureTable();

    try {
      const result = await this.db
        .prepare(
          `SELECT id FROM postback_idempotency WHERE conversion_id = ? AND platform = ? AND status = 'sent'`
        )
        .bind(conversionId, platform)
        .first();

      return result !== null;
    } catch (error) {
      console.error(
        '[PostbackIdempotencyRepository] isSent error:',
        error instanceof Error ? error.message : error
      );
      return false; // 出错时返回false，允许发送 (宁可重复也不能丢失)
    }
  }

  async markAsPending(conversionId: string, platform: string): Promise<void> {
    await this.ensureTable();
    await this.db.prepare(`
      INSERT OR IGNORE INTO postback_idempotency
        (id, conversion_id, platform, status, attempt_count, created_at)
      VALUES (?, ?, ?, 'pending', 0, datetime('now'))
    `).bind(crypto.randomUUID(), conversionId, platform).run();
  }

  async markAsSending(conversionId: string, platform: string): Promise<boolean> {
    await this.ensureTable();
    const result = await this.db.prepare(`
      UPDATE postback_idempotency
      SET status = 'sending', attempt_count = attempt_count + 1
      WHERE conversion_id = ? AND platform = ? AND status IN ('pending', 'retry')
    `).bind(conversionId, platform).run();
    return Number(result.meta?.changes ?? 0) > 0;
  }

  async markAsRetry(
    conversionId: string,
    platform: string,
    lastError: string,
    attemptCount: number,
    nextAttemptAt: string = new Date(Date.now() + Math.min(3600000, 1000 * 2 ** Math.max(0, attemptCount))).toISOString(),
    lastStatusCode?: number,
    requestId?: string,
  ): Promise<void> {
    await this.ensureTable();
    await this.db.prepare(`
      UPDATE postback_idempotency
      SET status = 'retry', last_error = ?, next_attempt_at = ?, attempt_count = ?,
          last_status_code = ?, request_id = ?
      WHERE conversion_id = ? AND platform = ? AND status != 'sent'
    `).bind(
      lastError,
      nextAttemptAt,
      attemptCount,
      lastStatusCode ?? null,
      requestId ?? null,
      conversionId,
      platform,
    ).run();
  }

  async markDeadLetter(
    conversionId: string,
    platform: string,
    lastError: string,
    lastStatusCode?: number,
    requestId?: string,
  ): Promise<void> {
    await this.ensureTable();
    await this.db.prepare(`
      UPDATE postback_idempotency
      SET status = 'dead_letter', last_error = ?, next_attempt_at = NULL,
          last_status_code = ?, request_id = ?
      WHERE conversion_id = ? AND platform = ? AND status != 'sent'
    `).bind(
      lastError,
      lastStatusCode ?? null,
      requestId ?? null,
      conversionId,
      platform,
    ).run();
  }

  async listDueRetries(limit: number = 100): Promise<Array<Record<string, unknown>>> {
    await this.ensureTable();
    const result = await this.db.prepare(`
      SELECT * FROM postback_idempotency
      WHERE status = 'retry' AND (next_attempt_at IS NULL OR julianday(next_attempt_at) <= julianday('now'))
      ORDER BY next_attempt_at ASC, created_at ASC
      LIMIT ?
    `).bind(Math.max(1, Math.min(500, limit))).all<Record<string, unknown>>();
    return result.results ?? [];
  }

  async findRetry(conversionId: string, platform: string): Promise<Record<string, unknown> | null> {
    await this.ensureTable();
    const row = await this.db.prepare(`
      SELECT * FROM postback_idempotency
      WHERE conversion_id = ? AND platform = ? AND status = 'retry'
      LIMIT 1
    `).bind(conversionId, platform).first<Record<string, unknown>>();
    return row ?? null;
  }

  /**
   * 标记Postback为已发送 (幂等性写入)
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   *
   * @description 只有外部发送成功后才允许写入 sent 状态。
   * 失败发送必须走 retry/dead_letter，不能被幂等检查永久吞掉。
   * 即使重复调用也不会产生错误或重复记录。
   *
   * @example
   * ```typescript
   * const repo = new PostbackIdempotencyRepository(env.DB);
   * await repo.markAsSent('cnv_123', 'taboola');
   * // 标记该转化已向taboola平台发送过Postback
   * ```
   *
   * PRECONDITIONS:
   * - conversionId非空字符串
   * - platform非空字符串
   *
   * POSTCONDITIONS:
   * - 数据库中存在该转化+平台的记录 (如果之前不存在)
   * - 如果已存在，不会产生错误或重复记录
   *
   * SIDE_EFFECTS:
   * - 写入D1数据库 (INSERT操作)
   */
  async markAsSent(
    conversionId: string,
    platform: string,
    statusCode?: number,
    requestId?: string,
  ): Promise<void> {
    await this.ensureTable();

    try {
      const id = crypto.randomUUID();
      await this.db
        .prepare(`
          INSERT INTO postback_idempotency
            (id, conversion_id, platform, status, attempt_count, next_attempt_at, last_error, last_status_code, request_id, created_at)
          VALUES (?, ?, ?, 'sent', 0, NULL, NULL, ?, ?, datetime('now'))
          ON CONFLICT(conversion_id, platform) DO UPDATE SET
            status = 'sent',
            next_attempt_at = NULL,
            last_error = NULL,
            last_status_code = excluded.last_status_code,
            request_id = excluded.request_id
        `)
        .bind(id, conversionId, platform, statusCode ?? null, requestId ?? null)
        .run();

      console.log(
        `[PostbackIdempotencyRepository] Marked as sent: ${conversionId}/${platform}`
      );
    } catch (error) {
      console.error(
        '[PostbackIdempotencyRepository] markAsSent error:',
        error instanceof Error ? error.message : error
      );
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 批量检查多个转化是否已发送
   *
   * @param items 待检查的项目数组 [{ conversionId, platform }]
   * @returns Promise<Map<string, boolean>> 以"conversionId:platform"为键的结果映射
   *
   * @description 批量优化版本，减少多次单次查询的开销。
   * 返回Map便于快速查找每个项目的状态。
   *
   * @example
   * ```typescript
   * const results = await repo.batchCheckSent([
   *   { conversionId: 'cnv_1', platform: 'taboola' },
   *   { conversionId: 'cnv_2', platform: 'facebook' },
   * ]);
   * results.get('cnv_1:taboola'); // true/false
   * ```
   *
   * PRECONDITIONS:
   * - items数组非空 (空数组直接返回空Map)
   * - 每个item包含有效的conversionId和platform
   *
   * POSTCONDITIONS:
   * - 返回所有项目的检查结果
   *
   * SIDE_EFFECTS:
   * - 无副作用 (只读查询)
   */
  async batchCheckSent(
    items: Array<{ conversionId: string; platform: string }>
  ): Promise<Map<string, boolean>> {
    await this.ensureTable();
    const result = new Map<string, boolean>();

    if (items.length === 0) return result;

    for (const item of items) {
      const key = `${item.conversionId}:${item.platform}`;
      result.set(key, await this.isSent(item.conversionId, item.platform));
    }

    return result;
  }

  /**
   * 清理过期的幂等性记录 (可选维护操作)
   *
   * @param daysToKeep 保留天数 (默认30天)
   * @returns Promise<number> 删除的记录数
   *
   * @description 定期清理旧记录以控制表大小，
   * 可通过定时任务调用。
   *
   * PRECONDITIONS:
   * - daysToKeep > 0
   *
   * POSTCONDITIONS:
   * - 删除超过指定天数的记录
   * - 返回删除的记录数量
   *
   * SIDE_EFFECTS:
   * - 从D1数据库删除记录 (DELETE操作)
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    await this.ensureTable();

    try {
      const result = await this.db
        .prepare(
          `DELETE FROM postback_idempotency WHERE created_at < datetime('now', '-' || ? || ' days')`
        )
        .bind(daysToKeep.toString())
        .run();

      const deletedCount = result.meta.changes || 0;
      console.log(
        `[PostbackIdempotencyRepository] Cleaned up ${deletedCount} old records`
      );
      return deletedCount;
    } catch (error) {
      console.error(
        '[PostbackIdempotencyRepository] cleanup error:',
        error instanceof Error ? error.message : error
      );
      return 0;
    }
  }
}
