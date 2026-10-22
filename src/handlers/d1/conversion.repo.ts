/**
 * @fileoverview Conversion 数据仓库
 * @description 封装 Conversion 相关的所有数据库操作
 * @module handlers/d1/conversion.repo
 * 
 * 输入: ConversionData 对象、查询参数
 * 输出: 转化记录数据、查询结果列表
 * 逻辑交互: 被 ConversionService 和 ConversionLogRoutes 调用
 * 前后端交互: 通过 D1 数据库进行数据持久化
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import {
  LIST_COUNT_CAP,
  buildCappedCountSql,
  interpretCappedCount,
  resolveListWindow,
} from './list-query';
import type { ConversionData } from '@/types/tracking';

export interface ConversionQueryParams {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  offerId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  country?: string;
  device?: string;
  search?: string;
}

export interface ConversionListResult {
  list: ConversionData[];
  /**
   * 匹配行数。精确值；totalCapped=true 时是下界 LIST_COUNT_CAP；
   * 仅 pageOutOfRange=true（请求窗口超出可服务范围）时为 null。
   */
  total: number | null;
  page: number;
  pageSize: number;
  /** 当前页之后是否还有行（列表查询多取 1 行得出，与 total 是否截断无关）。 */
  hasMore: boolean;
  /** 真实行数超过 LIST_COUNT_CAP，total 只是下界而非精确值。 */
  totalCapped: boolean;
  /** totalCapped 的契约别名；调用方读任一字段含义相同。 */
  totalIsApproximate: boolean;
  /** 请求页码窗口超出 LIST_COUNT_CAP，未执行 D1 查询，list 为空。 */
  pageOutOfRange: boolean;
}

/** 导出用的 keyset 游标：按 (timestamp, conversionId) 倒序推进，不依赖 OFFSET。 */
export interface ConversionExportCursor {
  timestamp: string;
  conversionId: string;
}

/** 一批导出数据；hasMore 由多取 1 行判定。 */
export interface ConversionExportBatch {
  list: ConversionData[];
  hasMore: boolean;
  nextCursor: ConversionExportCursor | null;
}

export interface ConversionStats {
  totalConversions: number;
  approvedConversions: number;
  pendingConversions: number;
  rejectedConversions: number;
  totalRevenue: number;
  totalPayout: number;
}

export class ConversionRepository extends BaseRepository<ConversionData> {
  constructor(db: D1Database) {
    super(db, 'conversions');
  }

