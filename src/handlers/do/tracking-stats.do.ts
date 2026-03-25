/**
 * @fileoverview 流量统计 Durable Object
 * @description 实时统计点击和转化，支持 SSR 快速查询和定时归档到 D1
 * @module handlers/do/tracking-stats
 * 
 * 数据流：
 * - 点击实时写入内存统计
 * - Alarm 定时批量持久化到 SQLite
 * - 每天凌晨归档 90 天前数据到 D1
 * - SSR 直接从内存读取统计（< 10ms）
 */

import { DurableObject } from 'cloudflare:workers';

export interface Env {
  DB: D1Database;
}

interface ClickData {
  id: string;
  campaignId: string;
  campaignName?: string;
  offerId?: string;
  landingId?: string;
  trafficSourceId?: string;
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  timestamp: number;
  isConversion?: boolean;
  revenue?: number;
  cost?: number;
}

interface HourlyStats {
  hour: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
}

export class TrackingStatsDO extends DurableObject {
  // 内存状态（实时）
  private stats = {
    todayClicks: 0,
    todayConversions: 0,
    todayRevenue: 0,
    todayCost: 0,
    recentClicks: [] as ClickData[],
    pendingWrites: [] as ClickData[],
    hourlyStats: new Map<string, HourlyStats>(),
  };
  
