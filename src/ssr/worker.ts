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

      // 2. 处理 API 请求（直接返回错误，让前端处理）
      if (url.pathname.startsWith('/api/')) {
        // API 请求应该由 Cloudflare Workers 直接处理
        // 这里不转发，因为可能会导致循环依赖
        return Response.json({
          error: 'API not available in SSR mode',
          hint: 'Use the original SPA for full functionality'
        }, { status: 404 })
      }

      // 3. 处理静态资源（由 Assets 配置自动处理）
      // 访问 /dashboard 时，让 Assets 返回 SPA（原来的 Dashboard）
      // 不渲染 SSR 内容，直接让 Assets 处理

      // 4. 首页直接重定向到 Dashboard
      if (url.pathname === '/') {
        return Response.redirect('https://' + url.host + '/dashboard', 302)
      }

      // 5. 其他所有路径都返回 SPA（让原有的 Dashboard 工作）
      // 不再渲染 SSR 内容
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
 * 注意：这个函数现在只返回一个简单的空页面
 * 实际的 Dashboard 由 Assets 返回 SPA
 */
async function renderPage(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  // 不再渲染 SSR 内容，返回一个简单的空页面
  // Assets 会自动返回 SPA（如果配置了 run_worker_first = false）
  const html = `
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
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
