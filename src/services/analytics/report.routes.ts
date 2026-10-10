/**
 * @fileoverview Report API 路由
 * @description 提供报告相关的 HTTP 接口
 * @module services/analytics/report.routes
 *
 * ⚠️ 数据口径说明：
 * - 标准报表（/generate traffic 等）：直查 clicks + conversions 表，实时口径。
 *   结果经 report_cache 缓存 5 分钟。
 * - 当日实时 UV/PV 另有 GET /api/s2s/landing-stats（S2S 鉴权，直读 DO）。
 * - trafficSummary 每日聚合表（2AM cron，T+1）仅供 Trends 等历史趋势视图。
 */

import { Hono } from 'hono';
import { createReportService } from './report.service';
import { exportToCSV, exportToExcel, exportToPDF, getMimeType, getFileExtension } from './report.export';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export function registerReportRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => createReportService(env);

  // 生成报告
  router.post('/generate', async (c) => {
    const env = c.env;
    try {
      const config = await c.req.json();
      const report = await service(env).generateReport(config);
      return c.json(success(report));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 漏斗报告
  router.post('/funnel', async (c) => {
    const env = c.env;
    try {
      const config = await c.req.json();
      const report = await service(env).generateFunnelReport(config);
      return c.json(success(report));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate funnel report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 队列报告
  router.post('/cohort', async (c) => {
    const env = c.env;
    try {
      const config = await c.req.json();
      const report = await service(env).generateCohortReport(config);
      return c.json(success(report));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate cohort report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 对比报告
  router.post('/comparison', async (c) => {
    const env = c.env;
    try {
      const config = await c.req.json();
      const report = await service(env).generateComparisonReport(config);
      return c.json(success(report));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to generate comparison report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // ==================== 报表预设 ====================

  // 预设列表（?reportType= 可选过滤）
  router.get('/presets', async (c) => {
    const env = c.env;
    try {
      const reportType = c.req.query('reportType') || undefined;
      const presets = await service(env).listReportPresets(reportType);
      return c.json(success(presets));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to list report presets', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建预设
  router.post('/presets', async (c) => {
    const env = c.env;
    try {
      const body = await c.req.json();
      const { name, reportType = 'traffic', config } = body || {};
      if (!name || typeof name !== 'string' || !config) {
        return c.json(
          error('name and config are required', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      if (name.length > 100) {
        return c.json(
          error('name too long (max 100)', ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const preset = await service(env).createReportPreset({ name, reportType, config });
      return c.json(success(preset), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to create report preset', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 更新预设
  router.put('/presets/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const body = await c.req.json();
      const preset = await service(env).updateReportPreset(id, {
        name: body?.name,
        config: body?.config,
      });
      if (!preset) {
        return c.json(error('Preset not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      return c.json(success(preset));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update report preset', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 删除预设
  router.delete('/presets/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      const deleted = await service(env).deleteReportPreset(id);
      if (!deleted) {
        return c.json(error('Preset not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete report preset', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 获取定时报告列表
  router.get('/scheduled', async (c) => {
    const env = c.env;
    try {
      const reports = await service(env).getScheduledReports();
      return c.json(success(reports));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get scheduled reports', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 创建定时报告
  router.post('/scheduled', async (c) => {
    const env = c.env;
    try {
      const data = await c.req.json();
      const report = await service(env).createScheduledReport(data);
      return c.json(success(report), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to create scheduled report', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 删除定时报告
  router.delete('/scheduled/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');
    try {
      await service(env).deleteScheduledReport(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete scheduled report', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  // 导出报告
  router.post('/export', async (c) => {
    const env = c.env;
    try {
      const body = await c.req.json();
      const { config, format = 'csv', filename, title } = body;

      // 生成报告数据
      const reportData = await service(env).generateReport(config);

      // 导出为指定格式
      let content: string;
      switch (format) {
        case 'excel':
          content = exportToExcel(reportData, { format, filename, title });
          break;
        case 'pdf':
          content = exportToPDF(reportData, { format, filename, title });
          break;
        default:
          content = exportToCSV(reportData, { format, filename, title });
      }

      // 设置响应头
      const mimeType = getMimeType(format);
      const extension = getFileExtension(format);
      const exportFilename = filename || `report_${Date.now()}${extension}`;

      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${exportFilename}"`,
        },
      });
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to export report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 导出漏斗报告
  router.post('/export/funnel', async (c) => {
    const env = c.env;
    try {
      const body = await c.req.json();
      const { config, format = 'csv', filename, title } = body;

      // 生成漏斗报告
      const reportData = await service(env).generateFunnelReport(config);

      // 导出为指定格式
      let content: string;
      switch (format) {
        case 'excel':
          content = exportToExcel(reportData, { format, filename, title });
          break;
        case 'pdf':
          content = exportToPDF(reportData, { format, filename, title });
          break;
        default:
          content = exportToCSV(reportData, { format, filename, title });
      }

      // 设置响应头
      const mimeType = getMimeType(format);
      const extension = getFileExtension(format);
      const exportFilename = filename || `funnel_report_${Date.now()}${extension}`;

      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${exportFilename}"`,
        },
      });
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to export funnel report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  // 导出队列报告
  router.post('/export/cohort', async (c) => {
    const env = c.env;
    try {
      const body = await c.req.json();
      const { config, format = 'csv', filename, title } = body;

      // 生成队列报告
      const reportData = await service(env).generateCohortReport(config);

      // 导出为指定格式
      let content: string;
      switch (format) {
        case 'excel':
          content = exportToExcel(reportData, { format, filename, title });
          break;
        case 'pdf':
          content = exportToPDF(reportData, { format, filename, title });
          break;
        default:
          content = exportToCSV(reportData, { format, filename, title });
      }

      // 设置响应头
      const mimeType = getMimeType(format);
      const extension = getFileExtension(format);
      const exportFilename = filename || `cohort_report_${Date.now()}${extension}`;

      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${exportFilename}"`,
        },
      });
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to export cohort report', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}

export default registerReportRoutes();