  /**
   * 保存转化记录到数据库
   */
  async saveConversion(data: ConversionData): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO conversions (
          id, conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.conversionId,
        data.conversionId,
        data.clickId,
        data.campaignId,
        data.offerId,
        data.timestamp,
        data.revenue,
        data.payout,
        data.currency,
        data.conversionType,
        data.offerName,
        'approved',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        now
      )
      .run();
  }

  /**
   * 构造转化列表/导出的过滤子句与绑定参数（占位符顺序 = 参数顺序）。
   *
   * @param params 查询参数；空字符串/undefined 条件会被跳过。
   * @returns conditions（未加 WHERE）与 values。
   */
  private buildConversionFilters(params: ConversionQueryParams): {
    conditions: string[];
    values: (string | number)[];
  } {
    const {
      campaignId,
      offerId,
      startDate,
      endDate,
      status,
      country,
      device,
      search,
    } = params;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (campaignId) {
      conditions.push('campaignId = ?');
      values.push(campaignId);
    }
    if (offerId) {
      conditions.push('offerId = ?');
      values.push(offerId);
    }
    if (startDate) {
      conditions.push('timestamp >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('timestamp <= ?');
      values.push(endDate);
    }
    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }
    if (country) {
      conditions.push('country = ?');
      values.push(country);
    }
    if (device) {
      conditions.push('device = ?');
      values.push(device);
    }
    if (search) {
      conditions.push('(conversionId LIKE ? OR clickId LIKE ? OR offerName LIKE ?)');
      const searchPattern = `%${search}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }

    return { conditions, values };
  }

  /**
   * 导出一批转化：按 (timestamp, conversionId) 倒序 keyset 翻页，不使用 OFFSET。
   *
   * 为什么不用 findConversions 深翻页：OFFSET 会先扫描并丢弃 offset 行，导出几万行
   * 时单条查询必然越过 D1 7500 行预算。keyset 每批只读 limit + 1 行（<= 7001）。
   *
   * @param params 与列表相同的过滤条件（不含 page/pageSize）。
   * @param cursor 上一批最后一行的 (timestamp, conversionId)；null 表示从最新开始。
   * @param limit 本批最多返回行数，内部钳制到 [1, LIST_COUNT_CAP]。
   * @returns 本批行、是否还有更多、下一批游标；只读且幂等。
   */
  async findConversionsForExport(
    params: ConversionQueryParams,
    cursor: ConversionExportCursor | null = null,
    limit: number = LIST_COUNT_CAP
  ): Promise<ConversionExportBatch> {
    const { conditions, values } = this.buildConversionFilters(params);
    const bound: (string | number)[] = [...values];

    if (cursor) {
      conditions.push('(timestamp < ? OR (timestamp = ? AND conversionId < ?))');
      bound.push(cursor.timestamp, cursor.timestamp, cursor.conversionId);
    }

    const requested = Number.isFinite(limit) ? Math.floor(limit) : LIST_COUNT_CAP;
    const pageSize = Math.min(Math.max(1, requested), LIST_COUNT_CAP);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db
      .prepare(`
        SELECT 
          conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3
        FROM conversions 
        ${whereClause}
        ORDER BY timestamp DESC, conversionId DESC
        LIMIT ?
      `)
      .bind(...bound, pageSize + 1)
      .all();

    const rows = (result.results as unknown as ConversionData[]) || [];
    const hasMore = rows.length > pageSize;
    const list = hasMore ? rows.slice(0, pageSize) : rows;
    const last = list.length > 0 ? list[list.length - 1] : undefined;

    return {
      list,
      hasMore,
      nextCursor: last ? { timestamp: last.timestamp, conversionId: last.conversionId } : null,
    };
  }

  /**
   * 查询转化日志列表（支持分页和筛选）。
   *
   * D1 行读预算（why）:
   *   - COUNT 使用 `SELECT COUNT(*) FROM (SELECT 1 ... LIMIT cap+1)`，最多读
   *     LIST_COUNT_CAP + 1 = 7001 行，不再全表扫描；
   *   - 列表查询多取 1 行判断 hasMore，页码窗口保证最多读 7001 行；
   *   - 超出窗口的页码直接返回空列表且不访问 D1。
   *
   * @param params 分页与筛选条件；page/pageSize 会归一化（pageSize 上限 100）。
   * @returns 列表、total（截断时为下界，越界时为 null）、hasMore 与截断标记。
   * @throws D1 查询失败时向上抛出；本方法只读，可安全重试（幂等）。
   */
  async findConversions(params: ConversionQueryParams): Promise<ConversionListResult> {
    const { page, pageSize, offset, pageOutOfRange } = resolveListWindow(
      params.page,
      params.pageSize
    );

    if (pageOutOfRange) {
      return {
        list: [],
        total: null,
        page,
        pageSize,
        hasMore: false,
        totalCapped: false,
        totalIsApproximate: false,
        pageOutOfRange: true,
      };
    }

    const { conditions, values } = this.buildConversionFilters(params);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db
      .prepare(buildCappedCountSql(this.tableName, whereClause))
      .bind(...values, LIST_COUNT_CAP + 1)
      .first();
    const counted = interpretCappedCount(countResult?.total);
    const total: number | null = counted.total;
    const totalCapped = counted.totalCapped;

    // 精确 total 已证明当前 offset 之后没有行，无需再发列表查询。
    if (total !== null && !totalCapped && offset >= total) {
      return {
        list: [],
        total,
        page,
        pageSize,
        hasMore: false,
        totalCapped: false,
        totalIsApproximate: false,
        pageOutOfRange: false,
      };
    }

    const listSql = `
      SELECT 
        conversionId, clickId, campaignId, offerId,
        timestamp, revenue, payout, currency, conversionType, offerName,
        status, ip, country, device, browser, source,
        subId1, subId2, subId3
      FROM conversions 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const listValues = [...values, pageSize + 1, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const rows = (listResult.results as unknown as ConversionData[]) || [];
    const hasMore = rows.length > pageSize;
    const list = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      list,
      total,
      page,
      pageSize,
      hasMore,
      totalCapped,
      totalIsApproximate: totalCapped,
      pageOutOfRange: false,
    };
  }

  /**
   * 根据 conversionId 获取单条转化详情
   */
  async findByConversionId(conversionId: string): Promise<ConversionData | null> {
    const result = await this.db
      .prepare(`
        SELECT 
          conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3
        FROM conversions 
        WHERE conversionId = ?
      `)
      .bind(conversionId)
      .first();
    
    return result as ConversionData | null;
  }

  /**
   * 根据 clickId 获取转化记录
   */
  async findByClickId(clickId: string): Promise<ConversionData[]> {
    const result = await this.db
      .prepare(`
        SELECT 
          conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3
        FROM conversions 
        WHERE clickId = ?
        ORDER BY timestamp DESC
      `)
      .bind(clickId)
      .all();
    
    return (result.results as unknown as ConversionData[]) || [];
  }

  /**
   * 获取转化统计概览
   */
  async getConversionStats(
    startDate: string, 
    endDate: string, 
    campaignId?: string
  ): Promise<ConversionStats> {
    let sql = `
      SELECT 
        COUNT(*) as totalConversions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedConversions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingConversions,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedConversions,
        SUM(CASE WHEN status = 'approved' THEN revenue ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN status = 'approved' THEN payout ELSE 0 END) as totalPayout
      FROM conversions 
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    
    const values: (string | number)[] = [startDate, endDate];
    
    if (campaignId) {
      sql += ' AND campaignId = ?';
      values.push(campaignId);
    }

    const result = await this.db.prepare(sql).bind(...values).first();
    
    return {
      totalConversions: (result?.totalConversions as number) || 0,
      approvedConversions: (result?.approvedConversions as number) || 0,
      pendingConversions: (result?.pendingConversions as number) || 0,
      rejectedConversions: (result?.rejectedConversions as number) || 0,
      totalRevenue: (result?.totalRevenue as number) || 0,
      totalPayout: (result?.totalPayout as number) || 0,
    };
  }

  /**
   * 更新转化状态
   */
  async updateStatus(conversionId: string, status: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE conversions SET status = ? WHERE conversionId = ?')
      .bind(status, conversionId)
      .run();
    
    return result.success;
  }
}
