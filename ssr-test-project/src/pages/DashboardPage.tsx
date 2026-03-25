/**
 * @fileoverview Dashboard 页面组件
 * 描述：实时监控 Dashboard，展示缓存状态和实时数据
 */
import { RealtimeDisplay, type ClickData } from '../components/RealtimeDisplay'
import { useState, useEffect } from 'react'

interface CacheMetadata {
  lastUpdateTime: number
  lastDataTimestamp: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  region: string
}

export default function DashboardPage() {
  const [metadata, setMetadata] = useState<CacheMetadata | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetadata()
  }, [])

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/metadata')
      const data = await response.json() as CacheMetadata
      setMetadata(data)
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurge = async () => {
    try {
      const response = await fetch('/admin/cache/purge', { method: 'POST' })
      const result = await response.json() as { deleted: number }
      alert(`清除完成：${result.deleted} 条记录`)
      fetchMetadata()
    } catch (error) {
      console.error('Failed to purge cache:', error)
      alert('清除失败')
    }
  }

  const handleRefresh = () => {
    fetchMetadata()
  }

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>
          📊 实时监控 Dashboard <span style={styles.badge}>LIVE</span>
        </h1>
        <p style={styles.subtitle}>Durable Objects 缓存状态 · WebSocket 实时推送</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>🇭🇰 🇨🇳</div>
          <div style={styles.statLabel}>启用地区：HK, CN</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>5min</div>
          <div style={styles.statLabel}>CDN 缓存 TTL</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {loading ? '...' : metadata?.totalClicks || 0}
          </div>
          <div style={styles.statLabel}>DO 缓存点击数</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {loading ? '...' : metadata?.totalConversions || 0}
          </div>
          <div style={styles.statLabel}>转化数</div>
        </div>
      </div>

      <div style={styles.infoSection}>
        <h2 style={styles.sectionTitle}>缓存元数据</h2>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : metadata ? (
          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>最后更新时间:</span>
              <span style={styles.metadataValue}>
                {formatTime(metadata.lastUpdateTime)}
              </span>
            </div>

            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>最后数据时间:</span>
              <span style={styles.metadataValue}>
                {formatTime(metadata.lastDataTimestamp)}
              </span>
            </div>

            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>总收入:</span>
              <span style={styles.metadataValue}>
                ${metadata.totalRevenue?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>地区:</span>
              <span style={styles.metadataValue}>{metadata.region}</span>
            </div>
          </div>
        ) : (
          <div style={styles.error}>无法加载元数据</div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>缓存架构</h2>
        <div style={styles.architecture}>
          <div style={styles.archCard}>
            <h3 style={styles.archTitle}>📊 缓存层次</h3>
            <ul style={styles.archList}>
              <li>
                <strong>CDN Edge:</strong> ✅ 5 分钟 TTL
              </li>
              <li>
                <strong>Durable Objects:</strong> ✅ SQLite 存储（7 天）
              </li>
              <li>
                <strong>Analytics Engine:</strong> 🤖 自动触发
              </li>
              <li>
                <strong>WebSocket:</strong> 🔌 实时推送
              </li>
            </ul>
          </div>

          <div style={styles.archCard}>
            <h3 style={styles.archTitle}>🔧 快速操作</h3>
            <div style={styles.buttonGroup}>
              <button onClick={handlePurge} style={styles.button}>
                清除过期数据
              </button>
              <button onClick={handleRefresh} style={styles.buttonSecondary}>
                刷新统计
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>实时数据流</h2>
        <RealtimeDisplay maxItems={30} showConnectionStatus={true} />
      </div>

      <div style={styles.footer}>
        <a href="/" style={styles.backButton}>
          ← 返回首页
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
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    padding: '60px 20px',
    borderRadius: '12px',
    marginBottom: '40px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '2.5rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  subtitle: {
    margin: 0,
    fontSize: '1.1rem',
    opacity: 0.9,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#10b981',
    color: 'white',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#667eea',
    marginBottom: '8px',
  },
  statLabel: {
    color: '#666',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '2rem',
    marginBottom: '20px',
    color: '#333',
  },
  infoSection: {
    marginBottom: '40px',
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '20px',
    color: '#ef4444',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px',
  },
  metadataLabel: {
    fontSize: '12px',
    color: '#6c757d',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  metadataValue: {
    fontSize: '16px',
    color: '#212529',
    fontWeight: 500,
  },
  architecture: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  archCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  archTitle: {
    margin: '0 0 16px 0',
    color: '#667eea',
    fontSize: '1.3rem',
  },
  archList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: 2,
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
  },
  buttonSecondary: {
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  backButton: {
    display: 'inline-block',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #9698a0 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 600,
  },
}
