/**
 * @fileoverview Flow Traffic Log Service
 * @description 处理 Flow 执行日志的记录和查询
 * @module services/flow/flow.log.service
 * @input FlowTrafficLog
 * @output FlowTrafficLog[]
 * @logic 使用 KV 存储日志，支持按 Flow/Campaign 查询
 * @frontend 无
 * @backend FlowEngine, FlowRoutes 使用
 */

import type { Env } from '@/config/env';
import type { FlowTrafficLog } from '@/types/flow';

export interface FlowLogQuery {
  flowId?: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface FlowLogListResult {
  logs: FlowTrafficLog[];
  total: number;
  hasMore: boolean;
}

/**
 * Flow Traffic Log Service
 * 
 * 使用 KV 存储流量日志，支持：
 * - 按时间范围查询
 * - 按 Flow ID 查询
 * - 按 Campaign ID 查询
 * - 分页查询
 */
export class FlowLogService {
  private kv: KVNamespace | null = null;

  constructor(env: Env) {
    this.kv = (env as any).TRAFFIC_LOGS || null;
  }

  /**
   * 记录 Flow 执行日志
   */
  async log(entry: Omit<FlowTrafficLog, 'id' | 'timestamp'>): Promise<FlowTrafficLog | null> {
    if (!this.kv) {
      console.warn('Traffic logs KV not configured, skipping log');
      return null;
    }

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const log: FlowTrafficLog = {
      ...entry,
      id,
      timestamp,
    };

    const key = this.getLogKey(log);
    const ttl = 7 * 24 * 60 * 60; // 7 days TTL

    try {
      await this.kv.put(key, JSON.stringify(log), { expirationTtl: ttl });
      
      // Add to index for querying
      await this.addToIndex(log);
      
      return log;
    } catch (err) {
      console.error('Failed to log flow execution:', err);
      return null;
    }
  }

  /**
   * 查询日志列表
   */
  async query(query: FlowLogQuery): Promise<FlowLogListResult> {
    if (!this.kv) {
      return { logs: [], total: 0, hasMore: false };
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    try {
      let logs: FlowTrafficLog[] = [];

      if (query.flowId) {
        logs = await this.getLogsByFlow(query.flowId);
      } else if (query.campaignId) {
        logs = await this.getLogsByCampaign(query.campaignId);
      } else {
        logs = await this.getRecentLogs(limit + offset + 1);
      }

      // Filter by date range
      if (query.startDate || query.endDate) {
        logs = logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          if (query.startDate && logTime < new Date(query.startDate).getTime()) {
            return false;
          }
          if (query.endDate && logTime > new Date(query.endDate).getTime()) {
            return false;
          }
          return true;
        });
      }

      const total = logs.length;
      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        total,
        hasMore: offset + limit < total,
      };
    } catch (err) {
      console.error('Failed to query flow logs:', err);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * 获取单个日志详情
   */
  async getById(id: string): Promise<FlowTrafficLog | null> {
    if (!this.kv) return null;

    try {
      const log = await this.kv.get(`log:${id}`, 'json') as FlowTrafficLog | null;
      return log;
    } catch (err) {
      console.error('Failed to get log by id:', err);
      return null;
    }
  }

  /**
   * 清除 Flow 的所有日志
   */
  async clearFlowLogs(flowId: string): Promise<number> {
    if (!this.kv) return 0;

    try {
      const keys = await this.kv.list({ prefix: `flow:${flowId}:` });
      let deleted = 0;
      
      for await (const key of keys.keys) {
        await this.kv.delete(key.name);
        deleted++;
      }

      return deleted;
    } catch (err) {
      console.error('Failed to clear flow logs:', err);
      return 0;
    }
  }

  // ==================== Private Methods ====================

  private getLogKey(log: FlowTrafficLog): string {
    return `log:${log.id}`;
  }

  private async addToIndex(log: FlowTrafficLog): Promise<void> {
    if (!this.kv) return;

    const indexKey = `flow:${log.flowId}:${log.timestamp}`;
    const campaignIndexKey = `campaign:${log.campaignId}:${log.timestamp}`;
    const recentIndexKey = `recent:${log.timestamp}`;

    try {
      // Store reference keys that point to the actual log
      await this.kv.put(indexKey, log.id, { expirationTtl: 7 * 24 * 60 * 60 });
      await this.kv.put(campaignIndexKey, log.id, { expirationTtl: 7 * 24 * 60 * 60 });
      await this.kv.put(recentIndexKey, log.id, { expirationTtl: 7 * 24 * 60 * 60 });
    } catch (err) {
      console.error('Failed to add log to index:', err);
    }
  }

  private async getLogsByFlow(flowId: string): Promise<FlowTrafficLog[]> {
    if (!this.kv) return [];

    const logs: FlowTrafficLog[] = [];
    
    try {
      const keys = await this.kv.list({ prefix: `flow:${flowId}:`, limit: 100 });
      
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, 'text');
        if (logId) {
          const log = await this.kv.get(`log:${logId}`, 'json') as FlowTrafficLog | null;
          if (log) logs.push(log);
        }
      }
    } catch (err) {
      console.error('Failed to get logs by flow:', err);
    }

    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async getLogsByCampaign(campaignId: string): Promise<FlowTrafficLog[]> {
    if (!this.kv) return [];

    const logs: FlowTrafficLog[] = [];
    
    try {
      const keys = await this.kv.list({ prefix: `campaign:${campaignId}:`, limit: 100 });
      
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, 'text');
        if (logId) {
          const log = await this.kv.get(`log:${logId}`, 'json') as FlowTrafficLog | null;
          if (log) logs.push(log);
        }
      }
    } catch (err) {
      console.error('Failed to get logs by campaign:', err);
    }

    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async getRecentLogs(limit: number): Promise<FlowTrafficLog[]> {
    if (!this.kv) return [];

    const logs: FlowTrafficLog[] = [];
    
    try {
      const keys = await this.kv.list({ prefix: 'recent:', limit });
      
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, 'text');
        if (logId) {
          const log = await this.kv.get(`log:${logId}`, 'json') as FlowTrafficLog | null;
          if (log) logs.push(log);
        }
      }
    } catch (err) {
      console.error('Failed to get recent logs:', err);
    }

    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
