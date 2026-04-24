/**
 * @fileoverview Postback日志数据仓库
 * @description 封装postback_logs表的所有数据库操作 (CRUD + 统计)
 * @module handlers/d1/postback.repo
 *
 * 输入:
 *   - PostbackLog对象 (待保存的日志记录)
 *   - 查询参数 (分页、筛选条件等)
 *
 * 输出:
 *   - PostbackLog列表
 *   - 统计结果 (PostbackStats)
 *   - 操作结果 (boolean)
 *
 * 逻辑交互:
 *   - 被PostbackService调用进行日志持久化
 *   - 被Postback历史查询API调用返回数据
 *   - 继承BaseRepository获取基础CRUD能力
 *
 * 前后端交互:
 *   - 通过D1数据库进行数据读写
 *   - 自动建表 (ensureTable模式)
 *
 * 表结构 (postback_logs):
 * - id: TEXT PRIMARY KEY
 * - taskId: TEXT NOT NULL
 * - conversionId: TEXT NOT NULL
 * - clickId: TEXT NOT NULL
 * - campaignId: TEXT NOT NULL
 * - platform: TEXT NOT NULL
 * - url: TEXT NOT NULL (脱敏处理)
 * - method: TEXT NOT NULL ('GET' | 'POST')
 * - requestHeaders: TEXT (JSON字符串，可选)
 * - requestBody: TEXT (JSON字符串，可选，敏感字段已脱敏)
 * - statusCode: INTEGER NOT NULL
 * - responseBody: TEXT (截断至500字符，可选)
 * - latencyMs: INTEGER NOT NULL
 * - success: INTEGER NOT NULL (0|1)
 * - errorMessage: TEXT (可选)
 * - retryCount: INTEGER NOT NULL DEFAULT 0
 * - createdAt: TEXT NOT NULL (ISO格式)
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type {
  PostbackLog,
  PostbackLogQueryParams,
  PostbackLogListResult,
  PostbackStats,
} from '@/types/postback';

/**
 * Postback日志数据仓库
 * @description 封装postback_logs表的完整CRUD操作和统计分析
 */
export class PostbackLogRepository extends BaseRepository<PostbackLog> {
  constructor(db: D1Database) {
    super(db, 'postback_logs');
  }

