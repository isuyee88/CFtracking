/**
 * @fileoverview SSR 应用主入口
 * @description SSR 版本的 App 组件，支持服务器端渲染和客户端 hydration
 * 输入：initialData - SSR 注入的初始数据
 * 输出：渲染的 React 组件
 * 逻辑交互：
 *   - SSR 期间渲染静态 HTML
 *   - 客户端 hydration 后恢复交互
 *   - 使用 SSE 接收实时更新
 */

import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'

interface AppProps {
  initialData?: any
}

/**
 * 主应用组件
 * 默认重定向到原有的完整 Dashboard（/dashboard）
 */
const App: React.FC<AppProps> = ({ initialData }) => {
  const location = useLocation()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // SSR 期间不渲染（避免 hydration 不匹配）
  if (!hydrated) {
    return null
  }

  // 直接重定向到原有的完整 Dashboard
  return <Navigate to="/dashboard" replace />
}

export default App
