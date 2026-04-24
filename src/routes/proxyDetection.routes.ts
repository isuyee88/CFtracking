/**
 * @fileoverview 代理检测API路由
 * @description 提供代理检测、规则管理、黑白名单管理的API接口
 * @module routes/proxyDetection.routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createProxyDetectionEngine } from '@/services/proxyDetection/proxyDetectionEngine.service';
import { createTurnstileService } from '@/services/proxyDetection/turnstile.service';
import type { Env } from '@/config/env';

const app = new Hono<{ Bindings: Env }>();

// 请求验证Schema
const verifyRequestSchema = z.object({
  ip: z.string().ip(),
  userAgent: z.string(),
  fingerprint: z.string().optional(),
  asn: z.number().optional(),
  country: z.string().optional(),
  asOrganization: z.string().optional(),
});

// IP黑白名单Schema
const ipEntrySchema = z.object({
  ip_address: z.string().ip(),
  ip_range: z.string().optional(),
  reason: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.enum(['manual', 'auto_detected', 'api', 'import']).optional(),
  expires_at: z.string().datetime().optional(),
  enabled: z.boolean().optional(),
});

// UA黑白名单Schema
const uaEntrySchema = z.object({
  pattern: z.string().min(1),
  pattern_type: z.enum(['exact', 'contains', 'regex']).optional(),
  reason: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  enabled: z.boolean().optional(),
});

// 设备指纹黑白名单Schema
const fingerprintEntrySchema = z.object({
  fingerprint: z.string().min(1),
  fingerprint_type: z.enum(['browser', 'canvas', 'webgl', 'audio', 'font', 'combined']).optional(),
  reason: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  related_ips: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

// 设备指纹白名单Schema (包含额外字段)
const fingerprintWhitelistSchema = z.object({
  fingerprint: z.string().min(1),
  fingerprint_type: z.enum(['browser', 'canvas', 'webgl', 'audio', 'font', 'combined']).optional(),
  reason: z.string().optional(),
  trust_level: z.enum(['verified', 'trusted']).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  enabled: z.boolean().optional(),
});

// 规则Schema
const ruleSchema = z.object({
  rule_name: z.string().min(1),
  rule_description: z.string().optional(),
  detection_type: z.enum(['isp_keyword', 'asn', 'ip_reputation', 'geo', 'behavior', 'ua', 'country']),
  detection_operator: z.enum(['equals', 'contains', 'regex', 'in_list', 'greater_than', 'less_than', 'in_whitelist', 'not_in_list']),
  detection_value: z.string(),
  priority: z.number().min(1).max(1000).optional(),
  action: z.enum(['ALLOW', 'CHALLENGE', 'MARK', 'BLOCK', 'REDIRECT']),
  action_config: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});

/**
 * 执行代理检测
 */
app.post('/detect', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = verifyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const engine = createProxyDetectionEngine(c.env);
    const result = await engine.detect(
      parsed.data.ip,
      parsed.data.userAgent,
      {
        asn: parsed.data.asn || null,
        asOrganization: parsed.data.asOrganization || null,
        country: parsed.data.country || null,
      },
      parsed.data.fingerprint
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Proxy detection error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Detection failed',
    }, 500);
  }
});

/**
 * 验证Turnstile挑战
 */
app.post('/verify-challenge', async (c) => {
  try {
    const body = await c.req.json();
    const { token, sessionId, fingerprint } = body;

    if (!token || !sessionId) {
      return c.json({ success: false, error: 'Missing token or sessionId' }, 400);
    }

    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const userAgent = c.req.header('User-Agent') || '';

    const turnstile = createTurnstileService(c.env);
    const verifyResult = await turnstile.verifyToken(token, ip, sessionId);

    if (!verifyResult.success) {
      // 增加失败计数
      await turnstile.incrementFailCount(sessionId, verifyResult.errorCodes?.join(', '));

      // 检查是否超过最大重试次数
      const maxExceeded = await turnstile.isMaxRetryExceeded(sessionId);
      if (maxExceeded) {
        return c.json({
          success: false,
          error: 'Max retry attempts exceeded',
          action: 'BLOCK',
        });
      }

      return c.json({
        success: false,
        error: 'Verification failed',
        errorCodes: verifyResult.errorCodes,
      }, 400);
    }

    // 设置信任状态
    await turnstile.setTrustState(ip, userAgent, sessionId, fingerprint);

    return c.json({
      success: true,
      message: 'Challenge passed',
    });
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, 500);
  }
});

/**
 * 获取挑战页面HTML
 */
