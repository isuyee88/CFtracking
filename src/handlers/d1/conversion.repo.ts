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
  total: number;
  page: number;
  pageSize: number;
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
   * 查询转化日志列表（支持分页和筛选）
   */
  async findConversions(params: ConversionQueryParams): Promise<ConversionListResult> {
    const {
      page = 1,
      pageSize = 20,
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) as total FROM conversions ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (values.length > 0 ? countStmt.bind(...values) : countStmt).first();
    const total = (countResult?.total as number) || 0;

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
    
    const listValues = [...values, pageSize, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const list = (listResult.results as unknown as ConversionData[]) || [];

    return {
      list,
      total,
      page,
      pageSize,
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
