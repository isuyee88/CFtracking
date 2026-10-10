/**
 * @fileoverview Log Explorer 服务
 * @description 处理统一日志查询、过滤和导出功能
 * @module services/logExplorer/logExplorer.service
 * 
 * 数据流:
 * 1. 从 unified_logs 表查询日志
 * 2. 支持复杂过滤条件和分页
 * 3. 支持异步导出任务
 * 
 * @input LogQuery
 * @output UnifiedLog[], LogStats, ExportTask
 * @logic 构建查询 -> 执行 -> 缓存结果
 * @frontend 无
 * @backend LogExplorer Routes
 */

import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  UnifiedLog,
  LogFilter,
  LogQuery,
  LogQueryResult,
  LogStats,
  LogExportTask,
  LogType,
  ExportFormat,
  ExportStatus,
} from '@/types/logExplorer';

export class LogExplorerService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = getD1Connection(env);
  }

  /**
   * 查询日志
   */
  async queryLogs(query: LogQuery): Promise<LogQueryResult> {
    const { logType, filters, sort, page = 1, pageSize = 50 } = query;
    const offset = (page - 1) * pageSize;

    // 构建 WHERE 子句
    const { whereClause, params } = this.buildWhereClause(logType, filters);

    // 构建排序
    const orderClause = this.buildOrderClause(sort);

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM unified_logs ${whereClause}`;
    const countResult = await this.db.prepare(countSql).bind(...params).first();
    const total = (countResult?.total as number) || 0;

    // 查询数据
    const dataSql = `SELECT * FROM unified_logs ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const dataResult = await this.db
      .prepare(dataSql)
      .bind(...params, pageSize, offset)
      .all();

    const logs = (dataResult.results as unknown as Record<string, unknown>[]).map(row =>
      this.transformLog(row)
    );

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取日志统计
   */
  async getStats(query: Omit<LogQuery, 'page' | 'pageSize' | 'sort'>): Promise<LogStats> {
    const { logType, filters } = query;
    const { whereClause, params } = this.buildWhereClause(logType, filters);

    // 按时间分组统计
    const byTimeSql = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM unified_logs ${whereClause}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `;
    const byTimeResult = await this.db.prepare(byTimeSql).bind(...params).all();

    // 按国家统计
    const byCountrySql = `
      SELECT 
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as count
      FROM unified_logs ${whereClause}
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `;
    const byCountryResult = await this.db.prepare(byCountrySql).bind(...params).all();

    // 按设备类型统计
    const byDeviceSql = `
      SELECT 
        COALESCE(deviceType, 'Unknown') as deviceType,
        COUNT(*) as count
      FROM unified_logs ${whereClause}
      GROUP BY deviceType
      ORDER BY count DESC
    `;
    const byDeviceResult = await this.db.prepare(byDeviceSql).bind(...params).all();

    // 按浏览器统计
    const byBrowserSql = `
      SELECT 
        COALESCE(browser, 'Unknown') as browser,
        COUNT(*) as count
      FROM unified_logs ${whereClause}
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 10
    `;
    const byBrowserResult = await this.db.prepare(byBrowserSql).bind(...params).all();

    // 按 OS 统计
    const byOSSql = `
      SELECT 
        COALESCE(os, 'Unknown') as os,
        COUNT(*) as count
      FROM unified_logs ${whereClause}
      GROUP BY os
      ORDER BY count DESC
      LIMIT 10
    `;
    const byOSResult = await this.db.prepare(byOSSql).bind(...params).all();

    return {
      total: 0,
      byTime: this.arrayToRecord(byTimeResult.results as Array<{ date: string; count: number }>, 'date', 'count'),
      byCountry: this.arrayToRecord(byCountryResult.results as Array<{ country: string; count: number }>, 'country', 'count'),
      byDevice: this.arrayToRecord(byDeviceResult.results as Array<{ deviceType: string; count: number }>, 'deviceType', 'count'),
      byBrowser: this.arrayToRecord(byBrowserResult.results as Array<{ browser: string; count: number }>, 'browser', 'count'),
      byOS: this.arrayToRecord(byOSResult.results as Array<{ os: string; count: number }>, 'os', 'count'),
    };
  }

  /**
   * 创建导出任务
   */
  async createExportTask(
    userId: string,
    query: Omit<LogQuery, 'page' | 'pageSize'>
  ): Promise<LogExportTask> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期

    const task: LogExportTask = {
      id,
      userId,
      logType: query.logType,
      filters: query.filters || null,
      format: query.exportFormat || 'csv',
      status: 'pending',
      totalRecords: 0,
      processedRecords: 0,
      filePath: null,
      fileSize: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.db
      .prepare(`
        INSERT INTO log_export_tasks (
          id, userId, logType, filters, format, status, totalRecords, processedRecords,
          filePath, fileSize, error, startedAt, completedAt, expiresAt, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        task.id,
        task.userId,
        task.logType,
        task.filters ? JSON.stringify(task.filters) : null,
        task.format,
        task.status,
        task.totalRecords,
        task.processedRecords,
        task.filePath,
        task.fileSize,
        task.error,
        task.startedAt,
        task.completedAt,
        task.expiresAt,
        task.createdAt,
        task.updatedAt
      )
      .run();

    return task;
  }

  /**
   * 获取导出任务状态
   */
  async getExportTask(taskId: string): Promise<LogExportTask | null> {
    const result = await this.db
      .prepare('SELECT * FROM log_export_tasks WHERE id = ?')
      .bind(taskId)
      .first();

    if (!result) return null;

    return this.transformExportTask(result as Record<string, unknown>);
  }

  /**
   * 获取用户的导出任务列表
   */
  async getExportTasks(userId: string, limit = 20): Promise<LogExportTask[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM log_export_tasks 
        WHERE userId = ? 
        ORDER BY createdAt DESC 
        LIMIT ?
      `)
      .bind(userId, limit)
      .all();

    return (result.results as unknown as Record<string, unknown>[]).map(row =>
      this.transformExportTask(row)
    );
  }

  /**
   * 写入日志
   */
  async writeLog(log: Omit<UnifiedLog, 'id' | 'createdAt'>): Promise<UnifiedLog> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const fullLog: UnifiedLog = {
      ...log,
      id,
      createdAt: now,
    };

    await this.db
      .prepare(`
        INSERT INTO unified_logs (
          id, logType, timestamp, campaignId, flowId, offerId, landingPageId,
          visitorId, clickId, conversionId, ip, userAgent, country, city,
          deviceType, browser, os, data, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        fullLog.id,
        fullLog.logType,
        fullLog.timestamp,
        fullLog.campaignId,
        fullLog.flowId,
        fullLog.offerId,
        fullLog.landingPageId,
        fullLog.visitorId,
        fullLog.clickId,
        fullLog.conversionId,
        fullLog.ip,
        fullLog.userAgent,
        fullLog.country,
        fullLog.city,
        fullLog.deviceType,
        fullLog.browser,
        fullLog.os,
        fullLog.data ? JSON.stringify(fullLog.data) : null,
        fullLog.createdAt
      )
      .run();

    return fullLog;
  }

  /**
   * 批量写入日志
   */
  async writeLogs(logs: Array<Omit<UnifiedLog, 'id' | 'createdAt'>>): Promise<number> {
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const log of logs) {
      const id = crypto.randomUUID();
      const stmt = this.db
        .prepare(`
          INSERT INTO unified_logs (
            id, logType, timestamp, campaignId, flowId, offerId, landingPageId,
            visitorId, clickId, conversionId, ip, userAgent, country, city,
            deviceType, browser, os, data, createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          log.logType,
          log.timestamp,
          log.campaignId,
          log.flowId,
          log.offerId,
          log.landingPageId,
          log.visitorId,
          log.clickId,
          log.conversionId,
          log.ip,
          log.userAgent,
          log.country,
          log.city,
          log.deviceType,
          log.browser,
          log.os,
          log.data ? JSON.stringify(log.data) : null,
          now
        );
      statements.push(stmt);
    }

    await this.db.batch(statements);
    return logs.length;
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.db
      .prepare('DELETE FROM unified_logs WHERE timestamp < ?')
      .bind(cutoffDate.toISOString())
      .run();

    return result.meta.changes || 0;
  }

  // ==================== 私有方法 ====================

  /**
   * 构建 WHERE 子句
   */
  private buildWhereClause(
    logType: LogType,
    filters?: LogFilter[]
  ): { whereClause: string; params: unknown[] } {
    const conditions: string[] = ['logType = ?'];
    const params: unknown[] = [logType];

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, params);
        if (condition) {
          conditions.push(condition);
        }
      }
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  /**
   * 构建单个过滤条件
   */
  private buildFilterCondition(filter: LogFilter, params: unknown[]): string | null {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        params.push(value);
        return `${field} = ?`;
      case 'ne':
        params.push(value);
        return `${field} != ?`;
      case 'gt':
        params.push(value);
        return `${field} > ?`;
      case 'gte':
        params.push(value);
        return `${field} >= ?`;
      case 'lt':
        params.push(value);
        return `${field} < ?`;
      case 'lte':
        params.push(value);
        return `${field} <= ?`;
      case 'contains':
        params.push(`%${value}%`);
        return `${field} LIKE ?`;
      case 'startsWith':
        params.push(`${value}%`);
        return `${field} LIKE ?`;
      case 'endsWith':
        params.push(`%${value}`);
        return `${field} LIKE ?`;
      case 'isNull':
        return `${field} IS NULL`;
      case 'isNotNull':
        return `${field} IS NOT NULL`;
      case 'in':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...value);
          return `${field} IN (${placeholders})`;
        }
        return null;
      case 'notIn':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...value);
          return `${field} NOT IN (${placeholders})`;
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * 构建排序子句
   */
  private buildOrderClause(sort?: { field: string; order: 'asc' | 'desc' }[]): string {
    if (!sort || sort.length === 0) {
      return 'ORDER BY timestamp DESC';
    }

    const orderParts = sort.map(s => `${s.field} ${s.order.toUpperCase()}`);
    return `ORDER BY ${orderParts.join(', ')}`;
  }

  /**
   * 转换日志记录
   */
  private transformLog(row: Record<string, unknown>): UnifiedLog {
    return {
      id: row.id as string,
      logType: row.logType as LogType,
      timestamp: row.timestamp as string,
      campaignId: row.campaignId as string | null,
      flowId: row.flowId as string | null,
      offerId: row.offerId as string | null,
      landingPageId: row.landingPageId as string | null,
      visitorId: row.visitorId as string | null,
      clickId: row.clickId as string | null,
      conversionId: row.conversionId as string | null,
      ip: row.ip as string | null,
      userAgent: row.userAgent as string | null,
      country: row.country as string | null,
      city: row.city as string | null,
      deviceType: row.deviceType as string | null,
      browser: row.browser as string | null,
      os: row.os as string | null,
      data: row.data ? JSON.parse(row.data as string) : null,
      createdAt: row.createdAt as string,
    };
  }

  /**
   * 转换导出任务记录
   */
  private transformExportTask(row: Record<string, unknown>): LogExportTask {
    return {
      id: row.id as string,
      userId: row.userId as string,
      logType: row.logType as LogType,
      filters: row.filters ? JSON.parse(row.filters as string) : null,
      format: row.format as ExportFormat,
      status: row.status as ExportStatus,
      totalRecords: (row.totalRecords as number) || 0,
      processedRecords: (row.processedRecords as number) || 0,
      filePath: row.filePath as string | null,
      fileSize: (row.fileSize as number) || 0,
      error: row.error as string | null,
      startedAt: row.startedAt as string | null,
      completedAt: row.completedAt as string | null,
      expiresAt: row.expiresAt as string,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  }

  /**
   * 数组转记录
   */
  private arrayToRecord<K extends string>(
    arr: Array<Record<string, unknown>>,
    keyField: K,
    valueField: string
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of arr) {
      const key = item[keyField] as string;
      const value = item[valueField] as number;
      if (key && typeof value === 'number') {
        result[key] = value;
      }
    }
    return result;
  }
}

/**
 * 创建 LogExplorerService 实例
 */
export function createLogExplorerService(env: Env): LogExplorerService {
  return new LogExplorerService(env);
}
