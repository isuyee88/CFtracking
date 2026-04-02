/**
 * @fileoverview 缓存 Durable Object
 * @description 临时保留，用于部署兼容性
 */

import { DurableObject } from 'cloudflare:workers';

export class CacheDurableObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    return new Response('CacheDurableObject is deprecated', { status: 410 });
  }
}
