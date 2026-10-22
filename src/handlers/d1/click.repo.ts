/**
 * @fileoverview Click 数据仓库
 * @description 封装 Click 相关的所有数据库操作，包括查询点击日志等
 * @module handlers/d1/click.repo
 *
 * 输入: ClickData 对象、查询参数（分页、筛选条件）
 * 输出: 点击记录数据、查询结果列表
 * 逻辑交互:
 *   - 继承 BaseRepository 获取基础 CRUD 能力
 *   - ClickService 调用本文件保存点击
 *   - Analytics routes 使用本文件查询点击数据
 * 前后端交互: 通过 D1 数据库进行数据读写
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
  buildClickStatsSql,
  buildStatsGroupSql,
  normalizeTopN,
  resolveStatsWindow,
  toFiniteNumber,
} from './stats-query';
import type { StatsBreakdownItem, StatsWindow } from './stats-query';
import type { ClickData } from '@/types/tracking';

export interface ClickQueryParams {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  visitorId?: string;
  offerId?: string;
  flowId?: string;
  isUnique?: boolean;
  search?: string;
}

export interface ClickListResult {
  list: ClickData[];
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

/** 导出用的 keyset 游标：按 (timestamp, clickId) 倒序推进，不依赖 OFFSET。 */
export interface ClickExportCursor {
  timestamp: string;
  clickId: string;
}

/** 一批导出数据；hasMore 由多取 1 行判定。 */
export interface ClickExportBatch {
  list: ClickData[];
  hasMore: boolean;
  nextCursor: ClickExportCursor | null;
}

/** stats 的既有字段（保持向后兼容，字段名与类型不变）。 */
export interface ClickStats {
  totalClicks: number;
  uniqueClicks: number;
  countries: number;
  deviceTypes: number;
}

/** getClickStats 的可选控制项。 */
export interface ClickStatsOptions {
  /** 当前时间，仅测试注入；默认 `new Date()`。 */
  now?: Date;
  /** 可选 topN 分组；0/非法表示不分组。 */
  topN?: number | string;
}

/** stats 响应：既有字段 + 时间窗/行读预算的可观测元数据。 */
export interface ClickStatsResult extends ClickStats {
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
  /** 仅当请求 topN 时返回：读取窗口内点击数最多的国家。 */
  byCountry?: StatsBreakdownItem[];
  /** 仅当请求 topN 时返回：读取窗口内点击数最多的设备。 */
  byDevice?: StatsBreakdownItem[];
}

export class ClickRepository extends BaseRepository<ClickData> {
  constructor(db: D1Database) {
    super(db, 'clicks');
  }

  /**
   * 保存点击记录到数据库。
   *
   * 列名必须与 migrations 010/019/022/050/051 的真实 schema 一致：布尔列统一
   * 绑定 0/1，riskReasons 只做 JSON.stringify（空数组落 NULL）。schema 没有
   * deviceFingerprint 列，因此不写入；serverFingerprint/clientFingerprint 无
   * 数据时保持 NULL。
   */
  async saveClick(data: ClickData): Promise<void> {
    const now = new Date().toISOString();
    // 缺失时保持旧行为（唯一）；只有显式 false 才落 0。
    const isUnique = data.isUnique === false ? 0 : 1;
    const riskReasons =
      Array.isArray(data.riskReasons) && data.riskReasons.length > 0
        ? JSON.stringify(data.riskReasons)
        : null;

    const values: (string | number | null)[] = [
      data.clickId, // id
      data.clickId,
      data.campaignId,
      data.flowId ?? null,
      data.landingPageId ?? null,
      data.offerId ?? null,
      data.timestamp,
      data.ip,
      data.userAgent,
      data.referer ?? null,
      data.country ?? null,
      data.city ?? null,
      data.device ?? null,
      data.browser ?? null,
      data.os ?? null,
      data.isp ?? null,
      data.connectionType ?? null,
      data.visitorId,
      data.subId1 ?? null,
      data.subId2 ?? null,
      data.subId3 ?? null,
      data.subId4 ?? null,
      data.subId5 ?? null,
      data.cost,
      isUnique,
      data.redirectUrl ?? null,
      now,
      data.cfRayId ?? null,
      data.cfBotScore ?? null,
      data.fingerprint ?? null,
      data.riskScore ?? 0,
      data.isBot === true ? 1 : 0,
      data.isSuspicious === true ? 1 : 0,
      riskReasons,
      data.ja3Hash ?? data.cfBotJA3Hash ?? null,
      data.utmSource ?? null,
      data.utmMedium ?? null,
      data.utmCampaign ?? null,
      data.utmTerm ?? null,
      data.utmContent ?? null,
    ];

    try {
      await this.db
        .prepare(`
          INSERT INTO clicks (
            id, clickId, campaignId, flowId, landingPageId, offerId,
            timestamp, ip, userAgent, referer, country, city,
            device, browser, os, isp, connectionType, visitorId,
            subId1, subId2, subId3, subId4, subId5, cost, isUnique, redirectUrl, createdAt,
            cfRayId, cfBotScore, fingerprint, riskScore, isBot, isSuspicious, riskReasons, ja3Hash,
            utmSource, utmMedium, utmCampaign, utmTerm, utmContent
          ) VALUES (${values.map(() => '?').join(', ')})
        `)
        .bind(...values)
        .run();
    } catch (error) {
      console.error('[ClickRepository] saveClick error:', error);
      throw error;
    }
  }

