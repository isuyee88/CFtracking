/**
 * @fileoverview Durable Objects - 任务队列
 * @description 管理规则执行任务队列
 * @module handlers/do/queue.do
 */

export interface QueueTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  createdAt: string;
  scheduledAt: string | null;
}

export class QueueDurableObject {
  private storage: DurableObjectStorage;
  private queue: QueueTask[] = [];

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'POST' && path === '/enqueue') {
      return this.enqueue(request);
    }

    if (method === 'POST' && path === '/dequeue') {
      return this.dequeue(request);
    }

    if (method === 'GET' && path === '/size') {
      return this.getSize();
    }

    if (method === 'GET' && path === '/peek') {
      return this.peek();
    }

    if (method === 'POST' && path === '/clear') {
      return this.clear();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async enqueue(request: Request): Promise<Response> {
    const data = await request.json() as Omit<QueueTask, 'id' | 'createdAt'>;
    const task: QueueTask = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    await this.storage.put('queue', this.queue);

    return new Response(JSON.stringify(task), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async dequeue(request: Request): Promise<Response> {
    const data = await request.json() as { count?: number };
    const count = data.count || 1;
    const tasks: QueueTask[] = [];

    for (let i = 0; i < count && this.queue.length > 0; i++) {
      const task = this.queue.shift();
      if (task) {
        tasks.push(task);
      }
    }

    await this.storage.put('queue', this.queue);

    return new Response(JSON.stringify(tasks), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getSize(): Promise<Response> {
    return new Response(JSON.stringify({ size: this.queue.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async peek(): Promise<Response> {
    return new Response(JSON.stringify(this.queue.slice(0, 10)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async clear(): Promise<Response> {
    this.queue = [];
    await this.storage.put('queue', this.queue);
    return new Response(JSON.stringify({ cleared: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
