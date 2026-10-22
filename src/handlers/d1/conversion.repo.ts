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
import {
  STATS_ROW_LIMIT,
  buildConversionStatsSql,
  buildStatsGroupSql,
  normalizeTopN,
  resolveStatsWindow,
  toFiniteNumber,
} from './stats-query';
import type { StatsBreakdownItem, StatsWindow } from './stats-query';
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

/**
 * 一次插入尝试的结果。
 *
 * `inserted=false` 只表示该 `idempotencyKey` 已经存在（并发/重试回传的输家），
 * 不代表写入失败；写入失败会抛异常，调用方不得把异常当成 duplicate。
 */
export interface SaveConversionResult {
  inserted: boolean;
}

export interface ConversionStats {
  totalConversions: number;
  approvedConversions: number;
  pendingConversions: number;
  rejectedConversions: number;
  totalRevenue: number;
  totalPayout: number;
}

/** getConversionStats 的可选控制项。 */
export interface ConversionStatsOptions {
  /** 当前时间，仅测试注入；默认 `new Date()`。 */
  now?: Date;
  /** 可选 topN 分组；0/非法表示不分组。 */
  topN?: number | string;
}

/** stats 响应：既有字段 + 时间窗/行读预算的可观测元数据。 */
export interface ConversionStatsResult extends ConversionStats {
  /** 实际生效的起始时间（ISO 8601，UTC）。 */
  rangeStart: string;
  /** 实际生效的结束时间（ISO 8601，UTC）。 */
  rangeEnd: string;
  /** 请求区间超过 90 天，已截断（保留 endDate）。 */
  rangeCapped: boolean;
  /** 请求缺失/非法，已回退默认最近 7 天。 */
  rangeDefaulted: boolean;
  /** 单次聚合的行读上限（STATS_ROW_LIMIT）。 */
  rowLimit: number;
  /** 聚合达到/超过 rowLimit，数值是下界而非完整窗口的精确值。 */
  rowCapped: boolean;
  /** 实际参与聚合的行数（<= rowLimit）。 */
  rowsScanned: number;
  /** 仅当请求 topN 时返回：读取窗口内转化最多的国家。 */
  byCountry?: StatsBreakdownItem[];
  /** 仅当请求 topN 时返回：读取窗口内转化最多的设备。 */
  byDevice?: StatsBreakdownItem[];
}

export class ConversionRepository extends BaseRepository<ConversionData> {
  constructor(db: D1Database) {
    super(db, 'conversions');
  }

