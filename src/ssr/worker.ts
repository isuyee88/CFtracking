/**
 * @fileoverview SSR Worker - 服务器端渲染入口，集成 DO 和 SSE
 * @description 处理页面请求的 SSR 渲染，API 请求转发，SSE 实时推送
 * 输入：HTTP 请求
 * 输出：SSR 渲染的 HTML 或 API 响应
 * 逻辑交互：
 *   - 页面请求：SSR 渲染首屏 HTML
 *   - API 请求：转发到 Hono API
 *   - SSE 请求：建立实时推送连接
 *   - DO 交互：读取/写入实时数据
 */

import type { Env } from '@/config/env'
import { renderToString } from 'react-dom/server'
import App from './App'

// 导入现有的 Durable Objects
import {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
} from '@/handlers/do'

// 导入 CacheDurableObject
import { CacheDurableObject } from './cache-do'

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

      // 2. 处理 API 请求
      if (url.pathname.startsWith('/api/')) {
        // API 请求应该由 Cloudflare Workers 直接处理
        // 这里不转发，因为可能会导致循环依赖
        return Response.json({
          error: 'API not available in SSR mode',
          hint: 'Use the original SPA for full functionality'
        }, { status: 404 })
      }

      // 3. 处理静态资源（由 Assets 配置自动处理）
      // 静态资源（JS, CSS, images）由 Assets 直接提供
      // 不需要 Worker 处理

      // 4. 处理页面请求 - SSR 渲染
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
      start(controller) {
        // 发送初始连接消息
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'connected', 
            message: 'SSE connection established',
            timestamp: Date.now()
          })}\n\n`)
        )

        // 心跳 - 每 30 秒发送一次
        const heartbeat = setInterval(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: Date.now()
            })}\n\n`)
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
 * 渲染 React 组件到 HTML
 */
async function renderPage(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  try {
    // 获取初始数据（可选）
    const initialData = await getInitialData(url, env)
    
    // 渲染 React 组件到字符串
    const appHtml = renderToString(
      <App initialData={initialData} location={url.pathname} />
    )
    
    // 生成完整的 HTML
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF Tracking - Affiliate Tracking System</title>
    <meta name="description" content="Cloudflare Workers based affiliate tracking system with real-time analytics" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      #root {
        min-height: 100vh;
      }
      /* 加载动画 */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f5f5f5;
      }
      .loading-spinner::after {
        content: '';
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-top-color: #1890ff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    </style>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <!-- 注入初始数据 -->
    <script>
      window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
    </script>
    <!-- 客户端 hydration 脚本 -->
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
      },
    })
  } catch (error) {
    console.error('❌ SSR render error:', error)
    
    // 降级：返回 SPA 模式
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF Tracking</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
      }
      #root {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
    `
    
    return new Response(fallbackHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }
}

/**
 * 获取初始数据
 * 根据页面路径获取相应的数据
 */
async function getInitialData(url: URL, env: Env): Promise<any> {
  try {
    const pathname = url.pathname
    
    // Dashboard 页面 - 获取统计数据
    if (pathname === '/' || pathname === '/dashboard') {
      return await getDashboardData(env)
    }
    
    // 其他页面 - 暂时返回空数据
    // 后续可以根据需要添加更多数据预取逻辑
    return {}
  } catch (error) {
    console.error('❌ Get initial data error:', error)
    return {}
  }
}

/**
 * 获取 Dashboard 数据
 */
async function getDashboardData(env: Env): Promise<any> {
  try {
    // 从 Analytics Engine 获取统计数据
    // 这里暂时返回模拟数据，后续可以连接真实数据源
    return {
      stats: {
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        conversionRate: 0
      },
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('❌ Get dashboard data error:', error)
    return {}
  }
}