app.get('/challenge-html', async (c) => {
  const { sessionId, reason, redirect } = c.req.query();

  if (!sessionId) {
    return c.json({ success: false, error: 'Missing sessionId' }, 400);
  }

  const turnstile = createTurnstileService(c.env);
  const html = turnstile.generateChallengeHtml(sessionId, reason || 'Security verification required', redirect);

  return c.html(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

/**
 * 获取检测统计
 */
app.get('/stats', async (c) => {
  try {
    const engine = createProxyDetectionEngine(c.env);
    const config = await engine.getConfig();

    return c.json({
      success: true,
      data: {
        enabled: config.enabled,
        mode: config.mode,
        turnstile: {
          enabled: config.turnstile.enabled,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    }, 500);
  }
});

/**
 * 更新配置
 */
app.post('/config', async (c) => {
  try {
    const body = await c.req.json();
    const engine = createProxyDetectionEngine(c.env);
    await engine.updateConfig(body);

    return c.json({
      success: true,
      message: 'Configuration updated',
    });
  } catch (error) {
    console.error('Update config error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update config',
    }, 500);
  }
});

/**
 * 清除规则缓存
 */
app.post('/clear-cache', async (c) => {
  try {
    const engine = createProxyDetectionEngine(c.env);
    await engine.clearRulesCache();

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

// ==================== IP黑白名单管理 ====================

/**
 * 获取IP黑名单
 */
app.get('/ip-blacklist', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '50', 10);
    const offset = (page - 1) * pageSize;

    const result = await c.env.DB
      .prepare(`
        SELECT * FROM ip_blacklist 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(pageSize, offset)
      .all();

    const countResult = await c.env.DB
      .prepare('SELECT COUNT(*) as total FROM ip_blacklist')
      .first<{ total: number }>();

    return c.json({
      success: true,
      data: {
        items: result.results || [],
        total: countResult?.total || 0,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Get IP blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get IP blacklist',
    }, 500);
  }
});

/**
 * 添加IP到黑名单
 */
app.post('/ip-blacklist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ipEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `ipbl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO ip_blacklist (id, ip_address, ip_range, reason, severity, source, expires_at, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.ip_address,
        parsed.data.ip_range || null,
        parsed.data.reason || null,
        parsed.data.severity || 'medium',
        parsed.data.source || 'manual',
        parsed.data.expires_at || null,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add IP to blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add IP to blacklist',
    }, 500);
  }
});

/**
 * 从黑名单移除IP
 */
app.delete('/ip-blacklist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM ip_blacklist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'IP removed from blacklist',
    });
  } catch (error) {
    console.error('Remove IP from blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove IP from blacklist',
    }, 500);
  }
});

/**
 * 获取IP白名单
 */
app.get('/ip-whitelist', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM ip_whitelist ORDER BY created_at DESC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get IP whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get IP whitelist',
    }, 500);
  }
});

/**
 * 添加IP到白名单
 */
app.post('/ip-whitelist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ipEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `ipwl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO ip_whitelist (id, ip_address, ip_range, reason, source, expires_at, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.ip_address,
        parsed.data.ip_range || null,
        parsed.data.reason || null,
        parsed.data.source || 'manual',
        parsed.data.expires_at || null,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add IP to whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add IP to whitelist',
    }, 500);
  }
});

/**
 * 从白名单移除IP
 */
app.delete('/ip-whitelist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM ip_whitelist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'IP removed from whitelist',
    });
  } catch (error) {
    console.error('Remove IP from whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove IP from whitelist',
    }, 500);
  }
});

// ==================== UA黑白名单管理 ====================

/**
 * 获取UA黑名单
 */
app.get('/ua-blacklist', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM ua_blacklist ORDER BY created_at DESC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get UA blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get UA blacklist',
    }, 500);
  }
});

/**
 * 添加UA到黑名单
 */
app.post('/ua-blacklist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = uaEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `uabl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO ua_blacklist (id, pattern, pattern_type, reason, severity, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.pattern,
        parsed.data.pattern_type || 'contains',
        parsed.data.reason || null,
        parsed.data.severity || 'medium',
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add UA to blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add UA to blacklist',
    }, 500);
  }
});

/**
 * 从黑名单移除UA
 */
app.delete('/ua-blacklist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM ua_blacklist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'UA removed from blacklist',
    });
  } catch (error) {
    console.error('Remove UA from blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove UA from blacklist',
    }, 500);
  }
});

/**
 * 获取UA白名单
 */
app.get('/ua-whitelist', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM ua_whitelist ORDER BY created_at DESC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get UA whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get UA whitelist',
    }, 500);
  }
});

/**
 * 添加UA到白名单
 */
app.post('/ua-whitelist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = uaEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `uawl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO ua_whitelist (id, pattern, pattern_type, reason, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.pattern,
        parsed.data.pattern_type || 'contains',
        parsed.data.reason || null,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add UA to whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add UA to whitelist',
    }, 500);
  }
});

/**
 * 从白名单移除UA
 */
app.delete('/ua-whitelist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM ua_whitelist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'UA removed from whitelist',
    });
  } catch (error) {
    console.error('Remove UA from whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove UA from whitelist',
    }, 500);
  }
});

// ==================== 设备指纹黑白名单管理 ====================

/**
 * 获取设备指纹黑名单
 */
app.get('/fingerprint-blacklist', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM fingerprint_blacklist ORDER BY created_at DESC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get fingerprint blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get fingerprint blacklist',
    }, 500);
  }
});

/**
 * 添加设备指纹到黑名单
 */
