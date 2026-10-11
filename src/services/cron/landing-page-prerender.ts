import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { LandingPageCacheService } from '@/services/landing-page-cache.service';
import type { Env } from '@/config/env';

/**
 * Cron 任务处理器
 * 每小时预渲染热门 Landing Pages
 */
export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  console.log('[Cron] Scheduled event triggered:', event.cron);

  if (event.cron === '0 * * * *') {
    await preRenderLandingPages(env);
  }
}

/**
 * 预渲染所有公开的 Landing Pages
 */
export async function preRenderLandingPages(env: Env): Promise<void> {
  const startTime = Date.now();
  
  try {
    const repo = new LandingPageRepository(env.DB);
    const cacheService = new LandingPageCacheService(env.LANDING_PAGE_CACHE, env.DB);

    // 获取所有公开的 Landing Pages
    const pages = await repo.findPublic(50);
    console.log(`[Cron] Found ${pages.length} public landing pages to pre-render`);

    // 批量预渲染
    const rendered = await cacheService.preRenderBatch(pages);

    const duration = Date.now() - startTime;
    console.log(`[Cron] Pre-rendered ${rendered}/${pages.length} landing pages in ${duration}ms`);
  } catch (error) {
    console.error('[Cron] Pre-render failed:', error);
  }
}
