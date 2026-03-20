/**
 * @fileoverview Durable Objects - 计数器
 * @description 管理实时计数器，用于 Campaign 统计
 * @module handlers/do/counter.do
 */

export interface CounterState {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  lastUpdated: string;
}

export class CounterDurableObject {
  private storage: DurableObjectStorage;
  private counters: Map<string, CounterState> = new Map();

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'POST' && path === '/increment') {
      return this.increment(request);
    }

    if (method === 'GET' && path.startsWith('/get/')) {
      const key = path.replace('/get/', '');
      return this.getCounter(key);
    }

    if (method === 'POST' && path === '/reset') {
      return this.resetCounter(request);
    }

    if (method === 'GET' && path === '/all') {
      return this.getAllCounters();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async increment(request: Request): Promise<Response> {
    const data = await request.json() as {
      key: string;
      impressions?: number;
      clicks?: number;
      conversions?: number;
      spend?: number;
      revenue?: number;
    };

    let counter = this.counters.get(data.key);
    if (!counter) {
      counter = (await this.storage.get(`counter:${data.key}`)) as CounterState | undefined;
      if (!counter) {
        counter = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
          revenue: 0,
          lastUpdated: new Date().toISOString(),
        };
      }
      this.counters.set(data.key, counter);
    }

    counter.impressions += data.impressions || 0;
    counter.clicks += data.clicks || 0;
    counter.conversions += data.conversions || 0;
    counter.spend += data.spend || 0;
    counter.revenue += data.revenue || 0;
    counter.lastUpdated = new Date().toISOString();

    await this.storage.put(`counter:${data.key}`, counter);

    return new Response(JSON.stringify(counter), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getCounter(key: string): Promise<Response> {
    let counter = this.counters.get(key);
    if (!counter) {
      counter = (await this.storage.get(`counter:${key}`)) as CounterState | undefined;
      if (counter) {
        this.counters.set(key, counter);
      }
    }

    if (!counter) {
      return new Response('Counter not found', { status: 404 });
    }

    return new Response(JSON.stringify(counter), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async resetCounter(request: Request): Promise<Response> {
    const data = await request.json() as { key: string };
    const counter: CounterState = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      lastUpdated: new Date().toISOString(),
    };

    this.counters.set(data.key, counter);
    await this.storage.put(`counter:${data.key}`, counter);

    return new Response(JSON.stringify(counter), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getAllCounters(): Promise<Response> {
    const allData = await this.storage.list({ prefix: 'counter:' });
    const counters: Record<string, CounterState> = {};

    for (const [key, value] of allData) {
      const counterKey = key.replace('counter:', '');
      counters[counterKey] = value as CounterState;
    }

    return new Response(JSON.stringify(counters), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
