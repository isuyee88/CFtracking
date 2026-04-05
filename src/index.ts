/**
 * @fileoverview Workers 入口文件
 * @description Cloudflare Workers 主入口，处理所有 HTTP 请求和定时任务
 * @module index
 * 
 * SSR 动态渲染：
 * - 页面请求时从 Durable Objects 获取初始数据
 * - 注入数据到 HTML，实现首屏即时渲染
 * - 客户端 Hydration 恢复交互
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  CacheEventBrokerDurableObject,
  TrackingStatsDO,
} from '@/handlers/do';
import { CacheDurableObject } from '@/ssr/cache-do';
import { EventActor, StatsActor } from '@/handlers/do/deprecated-do';
import { createAggregationService } from '@/services/analytics/aggregation.service';
import { handlePlatformCron } from '@/services/platform';
import { CacheRefreshConsumer, type CacheRefreshMessage } from '@/services/cache/cache-refresh-consumer';

// 导出 Durable Objects（Cloudflare Workers 要求）
export {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  CacheEventBrokerDurableObject,
  TrackingStatsDO,
  CacheDurableObject,
  EventActor,
  StatsActor,
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

// 添加版本和部署信息到响应头
app.use('*', async (c, next) => {
  await next();
  
  const env = c.env;
  const exposeDebugInfo = env.ENVIRONMENT !== 'production';
  
  if (exposeDebugInfo && env.CF_VERSION_METADATA) {
    c.header('X-Cloudflare-Worker-Version', env.CF_VERSION_METADATA.id);
    c.header('X-Cloudflare-Worker-Tag', env.CF_VERSION_METADATA.tag || 'latest');
    c.header('X-Cloudflare-Worker-Timestamp', env.CF_VERSION_METADATA.timestamp);
    c.header('X-Deployment-Environment', env.ENVIRONMENT);
  }
});

app.get('/health', (c) => {
  return c.json(success({ status: 'healthy', timestamp: new Date().toISOString() }));
});

app.get('/api/deployment/info', (c) => {
  const env = c.env;
  const exposeDebugInfo = env.ENVIRONMENT !== 'production';

  if (!exposeDebugInfo) {
    return c.json(
      success({
        environment: env.ENVIRONMENT,
        debugInfoExposed: false,
      })
    );
  }

  const deploymentInfo = {
    version: env.CF_VERSION_METADATA ? {
      id: env.CF_VERSION_METADATA.id,
      tag: env.CF_VERSION_METADATA.tag,
      timestamp: env.CF_VERSION_METADATA.timestamp,
    } : null,
    environment: env.ENVIRONMENT,
    realtimeEnabled: env.REALTIME_ENABLED,
    sseEnabled: env.SSE_ENABLED,
    debugInfoExposed: true,
    timestamp: new Date().toISOString(),
  };
  return c.json(success(deploymentInfo));
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
import { createDomainRouter } from '@/services/domain/domain.routes';
import { userPreferenceRoutes } from '@/services/user-preferences/user-preferences.routes';
import { createMigrationRouter } from '@/services/migration/migration.routes';
import { createCacheUpdateRoutes } from '@/services/cache/cache-update-service';
import { createSSECacheNotification } from '@/services/cache/sse-cache-notification';

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
app.route('/api/domains', createDomainRouter());
app.route('/api/user-preferences', userPreferenceRoutes);
app.route('/api/migration', createMigrationRouter());

// 缓存更新API (延迟初始化)
app.get('/api/cache-update', async (c) => {
  const cacheUpdateRoutes = createCacheUpdateRoutes(c.env);
  return cacheUpdateRoutes.handle(c.req.raw);
});

// SSE缓存更新通知端点
app.get('/api/cache/events', async (c) => {
  const userId = c.req.query('userId') || 'anonymous';
  const sseService = createSSECacheNotification(c.env);
  return sseService.handleConnection(c.req.raw, userId);
});

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(error(err.message, 'INTERNAL_ERROR'), HTTP_STATUS.INTERNAL_ERROR);
});

// 导出 app 供 SSR Worker 使用
export { app }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 记录部署版本信息
    if (env.CF_VERSION_METADATA) {
      console.log('[Deployment] Version info:', {
        versionId: env.CF_VERSION_METADATA.id,
        versionTag: env.CF_VERSION_METADATA.tag,
        versionTimestamp: env.CF_VERSION_METADATA.timestamp,
      });
    }
    
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
    
    // 所有其他请求（静态资源）直接交给 ASSETS 处理
    return env.ASSETS.fetch(request);
  },
  async queue(batch: MessageBatch<CacheRefreshMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    await CacheRefreshConsumer.handle(batch, env, ctx);
  },

  /**
   * 定时任务处理器 - Cron Trigger
   * - 每5分钟: 刷新实时缓存数据 + 平台规则评估
   * - 每小时: 刷新小时缓存数据
   * - 每天0点: 刷新每日缓存数据
   * - 每天凌晨2点: 执行数据聚合
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Starting scheduled task at ${new Date().toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, cron: ${event.cron}`);

    const cronExpression = event.cron;
    const cacheUpdate = createCacheUpdateRoutes(env);

    // 每5分钟: 刷新实时数据 + 平台规则评估
    if (cronExpression === '*/5 * * * *') {
      // 刷新实时缓存
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Cache refresh failed:`, err)
        )
      );
      
      // 平台规则评估
      ctx.waitUntil(
        (async () => {
          try {
            await handlePlatformCron(env);
            console.log(`[Cron] Platform cron completed successfully`);
          } catch (err) {
            console.error(`[Cron] Platform cron failed:`, err);
          }
        })()
      );
    }

    // 每小时: 刷新小时缓存数据
    if (cronExpression === '0 * * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Hourly cache refresh failed:`, err)
        )
      );
    }

    // 每天0点: 刷新每日缓存数据
    if (cronExpression === '0 0 * * *') {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(err => 
          console.error(`[Cron] Daily cache refresh failed:`, err)
        )
      );
    }

    // 每天凌晨2点: 执行数据聚合
    if (cronExpression === '0 2 * * *') {
      ctx.waitUntil(
        (async () => {
          try {
            const aggregationService = createAggregationService(env);
            const result = await aggregationService.aggregateDailyData();

            if (result.success) {
              console.log(`[Cron] Aggregation completed: ${result.message}`);
            } else {
              console.error(`[Cron] Aggregation failed: ${result.message}`);
              console.error(`[Cron] Errors:`, result.errors);
            }
          } catch (err) {
            console.error(`[Cron] Aggregation error:`, err);
          }
        })()
      );
    }
  },
};


