/**
 * @fileoverview Click 数据仓库
 * @description 封装 Click 相关的所有数据库操作，支持FTS5全文搜索和查询缓存
 * @module handlers/d1/click.repo
 *
 * 输入: ClickData 对象、查询参数（分页、筛选条件）
 * 输出: 点击记录数据、查询结果列表
 * 逻辑交互:
 *   - 继承 BaseRepository 获取基础 CRUD 能力
 *   - ClickService 调用本文件保存点击
 *   - Analytics routes 使用本文件查询点击数据
 *   - QueryCache 提供查询结果缓存
 * 前后端交互: 通过 D1 数据库进行数据读写
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { ClickData } from '@/types/tracking';
import { QueryCache, buildQueryCacheKey } from '@/utils/queryCache';

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
  total: number;
  page: number;
  pageSize: number;
}

const GOVERNANCE_COLUMN_NAMES = ['matchedRuleId', 'matchedRuleLayer', 'matchedRuleReason'] as const;

const BASE_CLICK_COLUMNS = [
  'clickId', 'campaignId', 'flowId', 'landingPageId', 'offerId',
  'timestamp', 'ip', 'userAgent', 'referer', 'country', 'city',
  'device', 'browser', 'os', 'isp', 'connectionType', 'visitorId',
  'subId1', 'subId2', 'subId3', 'subId4', 'subId5',
  'subId6', 'subId7', 'subId8', 'subId9', 'subId10',
  'subId11', 'subId12', 'subId13', 'subId14', 'subId15',
  'subId16', 'subId17', 'subId18', 'subId19', 'subId20',
  'subId21', 'subId22', 'subId23', 'subId24', 'subId25',
  'subId26', 'subId27', 'subId28', 'subId29', 'subId30',
  'cost', 'isUnique', 'redirectUrl',
  'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent',
  'fingerprint', 'riskScore', 'isBot', 'isSuspicious', 'riskReasons',
  'ruleMatched', 'ruleBlocked',
];

const QUERY_TIMEOUT_MS = 5000;

export class ClickRepository extends BaseRepository<ClickData> {
  private readonly queryCache: QueryCache;
  private clickColumnsPromise: Promise<string[]> | null = null;

  constructor(db: D1Database) {
    super(db, 'clicks');
    this.queryCache = QueryCache.getInstance();
  }

  async saveClick(data: ClickData): Promise<void> {
    const now = new Date().toISOString();
    const availableColumns = await this.getClickColumns();
    const supportsGovernanceColumns = GOVERNANCE_COLUMN_NAMES.every((column) => availableColumns.includes(column));

    const columns = [
      'id', 'clickId', 'campaignId', 'flowId', 'landingPageId', 'offerId',
      'timestamp', 'ip', 'userAgent', 'referer', 'country', 'city',
      'device', 'browser', 'os', 'isp', 'connectionType', 'visitorId',
      'subId1', 'subId2', 'subId3', 'subId4', 'subId5',
      'subId6', 'subId7', 'subId8', 'subId9', 'subId10',
      'subId11', 'subId12', 'subId13', 'subId14', 'subId15',
      'subId16', 'subId17', 'subId18', 'subId19', 'subId20',
      'subId21', 'subId22', 'subId23', 'subId24', 'subId25',
      'subId26', 'subId27', 'subId28', 'subId29', 'subId30',
      'cost', 'isUnique', 'redirectUrl',
      'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent',
      'fingerprint', 'riskScore', 'isBot', 'isSuspicious', 'riskReasons',
      'ruleMatched', 'ruleBlocked',
      'createdAt',
    ];

    if (supportsGovernanceColumns) {
      columns.splice(columns.length - 1, 0, ...GOVERNANCE_COLUMN_NAMES);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const normalizedRiskReasons = this.normalizeRiskReasons(data, supportsGovernanceColumns);

    const values = [
      data.clickId,
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
      data.subId6 ?? null,
      data.subId7 ?? null,
      data.subId8 ?? null,
      data.subId9 ?? null,
      data.subId10 ?? null,
      data.subId11 ?? null,
      data.subId12 ?? null,
      data.subId13 ?? null,
      data.subId14 ?? null,
      data.subId15 ?? null,
      data.subId16 ?? null,
      data.subId17 ?? null,
      data.subId18 ?? null,
      data.subId19 ?? null,
      data.subId20 ?? null,
      data.subId21 ?? null,
      data.subId22 ?? null,
      data.subId23 ?? null,
      data.subId24 ?? null,
      data.subId25 ?? null,
      data.subId26 ?? null,
      data.subId27 ?? null,
      data.subId28 ?? null,
      data.subId29 ?? null,
      data.subId30 ?? null,
      data.cost ?? 0,
      (data.isUnique ?? true) ? 1 : 0,
      data.redirectUrl ?? null,
      data.utmSource ?? null,
      data.utmMedium ?? null,
      data.utmCampaign ?? null,
      data.utmTerm ?? null,
      data.utmContent ?? null,
      data.fingerprint ?? null,
      data.riskScore ?? 0,
      data.isBot ? 1 : 0,
      data.isSuspicious ? 1 : 0,
      normalizedRiskReasons,
      data.ruleMatched ? 1 : 0,
      data.ruleBlocked ? 1 : 0,
      now,
    ];

    if (supportsGovernanceColumns) {
      values.splice(
        values.length - 1,
        0,
        data.matchedRuleId ?? null,
        data.matchedRuleLayer ?? null,
        data.matchedRuleReason ?? null,
      );
    }

    try {
      const sql = `INSERT INTO clicks (${columns.join(', ')}) VALUES (${placeholders})`;
      console.log('[ClickRepository] SQL columns:', columns.length, 'values:', values.length);
      await this.db.prepare(sql).bind(...values).run();

      this.queryCache.invalidateByPrefix('query:clicks:');
    } catch (error) {
      console.error('[ClickRepository] saveClick error:', error);
      throw error;
    }
  }

  async findClicks(params: ClickQueryParams): Promise<ClickListResult> {
    const cacheKey = buildQueryCacheKey('clicks', params);
    const cached = this.queryCache.get<ClickListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.withTimeout(
      this.executeFindClicks(params),
      QUERY_TIMEOUT_MS,
    );

    this.queryCache.set(cacheKey, result, 30);
    return result;
  }

  private async executeFindClicks(params: ClickQueryParams): Promise<ClickListResult> {
    const {
      page = 1,
      pageSize = 20,
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
      conditions.push('c.campaignId = ?');
      values.push(campaignId);
    }
    if (startDate) {
      conditions.push('c.timestamp >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('c.timestamp <= ?');
      values.push(endDate);
    }
    if (country) {
      conditions.push('c.country = ?');
      values.push(country);
    }
    if (device) {
      conditions.push('c.device = ?');
      values.push(device);
    }
    if (browser) {
      conditions.push('c.browser = ?');
      values.push(browser);
    }
    if (os) {
      conditions.push('c.os = ?');
      values.push(os);
    }
    if (ip) {
      conditions.push('c.ip = ?');
      values.push(ip);
    }
    if (visitorId) {
      conditions.push('c.visitorId = ?');
      values.push(visitorId);
    }
    if (offerId) {
      conditions.push('c.offerId = ?');
      values.push(offerId);
    }
    if (flowId) {
      conditions.push('c.flowId = ?');
      values.push(flowId);
    }
    if (isUnique !== undefined) {
      conditions.push('c.isUnique = ?');
      values.push(isUnique ? 1 : 0);
    }

    let ftsCondition = '';
    let ftsValues: string[] = [];
    if (search && search.trim()) {
      const escapedSearch = search
        .replace(/"/g, '""')
        .replace(/'/g, "''");
      ftsCondition = `c.rowid IN (SELECT rowid FROM clicks_fts WHERE clicks_fts MATCH ?)`;
      ftsValues.push(`"${escapedSearch}"`);
    }

    const allConditions = [...conditions];
    if (ftsCondition) {
      allConditions.push(ftsCondition);
    }

    const whereClause = allConditions.length > 0
      ? `WHERE ${allConditions.join(' AND ')}`
      : '';

    const offset = (page - 1) * pageSize;

    const allValues = [...values, ...ftsValues];
    const countSql = `SELECT COUNT(*) as total FROM clicks c ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (allValues.length > 0
      ? countStmt.bind(...allValues)
      : countStmt).first();
    const total = (countResult?.total as number) || 0;
    const clickColumns = await this.getSelectableColumns();

    const listSql = `
      SELECT ${clickColumns}
      FROM clicks c
      ${whereClause}
      ORDER BY c.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const listValues = [...allValues, pageSize, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const list = (listResult.results as unknown as ClickData[]) || [];

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  async findByClickId(clickId: string): Promise<ClickData | null> {
    const cacheKey = `query:clicks:detail:${clickId}`;
    const cached = this.queryCache.get<ClickData>(cacheKey);
    if (cached) {
      return cached;
    }
    const clickColumns = await this.getSelectableColumns();

    const result = await this.db
      .prepare(`
        SELECT ${clickColumns}
        FROM clicks
        WHERE clickId = ?
      `)
      .bind(clickId)
      .first();

    const data = result as ClickData | null;
    if (data) {
      this.queryCache.set(cacheKey, data, 60);
    }
    return data;
  }

  async getRecentClicks(limit: number = 50, afterTimestamp?: string): Promise<ClickData[]> {
    const cacheKey = `query:clicks:recent:${limit}:${afterTimestamp ?? 'all'}`;
    return this.queryCache.getOrFetch(cacheKey, async () => {
      const clickColumns = await this.getSelectableColumns();
      let sql = `SELECT ${clickColumns} FROM clicks`;
      const values: (string | number)[] = [];

      if (afterTimestamp) {
        sql += ' WHERE timestamp > ?';
        values.push(afterTimestamp);
      }

      sql += ' ORDER BY timestamp DESC LIMIT ?';
      values.push(limit);

      const result = await this.db.prepare(sql).bind(...values).all();
      return (result.results as unknown as ClickData[]) || [];
    }, 15);
  }

  async getClickStats(
    startDate: string,
    endDate: string,
    campaignId?: string,
  ): Promise<{
    totalClicks: number;
    uniqueClicks: number;
    countries: number;
    deviceTypes: number;
  }> {
    const cacheKey = `query:clicks:stats:${startDate}:${endDate}:${campaignId ?? 'all'}`;
    return this.queryCache.getOrFetch(cacheKey, async () => {
      let sql = `
        SELECT
          COUNT(*) as totalClicks,
          SUM(CASE WHEN isUnique = 1 THEN 1 ELSE 0 END) as uniqueClicks,
          COUNT(DISTINCT country) as countries,
          COUNT(DISTINCT device) as deviceTypes
        FROM clicks
        WHERE timestamp >= ? AND timestamp <= ?
      `;

      const values: (string | number)[] = [startDate, endDate];

      if (campaignId) {
        sql += ' AND campaignId = ?';
        values.push(campaignId);
      }

      const result = await this.db.prepare(sql).bind(...values).first();

      return {
        totalClicks: (result?.totalClicks as number) || 0,
        uniqueClicks: (result?.uniqueClicks as number) || 0,
        countries: (result?.countries as number) || 0,
        deviceTypes: (result?.deviceTypes as number) || 0,
      };
    }, 30);
  }

  async findByVisitorId(visitorId: string, limit: number = 100): Promise<ClickData[]> {
    const cacheKey = `query:clicks:visitor:${visitorId}:${limit}`;
    return this.queryCache.getOrFetch(cacheKey, async () => {
      const clickColumns = await this.getSelectableColumns();
      const result = await this.db
        .prepare(`
          SELECT ${clickColumns}
          FROM clicks
          WHERE visitorId = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `)
        .bind(visitorId, limit)
        .all();

      return (result.results as unknown as ClickData[]) || [];
    }, 30);
  }

  async updateUniqueStatus(clickId: string, isUnique: boolean): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE clicks SET isUnique = ? WHERE clickId = ?')
      .bind(isUnique ? 1 : 0, clickId)
      .run();

    this.queryCache.invalidate(`query:clicks:detail:${clickId}`);
    this.queryCache.invalidateByPrefix('query:clicks:');

    return result.success;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms),
      ),
    ]);
  }

  private async getClickColumns(): Promise<string[]> {
    if (!this.clickColumnsPromise) {
      this.clickColumnsPromise = this.db
        .prepare('PRAGMA table_info(clicks)')
        .all<{ name: string }>()
        .then((result) => (result.results || [])
          .map((item) => item.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0));
    }

    return this.clickColumnsPromise;
  }

  private async getSelectableColumns(): Promise<string> {
    const availableColumns = await this.getClickColumns();
    return [
      ...BASE_CLICK_COLUMNS,
      ...GOVERNANCE_COLUMN_NAMES.filter((column) => availableColumns.includes(column)),
    ].join(', ');
  }

  private normalizeRiskReasons(data: ClickData, supportsGovernanceColumns: boolean): string | null {
    const reasons = Array.isArray(data.riskReasons)
      ? data.riskReasons.filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0)
      : [];

    if (!supportsGovernanceColumns) {
      this.pushUniqueReason(reasons, data.matchedRuleLayer ? `governance_layer:${data.matchedRuleLayer}` : null);
      this.pushUniqueReason(reasons, data.matchedRuleId ? `governance_rule:${data.matchedRuleId}` : null);
      this.pushUniqueReason(reasons, data.matchedRuleReason ? `governance_reason:${data.matchedRuleReason}` : null);
    }

    return reasons.length > 0 ? JSON.stringify(reasons) : null;
  }

  private pushUniqueReason(reasons: string[], value: string | null): void {
    if (!value || reasons.includes(value)) {
      return;
    }

    reasons.push(value);
  }
}
