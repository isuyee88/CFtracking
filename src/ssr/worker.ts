/**
 * @fileoverview SSR Worker 入口
 * @description 服务器端渲染入口，集成 DO 和 SSE
 * 输入：HTTP 请求
 * 输出：SSR 渲染的 HTML 或 API 响应
 * 逻辑交互：
 *   - 页面请求：SSR 渲染首屏 HTML
 *   - API 请求：转发到 Hono API
 *   - SSE 请求：建立实时推送连接
 *   - DO 交互：读取/写入实时数据
 */

import type { Env } from '@/config/env'
import { CacheDurableObject } from './cache-do'

// 导入现有的 Durable Objects
import {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
} from '@/handlers/do'

// 导出所有 Durable Objects（Wrangler 要求）
export {
  CacheDurableObject,
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)

      // 1. 处理 SSE 请求（必须在 /api/ 之前）
      if (url.pathname.startsWith('/api/sse/')) {
        return await handleSSE(request, env)
      }

      // 2. 处理 API 请求（转发到现有的 Hono API）
      if (url.pathname.startsWith('/api/')) {
        try {
          // 导入现有的 Hono app
          const { app } = await import('./index')
          return await app.fetch(request, env, ctx)
        } catch (error) {
          console.error('❌ API forward error:', error)
          return Response.json({ 
            error: 'API forward failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
      }

      // 3. 处理静态资源（由 Assets 配置自动处理）

      // 4. 首页直接重定向到 Dashboard
      if (url.pathname === '/') {
        return Response.redirect('https://' + url.host + '/dashboard', 302)
      }

      // 5. SSR 渲染页面
      return await renderPage(request, env, url, ctx)
    } catch (error) {
      console.error('❌ SSR Worker error:', error)
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  },
}

/**
 * 处理 SSE 实时推送
 */
async function handleSSE(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const encoder = new TextEncoder()

  // SSE 更新流
  if (url.pathname === '/api/sse/updates') {
    const cacheDOId = env.CACHE_DO.idFromName('global-cache')
    const cacheDO = env.CACHE_DO.get(cacheDOId)

    const stream = new ReadableStream({
      async start(controller) {
        // 心跳 - 每 30 秒发送一次
        const heartbeat = setInterval(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
          )
        }, 30000)

        // 监听 DO 变化 - 每 5 秒轮询一次
        let lastCount = 0
        const poll = setInterval(async () => {
          try {
            const response = await cacheDO.fetch('http://cache/metadata')
            const metadata = await response.json() as any
            
            if (metadata.totalClicks > lastCount) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'new_click', 
                  data: { totalClicks: metadata.totalClicks },
                  timestamp: Date.now()
                })}\n\n`)
              )
              lastCount = metadata.totalClicks
            }
          } catch (error) {
            console.error('SSE poll error:', error)
          }
        }, 5000)

        // 清理
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          clearInterval(poll)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  return new Response('Not Found', { status: 404 })
}

/**
 * SSR 渲染页面
 */
async function renderPage(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const pathname = url.pathname

  // 检查 CDN 缓存（5 分钟）
  const cache = (caches as any).default
  const cdnTTL = parseInt(env.CDN_CACHE_TTL || '300')

  let response = await cache.match(request)

  if (response) {
    console.log('✅ CDN cache hit')
    return response
  }

  console.log('⚡ CDN cache miss, rendering SSR')

  // SSR 渲染
  let pageContent = ''
  let initialState = {}

  if (pathname === '/dashboard') {
    // TODO: 渲染 Dashboard 页面
    pageContent = await renderDashboard(env)
    initialState = await getDashboardState(env)
  } else {
    // 首页
    pageContent = await renderHomePage(env)
    initialState = await getHomePageState(env)
  }

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF Tracking - SSR</title>
    <meta name="description" content="Affiliate Tracking Platform with SSR" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        color: #333;
      }
    </style>
  </head>
  <body>
    <div id="root">${pageContent}</div>
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
    </script>
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
  `

  response = new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${cdnTTL}`,
    },
  })

  // 写入 CDN 缓存
  ctx.waitUntil(cache.put(request, response.clone()))

  return response
}

/**
 * 渲染首页
 */
async function renderHomePage(env: Env): Promise<string> {
  const metadata = await getCacheMetadata(env)

  return `
    <div style="padding: 20px;">
      <h1>🚀 CF Tracking SSR</h1>
      <p>服务器端渲染 · Durable Objects 实时推送 · SSE</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">${metadata.totalClicks || 0}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">总点击数</div>
        </div>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">${metadata.totalConversions || 0}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">转化数</div>
        </div>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">$${(metadata.totalRevenue || 0).toFixed(2)}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">总收入</div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="/dashboard" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          查看 Dashboard →
        </a>
      </div>
    </div>
  `
}

/**
 * 渲染 Dashboard 页面
 */
async function renderDashboard(env: Env): Promise<string> {
  const metadata = await getCacheMetadata(env)

  return `
    <div style="padding: 20px;">
      <h1>📊 Dashboard</h1>
      <p>实时监控 · Durable Objects 缓存</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">${metadata.totalClicks || 0}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">总点击数</div>
        </div>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">${metadata.totalConversions || 0}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">转化数</div>
        </div>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2.5rem; font-weight: 700; color: #667eea;">$${(metadata.totalRevenue || 0).toFixed(2)}</div>
          <div style="color: #666; font-size: 0.9rem; text-transform: uppercase;">总收入</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 40px;">
        <a href="/" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #9698a0 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          ← 返回首页
        </a>
      </div>
    </div>
  `
}

/**
 * 获取缓存元数据
 */
async function getCacheMetadata(env: Env): Promise<any> {
  try {
    const cacheDOId = env.CACHE_DO.idFromName('global-cache')
    const cacheDO = env.CACHE_DO.get(cacheDOId)

    const response = await cacheDO.fetch('http://cache/metadata')
    return await response.json()
  } catch (error) {
    console.error('Failed to get metadata:', error)
    return {
      lastUpdateTime: 0,
      lastDataTimestamp: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      region: 'HK,CN',
    }
  }
}

/**
 * 获取首页初始状态
 */
async function getHomePageState(env: Env): Promise<any> {
  const metadata = await getCacheMetadata(env)
  return { metadata, timestamp: Date.now() }
}

/**
 * 获取 Dashboard 初始状态
 */
async function getDashboardState(env: Env): Promise<any> {
  const metadata = await getCacheMetadata(env)
  return { metadata, timestamp: Date.now() }
}
