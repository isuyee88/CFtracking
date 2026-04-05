/**
 * @fileoverview 已废弃的 Durable Object 存根类
 * @description 保留用于部署兼容性，线上仍存在这些 DO 的 binding
 * 输入: Cloudflare DO 请求
 * 输出: 410 Gone 响应
 */

import { DurableObject } from 'cloudflare:workers';

export class EventActor extends DurableObject {
  async fetch(_request: Request): Promise<Response> {
    return new Response('EventActor is deprecated', { status: 410 });
  }
}

export class StatsActor extends DurableObject {
  async fetch(_request: Request): Promise<Response> {
    return new Response('StatsActor is deprecated', { status: 410 });
  }
}
