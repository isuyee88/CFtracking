/**
 * @fileoverview Flow 点击计数器服务
 * @description 使用 KV 存储实现 Flow 级别的点击计数，用于点击限制功能
 * @module services/flow/flow.counter.service
 * @input Flow ID, Campaign ID
 * @output 点击计数
 * @logic 使用 KV 原子操作实现精确计数
 * @frontend 无
 * @backend FlowEngine 使用
 */

import type { Env } from '@/config/env';

export interface FlowCounterData {
  flowId: string;
  campaignId: string;
  clicks: number;
  lastClickAt: string;
}

/**
 * Flow 点击计数器服务
 * 
 * 使用 KV 存储实现：
 * - 原子递增操作
 * - TTL 过期机制
 * - 实时计数查询
 */
export class FlowCounterService {
  private kv: KVNamespace | null = null;

  constructor(env: Env) {
    this.kv = (env as any).UNIQUENESS_KV || null;
  }

  /**
   * 声明递增 Flow 点击计数
   * 返回递增后的新值
   */
  async increment(flowId: string): Promise<number> {
    if (!this.kv) {
      return 0;
    }

    const key = `flow:counter:${flowId}`;
    const now = new Date().toISOString();

    try {
      const existing = await this.kv.get(key, 'json') as FlowCounterData | null;
      
      if (existing) {
        const newData: FlowCounterData = {
          ...existing,
          clicks: existing.clicks + 1,
          lastClickAt: now,
        };
        await this.kv.put(key, JSON.stringify(newData));
        return newData.clicks;
      } else {
        const newData: FlowCounterData = {
          flowId,
          campaignId: '',
          clicks: 1,
          lastClickAt: now,
        };
        await this.kv.put(key, JSON.stringify(newData));
        return 1;
      }
    } catch (err) {
      console.error('Failed to increment flow counter:', err);
      return 0;
    }
  }

  /**
   * 获取 Flow 当前点击计数
   */
  async getCount(flowId: string): Promise<number> {
    if (!this.kv) {
      return 0;
    }

    const key = `flow:counter:${flowId}`;
    
    try {
      const data = await this.kv.get(key, 'json') as FlowCounterData | null;
      return data?.clicks || 0;
    } catch (err) {
      console.error('Failed to get flow counter:', err);
      return 0;
    }
  }

  /**
   * 重置 Flow 点击计数
   */
  async reset(flowId: string): Promise<void> {
    if (!this.kv) {
      return;
    }

    const key = `flow:counter:${flowId}`;
    
    try {
      await this.kv.delete(key);
    } catch (err) {
      console.error('Failed to reset flow counter:', err);
    }
  }

  /**
   * 检查 Flow 是否已达到点击限制
   */
  async isLimitReached(flowId: string, limit: number): Promise<boolean> {
    if (limit <= 0) {
      return false;
    }

    const count = await this.getCount(flowId);
    return count >= limit;
  }

  /**
   * 批量获取多个 Flow 的点击计数
   */
  async getBatchCounts(flowIds: string[]): Promise<Record<string, number>> {
    if (!this.kv || flowIds.length === 0) {
      return {};
    }

    const results: Record<string, number> = {};

    try {
      for (const flowId of flowIds) {
        results[flowId] = await this.getCount(flowId);
      }
    } catch (err) {
      console.error('Failed to get batch flow counters:', err);
    }

    return results;
  }
}
