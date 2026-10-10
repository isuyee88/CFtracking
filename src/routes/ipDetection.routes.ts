/**
 * @fileoverview IP检测API路由
 * @description 提供IP检测、黑名单管理的API接口
 * @module routes/ipDetection.routes
 */

import { Hono } from 'hono';
import { createIPDetectionService } from '@/services/ipDetection/ipDetection.service';
import { ProxyVPNBlacklistRepo } from '@/handlers/d1/proxyVpnBlacklist.repo';
import { IPDetectionProviderRepo } from '@/handlers/d1/ipDetection.repo';
import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import { z } from 'zod';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

const app = new Hono<{ Bindings: Env }>();

const blacklistCreateSchema = z.object({
  ip: z.string().ip(),
  ipRange: z.string().optional(),
  type: z.enum(['proxy', 'vpn', 'tor', 'datacenter', 'mixed']),
  reason: z.string().optional(),
  source: z.enum(['manual', 'auto_detected', 'api', 'import']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  autoExpire: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const batchCheckSchema = z.object({
  ips: z.array(z.string().ip()).max(100),
});

app.get('/check/:ip', async (c) => {
  const ip = c.req.param('ip');

  if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return c.json({ success: false, error: 'Invalid IP address' }, 400);
  }

  try {
    const service = createIPDetectionService(c.env);
    const result = await service.checkIP(ip);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('IP detection error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'IP detection failed',
    }, 500);
  }
});

app.post('/check-batch', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = batchCheckSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const { ips } = parsed.data;
    const service = createIPDetectionService(c.env);
    const result = await service.checkIPBatch(ips);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch IP detection error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch detection failed',
    }, 500);
  }
});

app.get('/proxy-vpn/:ip', async (c) => {
  const ip = c.req.param('ip');

  if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return c.json({ success: false, error: 'Invalid IP address' }, 400);
  }

  try {
    const service = createIPDetectionService(c.env);
    const result = await service.checkProxyVPN(ip);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Proxy/VPN check error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Proxy/VPN check failed',
    }, 500);
  }
});

app.get('/stats', async (c) => {
  try {
    const service = createIPDetectionService(c.env);
    const stats = await service.getStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    }, 500);
  }
});

app.delete('/cache/:ip', async (c) => {
  const ip = c.req.param('ip');

  try {
    const service = createIPDetectionService(c.env);
    await service.clearCache(ip);

    return c.json({
      success: true,
      message: 'Cache cleared',
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache',
    }, 500);
  }
});

app.get('/blacklist', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const type = c.req.query('type') as any;
  const severity = c.req.query('severity') as any;

  try {
    const db = getD1Connection(c.env);
    const repo = new ProxyVPNBlacklistRepo(db);
    const result = await repo.list({ page, pageSize, type, severity });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blacklist',
    }, 500);
  }
});

app.post('/blacklist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = blacklistCreateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const db = getD1Connection(c.env);
    const repo = new ProxyVPNBlacklistRepo(db);
    const entry = await repo.create(parsed.data);

    return c.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Add to blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add to blacklist',
    }, 500);
  }
});

app.post('/blacklist/batch', async (c) => {
  try {
    const body = await c.req.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      return c.json({ success: false, error: 'No entries provided' }, 400);
    }

    const db = getD1Connection(c.env);
    const repo = new ProxyVPNBlacklistRepo(db);
    const count = await repo.batchCreate(entries);

    return c.json({
      success: true,
      data: { added: count, total: entries.length },
    });
  } catch (error) {
    console.error('Batch add to blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to batch add to blacklist',
    }, 500);
  }
});

app.delete('/blacklist/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const db = getD1Connection(c.env);
    const repo = new ProxyVPNBlacklistRepo(db);
    await repo.delete(id);

    return c.json({
      success: true,
      message: 'Entry deleted',
    });
  } catch (error) {
    console.error('Delete from blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete from blacklist',
    }, 500);
  }
});

app.get('/providers', async (c) => {
  try {
    const db = getD1Connection(c.env);
    const repo = new IPDetectionProviderRepo(db);
    const providers = await repo.listAll();

    const safeProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? '***' + p.apiKey.slice(-4) : null,
    }));

    return c.json({
      success: true,
      data: safeProviders,
    });
  } catch (error) {
    console.error('Get providers error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get providers',
    }, 500);
  }
});

app.post('/cleanup', async (c) => {
  try {
    const service = createIPDetectionService(c.env);
    const result = await service.cleanup();

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    }, 500);
  }
});

export default app;
