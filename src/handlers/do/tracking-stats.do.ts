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
import type { Env as WorkerEnv } from '@/config/env';

type TrackingStatsEnv = Pick<WorkerEnv, 'DB'>;

interface ClickData {
  id: string;
  campaignId: string;
  campaignName?: string;
  offerId?: string;
  landingId?: string;
  trafficSourceId?: string;
  visitorId?: string;
  /** 事件类型：pageview=着陆页浏览，click=/go 出站点击（affiliate-landing 集成） */
  type?: 'pageview' | 'click';
  /** 维度归因：subId1=slot/offer 维度，subId2=A/B 实验组维度（affiliate-landing /go 上报） */
  subId1?: string;
  subId2?: string;
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

export class TrackingStatsDO extends DurableObject<TrackingStatsEnv> {
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
  
  private db: any = null;

  constructor(ctx: DurableObjectState, env: TrackingStatsEnv) {
    super(ctx, env);
    
    // 初始化时从 SQLite 加载今日统计
    this.ctx.blockConcurrencyWhile(async () => {
      await this.initializeDatabase();
      await this.loadTodayStats();
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

    // 存量表平滑迁移：已有部署的 clicks 表缺 visitor_id/type 列，ALTER 失败（列已存在）属预期
    for (const colDef of ['visitor_id TEXT', "type TEXT DEFAULT 'pageview'", 'sub_id_1 TEXT', 'sub_id_2 TEXT']) {
      try {
        this.db.exec(`ALTER TABLE clicks ADD COLUMN ${colDef}`);
      } catch {
        // 列已存在（新部署或已迁移），幂等跳过
      }
    }

    // 访问时长聚合表（affiliate-landing beacon 上报，按 campaign 按天）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS duration_stats (
        campaign_id TEXT NOT NULL,
        day TEXT NOT NULL,
        total_ms INTEGER DEFAULT 0,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (campaign_id, day)
      )
    `);
  }

  private normalizeSqlRows<T extends Record<string, unknown>>(result: unknown): T[] {
    if (Array.isArray(result)) {
      return result as T[];
    }

    if (!result || typeof result !== 'object') {
      return [];
    }

    const rowCollection = result as {
      rows?: unknown[];
      results?: unknown[];
      toArray?: () => unknown[];
    };

    if (Array.isArray(rowCollection.rows)) {
      return rowCollection.rows as T[];
    }

    if (Array.isArray(rowCollection.results)) {
      return rowCollection.results as T[];
    }

    if (typeof rowCollection.toArray === 'function') {
      const rows = rowCollection.toArray();
      return Array.isArray(rows) ? (rows as T[]) : [];
    }

    return [];
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      switch (url.pathname) {
        case '/track-click':
          return await this.handleTrackClick(request);
        case '/track-conversion':
          return await this.handleTrackConversion(request);
        case '/track-duration':
          return await this.handleTrackDuration(request);
        case '/landing-stats':
          return await this.handleGetLandingStats(request);
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
        case '/aggregate-daily':
          return await this.handleAggregateDaily(request);
        case '/aggregate-historical':
          return await this.handleAggregateHistorical(request);
        case '/chart-data':
          return await this.handleGetChartData(request);
        case '/entity-stats':
          return await this.handleGetEntityStats(request);
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
    const data = await request.json() as { clickId: string; revenue?: number };
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
   * 记录访问时长（affiliate-landing beacon 上报）
   * 为什么直接落库不进 pendingWrites：量小（每访问至多 1 次）且需跨重启保留当日聚合
   */
  private async handleTrackDuration(request: Request): Promise<Response> {
    const data = await request.json() as { campaignId?: string; durationMs?: number };
    const campaignId = String(data.campaignId || '');
    if (!campaignId) {
      return Response.json({ success: false, error: 'campaignId required' }, { status: 400 });
    }
    // 钳制：页面挂后台/休眠一晚的异常值不应污染均值（上限 30 分钟）
    const ms = Math.max(0, Math.min(Number(data.durationMs) || 0, 30 * 60 * 1000));
    const day = new Date().toISOString().slice(0, 10);

    this.db.exec(`
      INSERT INTO duration_stats (campaign_id, day, total_ms, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(campaign_id, day)
      DO UPDATE SET total_ms = total_ms + excluded.total_ms, count = count + 1
    `, campaignId, day, ms);

    return Response.json({ success: true });
  }

  /**
   * 着陆页统计（affiliate-landing S2S 拉取）：按 campaign 返回分时 UV/PV/点击/平均时长
   * 为什么读前先 flush：内存队列最长延迟 5s 落库，先同步保证统计含最新数据
   */
  private async handleGetLandingStats(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hours = Math.max(1, Math.min(parseInt(url.searchParams.get('hours') || '24', 10) || 24, 168));
    const campaignFilter = (url.searchParams.get('campaignIds') || '')
      .split(',').map(s => s.trim()).filter(Boolean);

    this.flushPendingWrites();
    const since = Date.now() - hours * 3600 * 1000;

    // 分 campaign 分小时分类型计数；UV 用 visitor_id 兜底 ip（存量行无 visitor_id）
    const rows = this.normalizeSqlRows<{
      campaign_id: string; hour_bucket: number; t: string; n: number; uv: number;
    }>(this.db.exec(`
      SELECT campaign_id,
             (timestamp / 3600000) * 3600000 AS hour_bucket,
             COALESCE(type, 'pageview') AS t,
             COUNT(*) AS n,
             COUNT(DISTINCT COALESCE(visitor_id, ip)) AS uv
      FROM clicks
      WHERE timestamp >= ?
      GROUP BY campaign_id, hour_bucket, t
    `, since));

    // 整窗去重 UV（不可加指标，单独聚合，仅统计 pageview 事件）
    const uvRows = this.normalizeSqlRows<{ campaign_id: string; uv: number }>(this.db.exec(`
      SELECT campaign_id, COUNT(DISTINCT COALESCE(visitor_id, ip)) AS uv
      FROM clicks
      WHERE timestamp >= ? AND COALESCE(type, 'pageview') = 'pageview'
      GROUP BY campaign_id
    `, since));

    const dayCutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 10);
    const durRows = this.normalizeSqlRows<{ campaign_id: string; total_ms: number; cnt: number }>(this.db.exec(`
      SELECT campaign_id, SUM(total_ms) AS total_ms, SUM(count) AS cnt
      FROM duration_stats
      WHERE day >= ?
      GROUP BY campaign_id
    `, dayCutoff));

    // A/B 实验组分布：仅 click 事件且 sub_id_2 非空（pageview 不参与点击归因）
    const variantRows = this.normalizeSqlRows<{ campaign_id: string; v: string; n: number }>(this.db.exec(`
      SELECT campaign_id, sub_id_2 AS v, COUNT(*) AS n
      FROM clicks
      WHERE timestamp >= ? AND COALESCE(type, 'pageview') = 'click' AND COALESCE(sub_id_2, '') <> ''
      GROUP BY campaign_id, v
    `, since));
    const variantsByCampaign = new Map<string, Record<string, number>>();
    for (const r of variantRows) {
      const m = variantsByCampaign.get(r.campaign_id) || {};
      m[r.v] = (m[r.v] || 0) + r.n;
      variantsByCampaign.set(r.campaign_id, m);
    }

    const totalUv = new Map<string, number>();
    for (const r of uvRows) totalUv.set(r.campaign_id, r.uv);
    const duration = new Map<string, { totalMs: number; count: number }>();
    for (const r of durRows) duration.set(r.campaign_id, { totalMs: r.total_ms || 0, count: r.cnt || 0 });

    // 按 campaign 归组
    const grouped = new Map<string, { hourly: Map<number, { pv: number; uv: number; clicks: number }> }>();
    for (const r of rows) {
      if (campaignFilter.length > 0 && !campaignFilter.includes(r.campaign_id)) continue;
      if (!grouped.has(r.campaign_id)) grouped.set(r.campaign_id, { hourly: new Map() });
      const g = grouped.get(r.campaign_id)!;
      const h = g.hourly.get(r.hour_bucket) || { pv: 0, uv: 0, clicks: 0 };
      if (r.t === 'click') {
        h.clicks += r.n;
      } else {
        h.pv += r.n;
        h.uv += r.uv;
      }
      g.hourly.set(r.hour_bucket, h);
    }

    // 补齐空小时，保证前端 24h 柱状连续
    const nowBucket = Math.floor(Date.now() / 3600000) * 3600000;
    const campaigns: any[] = [];
    for (const [campaignId, g] of grouped) {
      const hourly: any[] = [];
      let pv = 0, clicks = 0, uvSum = 0;
      for (let i = hours - 1; i >= 0; i--) {
        const bucket = nowBucket - i * 3600000;
        const h = g.hourly.get(bucket);
        hourly.push({
          hour: new Date(bucket).toISOString(),
          pv: h?.pv || 0,
          uv: h?.uv || 0,
          clicks: h?.clicks || 0,
        });
        pv += h?.pv || 0;
        clicks += h?.clicks || 0;
        uvSum += h?.uv || 0;
      }
      const d = duration.get(campaignId);
      campaigns.push({
        campaignId,
        pv,
        // 整窗真实去重 UV；分时 uv 为小时级去重（跨小时可重复），口径已在 UI 标注
        uv: totalUv.get(campaignId) ?? uvSum,
        clicks,
        avgDurationMs: d && d.count > 0 ? Math.round(d.totalMs / d.count) : null,
        durationSamples: d?.count || 0,
        // A/B 实验组点击分布（如 {"A":3,"B":2}）；无实验数据时省略，零基线不破坏消费方
        ...(variantsByCampaign.has(campaignId) ? { variants: variantsByCampaign.get(campaignId) } : {}),
        hourly,
      });
    }

    return Response.json({
      campaigns,
      hours,
      dataSource: 'DO_SQLITE',
      timestamp: Date.now(),
    });
  }

  /**
   * 将内存队列批量写入 SQLite（alarm 与 landing-stats 共用，含 visitor_id/type 列）
   */
  private flushPendingWrites(): void {
    if (this.stats.pendingWrites.length === 0) return;
    for (const click of this.stats.pendingWrites) {
      this.db.exec(`
        INSERT OR REPLACE INTO clicks
        (id, campaign_id, campaign_name, offer_id, landing_id, traffic_source_id,
         ip, country, region, city, device, browser, os, timestamp, is_conversion, revenue, cost,
         visitor_id, type, sub_id_1, sub_id_2)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        click.id, click.campaignId, click.campaignName || '', click.offerId || '',
        click.landingId || '', click.trafficSourceId || '',
        click.ip, click.country || '', click.region || '', click.city || '',
        click.device || '', click.browser || '', click.os || '',
        click.timestamp, click.isConversion ? 1 : 0, click.revenue || 0, click.cost || 0,
        click.visitorId || '', click.type || 'pageview',
        click.subId1 || '', click.subId2 || ''
      );
    }
    console.log(`[TrackingStatsDO] Persisted ${this.stats.pendingWrites.length} clicks`);
    this.stats.pendingWrites = [];
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
      // 1. 批量写入 SQLite（复用共享 flush：含 visitor_id/type 列）
      this.flushPendingWrites();
      
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

  /**
   * 处理每日数据聚合
   */
  private async handleAggregateDaily(request: Request): Promise<Response> {
    const data = await request.json() as { date?: string };
    const { date } = data;
    
    try {
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const startTimestamp = targetDate.getTime();
      const endTimestamp = startTimestamp + 24 * 60 * 60 * 1000;
      
      // 1. 从 SQLite 查询当日数据
      const dailyData = this.db.exec(`
        SELECT 
          campaign_id, campaign_name, 
          COUNT(*) as clicks, 
          SUM(is_conversion) as conversions, 
          SUM(revenue) as revenue, 
          SUM(cost) as cost
        FROM clicks 
        WHERE timestamp >= ? AND timestamp < ?
        GROUP BY campaign_id
      `, startTimestamp, endTimestamp) as Array<Record<string, unknown>>;
      
      // 2. 写入 D1 数据库
      if (this.env.DB) {
        for (const item of dailyData) {
          try {
            await this.env.DB.prepare(`
              INSERT OR REPLACE INTO daily_stats (
                date, campaign_id, campaign_name, 
                clicks, conversions, revenue, cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
              .bind(
                targetDate.toISOString().split('T')[0],
                item.campaign_id,
                item.campaign_name,
                item.clicks,
                item.conversions,
                item.revenue,
                item.cost
              )
              .run();
          } catch (e) {
            console.warn('[AggregateDaily] Failed to insert into D1:', e);
          }
        }
      }
      
      return Response.json({
        success: true,
        message: 'Daily aggregation completed',
        recordsProcessed: dailyData.length,
        date: targetDate.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('[AggregateDaily] Error:', error);
      return Response.json({
        success: false,
        message: 'Daily aggregation failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  /**
   * 获取图表数据
   */
  private async handleGetChartData(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'last7days';
    
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last3months':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thismonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastmonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = now.getTime();
    
    // 从 SQLite 查询数据
    const chartDataResult = this.db.exec(`
      SELECT 
        DATE(timestamp / 1000, 'unixepoch') as date, 
        COUNT(*) as clicks, 
        SUM(is_conversion) as conversions, 
        SUM(revenue) as revenue, 
        SUM(cost) as cost
      FROM clicks 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY date
      ORDER BY date
    `, startTimestamp, endTimestamp);
    const chartData = this.normalizeSqlRows<Record<string, unknown>>(chartDataResult);
    
    return Response.json({
      chartData: chartData.map((item: any) => ({
        date: item.date,
        clicks: item.clicks || 0,
        conversions: item.conversions || 0,
        spend: item.cost || 0,
        revenue: item.revenue || 0,
        impressions: 0, // DO 中没有存储 impressions
      })),
      dataSource: 'DO_SQLITE',
    });
  }

  /**
   * 获取实体统计数据
   */
  private async handleGetEntityStats(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'last7days';
    
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last3months':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thismonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastmonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    const startTimestamp = startDate.getTime();
    
    // 并行获取各种实体统计
    const [campaigns, countries, deviceTypes, browsers] = await Promise.all([
      this.getEntityStatsByType('campaign_id', 'campaign_name', startTimestamp),
      this.getEntityStatsByType('country', 'country', startTimestamp),
      this.getEntityStatsByType('device', 'device', startTimestamp),
      this.getEntityStatsByType('browser', 'browser', startTimestamp),
    ]);
    
    return Response.json({
      stats: {
        campaigns,
        countries,
        device_types: deviceTypes,
        browsers,
      },
      dataSource: 'DO_SQLITE',
    });
  }

  /**
   * 根据实体类型获取统计数据
   */
  private getEntityStatsByType(
    idField: string,
    nameField: string,
    startTimestamp: number
  ): any[] {
    const resultSet = this.db.exec(`
      SELECT 
        ${idField} as id, 
        ${nameField} as name, 
        COUNT(*) as clicks, 
        SUM(is_conversion) as conversions, 
        SUM(revenue) as revenue, 
        SUM(cost) as cost
      FROM clicks 
      WHERE timestamp >= ? AND ${idField} != ''
      GROUP BY ${idField}
      ORDER BY clicks DESC
      LIMIT 10
    `, startTimestamp);
    const result = this.normalizeSqlRows<Record<string, unknown>>(resultSet);
    
    return result.map((item: any) => ({
      name: item.name || 'Unknown',
      clicks: item.clicks || 0,
      impressions: 0, // DO 中没有存储 impressions
      conversions: item.conversions || 0,
      spend: item.cost || 0,
      revenue: item.revenue || 0,
      unique_visitors: 0, // DO 中没有存储 unique_visitors
    }));
  }

  /**
   * 处理历史数据聚合
   */
  private async handleAggregateHistorical(request: Request): Promise<Response> {
    const data = await request.json() as { startDate: string; endDate: string };
    const { startDate, endDate } = data;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startTimestamp = start.getTime();
      const endTimestamp = end.getTime();
      
      // 1. 从 SQLite 查询历史数据
      const historicalData = this.db.exec(`
        SELECT 
          DATE(timestamp / 1000, 'unixepoch') as date, 
          campaign_id, campaign_name, 
          COUNT(*) as clicks, 
          SUM(is_conversion) as conversions, 
          SUM(revenue) as revenue, 
          SUM(cost) as cost
        FROM clicks 
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY date, campaign_id
      `, startTimestamp, endTimestamp) as Array<Record<string, unknown>>;
      
      // 2. 批量写入 D1 数据库
      if (this.env.DB) {
        let processed = 0;
        for (const item of historicalData) {
          try {
            await this.env.DB.prepare(`
              INSERT OR REPLACE INTO daily_stats (
                date, campaign_id, campaign_name, 
                clicks, conversions, revenue, cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
              .bind(
                item.date,
                item.campaign_id,
                item.campaign_name,
                item.clicks,
                item.conversions,
                item.revenue,
                item.cost
              )
              .run();
            processed++;
          } catch (e) {
            console.warn('[AggregateHistorical] Failed to insert into D1:', e);
          }
        }
        
        return Response.json({
          success: true,
          message: 'Historical aggregation completed',
          recordsProcessed: processed,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        });
      }
      
      return Response.json({
        success: false,
        message: 'D1 database not available',
      });
    } catch (error) {
      console.error('[AggregateHistorical] Error:', error);
      return Response.json({
        success: false,
        message: 'Historical aggregation failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }
}
