/**
 * @fileoverview Durable Objects 连接管理
 * @description 统一管理 Durable Objects 连接和 Stub 获取
 * @module handlers/do/index
 */

import type { Env } from '@/config/env';


export { SessionDurableObject } from './session.do';
export { CounterDurableObject } from './counter.do';
export { QueueDurableObject } from './queue.do';

export function getSessionStub(env: Env, visitorId: string): DurableObjectStub {
  const id = env.SESSION_DO.idFromName(`session:${visitorId}`);
  return env.SESSION_DO.get(id);
}

export function getCounterStub(env: Env, key: string): DurableObjectStub {
  const id = env.COUNTER_DO.idFromName(`counter:${key}`);
  return env.COUNTER_DO.get(id);
}

export function getQueueStub(env: Env, name: string = 'default'): DurableObjectStub {
  const id = env.QUEUE_DO.idFromName(`queue:${name}`);
  return env.QUEUE_DO.get(id);
}

export class DOService {
  constructor(private env: Env) {}

  async getSession(visitorId: string): Promise<unknown> {
    const stub = getSessionStub(this.env, visitorId);
    const response = await stub.fetch(
      new Request(`https://do.internal/get/${visitorId}`, { method: 'GET' })
    );
    if (!response.ok) return null;
    return response.json();
  }

  async createSession(data: {
    visitorId: string;
    campaignId: string;
    flowId: string | null;
    landingPageId: string | null;
    offerId: string | null;
    binding: string;
  }): Promise<unknown> {
    const stub = getSessionStub(this.env, data.visitorId);
    const response = await stub.fetch(
      new Request('https://do.internal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
    return response.json();
  }

  async incrementCounter(key: string, data: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
    revenue?: number;
  }): Promise<unknown> {
    const stub = getCounterStub(this.env, key);
    const response = await stub.fetch(
      new Request('https://do.internal/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...data }),
      })
    );
    return response.json();
  }

  async getCounter(key: string): Promise<unknown> {
    const stub = getCounterStub(this.env, key);
    const response = await stub.fetch(
      new Request(`https://do.internal/get/${key}`, { method: 'GET' })
    );
    if (!response.ok) return null;
    return response.json();
  }

  async enqueueTask(data: {
    type: string;
    payload: Record<string, unknown>;
    priority?: number;
    scheduledAt?: string;
  }): Promise<unknown> {
    const stub = getQueueStub(this.env);
    const response = await stub.fetch(
      new Request('https://do.internal/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
    return response.json();
  }

  async dequeueTasks(count = 1): Promise<unknown[]> {
    const stub = getQueueStub(this.env);
    const response = await stub.fetch(
      new Request('https://do.internal/dequeue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
    );
    return response.json();
  }
}
