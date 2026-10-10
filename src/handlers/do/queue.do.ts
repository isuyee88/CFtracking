/**
 * @fileoverview Durable Objects - 任务队列 (已废弃)
 * @description 管理规则执行任务队列 - 已废弃，保留用于向后兼容
 * @module handlers/do/queue.do
 * @deprecated 自 2026-04-29 起，任务队列已迁移至 D1 taskQueue 表
 *
 * ## 废弃原因
 * 1. QueueDO 基于 Durable Object 单实例串行处理，存在性能瓶颈
 * 2. 每次 enqueue 都执行全量排序 + 全量存储写入，O(n log n) 复杂度
 * 3. 无法利用 Cloudflare 基础设施的自动扩缩容能力
 * 4. 无内置重试、死信队列等生产级特性
 *
 * ## 当前方案
 * 任务队列已迁移至 **D1 taskQueue** 数据库表：
 * - Producer: RuleEngine.scheduleAction() → TaskRepository.create()
 * - Consumer: PlatformTaskProcessor → TaskRepository.getPendingTasks()
 * - 优势: SQL 索引排序 O(log n)、事务隔离、灵活查询、免费额度充足
 *
 * ## 迁移记录
 * - 废弃日期: 2026-04-29
 * - 替代方案: src/handlers/d1/task.repo.ts (TaskRepository)
 * - 架构评估: 见 .trae/specs/full-chain-test-validation/reports/queue-do-evaluation.md
 *
 * @see {@link https://developers.cloudflare.com/queues/} - 如未来需高吞吐场景可考虑 CF Queues
 */

export interface QueueTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  createdAt: string;
  scheduledAt: string | null;
}

/**
 * @deprecated 使用 TaskRepository (D1 taskQueue) 替代
 */
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
