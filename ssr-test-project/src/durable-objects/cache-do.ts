/**
 * 文件用途：Durable Objects 缓存实现
 * 输入：点击数据、转化数据
 * 输出：缓存的读取、写入、增量更新
 * 逻辑交互：
 *   - 使用 SQLite 存储数据
 *   - 支持增量追加数据
 *   - 自动过期清理（7 天）
 *   - WebSocket 实时推送
 * 前后端交互：
 *   - Worker 通过 DO Stub 调用
 *   - 客户端通过 WebSocket 接收实时更新
 */

import { DurableObject } from 'cloudflare:workers'

export interface ClickData {
  id: string
  campaignId?: string
  offerId?: string
  landingPageId?: string
  trafficSourceId?: string
  affiliateNetworkId?: string
  timestamp: number
  ip: string
  userAgent: string
  country?: string
  region?: string
  city?: string
  device?: string
  browser?: string
  os?: string
  revenue?: number
  isConversion?: boolean
}

export interface CacheMetadata {
  lastUpdateTime: number
  lastDataTimestamp: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  region: string
}

export class CacheDurableObject extends DurableObject {
  private db: SqlStorage | null = null

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    try {
      switch (url.pathname) {
        case '/cache/clicks':
          if (request.method === 'GET') {
            return await this.getClicks(request)
          } else if (request.method === 'POST') {
            return await this.appendClicks(request)
          }
          break

        case '/cache/metadata':
          if (request.method === 'GET') {
            return await this.getMetadata()
          }
          break

        case '/cache/purge':
          if (request.method === 'POST') {
            return await this.purgeExpired()
          }
          break

        case '/websocket':
          return await this.handleWebSocket(request)

        default:
          return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('DO error:', error)
      return new Response('Internal Error', { status: 500 })
    }
  }

  /**
   * 初始化 SQLite 数据库
   */
  private getDatabase(): SqlStorage {
    if (!this.db) {
      this.db = (this.ctx.storage as any).sql as SqlStorage
      this.initializeTables()
    }
    return this.db
  }

  /**
   * 初始化数据表
   */
  private initializeTables(): void {
    const db = this.getDatabase()

    // 创建点击数据表
    db.exec(`
      CREATE TABLE IF NOT EXISTS clicks (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        offer_id TEXT,
        landing_page_id TEXT,
        traffic_source_id TEXT,
        affiliate_network_id TEXT,
        timestamp INTEGER NOT NULL,
        ip TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        country TEXT,
        region TEXT,
        city TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        revenue REAL,
        is_conversion INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `)

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clicks_offer ON clicks(offer_id)
    `)

    // 创建元数据表
    db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `)

