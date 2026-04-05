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
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  }
}

// 获取初始数据（如果有的话）
const initialData = window.__INITIAL_DATA__

// 清理全局变量，避免内存泄漏
delete window.__INITIAL_DATA__

function isLocalPreviewHost() {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function hideBootScreen() {
  const bootScreen = document.getElementById('app-boot')
  if (!bootScreen) {
    return
  }

  bootScreen.classList.add('boot-hidden')
  window.setTimeout(() => bootScreen.remove(), 240)
}

function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  if (isLocalPreviewHost()) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })

    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    }

    return
  }

  const scheduleRegistration = () => {
    const onIdle = window.requestIdleCallback
      ? (callback: IdleRequestCallback) => window.requestIdleCallback!(callback, { timeout: 10000 })
      : (callback: IdleRequestCallback) =>
          window.setTimeout(
            () => callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline),
            0
          )

    onIdle(() => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('[PWA] Service worker registration failed', error)
      })
    })
  }

  const deferRegistration = () => {
    window.setTimeout(scheduleRegistration, 5000)
  }

  if (document.readyState === 'complete') {
    deferRegistration()
    return
  }

  window.addEventListener('load', deferRegistration, { once: true })
}

console.log('[App] Initial data:', initialData)

// 使用 CSR 模式
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App initialData={initialData} />
    </ToastProvider>
  </StrictMode>,
)

requestAnimationFrame(() => {
  requestAnimationFrame(hideBootScreen)
})

registerServiceWorker()

console.log('[App] CSR mode enabled')

