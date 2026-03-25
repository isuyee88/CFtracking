/**
 * @fileoverview 前端入口文件
 * @description React 应用入口，支持 SSR Hydration
 * 输入：SSR 注入的初始数据 (window.__INITIAL_DATA__)
 * 输出：渲染的 React 应用
 * 逻辑交互：
 *   - 检查 SSR 注入的初始数据
 *   - 使用 hydrateRoot 进行 Hydration（SSR）或 createRoot（CSR）
 *   - 初始数据通过 Context 传递给子组件
 */

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'

// 声明全局类型
declare global {
  interface Window {
    __INITIAL_DATA__?: any
  }
}

// 获取 SSR 注入的初始数据
const initialData = window.__INITIAL_DATA__

// 清理全局变量，避免内存泄漏
delete window.__INITIAL_DATA__

console.log('[Hydration] Initial data:', initialData)

// 判断是否 SSR 渲染
const isSSR = initialData && initialData.dataSource !== 'DEFAULT'

if (isSSR && document.getElementById('root')?.hasChildNodes()) {
  // SSR Hydration 模式
  hydrateRoot(
    document.getElementById('root')!,
    <StrictMode>
      <ToastProvider>
        <App initialData={initialData} />
      </ToastProvider>
    </StrictMode>,
  )
  console.log('[Hydration] SSR mode enabled')
} else {
  // CSR 模式
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <App initialData={initialData} />
      </ToastProvider>
    </StrictMode>,
  )
  console.log('[Hydration] CSR mode enabled')
}

