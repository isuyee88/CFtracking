/**
 * @fileoverview 前端入口文件
 * @description React 应用入口，使用 CSR 模式
 * 输出：渲染的 React 应用
 * 逻辑交互：
 *   - 直接渲染 React 应用
 *   - 初始数据通过 Context 传递给子组件
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'

// 声明全局类型
declare global {
  interface Window {
    __INITIAL_DATA__?: any
  }
}

// 获取初始数据（如果有的话）
const initialData = window.__INITIAL_DATA__

// 清理全局变量，避免内存泄漏
delete window.__INITIAL_DATA__

console.log('[App] Initial data:', initialData)

// 使用 CSR 模式
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App initialData={initialData} />
    </ToastProvider>
  </StrictMode>,
)
console.log('[App] CSR mode enabled')

