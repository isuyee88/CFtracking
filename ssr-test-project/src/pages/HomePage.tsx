/**
 * @fileoverview 首页组件
 * @description SSR 渲染的首页，包含实时数据展示
 */
import { RealtimeDisplay } from '../components/RealtimeDisplay'

interface HomePageProps {
  initialData?: any[]
}

export default function HomePage({ initialData = [] }: HomePageProps) {
  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>🚀 SSR + DO 实时缓存系统</h1>
        <p style={styles.subtitle}>
          服务器端渲染 · Durable Objects 实时推送 · Analytics Engine 自动触发
        </p>
      </div>

      <div style={styles.features}>
        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>⚡ SSR 服务器端渲染</h3>
          <p>首屏秒开，无需等待 JS 下载</p>
          <ul style={styles.list}>
            <li>✅ FCP &lt; 0.9s</li>
            <li>✅ LCP &lt; 1.2s</li>
            <li>✅ TTI &lt; 1.5s</li>
          </ul>
        </div>

        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>💾 Durable Objects 缓存</h3>
          <p>SQLite 存储，强一致性保证</p>
          <ul style={styles.list}>
            <li>📦 5GB 免费存储</li>
            <li>🔄 增量追加更新</li>
            <li>🧹 自动过期清理</li>
          </ul>
        </div>

        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>📡 实时推送</h3>
          <p>WebSocket 实时数据推送</p>
          <ul style={styles.list}>
            <li>🔌 客户端自动连接</li>
            <li>📊 新点击实时显示</li>
            <li>⚡ &lt;100ms 延迟</li>
          </ul>
        </div>

        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>🤖 AE 自动触发</h3>
          <p>Analytics Engine 自动同步</p>
          <ul style={styles.list}>
            <li>🎯 零轮询请求</li>
            <li>✅ 自动增量更新</li>
            <li>💰 免费无限制</li>
          </ul>
        </div>
      </div>

      <div style={styles.statsSection}>
        <h2 style={styles.sectionTitle}>实时数据</h2>
        <RealtimeDisplay initialData={initialData} maxItems={20} />
      </div>

      <div style={styles.footer}>
        <a href="/dashboard" style={styles.button}>
          查看 Dashboard →
        </a>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '60px 20px',
    borderRadius: '12px',
    marginBottom: '40px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '3rem',
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    fontSize: '1.2rem',
    opacity: 0.9,
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  featureCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  featureTitle: {
    margin: '0 0 10px 0',
    color: '#667eea',
    fontSize: '1.5rem',
  },
  list: {
    margin: '10px 0 0 0',
    paddingLeft: '20px',
    lineHeight: 1.8,
  },
  statsSection: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '2rem',
    marginBottom: '20px',
    color: '#333',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  button: {
    display: 'inline-block',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 600,
  },
}
