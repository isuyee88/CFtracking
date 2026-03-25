/**
 * @fileoverview 主应用组件
 * @description 根据当前路径渲染对应页面（不使用 React Router）
 */
import { useEffect, useState } from 'react'

interface PageProps {
  initialData?: any[]
}

const HomePage = ({ initialData }: PageProps) => {
  return (
    <div className="container">
      <div className="hero">
        <h1>🚀 SSR + DO 实时缓存系统</h1>
        <p>服务器端渲染 · Durable Objects 实时推送 · Analytics Engine 自动触发</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>⚡ SSR 服务器端渲染</h3>
          <p>首屏秒开，无需等待 JS 下载</p>
          <ul>
            <li>✅ FCP &lt; 0.9s</li>
            <li>✅ LCP &lt; 1.2s</li>
            <li>✅ TTI &lt; 1.5s</li>
          </ul>
        </div>
        
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>💾 Durable Objects 缓存</h3>
          <p>SQLite 存储，强一致性保证</p>
          <ul>
            <li>📦 5GB 免费存储</li>
            <li>🔄 增量追加更新</li>
            <li>🧹 自动过期清理</li>
          </ul>
        </div>
        
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>📡 实时推送</h3>
          <p>WebSocket 实时数据推送</p>
          <ul>
            <li>🔌 客户端自动连接</li>
            <li>📊 新点击实时显示</li>
            <li>⚡ &lt;100ms 延迟</li>
          </ul>
        </div>
        
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>🤖 AE 自动触发</h3>
          <p>Analytics Engine 自动同步</p>
          <ul>
            <li>🎯 零轮询请求</li>
            <li>✅ 自动增量更新</li>
            <li>💰 免费无限制</li>
          </ul>
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <a href="/dashboard" style={{ display: 'inline-block', padding: '12px 30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 600 }}>
          查看 Dashboard →
        </a>
      </div>
    </div>
  )
}

const DashboardPage = () => {
  return (
    <div className="container">
      <div className="hero" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
        <h1>📊 实时监控 Dashboard <span style={{ display: 'inline-block', padding: '4px 12px', background: '#10b981', color: 'white', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, marginLeft: '10px' }}>LIVE</span></h1>
        <p>Durable Objects 缓存状态 · WebSocket 实时推送</p>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <a href="/" style={{ display: 'inline-block', padding: '12px 30px', background: 'linear-gradient(135deg, #9698a0 0%, #764ba2 100%)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 600 }}>
          ← 返回首页
        </a>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('')

  useEffect(() => {
    setCurrentPage(window.location.pathname)
  }, [])

  // SSR 期间和 hydration 初期，渲染一个占位符（必须与 SSR 输出完全一致）
  if (!currentPage) {
    return (
      <div className="container">
        <div className="hero">
          <h1>🚀 SSR + DO 实时缓存系统</h1>
          <p>服务器端渲染 · Durable Objects 实时推送 · Analytics Engine 自动触发</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>⚡ SSR 服务器端渲染</h3>
            <p>首屏秒开，无需等待 JS 下载</p>
            <ul>
              <li>✅ FCP &lt; 0.9s</li>
              <li>✅ LCP &lt; 1.2s</li>
              <li>✅ TTI &lt; 1.5s</li>
            </ul>
          </div>
          
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>💾 Durable Objects 缓存</h3>
            <p>SQLite 存储，强一致性保证</p>
            <ul>
              <li>📦 5GB 免费存储</li>
              <li>🔄 增量追加更新</li>
              <li>🧹 自动过期清理</li>
            </ul>
          </div>
          
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>📡 实时推送</h3>
            <p>WebSocket 实时数据推送</p>
            <ul>
              <li>🔌 客户端自动连接</li>
              <li>📊 新点击实时显示</li>
              <li>⚡ &lt;100ms 延迟</li>
            </ul>
          </div>
          
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', margin: '0 0 10px 0' }}>🤖 AE 自动触发</h3>
            <p>Analytics Engine 自动同步</p>
            <ul>
              <li>🎯 零轮询请求</li>
              <li>✅ 自动增量更新</li>
              <li>💰 免费无限制</li>
            </ul>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>0</div>
            <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>总点击数</div>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>0</div>
            <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>转化数</div>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#667eea' }}>$0.00</div>
            <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>总收入</div>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', background: '#10b981' }}></span>
              实时
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>连接状态</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <a href="/dashboard" style={{ display: 'inline-block', padding: '12px 30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 600 }}>
            查看 Dashboard →
          </a>
        </div>
      </div>
    )
  }

  if (currentPage === '/dashboard') {
    return <DashboardPage />
  }

  return <HomePage initialData={(window as any).__INITIAL_STATE__} />
}

export default App