  /**
   * 确保postback_logs表存在 (自动建表)
   *
   * @description 如果表不存在则创建，确保后续操作可正常执行
   * 使用"懒初始化"模式，在首次操作时检查并创建表
   *
   * PRECONDITIONS:
   * - D1数据库连接有效
   *
   * POSTCONDITIONS:
   * - postback_logs表存在且结构正确
   *
   * SIDE_EFFECTS:
   * - 可能创建新表 (DDL操作)
   */
  private async ensureTable(): Promise<void> {
    try {
      // 检查表是否已存在
      const tableCheck = await this.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='postback_logs'`)
        .first();

      if (!tableCheck) {
        // 表不存在，创建它
        console.log('[PostbackLogRepository] Creating postback_logs table...');
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS postback_logs (
            id TEXT PRIMARY KEY,
            taskId TEXT NOT NULL,
            conversionId TEXT NOT NULL,
            clickId TEXT NOT NULL,
            campaignId TEXT NOT NULL,
            platform TEXT NOT NULL,
            url TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            requestHeaders TEXT,
            requestBody TEXT,
            statusCode INTEGER NOT NULL DEFAULT 0,
            responseBody TEXT,
            latencyMs INTEGER NOT NULL DEFAULT 0,
            success INTEGER NOT NULL DEFAULT 0,
            errorMessage TEXT,
            retryCount INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,

            -- 索引优化查询性能
            INDEX idx_postback_conversionId (conversionId),
            INDEX idx_postback_clickId (clickId),
            INDEX idx_postback_campaignId (campaignId),
            INDEX idx_postback_platform (platform),
            INDEX idx_postback_success (success),
            INDEX idx_postback_createdAt (createdAt),
            INDEX idx_postback_taskId (taskId)
          )
        `);
        console.log('[PostbackLogRepository] postback_logs table created successfully');
      }
    } catch (error) {
      console.error('[PostbackLogRepository] ensureTable error:', error);
      throw new Error(`Failed to create postback_logs table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 记录Postback日志到D1数据库
   *
   * @param log Postback日志对象 (必须包含所有必需字段)
   *
   * @example
   * ```typescript
   * const repo = new PostbackLogRepository(env.DB);
   * await repo.saveLog({
   *   id: 'log-123',
   *   taskId: 'task-456',
   *   conversionId: 'cnv_789',
   *   clickId: 'clk_123',
   *   campaignId: 'camp-abc',
   *   platform: 'taboola',
   *   url: 'https://trk.taboola.com/...?clickid=clk_***',
   *   method: 'GET',
   *   statusCode: 200,
   *   latencyMs: 150,
   *   success: true,
   *   retryCount: 0,
   *   createdAt: new Date().toISOString(),
   * });
   * ```
   *
   * PRECONDITIONS:
   * - log对象包含所有必需字段 (id, taskId, conversionId, clickId等)
   * - log.url已脱敏处理 (隐藏token等敏感信息)
   * - log.responseBody长度不超过500字符
   *
   * POSTCONDITIONS:
   * - 日志记录已写入D1数据库
   * - 后续可通过findLogs查询到该记录
   *
   * SIDE_EFFECTS:
   * - 写入D1数据库 (INSERT操作)
   */
  async saveLog(log: PostbackLog): Promise<void> {
    // 确保表存在
    await this.ensureTable();

    try {
      await this.db
        .prepare(`
          INSERT INTO postback_logs (
            id, taskId, conversionId, clickId, campaignId,
            platform, url, method, requestHeaders, requestBody,
            statusCode, responseBody, latencyMs, success,
            errorMessage, retryCount, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          log.id,
          log.taskId,
          log.conversionId,
          log.clickId,
          log.campaignId,
          log.platform,
          log.url,
          log.method,
          log.requestHeaders || null,
          log.requestBody || null,
          log.statusCode,
          log.responseBody || null,
          log.latencyMs,
          log.success ? 1 : 0,
          log.errorMessage || null,
          log.retryCount,
          log.createdAt
        )
        .run();

      console.log(`[PostbackLogRepository] Log saved: ${log.id} (success=${log.success})`);
    } catch (error) {
      console.error('[PostbackLogRepository] saveLog error:', error);
      throw new Error(`Failed to save postback log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查询Postback发送历史 (分页+筛选)
   *
   * @param params 查询参数
   *   - page: 页码 (从1开始，默认1)
   *   - pageSize: 每页数量 (默认20)
   *   - conversionId: 按转化ID筛选 (可选)
   *   - clickId: 按点击ID筛选 (可选)
   *   - campaignId: 按活动ID筛选 (可选)
   *   - platform: 按平台筛选 (可选)
   *   - success: 按成功/失败筛选 (可选)
   *   - startDate: 开始日期 (ISO格式，可选)
   *   - endDate: 结束日期 (ISO格式，可选)
   * @returns 分页结果 (logs列表 + 总数)
   *
   * @example
   * ```typescript
   * const result = await repo.findLogs({
   *   page: 1,
   *   pageSize: 20,
   *   platform: 'taboola',
   *   startDate: '2026-04-01T00:00:00Z',
   * });
   * // 结果: { logs: [...], total: 150 }
   * ```
   */
  async findLogs(params: PostbackLogQueryParams = {}): Promise<PostbackLogListResult> {
    // 确保表存在
    await this.ensureTable();

    const {
      limit = 20,
      offset = 0,
      conversionId,
      clickId,
      campaignId,
      platform,
      success,
      startDate,
      endDate,
    } = params;

    const conditions: string[] = [];
    const values: (string | number | boolean)[] = [];

    // 构建WHERE条件
    if (conversionId) {
      conditions.push('conversionId = ?');
      values.push(conversionId);
    }
    if (clickId) {
      conditions.push('clickId = ?');
      values.push(clickId);
    }
    if (campaignId) {
      conditions.push('campaignId = ?');
      values.push(campaignId);
    }
    if (platform) {
      conditions.push('platform = ?');
      values.push(platform);
    }
    if (success !== undefined) {
      conditions.push('success = ?');
      values.push(success ? 1 : 0);
    }
    if (startDate) {
      conditions.push('createdAt >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('createdAt <= ?');
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM postback_logs ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (values.length > 0 ? countStmt.bind(...values) : countStmt).first();
    const total = (countResult?.total as number) || 0;

    // 查询数据列表
    const listSql = `
      SELECT
        id, taskId, conversionId, clickId, campaignId,
        platform, url, method, requestHeaders, requestBody,
        statusCode, responseBody, latencyMs, success,
        errorMessage, retryCount, createdAt
      FROM postback_logs
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const listValues = [...values, limit, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();

    // 转换success字段为boolean
    const logs = (listResult.results as Array<Record<string, unknown>>).map(row => ({
      ...row,
      success: row.success === 1,
    })) as PostbackLog[];

    return {
      logs,
      total,
    };
  }

  /**
   * 获取Postback统计概览
   *
   * @param startDate 开始日期 (ISO格式)
   * @param endDate 结束日期 (ISO格式)
   * @param campaignId 可选的活动ID筛选
   * @returns 统计概览数据
   *
   * @description 返回指定时间范围内的Postback统计:
   * - 总发送数、成功数、失败数
   * - 成功率百分比
   * - 平均延迟
   * - 总重试次数
   * - 各平台统计数据
   */
  async getStats(startDate: string, endDate: string, campaignId?: string): Promise<PostbackStats> {
    await this.ensureTable();

    let sql = `
      SELECT
        COUNT(*) as totalSent,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as totalSuccess,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as totalFailed,
        COALESCE(AVG(latencyMs), 0) as avgLatencyMs,
        SUM(retryCount) as totalRetryCount
      FROM postback_logs
      WHERE createdAt >= ? AND createdAt <= ?
    `;

    const values: string[] = [startDate, endDate];

    if (campaignId) {
      sql += ' AND campaignId = ?';
      values.push(campaignId);
    }

    const result = await this.db.prepare(sql).bind(...values).first();

    const totalSent = (result?.totalSent as number) || 0;
    const totalSuccess = (result?.totalSuccess as number) || 0;
    const totalFailed = (result?.totalFailed as number) || 0;
    const avgLatencyMs = Math.round((result?.avgLatencyMs as number) || 0);
    const totalRetryCount = (result?.totalRetryCount as number) || 0;
    const successRate = totalSent > 0 ? Math.round((totalSuccess / totalSent) * 10000) / 100 : 0;

    // 查询各平台统计
    let platformSql = `
      SELECT
        platform,
        COUNT(*) as sent,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
      FROM postback_logs
      WHERE createdAt >= ? AND createdAt <= ?
    `;
    const platformValues: string[] = [startDate, endDate];

    if (campaignId) {
      platformSql += ' AND campaignId = ?';
      platformValues.push(campaignId);
    }

    platformSql += ' GROUP BY platform ORDER BY sent DESC';

    const platformResult = await this.db.prepare(platformSql).bind(...platformValues).all();
    const byPlatformStats = (platformResult.results as Array<Record<string, unknown>>).map(row => {
      const sent = (row.sent as number) || 0;
      const successCount = (row.success as number) || 0;
      const failedCount = (row.failed as number) || 0;
      return {
        platform: row.platform as string,
        sent,
        success: successCount,
        failed: failedCount,
        successRate: sent > 0 ? Math.round((successCount / sent) * 10000) / 100 : 0,
      };
    });

    return {
      totalSent,
      totalSuccess,
      totalFailed,
      successRate,
      avgLatencyMs,
      totalRetryCount,
      byPlatformStats,
    };
  }

  /**
   * 获取失败的Postback列表 (用于手动重试)
   *
   * @param limit 最大返回数量 (默认100)
   * @returns 失败的Postback日志列表
   *
   * @description 用于管理员界面展示可重试的失败任务，
   * 或用于定时任务自动重试。
   */
  async findFailedLogs(limit: number = 100): Promise<PostbackLog[]> {
    await this.ensureTable();

    const result = await this.db
      .prepare(`
        SELECT
          id, taskId, conversionId, clickId, campaignId,
          platform, url, method, requestHeaders, requestBody,
          statusCode, responseBody, latencyMs, success,
          errorMessage, retryCount, createdAt
        FROM postback_logs
        WHERE success = 0
        ORDER BY createdAt DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    return (result.results as Array<Record<string, unknown>>).map(row => ({
      ...row,
      success: false,
    })) as PostbackLog[];
  }

  /**
   * 更新Postback日志状态 (重试后更新)
   *
   * @param logId 日志ID
   * @param status 新的状态描述 (如 'retried', 'success_after_retry')
   * @param statusCode HTTP响应状态码 (可选)
   * @param errorMessage 错误信息 (可选)
   * @returns 是否更新成功
   *
   * @description 在手动或自动重试后调用，
   * 更新原始日志的最终状态。
   */
  async updateLogStatus(
    logId: string,
    _status: string, // 状态描述，用于日志记录
    statusCode?: number,
    errorMessage?: string
  ): Promise<boolean> {
    await this.ensureTable();

    try {
      const result = await this.db
        .prepare(`
          UPDATE postback_logs
          SET
            statusCode = COALESCE(?, statusCode),
            errorMessage = COALESCE(?, errorMessage),
            retryCount = retryCount + 1
          WHERE id = ?
        `)
        .bind(statusCode ?? null, errorMessage ?? null, logId)
        .run();

      return result.success;
    } catch (error) {
      console.error('[PostbackLogRepository] updateLogStatus error:', error);
      return false;
    }
  }
}
