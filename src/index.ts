/**
 * @fileoverview Workers 入口文件
 * @description Cloudflare Workers 主入口，处理所有 HTTP 请求和定时任务
 * @module index
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { SessionDurableObject, CounterDurableObject, QueueDurableObject, UniquenessDurableObject, UserPreferenceDurableObject } from '@/handlers/do';
import { createAggregationService } from '@/services/analytics/aggregation.service';
import { handlePlatformCron } from '@/services/platform';

// 导出 Durable Objects（Cloudflare Workers 要求）
export {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/health', (c) => {
  return c.json(success({ status: 'healthy', timestamp: new Date().toISOString() }));
});

import { createCampaignRouter } from '@/services/campaign/campaign.routes';
import { createFlowRouter } from '@/services/flow/flow.routes';
import { createLandingPageRouter } from '@/services/landingPage/lp.routes';
import { createOfferRouter } from '@/services/offer/offer.routes';
import { createTrafficSourceRouter } from '@/services/trafficSource/trafficSource.routes';
import { createAffiliateNetworkRouter } from '@/services/affiliateNetwork/affiliateNetwork.routes';
import { createRuleRouter } from '@/services/rule/rule.routes';
import { createPlatformRouter } from '@/services/platform/platform.routes';
import { createTrackingRouter } from '@/services/tracking/tracking.routes';
import { createAggregationRouter } from '@/services/analytics/aggregation.routes';
import { createAnalyticsRouter } from '@/services/analytics/analytics.routes';
import { createClickLogRouter } from '@/services/tracking/clickLog.routes';
import { createConversionLogRouter } from '@/services/tracking/conversionLog.routes';
import { createExportRouter } from '@/services/export/export.routes';
import { createTrendsRouter } from '@/services/trends/trends.routes';
import { createBlacklistRouter } from '@/routes/blacklist.routes';
import { createWhitelistRouter } from '@/routes/whitelist.routes';
import { userPreferenceRoutes } from '@/services/user-preferences/user-preferences.routes';

app.route('/api/campaigns', createCampaignRouter());
app.route('/api/flows', createFlowRouter());
app.route('/api/landing-pages', createLandingPageRouter());
app.route('/api/offers', createOfferRouter());
app.route('/api/traffic-sources', createTrafficSourceRouter());
app.route('/api/affiliate-networks', createAffiliateNetworkRouter());
app.route('/api/rules', createRuleRouter());
app.route('/api/platforms', createPlatformRouter());
app.route('/api/tracking', createTrackingRouter());
app.route('/api/analytics', createAggregationRouter());
app.route('/api/analytics', createAnalyticsRouter());
app.route('/api/clicks', createClickLogRouter());
app.route('/api/conversions', createConversionLogRouter());
app.route('/api/export', createExportRouter());
app.route('/api/trends', createTrendsRouter());
app.route('/api/blacklist', createBlacklistRouter());
app.route('/api/whitelist', createWhitelistRouter());
app.route('/api/user-preferences', userPreferenceRoutes);

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(error(err.message, 'INTERNAL_ERROR'), HTTP_STATUS.INTERNAL_ERROR);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 处理 API 请求（包括 /api/* 和 /health）
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      return app.fetch(request, env, ctx);
    }
    
    // 处理直接通过域名访问的追踪请求
    // 格式：http://custom-domain.com/:campaignAlias
    // 注意：排除静态资源文件（.html, .svg, .png, .ico, .css, .js, .woff2 等）
    if (url.pathname.length > 1 && !url.pathname.startsWith('/__')) {
      const isStaticResource = /\.(html?|svg|png|ico|jpg|jpeg|gif|css|js|woff2|ttf|eot|otf|webmanifest)$/i.test(url.pathname);
      
      if (!isStaticResource) {
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length === 1) {
          const campaignAlias = pathParts[0];
          console.log('[Tracking] Campaign alias:', campaignAlias, 'Original URL:', request.url);
          const trackingUrl = new URL('/api/tracking/click/' + campaignAlias, url.origin);
          trackingUrl.search = url.search;
          console.log('[Tracking] Tracking URL:', trackingUrl.toString());
          const trackingRequest = new Request(trackingUrl.toString(), {
            method: request.method,
            headers: request.headers,
            redirect: 'manual'
          });
          return app.fetch(trackingRequest, env, ctx);
        }
      }
    }
    
    // 所有其他请求（包括静态资源和前端路由）直接交给 ASSETS 处理
    // ASSETS binding 会自动处理静态文件和 404 回退到 index.html
    return env.ASSETS.fetch(request);
  },

  /**
   * 定时任务处理器 - Cron Trigger
   * 每天凌晨 2:00 执行数据聚合
   * 每 5 分钟执行平台规则评估和任务处理
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Starting scheduled task at ${new Date().toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, scheduled time: ${event.scheduledTime}`);

    // 根据 Cron 表达式判断执行哪个任务
    const cronExpression = event.cron;

    // 每日数据聚合任务 (每天凌晨 2:00)
    if (cronExpression === '0 2 * * *') {
      ctx.waitUntil(
        (async () => {
          try {
            const aggregationService = createAggregationService(env);

            // 执行每日数据聚合（聚合昨天的数据）
            const result = await aggregationService.aggregateDailyData();

            if (result.success) {
              console.log(`[Cron] Aggregation completed successfully: ${result.message}`);
            } else {
              console.error(`[Cron] Aggregation failed: ${result.message}`);
              console.error(`[Cron] Errors: ${JSON.stringify(result.errors)}`);
            }
          } catch (err) {
            console.error(`[Cron] Unexpected error during aggregation: ${err instanceof Error ? err.message : String(err)}`);
          }
        })()
      );
    }

    // 平台规则评估和任务处理 (每 5 分钟)
    if (cronExpression === '*/5 * * * *') {
      ctx.waitUntil(
        (async () => {
          try {
            await handlePlatformCron(env);
            console.log(`[Cron] Platform cron completed successfully`);
          } catch (err) {
            console.error(`[Cron] Platform cron failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        })()
      );
    }
  },
};
