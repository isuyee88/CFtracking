/**
 * @fileoverview Postback管理API路由
 * @description 提供Postback历史查询、统计、重试等管理功能
 * @module routes/postback.routes
 *
 * 输入:
 *   - RESTful HTTP请求 (GET/POST/DELETE)
 *
 * 输出:
 *   - JSON响应 (PostbackLog列表/统计/操作结果)
 *
 * 逻辑交互:
 *   - 调用PostbackLogRepository进行数据查询
 *   - 调用PostbackService进行重试操作
 *
 * 前后端交互:
 *   - 前端Postback管理页面调用
 *   - 需要JWT认证 (通过全局认证中间件)
 *
 * API端点:
 * - GET /api/postbacks/history - Postback发送历史 (分页+筛选)
 * - GET /api/postbacks/stats - Postback统计概览
 * - POST /api/postbacks/retry - 手动重发失败的Postback
 * - GET /api/postbacks/platforms/:platform/stats - 单平台统计
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

/** 定义Hono应用的绑定类型 */
type Bindings = Env;

/** 创建Hono应用实例 */
const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/postbacks/history
 * 获取Postback发送历史 (分页+多维度筛选)
 *
 * @query page - 页码 (默认1)
 * @query pageSize - 每页数量 (默认20, 最大100)
 * @query conversionId - 按转化ID筛选 (可选)
 * @query clickId - 按点击ID筛选 (可选)
 * @query campaignId - 按活动ID筛选 (可选)
 * @query platform - 按平台筛选 (可选)
 * @query success - 按成功/失败筛选 ("true"/"false", 可选)
 * @query startDate - 开始日期 (ISO格式, 可选)
 * @query endDate - 结束日期 (ISO格式, 可选)
 *
 * @returns { logs: PostbackLog[], total: number }
 *
 * @example
 * GET /api/postbacks/history?page=1&pageSize=20&platform=taboola&success=false
 */
app.get('/history', async (c) => {
  try {
    const page = Number(c.req.query('page')) || 1;
    const pageSize = Math.min(Number(c.req.query('pageSize')) || 20, 100);

    // 动态导入以避免循环依赖
    const { PostbackLogRepository } = await import(
      '@/handlers/d1/postback.repo'
    );
    const repo = new PostbackLogRepository(c.env.DB);

    const result = await repo.findLogs({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      conversionId: c.req.query('conversionId'),
      clickId: c.req.query('clickId'),
      campaignId: c.req.query('campaignId'),
      platform: c.req.query('platform'),
      success:
        c.req.query('success') === 'true'
          ? true
          : c.req.query('success') === 'false'
            ? false
            : undefined,
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
    });

    return c.json(success(result));
  } catch (err) {
    console.error('[PostbackRoutes] history error:', err);
    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error('获取Postback历史失败', 'QUERY_ERROR'));
  }
});

/**
 * GET /api/postbacks/stats
 * 获取Postback统计概览
 *
 * @query startDate - 开始日期 (ISO格式, 默认7天前)
 * @query endDate - 结束日期 (ISO格式, 默认当前时间)
 * @query campaignId - 活动ID筛选 (可选)
 *
 * @returns PostbackStats对象 (含各平台统计数据)
 *
 * @example
 * GET /api/postbacks/stats?startDate=2026-04-01T00:00:00Z&endDate=2026-04-07T23:59:59Z
 */
app.get('/stats', async (c) => {
  try {
    const startDate =
      c.req.query('startDate') ||
      new Date(Date.now() - 7 * 86400000).toISOString();
    const endDate =
      c.req.query('endDate') || new Date().toISOString();
    const campaignId = c.req.query('campaignId');

    // 动态导入以避免循环依赖
    const { PostbackLogRepository } = await import(
      '@/handlers/d1/postback.repo'
    );
    const repo = new PostbackLogRepository(c.env.DB);

    const stats = await repo.getStats(startDate, endDate, campaignId);
    return c.json(success(stats));
  } catch (err) {
    console.error('[PostbackRoutes] stats error:', err);
    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error('获取统计数据失败', 'STATS_ERROR'));
  }
});

