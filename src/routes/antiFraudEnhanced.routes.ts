/**
 * @fileoverview 增强防欺诈 API 路由
 * @description 提供防欺诈管理的 REST API
 * @module routes/antiFraudEnhanced.routes
 */

import { Hono } from 'hono';
import { createAntiFraudEnhancedService } from '@/services/antiFraudEnhanced/antiFraudEnhanced.service';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export function registerAntiFraudEnhancedRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  const service = (env: Env) => createAntiFraudEnhancedService(env);

  // 获取防欺诈配置
  router.get('/config', async (c) => {
    const env = c.env;
    try {
      const config = await service(env).getConfig();
      return c.json(success(config));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 更新防欺诈配置
  router.put('/config', async (c) => {
    const env = c.env;
    try {
      const body = await c.req.json();
      const config = await service(env).updateConfig(body);
      return c.json(success(config));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取统计数据
  router.get('/stats', async (c) => {
    const env = c.env;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    try {
      const stats = await service(env).getStats(startDate, endDate);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get stats', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 检测欺诈
  router.post('/detect', async (c) => {
    const env = c.env;
    try {
      const event = await c.req.json();
      const result = await service(env).detectFraud(event);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to detect fraud', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 检查 IP
  router.get('/check-ip/:ip', async (c) => {
    const env = c.env;
    const ip = c.req.param('ip');

    try {
      const result = await service(env).checkIPBlacklist(ip);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to check IP', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // ========== IP 黑名单管理 ==========

  // 获取 IP 黑名单列表
  router.get('/ip-blacklist', async (c) => {
    const env = c.env;
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');

    try {
      const result = await service(env).getIPBlacklist({ page, pageSize });
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get IP blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 添加 IP 到黑名单
  router.post('/ip-blacklist', async (c) => {
    const env = c.env;
    try {
      const input = await c.req.json();
      const entry = await service(env).addIPToBlacklist(input);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add IP to blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 从黑名单移除 IP
  router.delete('/ip-blacklist/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      await service(env).removeIPFromBlacklist(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to remove IP from blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // ========== Bot 检测规则管理 ==========

  // 获取 Bot 检测规则列表
  router.get('/bot-rules', async (c) => {
    const env = c.env;
    try {
      const rules = await service(env).getBotDetectionRules();
      return c.json(success(rules));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get bot rules', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 添加 Bot 检测规则
  router.post('/bot-rules', async (c) => {
    const env = c.env;
    try {
      const input = await c.req.json();
      const rule = await service(env).addBotDetectionRule(input);
      return c.json(success(rule), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 更新 Bot 检测规则
  router.put('/bot-rules/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      const input = await c.req.json();
      const rule = await service(env).updateBotDetectionRule(id, input);
      return c.json(success(rule));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 删除 Bot 检测规则
  router.delete('/bot-rules/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
      await service(env).deleteBotDetectionRule(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // ========== 异常模式管理 ==========

  // 获取异常模式列表
  router.get('/anomaly-patterns', async (c) => {
    const env = c.env;
    try {
      const patterns = await service(env).getAnomalyPatterns();
      return c.json(success(patterns));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get anomaly patterns', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 添加异常模式
  router.post('/anomaly-patterns', async (c) => {
    const env = c.env;
    try {
      const input = await c.req.json();
      const pattern = await service(env).addAnomalyPattern(input);
      return c.json(success(pattern), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add anomaly pattern', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // ========== 欺诈检测日志 ==========

  // 获取欺诈检测日志
  router.get('/logs', async (c) => {
    const env = c.env;
    const campaignId = c.req.query('campaignId');
    const status = c.req.query('status');
    const ip = c.req.query('ip');
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');

    try {
      const result = await service(env).getFraudLogs({
        campaignId,
        status,
        ip,
        page,
        pageSize
      });
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get fraud logs', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}