  /**
   * 保存转化记录到数据库；同一个 clickId 最多落一行。
   *
   * 幂等 why: postback 平台会重试，并发重试可能同时通过前置查询。
   * `idempotencyKey = clickId` 上的唯一索引（迁移 084）让数据库裁决胜负：
   * `ON CONFLICT(idempotencyKey) DO NOTHING` 只吞掉这一条索引冲突。
   * 不用 `INSERT OR IGNORE`：它会连主键/`conversionId` 冲突一起吞掉，
   * 把真实写入故障伪装成“重复”。
   *
   * @param data 转化记录；`idempotencyKey` 由本方法写入为 `data.clickId`。
   *        空 clickId 写 NULL 而不是空字符串：NULL 之间不冲突，否则所有无
   *        clickId 的写入会挤在同一个 "" 键上，互相被当成重复吞掉。
   * @returns inserted=false 表示该 clickId 已有转化，本次没有写入任何行。
   * @throws D1 写入失败（含唯一索引缺失）一律向上抛，由调用方 fail-closed。
   * @sideEffects inserted=true 时向 D1 `conversions` 写入一行。
   */
  async saveConversion(data: ConversionData): Promise<SaveConversionResult> {
    const now = new Date().toISOString();
    const idempotencyKey = data.clickId || null;

    const result = await this.db
      .prepare(`
        INSERT INTO conversions (
          id, conversionId, clickId, idempotencyKey, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(idempotencyKey) DO NOTHING
      `)
      .bind(
        data.conversionId,
        data.conversionId,
        data.clickId,
        idempotencyKey,
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

    // D1 用 meta.changes 报告实际影响行数；DO NOTHING 命中时是 0。
    return { inserted: Number(result?.meta?.changes ?? 0) > 0 };
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
   * 获取转化统计概览。
   *
   * D1 行读预算（why）:
   *   - 时间窗缺失/非法回退默认最近 7 天，超过 90 天截断并返回 rangeCapped；
   *   - 聚合基于 `WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
   *     LIMIT STATS_ROW_LIMIT` 的子查询，最多读 7000 行，依赖 idx_conversions_timestamp；
   *   - 达到行上限时 rowCapped=true，返回值是下界，禁止当作精确值；
   *   - 可选 topN 分组各自带行上限与 LIMIT，不返回无界分组结果。
   *
   * @param startDate 起始时间；`YYYY-MM-DD` 或 ISO 8601，缺省用默认窗口。
   * @param endDate 结束时间；`YYYY-MM-DD` 或 ISO 8601，缺省用默认窗口。
   * @param campaignId 可选 campaign 过滤。
   * @param options 仅测试注入的 now 与可选 topN 分组。
   * @returns 既有 stats 字段 + 时间窗/行读元数据；topN>0 时附加 byCountry/byDevice。
   * @throws D1 查询失败时向上抛出；本方法只读，可安全重试（幂等）。
   */
  async getConversionStats(
    startDate?: string,
    endDate?: string,
    campaignId?: string,
    options: ConversionStatsOptions = {}
  ): Promise<ConversionStatsResult> {
    const window = resolveStatsWindow(startDate, endDate, options.now);
    const campaignValues = campaignId ? [campaignId] : [];

    const result = await this.db
      .prepare(buildConversionStatsSql(campaignId))
      .bind(window.startDate, window.endDate, ...campaignValues, STATS_ROW_LIMIT)
      .first();

    const totalConversions = toFiniteNumber(result?.totalConversions);
    const stats: ConversionStatsResult = {
      totalConversions,
      approvedConversions: toFiniteNumber(result?.approvedConversions),
      pendingConversions: toFiniteNumber(result?.pendingConversions),
      rejectedConversions: toFiniteNumber(result?.rejectedConversions),
      totalRevenue: toFiniteNumber(result?.totalRevenue),
      totalPayout: toFiniteNumber(result?.totalPayout),
      rangeStart: window.startDate,
      rangeEnd: window.endDate,
      rangeCapped: window.rangeCapped,
      rangeDefaulted: window.rangeDefaulted,
      rowLimit: STATS_ROW_LIMIT,
      rowCapped: totalConversions >= STATS_ROW_LIMIT,
      rowsScanned: Math.min(totalConversions, STATS_ROW_LIMIT),
    };

    const topN = normalizeTopN(options.topN);
    if (topN === 0) return stats;

    const [byCountry, byDevice] = await Promise.all([
      this.queryConversionBreakdown('country', window, campaignId, topN),
      this.queryConversionBreakdown('device', window, campaignId, topN),
    ]);

    return { ...stats, byCountry, byDevice };
  }

  /**
   * 查询转化 stats 的 topN 分组；SQL 内部同时受行上限与 topN 限制。
   *
   * @param column 分组列，仅接受 `country` / `device` 常量。
   * @param window 已归一化的时间窗。
   * @param campaignId 可选 campaign 过滤。
   * @param topN 已归一化的分组条数（1..STATS_TOP_N_MAX）。
   * @returns 按 clicks 倒序的分组项；空值/空串不计入。
   */
  private async queryConversionBreakdown(
    column: 'country' | 'device',
    window: StatsWindow,
    campaignId: string | undefined,
    topN: number
  ): Promise<StatsBreakdownItem[]> {
    const campaignValues = campaignId ? [campaignId] : [];
    const result = await this.db
      .prepare(buildStatsGroupSql('conversions', column, campaignId))
      .bind(window.startDate, window.endDate, ...campaignValues, STATS_ROW_LIMIT, topN)
      .all();

    return (result.results as unknown as StatsBreakdownItem[]) || [];
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
