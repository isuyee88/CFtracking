/**
 * @fileoverview S2S 路由：affiliate-landing Worker 服务端拉取着陆页统计
 * @description X-S2S-Key 鉴权（见 middleware/auth.ts s2sMiddleware），与 JWT 面板体系完全隔离
 * @module services/s2s/s2s.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { s2sMiddleware } from '@/middleware/auth';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

export function createS2SRouter() {
  const router = new Hono<{ Bindings: Env }>();

  // 该路由下所有端点均为 Worker 间调用，统一 S2S 鉴权
  router.use('*', s2sMiddleware);

  /**
   * GET /api/s2s/landing-stats?hours=24&campaignIds=a,b
   * 按 campaign 返回分时 UV/PV/点击/平均时长（来自 TrackingStatsDO）
   */
  router.get('/landing-stats', async (c) => {
    try {
      const hours = c.req.query('hours') || '24';
      const campaignIds = c.req.query('campaignIds') || '';

      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName('global-stats')
      );

      const params = new URLSearchParams({ hours });
      if (campaignIds) params.set('campaignIds', campaignIds);

      const res = await trackingDO.fetch(`http://do/landing-stats?${params.toString()}`);
      const data = await res.json<any>();

      if (!res.ok) {
        return c.json(error(data?.error || 'DO query failed'), HTTP_STATUS.INTERNAL_ERROR);
      }

      return c.json(success(data));
    } catch (err) {
      console.error('[S2S] Landing stats error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get landing stats'),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
