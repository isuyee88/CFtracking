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
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useSSE } from './hooks/useSSE'

interface AppProps {
  initialData?: any
}

interface Metadata {
  totalClicks: number
  totalConversions: number
  totalRevenue: number
}

/**
 * 首页组件
 */
const HomePage = ({ initialData }: AppProps) => {
  const metadata: Metadata = initialData?.metadata || {
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
  }

  const { status } = useSSE({
    onMessage: (data) => {
      console.log('📡 Home received update:', data)
    },
  })

  return (
    <div style={{ padding: '20px' }}>
      <h1>🚀 CF Tracking SSR</h1>
      <p>服务器端渲染 · Durable Objects 实时推送 · SSE</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        margin: '40px 0' 
      }}>
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            {metadata.totalClicks}
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            总点击数
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            {metadata.totalConversions}
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            转化数
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            ${metadata.totalRevenue.toFixed(2)}
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            总收入
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link 
          to="/dashboard"
          style={{ 
            display: 'inline-block', 
            padding: '12px 30px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px', 
            fontWeight: 600 
          }}
        >
          查看 Dashboard →
        </Link>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <span style={{ 
          display: 'inline-block', 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: status.connected ? '#10b981' : '#ef4444',
          marginRight: '8px'
        }} />
        SSE: {status.connected ? 'Connected' : status.connecting ? 'Connecting...' : 'Disconnected'}
      </div>
    </div>
  )
}

/**
 * Dashboard 组件
 */
const DashboardPage = () => {
  const { data: sseData, status } = useSSE({
    onMessage: (data) => {
      console.log('📡 Dashboard received update:', data)
    },
  })

  return (
    <div style={{ padding: '20px' }}>
      <h1>📊 Dashboard</h1>
      <p>实时监控 · Durable Objects 缓存 · SSE 推送</p>
      
      {sseData && (
        <div style={{ 
          padding: '16px', 
          background: '#e0f2fe', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #0ea5e9'
        }}>
          <strong>📡 实时更新:</strong>
          <pre style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
            {JSON.stringify(sseData, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        margin: '40px 0' 
      }}>
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            0
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            总点击数
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            0
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            转化数
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>
            $0.00
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            总收入
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <Link 
          to="/"
          style={{ 
            display: 'inline-block', 
            padding: '12px 30px', 
            background: 'linear-gradient(135deg, #9698a0 0%, #764ba2 100%)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px', 
            fontWeight: 600 
          }}
        >
          ← 返回首页
        </Link>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <span style={{ 
          display: 'inline-block', 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: status.connected ? '#10b981' : '#ef4444',
          marginRight: '8px'
        }} />
        SSE: {status.connected ? 'Connected' : status.connecting ? 'Connecting...' : 'Disconnected'}
      </div>
    </div>
  )
}

/**
 * 主应用组件
 */
const App: React.FC<AppProps> = ({ initialData }) => {
  const location = useLocation()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // SSR 期间不渲染（避免 hydration 不匹配）
  if (!hydrated) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🚀 CF Tracking SSR</h1>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <Routes location={location}>
      <Route path="/" element={<HomePage initialData={initialData} />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  )
}

export default App
