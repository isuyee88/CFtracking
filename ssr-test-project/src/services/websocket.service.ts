/**
 * 文件用途：WebSocket 实时推送服务
 * 描述：管理 WebSocket 连接和实时数据推送
 */

import type { ClickData } from '../durable-objects/cache-do'

export interface WebSocketMessage {
  type: 'new_click' | 'new_conversion' | 'heartbeat' | 'error' | 'subscribe' | 'ping' | 'pong' | 'subscribed'
  data?: any
  timestamp: number
  clientId?: string
}

export interface ClientInfo {
  id: string
  connectedAt: number
  lastHeartbeat: number
  subscriptions: string[]
}

/**
 * WebSocket 实时推送管理器
 */
export class WebSocketManager {
  private clients: Map<string, WebSocket> = new Map()
  private clientInfo: Map<string, ClientInfo> = new Map()

  /**
   * 添加客户端连接
   */
  addClient(clientId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws)
    this.clientInfo.set(clientId, {
      id: clientId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      subscriptions: ['clicks', 'conversions'],
    })

    ws.addEventListener('message', (event) => this.handleMessage(clientId, event))
    ws.addEventListener('close', () => this.removeClient(clientId))
    ws.addEventListener('error', () => this.removeClient(clientId))

    console.log(`🔌 Client connected: ${clientId}`)
  }

  /**
   * 移除客户端
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId)
    this.clientInfo.delete(clientId)
    console.log(`🔌 Client disconnected: ${clientId}`)
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string) as WebSocketMessage

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message)
          break

        case 'heartbeat':
          this.handleHeartbeat(clientId)
          break

        case 'ping':
          this.sendPong(clientId)
          break
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * 处理订阅请求
   */
  private handleSubscribe(clientId: string, message: WebSocketMessage): void {
    const client = this.clientInfo.get(clientId)
    if (!client) return

    if (message.data?.subscriptions) {
      client.subscriptions = message.data.subscriptions
      this.clientInfo.set(clientId, client)
    }

    this.sendMessage(clientId, {
      type: 'subscribed',
      timestamp: Date.now(),
    } as WebSocketMessage)

    console.log(`📡 Client ${clientId} subscribed to: ${client.subscriptions.join(', ')}`)
  }

  /**
   * 处理心跳
   */
  private handleHeartbeat(clientId: string): void {
    const client = this.clientInfo.get(clientId)
    if (!client) return

    client.lastHeartbeat = Date.now()
    this.clientInfo.set(clientId, client)

    this.sendMessage(clientId, {
      type: 'heartbeat',
      timestamp: Date.now(),
    })
  }

  /**
   * 发送 Pong 响应
   */
  private sendPong(clientId: string): void {
    this.sendMessage(clientId, {
      type: 'pong',
      timestamp: Date.now(),
    })
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: WebSocketMessage, excludeClientId?: string): void {
    const messageStr = JSON.stringify(message)

    for (const [clientId, ws] of this.clients.entries()) {
      if (clientId === excludeClientId) continue

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr)
      }
    }
  }

  /**
   * 广播新点击数据
   */
  broadcastNewClick(click: ClickData, excludeClientId?: string): void {
    this.broadcast(
      {
        type: 'new_click',
        data: click,
        timestamp: Date.now(),
      },
      excludeClientId
    )
  }

  /**
   * 广播新转化数据
   */
  broadcastNewConversion(conversion: ClickData, excludeClientId?: string): void {
    this.broadcast(
      {
        type: 'new_conversion',
        data: conversion,
        timestamp: Date.now(),
      },
      excludeClientId
    )
  }

  /**
   * 发送消息给指定客户端
   */
  sendMessage(clientId: string, message: WebSocketMessage): void {
    const ws = this.clients.get(clientId)
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify(message))
  }

  /**
   * 获取在线客户端数量
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * 获取所有客户端信息
   */
  getAllClients(): ClientInfo[] {
    return Array.from(this.clientInfo.values())
  }

  /**
   * 清理过期连接（超过 5 分钟无心跳）
   */
  cleanupStaleConnections(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    for (const [clientId, info] of this.clientInfo.entries()) {
      if (info.lastHeartbeat < fiveMinutesAgo) {
        console.log(`🧹 Cleaning up stale client: ${clientId}`)
        const ws = this.clients.get(clientId)
        if (ws) {
          ws.close()
        }
        this.removeClient(clientId)
      }
    }
  }
}

/**
 * 生成客户端 ID
 */
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
