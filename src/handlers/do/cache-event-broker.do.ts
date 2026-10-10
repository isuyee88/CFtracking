import { DurableObject } from 'cloudflare:workers';
import type { SSEEvent } from '@/services/cache/sse-cache-notification';

interface NotifyPayload {
  event?: SSEEvent;
  events?: SSEEvent[];
  userId?: string;
}

export class CacheEventBrokerDurableObject extends DurableObject {
  private readonly encoder = new TextEncoder();
  private readonly maxConnectionsPerUser = 5;
  private readonly connections = new Map<string, Map<string, ReadableStreamDefaultController<Uint8Array>>>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/events') {
      return this.handleConnection(request, url.searchParams.get('userId') || 'anonymous');
    }

    if (request.method === 'POST' && url.pathname === '/notify') {
      return this.handleNotify(request);
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      return Response.json(this.getStats());
    }

    return new Response('Not Found', { status: 404 });
  }

  private handleConnection(request: Request, userId: string): Response {
    const connectionId = crypto.randomUUID();
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    let closed = false;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (controllerRef) {
        this.removeConnection(userId, connectionId);
        try {
          controllerRef.close();
        } catch {
          // Ignore close races from already-aborted streams.
        }
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller;
        this.addConnection(userId, connectionId, controller);

        controller.enqueue(this.encoder.encode('retry: 5000\n\n'));
        controller.enqueue(
          this.encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              type: 'connected',
              cacheKey: 'connection',
              timestamp: Date.now(),
              message: 'SSE connection established',
            })}\n\n`
          )
        );

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(this.encoder.encode(': heartbeat\n\n'));
          } catch {
            cleanup();
          }
        }, 30000);

        request.signal.addEventListener('abort', cleanup);
      },
      cancel: cleanup,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  private async handleNotify(request: Request): Promise<Response> {
    const payload = await request.json<NotifyPayload>();
    const events = payload.events ?? (payload.event ? [payload.event] : []);

    if (events.length === 0) {
      return Response.json({ success: false, message: 'Missing event payload' }, { status: 400 });
    }

    if (payload.userId) {
      for (const event of events) {
        this.sendToUser(payload.userId, event);
      }
    } else {
      this.broadcast(events);
    }

    return Response.json({
      success: true,
      dispatched: events.length,
      ...this.getStats(),
    });
  }

  private addConnection(
    userId: string,
    connectionId: string,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): void {
    let userConnections = this.connections.get(userId);

    if (!userConnections) {
      userConnections = new Map();
      this.connections.set(userId, userConnections);
    }

    if (userConnections.size >= this.maxConnectionsPerUser) {
      const oldest = userConnections.entries().next().value as
        | [string, ReadableStreamDefaultController<Uint8Array>]
        | undefined;

      if (oldest) {
        try {
          oldest[1].close();
        } catch {
          // Ignore controllers that are already closed.
        }
        userConnections.delete(oldest[0]);
      }
    }

    userConnections.set(connectionId, controller);
  }

  private removeConnection(userId: string, connectionId: string): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

    userConnections.delete(connectionId);
    if (userConnections.size === 0) {
      this.connections.delete(userId);
    }
  }

  private sendToUser(userId: string, event: SSEEvent): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

    const message = this.formatMessage(event);

    for (const [connectionId, controller] of userConnections.entries()) {
      try {
        controller.enqueue(message);
      } catch {
        this.removeConnection(userId, connectionId);
      }
    }
  }

  private broadcast(events: SSEEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const messages = events.map((event) => this.formatMessage(event));

    for (const [userId, userConnections] of this.connections.entries()) {
      for (const [connectionId, controller] of userConnections.entries()) {
        try {
          for (const message of messages) {
            controller.enqueue(message);
          }
        } catch {
          this.removeConnection(userId, connectionId);
        }
      }
    }
  }

  private getStats(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;

    for (const userConnections of this.connections.values()) {
      totalConnections += userConnections.size;
    }

    return {
      totalUsers: this.connections.size,
      totalConnections,
    };
  }

  private formatMessage(event: SSEEvent): Uint8Array {
    return this.encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }
}
