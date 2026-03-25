/**
 * 文件用途：Analytics Engine 自动触发器
 * 输入：Analytics Engine 事件（新点击数据）
 * 输出：增量更新到 Durable Objects 缓存
 */

import { ClickData } from './durable-objects/cache-do'

export interface AnalyticsEngineEvent {
  dataset: string
  index: string
  blob?: string
  doubleIndexes?: number[]
  blobIndexes?: string[]
  timestamp: number
}

export default {
  /**
   * Analytics Engine 事件处理器
   */
  async analyticsEngine(event: AnalyticsEngineEvent, env: any, ctx: ExecutionContext): Promise<void> {
    try {
      // 验证数据集
      if (event.dataset !== 'click_tracking') {
        return
      }

      // 从 AE 事件中提取点击数据
      const clickData = extractClickFromEvent(event)

      if (!clickData) {
        console.warn('⚠️ No click data extracted from AE event')
        return
      }

      // 获取 DO 实例
      const cacheDOId = env.CACHE_DO.idFromName('global-cache')
      const cacheDO = env.CACHE_DO.get(cacheDOId)

      // 增量追加到 DO 缓存
      const response = await cacheDO.fetch('http://cache/cache/clicks', {
        method: 'POST',
        body: JSON.stringify([clickData]),
      })

      const result = await response.json()

      console.log(
        `✅ AE auto-trigger: Synced 1 click to DO cache (${result.inserted} new, ${result.updated} updated)`
      )
    } catch (error) {
      console.error('❌ AE auto-trigger error:', error)
      // 不抛出错误，避免影响 AE 写入
    }
  },
}

/**
 * 从 Analytics Engine 事件提取点击数据
 */
function extractClickFromEvent(event: AnalyticsEngineEvent): ClickData | null {
  try {
    if (!event.blob) {
      return null
    }

    const data = JSON.parse(event.blob)

    return {
      id: data.id || `ae_${event.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId: data.campaign_id,
      offerId: data.offer_id,
      landingPageId: data.landing_page_id,
      trafficSourceId: data.traffic_source_id,
      affiliateNetworkId: data.affiliate_network_id,
      timestamp: event.timestamp || Date.now(),
      ip: data.ip || 'unknown',
      userAgent: data.user_agent || 'unknown',
      country: data.country,
      region: data.region,
      city: data.city,
      device: data.device,
      browser: data.browser,
      os: data.os,
      revenue: data.revenue,
      isConversion: data.is_conversion || false,
    }
  } catch (error) {
    console.error('Failed to extract click from AE event:', error)
    return null
  }
}
