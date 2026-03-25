/**
 * 文件用途：实时数据更新 Hook
 * 描述：React Hook 用于管理 WebSocket 连接和实时数据更新
 * 
 * 输入：
 * - WebSocket URL
 * - 自动重连配置
 * 
 * 输出：
 * - 实时数据
 * - 连接状态
 * - 控制方法
 * 
 * 逻辑交互：
 *   - 自动连接 WebSocket
 *   - 监听实时更新
 *   - 断线自动重连
 *   - 心跳保活
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface RealtimeData {
  type: 'new_click' | 'new_conversion'
  data: any
  timestamp: number
}

export interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastMessage: Date | null
}

export interface UseRealtimeOptions {
  url?: string
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    url = `wss://${window.location.host}/websocket`,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
  } = options

  const [data, setData] = useState<RealtimeData | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const heartbeatIntervalRef = useRef<number>()
  const reconnectTimeoutRef = useRef<number>()

  /**
   * 发送心跳
   */
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
        })
      )
    }
  }, [])

  /**
   * 连接 WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus((prev) => ({ ...prev, connecting: true, error: null }))

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        setStatus({
          connected: true,
          connecting: false,
          error: null,
          lastMessage: new Date(),
        })
        reconnectAttemptsRef.current = 0

        // 订阅实时更新
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            data: {
              subscriptions: ['clicks', 'conversions'],
            },
          })
        )

        // 启动心跳
        heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, heartbeatInterval)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📡 Realtime update:', message)

          if (message.type === 'new_click' || message.type === 'new_conversion') {
            setData({
              type: message.type,
              data: message.data,
              timestamp: message.timestamp,
            })
            setStatus((prev) => ({ ...prev, lastMessage: new Date() }))
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
          connecting: false,
        }))
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket closed')
        setStatus((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
        }))

        // 清理心跳
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }

        // 自动重连
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`🔄 Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (autoReconnect) {
          setStatus((prev) => ({
            ...prev,
            error: 'Max reconnection attempts reached',
          }))
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setStatus({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastMessage: null,
      })
    }
  }, [url, autoReconnect, reconnectInterval, maxReconnectAttempts, heartbeatInterval, sendHeartbeat])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus({
      connected: false,
      connecting: false,
      error: null,
      lastMessage: null,
    })
  }, [])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    disconnect()
    setTimeout(connect, 100)
  }, [connect, disconnect])

  // 自动连接
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    data,
    status,
    connect,
    disconnect,
    reconnect,
  }
}
