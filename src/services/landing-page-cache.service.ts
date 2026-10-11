/**
 * @fileoverview Landing Page 缓存服务
 * @description 管理 KV 预渲染缓存
 */

import type { LandingPage } from '@/types/landingPage';
import { renderBettingComparisonTemplate } from '@/templates/landing/render-betting-comparison';

export class LandingPageCacheService {
  constructor(
    private kv: KVNamespace,
    private _db: D1Database
  ) {}

  /**
   * 从 KV 获取缓存的 HTML
   */
  async get(slug: string): Promise<string | null> {
    const key = `lp:${slug}`;
    return await this.kv.get(key);
  }

  /**
   * 设置缓存（1 小时 TTL）
   */
  async set(slug: string, html: string, ttl = 3600): Promise<void> {
    const key = `lp:${slug}`;
    await this.kv.put(key, html, { expirationTtl: ttl });
  }

  /**
   * 清除缓存
   */
  async invalidate(slug: string): Promise<void> {
    const key = `lp:${slug}`;
    await this.kv.delete(key);
  }

  /**
   * 预渲染 Landing Page 并存入 KV
   */
  async preRender(lp: LandingPage, country?: string): Promise<void> {
    if (!lp.slug) return;

    const html = renderBettingComparisonTemplate(
      lp.content || { header: {}, offers: [], compliance: {} } as any,
      {
        title: lp.seo_title || lp.name,
        description: lp.seo_description || '',
        country: country,
        landingPageId: lp.id
      }
    );

    await this.set(lp.slug, html);
  }

  /**
   * 批量预渲染
   */
  async preRenderBatch(pages: LandingPage[]): Promise<number> {
    let count = 0;
    
    for (const page of pages) {
      if (page.slug) {
        try {
          await this.preRender(page);
          count++;
        } catch (error) {
          console.error(`Failed to pre-render ${page.slug}:`, error);
        }
      }
    }
    
    return count;
  }
}
