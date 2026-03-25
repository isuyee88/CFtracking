/**
 * @fileoverview SSE Hook
 * @description React Hook for Server-Sent Events (SSE) 实时推送
 * 输入：SSE 配置选项
 * 输出：SSE 连接状态、数据、控制方法
 * 逻辑交互：
 *   - 建立 SSE 连接到服务端
 *   - 自动重连（断线重连）
 *   - 心跳检测
 *   - 数据更新通知
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface SSEData {
  type: 'heartbeat' | 'new_click' | 'new_conversion' | 'error'
  data?: any
  timestamp: number
}

export interface SSEStatus {
  connected: boolean
  connecting: boolean
  error: Error | null
  lastMessage: SSEData | null
  retryCount: number
}

export interface UseSSEOptions {
  url?: string
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  onMessage?: (data: SSEData) => void
  onError?: (error: Error) => void
}

/**
 * SSE Hook
 * @param options 配置选项
 * @returns SSE 状态和方法
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = '/api/sse/updates',
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 3000,
    onMessage,
    onError,
  } = options

  const [data, setData] = useState<SSEData | null>(null)
  const [status, setStatus] = useState<SSEStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    retryCount: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isManualDisconnect = useRef(false)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    isManualDisconnect.current = false
    setStatus((prev) => ({ ...prev, connecting: true, error: null }))

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('📡 SSE connected')
        setStatus({
          connected: true,
          connecting: false,
          error: null,
          lastMessage: null,
          retryCount: 0,
        })
      }

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SSEData
          setData(message)
          setStatus((prev) => ({ ...prev, lastMessage: message }))

          if (onMessage) {
            onMessage(message)
          }

          console.log('📡 SSE message:', message)
        } catch (error) {
          console.error('Failed to parse SSE message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error)

        const err = new Error('SSE connection error')
        setStatus((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
          error: err,
        }))

        if (onError) {
          onError(err)
        }

        eventSource.close()

        // 自动重连
        if (autoReconnect && !isManualDisconnect.current && status.retryCount < maxReconnectAttempts) {
          const nextRetry = status.retryCount + 1
          console.log(`🔄 Reconnecting in ${reconnectDelay}ms (attempt ${nextRetry}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            setStatus((prev) => ({ ...prev, retryCount: nextRetry }))
            connect()
          }, reconnectDelay)
        } else if (!isManualDisconnect.current) {
          console.error('❌ Max reconnection attempts reached')
        }
      }
    } catch (error) {
      console.error('❌ Failed to create EventSource:', error)
      setStatus((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error as Error,
      }))
    }
  }, [url, autoReconnect, maxReconnectAttempts, reconnectDelay, onMessage, onError, status.retryCount])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setStatus((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
    }))

    console.log('🔌 SSE disconnected')
  }, [])

  useEffect(() => {
    // 组件挂载时自动连接
    connect()

    // 组件卸载时断开连接
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    data,
    status,
    connect,
    disconnect,
  }
}
