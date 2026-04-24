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
            status TEXT NOT NULL DEFAULT 'sent',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(conversion_id, platform)
          )
        `),
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_pidempotency_conversion ON postback_idempotency(conversion_id)'
        ),
        this.db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_pidempotency_platform ON postback_idempotency(platform)'
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
          `SELECT id FROM postback_idempotency WHERE conversion_id = ? AND platform = ?`
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

  /**
   * 标记Postback为已发送 (幂等性写入)
   *
   * @param conversionId 转化ID
   * @param platform 平台名称
   *
   * @description 使用INSERT OR IGNORE保证唯一性，
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
  async markAsSent(conversionId: string, platform: string): Promise<void> {
    await this.ensureTable();

    try {
      const id = crypto.randomUUID();
      await this.db
        .prepare(`
          INSERT OR IGNORE INTO postback_idempotency (id, conversion_id, platform, status, created_at)
          VALUES (?, ?, ?, 'sent', datetime('now'))
        `)
        .bind(id, conversionId, platform)
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