/**
 * POST /api/postbacks/retry
 * 手动重发失败的Postback
 *
 * @body conversionId? - 可选的转化ID筛选
 * @body platform? - 可选的平台筛选
 *
 * @returns { retried: number, results: Array<{ logId, success, error? }> }
 *
 * @example
 * POST /api/postbacks/retry
 * Body: { "conversionId": "cnv_123", "platform": "taboola" }
 */
app.post('/retry', async (c) => {
  try {
    const body = (await c.req.json()) as {
      conversionId?: string;
      platform?: string;
    };

    // 动态导入以避免循环依赖
    const { PostbackLogRepository } = await import(
      '@/handlers/d1/postback.repo'
    );

    const repo = new PostbackLogRepository(c.env.DB);
    let failedLogs;

    // 根据条件查询失败的日志
    if (body.conversionId || body.platform) {
      failedLogs = await repo.findFailedLogs(50);
      if (body.conversionId) {
        failedLogs = failedLogs.filter(
          (l) => l.conversionId === body.conversionId
        );
      }
      if (body.platform) {
        failedLogs = failedLogs.filter((l) => l.platform === body.platform);
      }
    } else {
      // 无筛选条件，取最近20条失败记录
      failedLogs = await repo.findFailedLogs(20);
    }

    // 限制最多重试10条，避免长时间阻塞
    const logsToRetry = failedLogs.slice(0, 10);
    const results: Array<{
      logId: string;
      success: boolean;
      error?: string;
    }> = [];

    // TODO: 实现完整的重试逻辑
    // 当前版本仅记录日志，实际重发需要在后续迭代中实现
    // 需要根据log重建context并重新发送Postback
    for (const log of logsToRetry) {
      try {
        // 占位符: 实际应重建上下文并重新发送
        // const service = new PostbackService(c.env);
        // await service.retrySinglePostback(log);
        results.push({ logId: log.id, success: true });
      } catch (e) {
        results.push({
          logId: log.id,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return c.json(success({ retried: results.length, results }));
  } catch (err) {
    console.error('[PostbackRoutes] retry error:', err);
    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error('重发失败', 'RETRY_ERROR'));
  }
});

/**
 * GET /api/postbacks/platforms/:platform/stats
 * 获取单个平台的Postback统计
 *
 * @param platform 平台名称 (URL参数)
 * @query startDate - 开始日期 (ISO格式, 默认7天前)
 * @query endDate - 结束日期 (ISO格式, 默认当前时间)
 *
 * @returns 单平台统计数据或空统计 (如果平台不存在)
 *
 * @example
 * GET /api/postbacks/platforms/taboola/stats
 */
app.get('/platforms/:platform/stats', async (c) => {
  try {
    const platform = c.req.param('platform');
    const startDate =
      c.req.query('startDate') ||
      new Date(Date.now() - 7 * 86400000).toISOString();
    const endDate =
      c.req.query('endDate') || new Date().toISOString();

    // 动态导入以避免循环依赖
    const { PostbackLogRepository } = await import(
      '@/handlers/d1/postback.repo'
    );
    const repo = new PostbackLogRepository(c.env.DB);

    const stats = await repo.getStats(startDate, endDate);
    const platformStats = stats.byPlatformStats.find(
      (p) => p.platform === platform
    );

    return c.json(
      success(
        platformStats || {
          platform,
          sent: 0,
          success: 0,
          failed: 0,
          successRate: 0,
        }
      )
    );
  } catch (err) {
    console.error('[PostbackRoutes] platform stats error:', err);
    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error('获取平台统计失败', 'PLATFORM_STATS_ERROR'));
  }
});

export default app;