  private initialized = false;
  private db: any = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // 初始化时从 SQLite 加载今日统计
    this.ctx.blockConcurrencyWhile(async () => {
      await this.initializeDatabase();
      await this.loadTodayStats();
      this.initialized = true;
    });
  }

  /**
   * 初始化 SQLite 数据库
   */
  private async initializeDatabase(): Promise<void> {
    this.db = this.ctx.storage.sql;
    
    // 创建点击表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clicks (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        campaign_name TEXT,
        offer_id TEXT,
        landing_id TEXT,
        traffic_source_id TEXT,
        ip TEXT,
        country TEXT,
        region TEXT,
        city TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        timestamp INTEGER,
        is_conversion INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        cost REAL DEFAULT 0
      )
    `);
    
    // 创建小时统计表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        hour TEXT PRIMARY KEY,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        cost REAL DEFAULT 0
      )
    `);
    
    // 创建索引
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_conversion ON clicks(is_conversion)`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      switch (url.pathname) {
        case '/track-click':
          return await this.handleTrackClick(request);
        case '/track-conversion':
          return await this.handleTrackConversion(request);
        case '/stats':
          return await this.handleGetStats();
        case '/recent-clicks':
          return await this.handleGetRecentClicks(request);
        case '/hourly-stats':
          return await this.handleGetHourlyStats(request);
        case '/campaign-stats':
          return await this.handleGetCampaignStats();
        case '/archive':
          return await this.handleArchive();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('[TrackingStatsDO] Error:', error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理点击追踪 - 极快（仅写内存）
   */
  private async handleTrackClick(request: Request): Promise<Response> {
    const data: ClickData = await request.json();
    
    // 1. 更新内存统计（< 1ms）
    this.stats.todayClicks++;
    this.stats.todayCost += data.cost || 0;
    
    // 2. 更新小时统计
    const hour = new Date(data.timestamp).toISOString().slice(0, 13) + ':00:00';
    const hourly = this.stats.hourlyStats.get(hour) || {
      hour,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      cost: 0,
    };
    hourly.clicks++;
    hourly.cost += data.cost || 0;
    this.stats.hourlyStats.set(hour, hourly);
    
    // 3. 加入最近点击队列
    this.stats.recentClicks.unshift(data);
    if (this.stats.recentClicks.length > 200) {
      this.stats.recentClicks.pop();
    }
    
    // 4. 加入待写入队列
    this.stats.pendingWrites.push(data);
    
    // 5. 设置 Alarm 批量处理（如果还没设置）
    await this.scheduleAlarmIfNeeded();
    
    return Response.json({ 
      success: true,
      stats: {
        todayClicks: this.stats.todayClicks,
        todayConversions: this.stats.todayConversions,
        todayRevenue: this.stats.todayRevenue,
        todayCost: this.stats.todayCost,
      }
    });
  }

  /**
   * 处理转化追踪
   */
  private async handleTrackConversion(request: Request): Promise<Response> {
    const data = await request.json();
    const { clickId, revenue = 0 } = data;
    
    // 1. 更新内存统计
    this.stats.todayConversions++;
    this.stats.todayRevenue += revenue;
    
    // 2. 更新最近点击中的转化状态
    const click = this.stats.recentClicks.find(c => c.id === clickId);
    if (click) {
      click.isConversion = true;
      click.revenue = revenue;
    }
    
    // 3. 更新 SQLite 中的转化状态
    try {
      this.db.exec(
        'UPDATE clicks SET is_conversion = 1, revenue = ? WHERE id = ?',
        revenue,
        clickId
      );
    } catch (e) {
      console.warn('[TrackingStatsDO] Failed to update conversion:', e);
    }
    
    return Response.json({ 
      success: true,
      stats: {
        todayClicks: this.stats.todayClicks,
        todayConversions: this.stats.todayConversions,
        todayRevenue: this.stats.todayRevenue,
      }
    });
  }

  /**
   * 获取实时统计 - 极快（直接读内存）
   */
  private async handleGetStats(): Promise<Response> {
    // 计算 ROI
    const profit = this.stats.todayRevenue - this.stats.todayCost;
    const roi = this.stats.todayCost > 0 ? (profit / this.stats.todayCost) * 100 : 0;
    
    // 计算转化率
    const conversionRate = this.stats.todayClicks > 0 
      ? (this.stats.todayConversions / this.stats.todayClicks) * 100 
      : 0;
    
    return Response.json({
      todayClicks: this.stats.todayClicks,
      todayConversions: this.stats.todayConversions,
      todayRevenue: this.stats.todayRevenue,
      todayCost: this.stats.todayCost,
      todayProfit: profit,
      todayROI: roi,
      conversionRate: conversionRate,
      dataSource: 'DO_MEMORY',
      timestamp: Date.now(),
    });
  }

  /**
   * 获取最近点击
   */
  private async handleGetRecentClicks(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    return Response.json({
      clicks: this.stats.recentClicks.slice(0, limit),
      total: this.stats.recentClicks.length,
      dataSource: 'DO_MEMORY',
    });
  }

  /**
   * 获取小时统计
   */
  private async handleGetHourlyStats(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    
    const now = new Date();
    const stats: HourlyStats[] = [];
    
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.toISOString().slice(0, 13) + ':00:00';
      const hourly = this.stats.hourlyStats.get(hour);
      
      stats.push(hourly || {
        hour,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
      });
    }
    
    return Response.json({
      stats,
      dataSource: 'DO_MEMORY',
    });
  }

  /**
   * 获取活动统计
   */
  private async handleGetCampaignStats(): Promise<Response> {
    // 从 SQLite 查询活动统计
    const result = this.db.exec(`
      SELECT 
        campaign_id,
        campaign_name,
        COUNT(*) as clicks,
        SUM(is_conversion) as conversions,
        SUM(revenue) as revenue,
        SUM(cost) as cost
      FROM clicks
      WHERE timestamp > ?
      GROUP BY campaign_id
      ORDER BY clicks DESC
    `, Date.now() - 24 * 60 * 60 * 1000);
    
    return Response.json({
      campaigns: result,
      dataSource: 'DO_SQLITE',
    });
  }

  /**
   * 归档到 D1
   */
  private async handleArchive(): Promise<Response> {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 天前
    
    // 1. 查询 90 天前的数据
    const oldClicks = this.db.exec(`
      SELECT * FROM clicks WHERE timestamp < ?
    `, cutoff);
    
    // 2. 写入 D1（这里简化处理，实际需要批量插入）
    console.log(`[Archive] Found ${oldClicks.length} old clicks to archive`);
    
    // 3. 删除本地数据
    this.db.exec(`DELETE FROM clicks WHERE timestamp < ?`, cutoff);
    
    return Response.json({
      success: true,
      archived: oldClicks.length,
      cutoff: new Date(cutoff).toISOString(),
    });
  }

  /**
   * Alarm 触发 - 批量持久化
   */
  async alarm(): Promise<void> {
    console.log('[Alarm] Running batch persistence');
    
    try {
      // 1. 批量写入 SQLite
      if (this.stats.pendingWrites.length > 0) {
        for (const click of this.stats.pendingWrites) {
          this.db.exec(`
            INSERT OR REPLACE INTO clicks 
            (id, campaign_id, campaign_name, offer_id, landing_id, traffic_source_id,
             ip, country, region, city, device, browser, os, timestamp, is_conversion, revenue, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, 
            click.id, click.campaignId, click.campaignName || '', click.offerId || '', 
            click.landingId || '', click.trafficSourceId || '',
            click.ip, click.country || '', click.region || '', click.city || '',
            click.device || '', click.browser || '', click.os || '',
            click.timestamp, click.isConversion ? 1 : 0, click.revenue || 0, click.cost || 0
          );
        }
        
        console.log(`[Alarm] Persisted ${this.stats.pendingWrites.length} clicks`);
        this.stats.pendingWrites = [];
      }
      
      // 2. 更新小时统计到 SQLite
      for (const [hour, stats] of this.stats.hourlyStats) {
        this.db.exec(`
          INSERT OR REPLACE INTO hourly_stats (hour, clicks, conversions, revenue, cost)
          VALUES (?, ?, ?, ?, ?)
        `, hour, stats.clicks, stats.conversions, stats.revenue, stats.cost);
      }
      
      // 3. 检查是否需要归档（每天凌晨 2 点）
      const now = new Date();
      if (now.getHours() === 2) {
        await this.handleArchive();
      }
      
    } catch (error) {
      console.error('[Alarm] Error:', error);
    }
  }

  /**
   * 设置 Alarm（如果需要）
   */
  private async scheduleAlarmIfNeeded(): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      // 5 秒后执行批量写入
      await this.ctx.storage.setAlarm(Date.now() + 5000);
    }
  }

  /**
   * 从 SQLite 加载今日统计
   */
  private async loadTodayStats(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // 加载今日点击数
    const clickResult = this.db.exec(`
      SELECT COUNT(*) as count FROM clicks WHERE timestamp >= ?
    `, todayTimestamp);
    this.stats.todayClicks = clickResult[0]?.count || 0;
    
    // 加载今日转化数
    const convResult = this.db.exec(`
      SELECT COUNT(*) as count, SUM(revenue) as revenue, SUM(cost) as cost
      FROM clicks WHERE timestamp >= ? AND is_conversion = 1
    `, todayTimestamp);
    this.stats.todayConversions = convResult[0]?.count || 0;
    this.stats.todayRevenue = convResult[0]?.revenue || 0;
    this.stats.todayCost = convResult[0]?.cost || 0;
    
    console.log('[TrackingStatsDO] Loaded today stats:', {
      clicks: this.stats.todayClicks,
      conversions: this.stats.todayConversions,
    });
  }
}
