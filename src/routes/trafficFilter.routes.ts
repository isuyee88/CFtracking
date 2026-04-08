/**
 * @fileoverview 流量过滤API路由
 * @description 提供ASN黑名单、ISP白名单、国家过滤规则的API接口
 * @module routes/trafficFilter.routes
 */

import { Hono } from 'hono';
import { createTrafficFilterService, ISP_BLACKLIST_KEYWORDS } from '@/services/ipDetection/trafficFilter.service';
import { createASNFilterService } from '@/services/ipDetection/asnFilter.service';
import type { Env } from '@/config/env';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>();

const asnCreateSchema = z.object({
  asn: z.number().int().positive(),
  asName: z.string().optional(),
  category: z.enum(['blacklist', 'greylist', 'whitelist']),
  type: z.enum(['bot', 'datacenter', 'vpn', 'proxy', 'hosting', 'isp', 'mobile', 'business', 'education', 'government']),
  riskScore: z.number().int().min(0).max(100).optional(),
  reason: z.string().optional(),
  enabled: z.boolean().optional(),
});

const ispCreateSchema = z.object({
  namePattern: z.string().min(1),
  type: z.enum(['isp', 'mobile', 'business', 'education', 'government']),
  country: z.string().length(2).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

const countryCreateSchema = z.object({
  countryCode: z.string().length(2),
  action: z.enum(['allow', 'block', 'challenge']),
  enabled: z.boolean().optional(),
});

// 获取统计信息
app.get('/stats', async (c) => {
  try {
    const service = createTrafficFilterService(c.env);
    const stats = await service.getStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get traffic filter stats error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    }, 500);
  }
});

// 获取ISP黑名单关键词列表
app.get('/isp-blacklist-keywords', async (c) => {
  try {
    return c.json({
      success: true,
      data: ISP_BLACKLIST_KEYWORDS,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get ISP blacklist keywords',
    }, 500);
  }
});

// ASN相关路由
app.get('/asn', async (c) => {
  const category = c.req.query('category') as 'blacklist' | 'greylist' | 'whitelist' | undefined;
  const type = c.req.query('type') as string | undefined;

  try {
    const service = createASNFilterService(c.env);
    await service.initialize();
    const list = await service.getASNList({ category: category as any, type: type as any });

    return c.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error('Get ASN list error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get ASN list',
    }, 500);
  }
});

app.post('/asn', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = asnCreateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const service = createASNFilterService(c.env);
    await service.initialize();
    const entry = await service.addASNToBlacklist({
      asn: parsed.data.asn,
      asName: parsed.data.asName,
      category: parsed.data.category,
      type: parsed.data.type,
      riskScore: parsed.data.riskScore || 80,
      reason: parsed.data.reason || '',
      source: 'manual',
      enabled: parsed.data.enabled !== false,
    });

    return c.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Add ASN error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add ASN',
    }, 500);
  }
});

app.delete('/asn/:asn', async (c) => {
  const asn = parseInt(c.req.param('asn'));

  if (isNaN(asn)) {
    return c.json({ success: false, error: 'Invalid ASN' }, 400);
  }

  try {
    const service = createASNFilterService(c.env);
    await service.initialize();
    await service.removeASNFromBlacklist(asn);

    return c.json({
      success: true,
      message: 'ASN removed',
    });
  } catch (error) {
    console.error('Remove ASN error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove ASN',
    }, 500);
  }
});

 app.patch('/asn/:asn', async (c) => {
  const asn = parseInt(c.req.param('asn'));

  if (isNaN(asn)) {
    return c.json({ success: false, error: 'Invalid ASN' }, 400);
  }

  try {
    const body = await c.req.json();
    const service = createASNFilterService(c.env);
    await service.initialize();
    const entry = await service.addASNToBlacklist({
      asn,
      asName: body.asName,
      category: body.category,
      type: body.type,
      riskScore: body.riskScore,
      reason: body.reason,
      source: 'manual',
      enabled: body.enabled !== false,
    });

    return c.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Update ASN error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update ASN',
    }, 500);
  }
});

// ISP白名单相关路由
app.get('/isp', async (c) => {
  try {
    const service = createTrafficFilterService(c.env);
    const list = service.getISPWhitelist();

    return c.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error('Get ISP whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get ISP whitelist',
    }, 500);
  }
});

app.post('/isp', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ispCreateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const service = createTrafficFilterService(c.env);
    const entry = await service.addISPToWhitelist({
      namePattern: parsed.data.namePattern,
      type: parsed.data.type,
      country: parsed.data.country,
      priority: parsed.data.priority || 50,
      enabled: parsed.data.enabled !== false,
    });

    return c.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Add ISP to whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add ISP to whitelist',
    }, 500);
  }
});

app.delete('/isp/:namePattern', async (c) => {
  const namePattern = decodeURIComponent(c.req.param('namePattern'));

  try {
    const service = createTrafficFilterService(c.env);
    await service.removeISPFromWhitelist(namePattern);

    return c.json({
      success: true,
      message: 'ISP removed from whitelist',
    });
  } catch (error) {
    console.error('Remove ISP from whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove ISP from whitelist',
    }, 500);
  }
});

// 国家过滤相关路由
app.get('/country', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM countryFilter ORDER BY countryCode')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get country rules error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get country rules',
    }, 500);
  }
});

app.post('/country', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = countryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `country_${parsed.data.countryCode.toLowerCase()}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO countryFilter (id, countryCode, action, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          action = excluded.action,
          enabled = excluded.enabled,
          updatedAt = excluded.updatedAt
      `)
      .bind(
        id,
        parsed.data.countryCode.toUpperCase(),
        parsed.data.action,
        parsed.data.enabled !== false ? 1 : 0,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: {
        id,
        countryCode: parsed.data.countryCode.toUpperCase(),
        action: parsed.data.action,
        enabled: parsed.data.enabled !== false,
      },
    });
  } catch (error) {
    console.error('Add country rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add country rule',
    }, 500);
  }
});

app.delete('/country/:countryCode', async (c) => {
  const countryCode = c.req.param('countryCode').toUpperCase();

  try {
    await c.env.DB
      .prepare('DELETE FROM countryFilter WHERE countryCode = ?')
      .bind(countryCode)
      .run();

    return c.json({
      success: true,
      message: 'Country rule removed',
    });
  } catch (error) {
    console.error('Remove country rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove country rule',
    }, 500);
  }
});

// 测试流量过滤
app.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const { asn, asOrganization, country } = body;

    const service = createTrafficFilterService(c.env);
    const result = await service.filterTraffic({
      rayId: null,
      connectingIP: null,
      ipCountry: country || null,
      isEUCountry: false,
      asn: asn || null,
      asOrganization: asOrganization || null,
      colo: null,
      country: country || null,
      city: null,
      region: null,
      regionCode: null,
      latitude: null,
      longitude: null,
      postalCode: null,
      continent: null,
      timezone: null,
      metroCode: null,
      httpProtocol: null,
      tlsVersion: null,
      tlsCipher: null,
      tlsClientAuth: null,
      tlsClientCiphersSha1: null,
      tlsClientHelloLength: null,
      tlsClientRandom: null,
    tlsClientExtensionsSha1: null,
      botManagement: null,
      headers: {},
      requestPriority: null,
      clientAcceptEncoding: null,
      userAgent: null,
    });
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Test traffic filter error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test traffic filter',
    }, 500);
  }
});

export default app;
