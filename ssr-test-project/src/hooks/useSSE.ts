/**
 * 文件用途：SSE 实时推送 Hook
 * 描述：使用 SSE (Server-Sent Events) 接收实时更新
 * 
 * SSE 优势：
 * - 基于 HTTP，更简单稳定
 * - 浏览器自动重连
 * - 单向推送（服务端→客户端），符合我们的场景
 * - 不易断连，防火墙友好
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface SSEData {
  type: 'new_click' | 'new_conversion' | 'heartbeat'
  data: any
  timestamp: number
}

export interface SSEStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastMessage: Date | null
  retryCount: number
}

export interface UseSSEOptions {
  url?: string
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = `/api/sse/updates`,
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 3000,
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
  const reconnectTimeoutRef = useRef<number>()
  const reconnectCountRef = useRef(0)

  /**
   * 连接 SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    setStatus((prev) => ({ ...prev, connecting: true, error: null }))

    try {
      const es = new EventSource(url)
      eventSourceRef.current = es

      // 连接打开
      es.onopen = () => {
        console.log('📡 SSE connected')
        setStatus({
          connected: true,
          connecting: false,
          error: null,
          lastMessage: new Date(),
          retryCount: 0,
        })
        reconnectCountRef.current = 0
      }

      // 接收消息
      es.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SSEData
          console.log('📡 SSE update:', message)

          setData(message)
          setStatus((prev) => ({ ...prev, lastMessage: new Date() }))
        } catch (error) {
          console.error('Failed to parse SSE message:', error)
        }
      }

      // 连接错误
      es.onerror = (error) => {
        console.error('SSE error:', error)
        
        const newRetryCount = reconnectCountRef.current + 1
        
        if (newRetryCount >= maxReconnectAttempts) {
          // 超过最大重连次数
          setStatus({
            connected: false,
            connecting: false,
            error: 'Max reconnection attempts reached',
            lastMessage: null,
            retryCount: newRetryCount,
          })
          es.close()
          eventSourceRef.current = null
        } else if (autoReconnect) {
          // 自动重连
          reconnectCountRef.current = newRetryCount
          setStatus((prev) => ({
            ...prev,
            connected: false,
            connecting: false,
            error: `Reconnecting (${newRetryCount}/${maxReconnectAttempts})...`,
            retryCount: newRetryCount,
          }))

          // SSE 会自动重连，但我们可以手动控制延迟
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      setStatus({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastMessage: null,
        retryCount: 0,
      })
    }
  }, [url, autoReconnect, maxReconnectAttempts, reconnectDelay])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setStatus({
      connected: false,
      connecting: false,
      error: null,
      lastMessage: null,
      retryCount: 0,
    })
  }, [])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0
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
