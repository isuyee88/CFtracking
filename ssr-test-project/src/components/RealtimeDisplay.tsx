/**
 * 文件用途：实时数据展示组件（SSE 版本）
 * 描述：使用 SSE (Server-Sent Events) 接收实时更新
 */

import { useState, useEffect } from 'react'
import { useSSE } from '../hooks/useSSE'

export interface ClickData {
  id: string
  campaignId?: string
  offerId?: string
  timestamp: number
  country?: string
  revenue?: number
  isConversion?: boolean
}

interface RealtimeDisplayProps {
  initialData?: ClickData[]
  maxItems?: number
  showConnectionStatus?: boolean
  refreshInterval?: number
}

export function RealtimeDisplay({
  initialData = [],
  maxItems = 50,
  showConnectionStatus = true,
  refreshInterval = 30000,
}: RealtimeDisplayProps) {
  const [data, setData] = useState<ClickData[]>(initialData)
  const { data: sseUpdate, status } = useSSE()

  // 处理 SSE 更新
  useEffect(() => {
    if (sseUpdate && sseUpdate.type === 'new_click') {
      console.log('📡 SSE received new click notification')
      // SSE 只通知有新数据，实际数据需要从 API 获取
      fetchLatestData()
    }
  }, [sseUpdate])

  // 定期刷新数据
  const fetchLatestData = async () => {
    try {
      const response = await fetch('/api/clicks?limit=10')
      const latest = await response.json() as ClickData[]
      if (latest.length > 0) {
        setData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id))
          const newItems = latest.filter((item) => !existingIds.has(item.id))
          return [...newItems, ...prev].slice(0, maxItems)
        })
      }
    } catch (error) {
      console.error('Failed to fetch latest data:', error)
    }
  }

  // 初始加载和定期刷新
  useEffect(() => {
    fetchLatestData()
    const interval = setInterval(fetchLatestData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, maxItems])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN')
  }

  const formatRevenue = (revenue?: number) => {
    if (revenue === undefined || revenue === null) return '-'
    return `$${revenue.toFixed(2)}`
  }

  return (
    <div style={styles.container}>
      {showConnectionStatus && (
        <div style={styles.statusBar}>
          <div style={styles.statusInfo}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: status.connected ? '#10b981' : status.connecting ? '#f59e0b' : '#ef4444',
              }}
            />
            <span style={styles.statusText}>
              {status.connected ? '实时连接中 (SSE)' : status.connecting ? '连接中...' : '已断开'}
            </span>
          </div>

          {status.lastMessage && (
            <span style={styles.lastUpdate}>
              最后更新：{formatTime(status.lastMessage.getTime())}
            </span>
          )}

          {!status.connected && !status.connecting && status.retryCount >= 10 && (
            <button onClick={() => window.location.reload()} style={styles.reconnectButton}>
              重新连接
            </button>
          )}
        </div>
      )}

      <div style={styles.dataList}>
        {data.length === 0 ? (
          <div style={styles.emptyState}>暂无数据</div>
        ) : (
          data.map((item, index) => (
            <div key={item.id} style={styles.dataItem}>
              <div style={styles.dataHeader}>
                <span style={styles.dataId}>#{item.id.substr(0, 8)}</span>
                <span style={styles.dataTime}>{formatTime(item.timestamp)}</span>
              </div>

              <div style={styles.dataContent}>
                {item.campaignId && (
                  <div style={styles.dataField}>
                    <span style={styles.fieldLabel}>Campaign:</span>
                    <span style={styles.fieldValue}>{item.campaignId}</span>
                  </div>
                )}

                {item.offerId && (
                  <div style={styles.dataField}>
                    <span style={styles.fieldLabel}>Offer:</span>
                    <span style={styles.fieldValue}>{item.offerId}</span>
                  </div>
                )}

                {item.country && (
                  <div style={styles.dataField}>
                    <span style={styles.fieldLabel}>国家:</span>
                    <span style={styles.fieldValue}>{item.country}</span>
                  </div>
                )}

                <div style={styles.dataField}>
                  <span style={styles.fieldLabel}>类型:</span>
                  <span
                    style={{
                      ...styles.fieldValue,
                      color: item.isConversion ? '#10b981' : '#667eea',
                      fontWeight: 600,
                    }}
                  >
                    {item.isConversion ? '转化' : '点击'}
                  </span>
                </div>

                <div style={styles.dataField}>
                  <span style={styles.fieldLabel}>收入:</span>
                  <span style={{ ...styles.fieldValue, fontWeight: 600 }}>
                    {formatRevenue(item.revenue)}
                  </span>
                </div>
              </div>

              {index < data.length - 1 && <div style={styles.divider} />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
  },
  statusInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background-color 0.3s',
  },
  statusText: {
    fontSize: '14px',
    color: '#495057',
    fontWeight: 500,
  },
  lastUpdate: {
    fontSize: '12px',
    color: '#6c757d',
  },
  reconnectButton: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  dataList: {
    padding: '20px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6c757d',
    fontSize: '14px',
  },
  dataItem: {
    padding: '16px 0',
  },
  dataHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  dataId: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  dataTime: {
    fontSize: '12px',
    color: '#6c757d',
  },
  dataContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  dataField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '11px',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: '13px',
    color: '#212529',
  },
  divider: {
    height: '1px',
    background: '#e9ecef',
    marginTop: '16px',
  },
}
