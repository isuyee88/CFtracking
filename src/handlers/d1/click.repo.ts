/**
 * @fileoverview Click 数据仓库
 * @description 封装 Click 相关的所有数据库操作，包括保存点击记录、查询点击日志等
 * @module handlers/d1/click.repo
 * 
 * 输入: ClickData 对象、查询参数（分页、筛选条件）
 * 输出: 点击记录数据、查询结果列表
 * 逻辑交互: 
 *   - 继承 BaseRepository 获取基础 CRUD 能力
 *   - 被 ClickService 调用保存点击数据
 *   - 被 ClickLogRoutes 调用查询点击日志
 * 前后端交互: 通过 D1 数据库进行数据持久化
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
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
  total: number;
  page: number;
  pageSize: number;
}

export class ClickRepository extends BaseRepository<ClickData> {
  constructor(db: D1Database) {
    super(db, 'clicks');
  }

  /**
   * 保存点击记录到数据库
   */
  async saveClick(data: ClickData): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO clicks (
          id, clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, cost, isUnique, redirectUrl, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.clickId,
        data.clickId,
        data.campaignId,
        data.flowId,
        data.landingPageId,
        data.offerId,
        data.timestamp,
        data.ip,
        data.userAgent,
        data.referer,
        data.country,
        data.city,
        data.device,
        data.browser,
        data.os,
        data.isp,
        data.connectionType,
        data.visitorId,
        data.subId1,
        data.subId2,
        data.subId3,
        data.cost,
        1,
        null,
        now
      )
      .run();
  }

  /**
   * 查询点击日志列表（支持分页和筛选）
   */
  async findClicks(params: ClickQueryParams): Promise<ClickListResult> {
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) as total FROM clicks ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (values.length > 0 ? countStmt.bind(...values) : countStmt).first();
    const total = (countResult?.total as number) || 0;

    const listSql = `
      SELECT 
        clickId, campaignId, flowId, landingPageId, offerId,
        timestamp, ip, userAgent, referer, country, city,
        device, browser, os, isp, connectionType, visitorId,
        subId1, subId2, subId3, cost
      FROM clicks 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const listValues = [...values, pageSize, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const list = (listResult.results as unknown as ClickData[]) || [];

    return {
      list,
      total,
      page,
      pageSize,
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
          subId1, subId2, subId3, cost
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
        subId1, subId2, subId3, cost
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
   * 获取点击统计概览
   */
  async getClickStats(startDate: string, endDate: string, campaignId?: string): Promise<{
    totalClicks: number;
    uniqueClicks: number;
    countries: number;
    deviceTypes: number;
  }> {
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
          subId1, subId2, subId3, cost
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