app.post('/fingerprint-blacklist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = fingerprintEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `fpbl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO fingerprint_blacklist (id, fingerprint, fingerprint_type, reason, severity, related_ips, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.fingerprint,
        parsed.data.fingerprint_type || 'browser',
        parsed.data.reason || null,
        parsed.data.severity || 'medium',
        parsed.data.related_ips ? JSON.stringify(parsed.data.related_ips) : null,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add fingerprint to blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add fingerprint to blacklist',
    }, 500);
  }
});

/**
 * 从黑名单移除设备指纹
 */
app.delete('/fingerprint-blacklist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM fingerprint_blacklist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'Fingerprint removed from blacklist',
    });
  } catch (error) {
    console.error('Remove fingerprint from blacklist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove fingerprint from blacklist',
    }, 500);
  }
});

/**
 * 获取设备指纹白名单
 */
app.get('/fingerprint-whitelist', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM fingerprint_whitelist ORDER BY created_at DESC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get fingerprint whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get fingerprint whitelist',
    }, 500);
  }
});

/**
 * 添加设备指纹到白名单
 */
app.post('/fingerprint-whitelist', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = fingerprintWhitelistSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const id = `fpwl_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO fingerprint_whitelist (id, fingerprint, fingerprint_type, reason, trust_level, expires_at, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        parsed.data.fingerprint,
        parsed.data.fingerprint_type || 'browser',
        parsed.data.reason || null,
        parsed.data.trust_level || 'verified',
        parsed.data.expires_at || null,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: { id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add fingerprint to whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add fingerprint to whitelist',
    }, 500);
  }
});

/**
 * 从白名单移除设备指纹
 */
app.delete('/fingerprint-whitelist/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM fingerprint_whitelist WHERE id = ?')
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'Fingerprint removed from whitelist',
    });
  } catch (error) {
    console.error('Remove fingerprint from whitelist error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove fingerprint from whitelist',
    }, 500);
  }
});

// ==================== 规则管理 ====================

/**
 * 获取规则列表
 */
app.get('/rules', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM proxy_detection_rules ORDER BY priority ASC')
      .all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Get rules error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rules',
    }, 500);
  }
});

/**
 * 添加规则
 */
app.post('/rules', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ruleSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB
      .prepare(`
        INSERT INTO proxy_detection_rules (
          rule_name, rule_description, detection_type, detection_operator, detection_value,
          priority, action, action_config, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        parsed.data.rule_name,
        parsed.data.rule_description || null,
        parsed.data.detection_type,
        parsed.data.detection_operator,
        parsed.data.detection_value,
        parsed.data.priority || 100,
        parsed.data.action,
        parsed.data.action_config ? JSON.stringify(parsed.data.action_config) : null,
        now,
        now
      )
      .run();

    // 清除规则缓存
    const engine = createProxyDetectionEngine(c.env);
    await engine.clearRulesCache();

    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, ...parsed.data },
    });
  } catch (error) {
    console.error('Add rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add rule',
    }, 500);
  }
});

/**
 * 更新规则
 */
app.put('/rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = ruleSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request', details: parsed.error.errors }, 400);
    }

    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        UPDATE proxy_detection_rules SET
          rule_name = ?,
          rule_description = ?,
          detection_type = ?,
          detection_operator = ?,
          detection_value = ?,
          priority = ?,
          action = ?,
          action_config = ?,
          enabled = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .bind(
        parsed.data.rule_name,
        parsed.data.rule_description || null,
        parsed.data.detection_type,
        parsed.data.detection_operator,
        parsed.data.detection_value,
        parsed.data.priority || 100,
        parsed.data.action,
        parsed.data.action_config ? JSON.stringify(parsed.data.action_config) : null,
        parsed.data.enabled !== false ? 1 : 0,
        now,
        id
      )
      .run();

    // 清除规则缓存
    const engine = createProxyDetectionEngine(c.env);
    await engine.clearRulesCache();

    return c.json({
      success: true,
      message: 'Rule updated',
    });
  } catch (error) {
    console.error('Update rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule',
    }, 500);
  }
});

/**
 * 删除规则
 */
app.delete('/rules/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB
      .prepare('DELETE FROM proxy_detection_rules WHERE id = ?')
      .bind(id)
      .run();

    // 清除规则缓存
    const engine = createProxyDetectionEngine(c.env);
    await engine.clearRulesCache();

    return c.json({
      success: true,
      message: 'Rule deleted',
    });
  } catch (error) {
    console.error('Delete rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete rule',
    }, 500);
  }
});

/**
 * 切换规则启用状态
 */
app.patch('/rules/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    const { enabled } = await c.req.json();

    await c.env.DB
      .prepare('UPDATE proxy_detection_rules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(enabled ? 1 : 0, id)
      .run();

    // 清除规则缓存
    const engine = createProxyDetectionEngine(c.env);
    await engine.clearRulesCache();

    return c.json({
      success: true,
      message: 'Rule toggled',
    });
  } catch (error) {
    console.error('Toggle rule error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle rule',
    }, 500);
  }
});

export default app;