  /**
   * 构造点击列表/导出的过滤子句与绑定参数（占位符顺序 = 参数顺序）。
   *
   * @param params 查询参数；空字符串/undefined 条件会被跳过。
   * @returns conditions（未加 WHERE）与 values。
   */
  private buildClickFilters(params: ClickQueryParams): {
    conditions: string[];
    values: (string | number)[];
  } {
    const {
      campaignId,
      startDate,
      endDate,
      country,
      device,
      browser,
      os,
      ip,
      visitorId,
      offerId,
      flowId,
      isUnique,
      search,
    } = params;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (campaignId) {
      conditions.push('campaignId = ?');
      values.push(campaignId);
    }
    if (startDate) {
      conditions.push('timestamp >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('timestamp <= ?');
      values.push(endDate);
    }
    if (country) {
      conditions.push('country = ?');
      values.push(country);
    }
    if (device) {
      conditions.push('device = ?');
      values.push(device);
    }
    if (browser) {
      conditions.push('browser = ?');
      values.push(browser);
    }
    if (os) {
      conditions.push('os = ?');
      values.push(os);
    }
    if (ip) {
      conditions.push('ip = ?');
      values.push(ip);
    }
    if (visitorId) {
      conditions.push('visitorId = ?');
      values.push(visitorId);
    }
    if (offerId) {
      conditions.push('offerId = ?');
      values.push(offerId);
    }
    if (flowId) {
      conditions.push('flowId = ?');
      values.push(flowId);
    }
    if (isUnique !== undefined) {
      conditions.push('isUnique = ?');
      values.push(isUnique ? 1 : 0);
    }
    if (search) {
      conditions.push('(clickId LIKE ? OR ip LIKE ? OR visitorId LIKE ? OR userAgent LIKE ?)');
      const searchPattern = `%${search}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    return { conditions, values };
  }

  /**
   * 导出一批点击：按 (timestamp, clickId) 倒序 keyset 翻页，不使用 OFFSET。
   *
   * 为什么不用 findClicks 深翻页：OFFSET 会先扫描并丢弃 offset 行，导出几万行时
   * 单条查询必然越过 D1 7500 行预算。keyset 每批只读 limit + 1 行（<= 7001）。
   *
   * @param params 与列表相同的过滤条件（不含 page/pageSize）。
   * @param cursor 上一批最后一行的 (timestamp, clickId)；null 表示从最新开始。
   * @param limit 本批最多返回行数，内部钳制到 [1, LIST_COUNT_CAP]。
   * @returns 本批行、是否还有更多、下一批游标；只读且幂等。
   */
  async findClicksForExport(
    params: ClickQueryParams,
    cursor: ClickExportCursor | null = null,
    limit: number = LIST_COUNT_CAP
  ): Promise<ClickExportBatch> {
    const { conditions, values } = this.buildClickFilters(params);
    const bound: (string | number)[] = [...values];

    if (cursor) {
      conditions.push('(timestamp < ? OR (timestamp = ? AND clickId < ?))');
      bound.push(cursor.timestamp, cursor.timestamp, cursor.clickId);
    }

    const requested = Number.isFinite(limit) ? Math.floor(limit) : LIST_COUNT_CAP;
    const pageSize = Math.min(Math.max(1, requested), LIST_COUNT_CAP);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db
      .prepare(`
        SELECT 
          clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, subId4, subId5, cost
        FROM clicks 
        ${whereClause}
        ORDER BY timestamp DESC, clickId DESC
        LIMIT ?
      `)
      .bind(...bound, pageSize + 1)
      .all();

    const rows = (result.results as unknown as ClickData[]) || [];
    const hasMore = rows.length > pageSize;
    const list = hasMore ? rows.slice(0, pageSize) : rows;
    const last = list.length > 0 ? list[list.length - 1] : undefined;

    return {
      list,
      hasMore,
      nextCursor: last ? { timestamp: last.timestamp, clickId: last.clickId } : null,
    };
  }

  /**
   * 查询点击日志列表（支持分页和筛选）。
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
  async findClicks(params: ClickQueryParams): Promise<ClickListResult> {
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

    const { conditions, values } = this.buildClickFilters(params);
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
        clickId, campaignId, flowId, landingPageId, offerId,
        timestamp, ip, userAgent, referer, country, city,
        device, browser, os, isp, connectionType, visitorId,
        subId1, subId2, subId3, subId4, subId5, cost
      FROM clicks 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const listValues = [...values, pageSize + 1, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const rows = (listResult.results as unknown as ClickData[]) || [];
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
   * 根据 clickId 获取单条点击详情
   */
  async findByClickId(clickId: string): Promise<ClickData | null> {
    const result = await this.db
      .prepare(`
        SELECT 
          clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, subId4, subId5, cost
        FROM clicks 
        WHERE clickId = ?
      `)
      .bind(clickId)
      .first();
    
    return result as ClickData | null;
  }

  /**
   * 获取最近的点击记录（用于 SSE 实时流）
   */
  async getRecentClicks(limit: number = 50, afterTimestamp?: string): Promise<ClickData[]> {
    let sql = `
      SELECT 
        clickId, campaignId, flowId, landingPageId, offerId,
        timestamp, ip, userAgent, referer, country, city,
        device, browser, os, isp, connectionType, visitorId,
        subId1, subId2, subId3, subId4, subId5, cost
      FROM clicks 
    `;
    
    const values: (string | number)[] = [];
    
    if (afterTimestamp) {
      sql += ' WHERE timestamp > ?';
      values.push(afterTimestamp);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    values.push(limit);

    const result = await this.db.prepare(sql).bind(...values).all();
    return (result.results as unknown as ClickData[]) || [];
  }

  /**
   * 获取点击统计概览。
   *
   * D1 行读预算（why）:
   *   - 时间窗缺失/非法回退默认最近 7 天，超过 90 天截断并返回 rangeCapped；
   *   - 聚合基于 `WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
   *     LIMIT STATS_ROW_LIMIT` 的子查询，最多读 7000 行，依赖 idx_clicks_timestamp；
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
  async getClickStats(
    startDate?: string,
    endDate?: string,
    campaignId?: string,
    options: ClickStatsOptions = {}
  ): Promise<ClickStatsResult> {
    const window = resolveStatsWindow(startDate, endDate, options.now);
    const campaignValues = campaignId ? [campaignId] : [];

    const result = await this.db
      .prepare(buildClickStatsSql(campaignId))
      .bind(window.startDate, window.endDate, ...campaignValues, STATS_ROW_LIMIT)
      .first();

    const totalClicks = toFiniteNumber(result?.totalClicks);
    const stats: ClickStatsResult = {
      totalClicks,
      uniqueClicks: toFiniteNumber(result?.uniqueClicks),
      countries: toFiniteNumber(result?.countries),
      deviceTypes: toFiniteNumber(result?.deviceTypes),
      rangeStart: window.startDate,
      rangeEnd: window.endDate,
      rangeCapped: window.rangeCapped,
      rangeDefaulted: window.rangeDefaulted,
      rowLimit: STATS_ROW_LIMIT,
      rowCapped: totalClicks >= STATS_ROW_LIMIT,
      rowsScanned: Math.min(totalClicks, STATS_ROW_LIMIT),
    };

    const topN = normalizeTopN(options.topN);
    if (topN === 0) return stats;

    const [byCountry, byDevice] = await Promise.all([
      this.queryClickBreakdown('country', window, campaignId, topN),
      this.queryClickBreakdown('device', window, campaignId, topN),
    ]);

    return { ...stats, byCountry, byDevice };
  }

  /**
   * 查询 stats 的 topN 分组；SQL 内部同时受行上限与 topN 限制。
   *
   * @param column 分组列，仅接受 `country` / `device` 常量。
   * @param window 已归一化的时间窗。
   * @param campaignId 可选 campaign 过滤。
   * @param topN 已归一化的分组条数（1..STATS_TOP_N_MAX）。
   * @returns 按 clicks 倒序的分组项；空值/空串不计入。
   */
  private async queryClickBreakdown(
    column: 'country' | 'device',
    window: StatsWindow,
    campaignId: string | undefined,
    topN: number
  ): Promise<StatsBreakdownItem[]> {
    const campaignValues = campaignId ? [campaignId] : [];
    const result = await this.db
      .prepare(buildStatsGroupSql('clicks', column, campaignId))
      .bind(window.startDate, window.endDate, ...campaignValues, STATS_ROW_LIMIT, topN)
      .all();

    return (result.results as unknown as StatsBreakdownItem[]) || [];
  }

  /**
   * 根据 visitorId 获取该访客的所有点击记录
   */
  async findByVisitorId(visitorId: string, limit: number = 100): Promise<ClickData[]> {
    const result = await this.db
      .prepare(`
        SELECT 
          clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, subId4, subId5, cost
        FROM clicks 
        WHERE visitorId = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .bind(visitorId, limit)
      .all();
    
    return (result.results as unknown as ClickData[]) || [];
  }

  /**
   * 更新点击记录的 isUnique 状态
   */
  async updateUniqueStatus(clickId: string, isUnique: boolean): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE clicks SET isUnique = ? WHERE clickId = ?')
      .bind(isUnique ? 1 : 0, clickId)
      .run();
    
    return result.success;
  }
}
