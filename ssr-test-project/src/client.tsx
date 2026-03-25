/**
 * 文件用途：客户端水合（Hydration）脚本
 * 描述：React 客户端加载后接管 SSR 渲染的页面
 * 
 * 输入：
 * - SSR 渲染的 HTML
 * - window.__INITIAL_STATE__ 初始数据
 * 
 * 输出：
 * - 交互式 React 应用
 * - WebSocket 实时连接
 * 
 * 逻辑交互：
 *   - React hydrateRoot 接管 SSR HTML
 *   - 连接 WebSocket 接收实时更新
 *   - 更新 UI 状态
 */

import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// 客户端水合
hydrateRoot(document.getElementById('root')!, (
  <BrowserRouter>
    <App />
  </BrowserRouter>
))

console.log('✅ React client hydrated')
