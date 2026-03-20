/**
 * @fileoverview Durable Objects - 会话管理
 * @description 管理访问者会话状态
 * @module handlers/do/session.do
 */

import type { VisitorBinding } from '@/types/campaign';

export interface SessionState {
  visitorId: string;
  campaignId: string;
  flowId: string | null;
  landingPageId: string | null;
  offerId: string | null;
  binding: VisitorBinding;
  createdAt: string;
  expiresAt: string;
}

export class SessionDurableObject {
  private storage: DurableObjectStorage;
  private sessions: Map<string, SessionState> = new Map();

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'POST' && path === '/create') {
      return this.createSession(request);
    }

    if (method === 'GET' && path.startsWith('/get/')) {
      const visitorId = path.replace('/get/', '');
      return this.getSession(visitorId);
    }

    if (method === 'PUT' && path === '/update') {
      return this.updateSession(request);
    }

    if (method === 'DELETE' && path.startsWith('/delete/')) {
      const visitorId = path.replace('/delete/', '');
      return this.deleteSession(visitorId);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async createSession(request: Request): Promise<Response> {
    const data = await request.json() as Omit<SessionState, 'createdAt' | 'expiresAt'>;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const session: SessionState = {
      ...data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.sessions.set(data.visitorId, session);
    await this.storage.put(`session:${data.visitorId}`, session);

    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getSession(visitorId: string): Promise<Response> {
    let session = this.sessions.get(visitorId);

    if (!session) {
      session = (await this.storage.get(`session:${visitorId}`)) as SessionState | undefined;
      if (session) {
        this.sessions.set(visitorId, session);
      }
    }

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(visitorId);
      await this.storage.delete(`session:${visitorId}`);
      return new Response('Session expired', { status: 410 });
    }

    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateSession(request: Request): Promise<Response> {
    const data = await request.json() as { visitorId: string; updates: Partial<SessionState> };
    const existing = this.sessions.get(data.visitorId);

    if (!existing) {
      const stored = await this.storage.get(`session:${data.visitorId}`) as SessionState | undefined;
      if (!stored) {
        return new Response('Session not found', { status: 404 });
      }
      this.sessions.set(data.visitorId, stored);
    }

    const session = this.sessions.get(data.visitorId)!;
    const updated = { ...session, ...data.updates };
    this.sessions.set(data.visitorId, updated);
    await this.storage.put(`session:${data.visitorId}`, updated);

    return new Response(JSON.stringify(updated), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async deleteSession(visitorId: string): Promise<Response> {
    this.sessions.delete(visitorId);
    await this.storage.delete(`session:${visitorId}`);
    return new Response(JSON.stringify({ deleted: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