    console.log('✅ DO SQLite tables initialized')
  }

  /**
   * 增量追加点击数据
   */
  async appendClicks(request: Request): Promise<Response> {
    const db = this.getDatabase()
    const clicks: ClickData[] = await request.json()

    const insertStmt = (db as any).prepare(`
      INSERT OR REPLACE INTO clicks (
        id, campaign_id, offer_id, landing_page_id, traffic_source_id,
        affiliate_network_id, timestamp, ip, user_agent, country, region,
        city, device, browser, os, revenue, is_conversion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let inserted = 0
    let updated = 0

    await db.exec('BEGIN TRANSACTION')

    try {
      for (const click of clicks) {
        const existing = (db as any)
          .prepare('SELECT id FROM clicks WHERE id = ?')
          .bind(click.id)
          .one()

        if (existing) {
          updated++
        } else {
          inserted++
        }

        insertStmt.run(
          click.id,
          click.campaignId || null,
          click.offerId || null,
          click.landingPageId || null,
          click.trafficSourceId || null,
          click.affiliateNetworkId || null,
          click.timestamp,
          click.ip,
          click.userAgent,
          click.country || null,
          click.region || null,
          click.city || null,
          click.device || null,
          click.browser || null,
          click.os || null,
          click.revenue || null,
          click.isConversion ? 1 : 0
        )
      }

      await db.exec('COMMIT')

      // 更新元数据
      await this.updateMetadata({
        lastUpdateTime: Date.now(),
        lastDataTimestamp: Math.max(...clicks.map((c) => c.timestamp)),
        totalClicks: await this.getTotalCount(),
        totalConversions: await this.getConversionCount(),
        totalRevenue: await this.getTotalRevenue(),
        region: 'HK,CN',
      })

      console.log(
        `✅ Appended ${clicks.length} clicks (${inserted} new, ${updated} updated)`
      )

      return Response.json({
        success: true,
        inserted,
        updated,
        total: clicks.length,
      })
    } catch (error) {
      await db.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * 批量读取点击数据
   */
  async getClicks(request: Request): Promise<Response> {
    const db = this.getDatabase()
    const url = new URL(request.url)

    const limit = parseInt(url.searchParams.get('limit') || '1000')
    const sinceTimestamp = parseInt(
      url.searchParams.get('since') || '0'
    )
    const campaignId = url.searchParams.get('campaign')

    let query = 'SELECT * FROM clicks WHERE 1=1'
    const params: any[] = []

    if (sinceTimestamp > 0) {
      query += ' AND timestamp > ?'
      params.push(sinceTimestamp)
    }

    if (campaignId) {
      query += ' AND campaign_id = ?'
      params.push(campaignId)
    }

    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const stmt = (db as any).prepare(query)
    const results = stmt.all(...params)

    return Response.json(results)
  }

  /**
   * 获取元数据
   */
  async getMetadata(): Promise<Response> {
    const db = this.getDatabase()
    const result = (db as any)
      .prepare('SELECT value FROM metadata WHERE key = ?')
      .bind('cache')
      .one()

    if (!result) {
      return Response.json({
        lastUpdateTime: 0,
        lastDataTimestamp: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        region: 'HK,CN',
      })
    }

    const metadata: CacheMetadata = JSON.parse(result.value as string)
    return Response.json(metadata)
  }

  /**
   * 更新元数据
   */
  private async updateMetadata(metadata: CacheMetadata): Promise<void> {
    const db = this.getDatabase()
    ;(db as any).prepare(
      'INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, unixepoch())'
    ).run('cache', JSON.stringify(metadata))
  }

  /**
   * 获取总点击数
   */
  private async getTotalCount(): Promise<number> {
    const db = this.getDatabase()
    const result = (db as any).prepare('SELECT COUNT(*) as count FROM clicks').one()
    return (result as any)?.count || 0
  }

  /**
   * 获取转化数
   */
  private async getConversionCount(): Promise<number> {
    const db = this.getDatabase()
    const result = (db as any)
      .prepare('SELECT COUNT(*) as count FROM clicks WHERE is_conversion = 1')
      .one()
    return (result as any)?.count || 0
  }

  /**
   * 获取总收入
   */
  private async getTotalRevenue(): Promise<number> {
    const db = this.getDatabase()
    const result = (db as any)
      .prepare('SELECT SUM(revenue) as total FROM clicks WHERE revenue IS NOT NULL')
      .one()
    return (result as any)?.total || 0
  }

  /**
   * 清理过期数据（7 天前）
   */
  async purgeExpired(): Promise<Response> {
    const db = this.getDatabase()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const result = (db as any)
      .prepare('DELETE FROM clicks WHERE timestamp < ?')
      .bind(sevenDaysAgo)
      .run()

    console.log(`🧹 Purged ${result.changes} expired clicks`)

    return Response.json({
      success: true,
      deleted: result.changes,
    })
  }

  /**
   * 处理 WebSocket 连接
   */
  async handleWebSocket(_request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair()
    const [client, server] = webSocketPair

    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * WebSocket 消息处理
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const data = typeof message === 'string' ? JSON.parse(message) : null

    if (data?.type === 'subscribe') {
      console.log('🔌 Client subscribed to real-time updates')
      ws.send(
        JSON.stringify({
          type: 'subscribed',
          timestamp: Date.now(),
        })
      )
    }
  }

  /**
   * WebSocket 关闭处理
   */
  async webSocketClose(_ws: WebSocket, code: number, reason: string): Promise<void> {
    console.log(`🔌 WebSocket closed: ${code} ${reason}`)
  }
}
