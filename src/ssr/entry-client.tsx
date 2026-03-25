/**
 * @fileoverview 客户端入口
 * @description 浏览器端 hydration 入口，激活 SSR 渲染的静态 HTML
 * 输入：SSR 渲染的 HTML
 * 输出：可交互的 React 应用
 * 逻辑交互：
 *   - 使用 hydrateRoot 激活 SSR 内容
 *   - 连接 SSE 实时推送
 *   - 恢复应用状态
 */

import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// 获取 SSR 注入的初始状态
const initialState = (window as any).__INITIAL_STATE__ || {}

console.log('🚀 Client hydration started', initialState)

// 客户端 hydration
hydrateRoot(
  document.getElementById('root')!,
  <BrowserRouter>
    <App initialData={initialState} />
  </BrowserRouter>
)

// 注册 Service Worker（如果存在）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service Worker 注册失败（可选）
    })
  })
}

console.log('✅ Client hydration completed')
