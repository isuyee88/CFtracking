/**
 * @fileoverview Durable Objects - 用户偏好管理
 * @description 管理用户偏好的云端存储和同步，支持 SSE 实时推送
 * @module handlers/do/user-preference.do
 * 
 * 输入输出:
 * - GET /preferences - 获取用户偏好
 * - POST /preferences - 更新用户偏好（触发 SSE 广播）
 * - GET /preferences/version - 获取版本信息
 * - GET /events - SSE 事件流连接
 * 
 * 前后端交互:
 * - 前端：useCloudSync Hook 通过 HTTP 和 SSE 与 DO 通信
 * - 后端：通过 Worker 路由暴露 DO Stub
 */

import { DurableObjectState, DurableObjectStorage } from '@cloudflare/workers-types';

/**
 * 用户偏好数据结构
 */
export interface UserPreferenceData {
  version: string;
  lastUpdated: number;
  lastModifiedBy: string;  // 设备 ID
  preferences: {
    ui: UIPreferences;
    tables: Record<string, TablePreferences>;
    views: Record<string, ViewPreferences>;
    system: SystemPreferences;
  };
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'standard' | 'comfortable';
  fontSize: 'small' | 'medium' | 'large';
  sidebarCollapsed: boolean;
}

export interface TablePreferences {
  columnVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  sorting?: any;
  filters?: any;
}

export interface ViewPreferences {
  timeRange?: string;
  metrics?: string[];
  entities?: string[];
}

export interface SystemPreferences {
  language: string;
  timezone: string;
  refreshInterval: number;
}

/**
 * SSE 事件数据结构
 */
interface SSEEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

export class UserPreferenceDurableObject {
  private storage: DurableObjectStorage;
  private eventControllers: Map<string, ReadableStreamDefaultController<Uint8Array>> = new Map();

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // === GET /preferences ===
    // 获取用户偏好（用于拉取）
    if (method === 'GET' && path === '/preferences') {
      return this.getPreferences();
    }

    // === POST /preferences ===
    // 更新用户偏好（用于推送）
    if (method === 'POST' && path === '/preferences') {
      return this.updatePreferences(request);
    }

    // === GET /preferences/version ===
    // 检查版本（轻量级拉取）
    if (method === 'GET' && path === '/preferences/version') {
      return this.getVersion();
    }

    // === GET /events ===
    // SSE 事件流（推送通知）
    if (method === 'GET' && path === '/events') {
      return this.handleSSE(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * 获取完整用户偏好
   */
  private async getPreferences(): Promise<Response> {
    const data = await this.storage.get<UserPreferenceData>('preferences');
    
    if (!data) {
      // 返回默认偏好
      return Response.json(this.getDefaultPreferences());
    }

    return Response.json(data);
  }

  /**
   * 获取版本信息（轻量级）
   */
  private async getVersion(): Promise<Response> {
    const data = await this.storage.get<UserPreferenceData>('preferences');
    
    return Response.json({
      version: data?.version || '1.0',
      lastUpdated: data?.lastUpdated || 0,
      lastModifiedBy: data?.lastModifiedBy || 'unknown',
    });
  }

  /**
   * 更新用户偏好（推送）
   */
  private async updatePreferences(request: Request): Promise<Response> {
    try {
      const update = await request.json() as Record<string, any>;
      const deviceId = request.headers.get('X-Device-ID') || 'unknown';

      // 获取当前数据
      const current = await this.storage.get<UserPreferenceData>('preferences');
      const currentData = current || this.getDefaultPreferences();

      // 检查版本冲突（可选）
      if (update.lastKnownVersion && (update.lastKnownVersion as number) < currentData.lastUpdated) {
        // 客户端版本过旧，返回冲突信息
        return Response.json({
          success: false,
          conflict: true,
          serverVersion: currentData,
          message: 'Server has newer version',
        }, { status: 409 });
      }

      // 合并更新
      const newData: UserPreferenceData = {
        ...currentData,
        version: this.incrementVersion(currentData.version),
        lastUpdated: Date.now(),
        lastModifiedBy: deviceId,
        preferences: {
          ...currentData.preferences,
          ...(update.preferences as Record<string, any> || {}),
        },
      };

      // 持久化
      await this.storage.put('preferences', newData);

      // 🎯 广播 SSE 事件通知所有连接的客户端
      this.broadcastEvent({
        type: 'preference_updated',
        version: newData.lastUpdated,
        timestamp: Date.now(),
        modifiedBy: deviceId,
      });

      return Response.json({
        success: true,
        data: newData,
        version: newData.lastUpdated,
      });

    } catch (error) {
      console.error('[UserPreferenceDO] Update failed:', error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      }, { status: 500 });
    }
  }

  /**
   * SSE 事件处理
   */
  private handleSSE(request: Request): Response {
    const encoder = new TextEncoder();
    const clientId = request.headers.get('X-Device-ID') || `client_${Date.now()}`;
    
    const stream = new ReadableStream({
      async start(controller) {
        // 发送连接确认
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: Date.now() })}\n\n`)
        );

        // 定期发送心跳（保持连接）
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        }, 30000); // 30 秒心跳

        // 客户端断开时清理
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          controller.close();
        });
      },
      cancel() {
        // 流关闭时的清理逻辑
      }
    });

    // 注册这个客户端的 controller（用于后续广播）
    this.eventControllers.set(clientId, stream as any);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'X-Client-ID': clientId,
      },
    });
  }

  /**
   * 广播事件到所有连接的客户端
   */
  private broadcastEvent(data: SSEEvent) {
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(data)}\n\n`;

    // 遍历所有连接的客户端
    for (const [clientId, controller] of this.eventControllers.entries()) {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        // 客户端已断开，移除
        this.eventControllers.delete(clientId);
        console.log(`[SSE] Client ${clientId} disconnected`);
      }
    }

    console.log(`[SSE] Broadcasted event to ${this.eventControllers.size} clients`);
  }

  /**
   * 获取默认偏好设置
   */
  private getDefaultPreferences(): UserPreferenceData {
    return {
      version: '1.0',
      lastUpdated: 0,
      lastModifiedBy: 'system',
      preferences: {
        ui: {
          theme: 'auto',
          density: 'standard',
          fontSize: 'medium',
          sidebarCollapsed: false,
        },
        tables: {},
        views: {},
        system: {
          language: 'en',
          timezone: 'UTC',
          refreshInterval: 30000,
        },
      },
    };
  }

  /**
   * 版本号递增
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const minor = parseInt(parts[1] || '0', 10) + 1;
    return `${parts[0]}.${minor}`;
  }
}
