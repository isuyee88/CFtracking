/**
 * @fileoverview 平台凭据统一管理路由（批2 §4.5）
 * @description X-S2S-Key 鉴权（s2sMiddleware），与 JWT 面板体系隔离；挂载于 /api/s2s/credentials
 *          （该前缀在 public-api-path.ts 中跳过 JWT，自带 S2S 保护）。
 *          安全边界：
 *          - 明文只走 GET /:platform（服务端运行期注入用）；列表/管理端点只返回掩码
 *          - 轮换 = 旧 active 归档 + 新 active 写入（D1 batch 原子，可回溯审计）
 *          - CRED_MASTER_KEY 未配置时 503 拒绝（安全默认关闭，不裸奔）
 * @module services/credentials/credentials.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { s2sMiddleware } from '@/middleware/auth';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { encryptSecret, decryptSecret, maskSecret } from './secret-crypto';

/** 平台白名单：campaign.platforms 声明依赖时按此引用（§4.5.1 凭据盘点）
 *  2026-09-22 审计补充：mylead/activerevenue 为待接入联盟平台（账号+API key 前置），
 *  oddbytes 凭据现存于 trafficSources.apiConfig，但统一纳管需占位（P1 修复） */
const PLATFORMS = [
    'monetizer',
    'partnerboost',
    'mylead',
    'propellerads',
    'activerevenue',
    'oddbytes',
    'maxconv',
    'postback',
    'other',
] as const;
const KINDS = ['api', 'postback', 'shared_secret'] as const;

interface SecretRow {
  id: number;
  platform: string;
  kind: string;
  label: string;
  cipher: string;
  masked: string;
  expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** 到期剩余天数（无到期返回 null；已过期为负数） */
function daysToExpire(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / 864e5);
}

export function createCredentialsRouter() {
  const router = new Hono<{ Bindings: Env }>();

  // 该路由下所有端点均为 Worker 间调用，统一 S2S 鉴权
  router.use('*', s2sMiddleware);

  const requireMaster = (c: { env: Env }): boolean => !!c.env.CRED_MASTER_KEY;

  /**
   * GET /api/s2s/credentials — 掩码列表（admin 面板展示，含到期预警天数）
   * 可选 ?status=active|archived|all（缺省 active）
   */
  router.get('/', async (c) => {
    if (!requireMaster(c)) {
      return c.json(error('CRED_MASTER_KEY not configured', 'NOT_CONFIGURED'), 503);
    }
    const status = ['active', 'archived', 'all'].includes(c.req.query('status') ?? '')
      ? c.req.query('status')!
      : 'active';
    try {
      const stmt = status === 'all'
        ? c.env.DB.prepare('SELECT * FROM secret_store ORDER BY status, platform')
        : c.env.DB.prepare('SELECT * FROM secret_store WHERE status = ? ORDER BY platform').bind(status);
      const { results } = await stmt.all<SecretRow>();
      return c.json(success((results ?? []).map((r) => ({
        id: r.id,
        platform: r.platform,
        kind: r.kind,
        label: r.label,
        masked: r.masked,
        expiresAt: r.expires_at,
        expiresAtDays: daysToExpire(r.expires_at),
        status: r.status,
        updatedAt: r.updated_at,
      }))));
    } catch (err) {
      console.error('[Credentials] List error:', err);
      return c.json(error(err instanceof Error ? err.message : 'List failed'), HTTP_STATUS.INTERNAL_ERROR);
    }
  });

  /**
   * POST /api/s2s/credentials — 写入/轮换
   * body: { platform, value, kind?, label?, expiresAt? }
   * 轮换语义：同 platform 旧 active 原子归档后写入新值（历史可查）
   */
  router.post('/', async (c) => {
    if (!requireMaster(c)) {
      return c.json(error('CRED_MASTER_KEY not configured', 'NOT_CONFIGURED'), 503);
    }
    const body = await c.req.json().catch(() => null);
    const platform = String(body?.platform ?? '');
    const value = String(body?.value ?? '');
    const kind = (KINDS as readonly string[]).includes(body?.kind) ? body.kind : 'api';
    const label = String(body?.label ?? '').slice(0, 120);
    const expiresAt = /^\d{4}-\d{2}-\d{2}/.test(String(body?.expiresAt ?? ''))
      ? String(body.expiresAt) : null;

    if (!(PLATFORMS as readonly string[]).includes(platform)) {
      return c.json(error(`platform 必须是 ${PLATFORMS.join('|')}`), HTTP_STATUS.BAD_REQUEST);
    }
    if (value.length < 8 || value.length > 4096) {
      return c.json(error('value 长度须在 8-4096 之间'), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const cipher = await encryptSecret(c.env.CRED_MASTER_KEY!, value);
      const masked = maskSecret(value);
      // batch 原子性：归档旧值 + 写新值（部分唯一索引兜底防双活）
      await c.env.DB.batch([
        c.env.DB.prepare(
            "UPDATE secret_store SET status = 'archived', updated_at = datetime('now') WHERE platform = ? AND status = 'active'"
        ).bind(platform),
        c.env.DB.prepare(
            "INSERT INTO secret_store (platform, kind, label, cipher, masked, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(platform, kind, label, cipher, masked, expiresAt),
      ]);
      return c.json(success({ platform, kind, masked, expiresAt, rotated: true }));
    } catch (err) {
      console.error('[Credentials] Write error:', err);
      return c.json(error(err instanceof Error ? err.message : 'Write failed'), HTTP_STATUS.INTERNAL_ERROR);
    }
  });

  /**
   * GET /api/s2s/credentials/:platform — 取用明文（运行期注入，仅服务端）
   * 为什么提供明文端点：campaign 执行期（拉产品/调平台 API）需要真实凭据，
   * 列表端点永远只回掩码；此端点仍受 S2S 保护，禁止 admin 前端直连
   */
  router.get('/:platform', async (c) => {
    if (!requireMaster(c)) {
      return c.json(error('CRED_MASTER_KEY not configured', 'NOT_CONFIGURED'), 503);
    }
    const platform = c.req.param('platform');
    try {
      const row = await c.env.DB.prepare(
          "SELECT * FROM secret_store WHERE platform = ? AND status = 'active'"
      ).bind(platform).first<SecretRow>();
      if (!row) {
        return c.json(error(`No active credential for platform: ${platform}`), HTTP_STATUS.NOT_FOUND);
      }
      const value = await decryptSecret(c.env.CRED_MASTER_KEY!, row.cipher);
      return c.json(success({
        platform: row.platform,
        kind: row.kind,
        label: row.label,
        value,
        expiresAt: row.expires_at,
        expiresAtDays: daysToExpire(row.expires_at),
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error('[Credentials] Reveal error:', err);
      // 解密失败多为主密钥不匹配/密文被篡改——不回显细节
      return c.json(error('Decrypt failed (key mismatch or corrupted cipher)'), HTTP_STATUS.INTERNAL_ERROR);
    }
  });

  /**
   * DELETE /api/s2s/credentials/:platform — 归档下线（不物理删除，保留审计链）
   */
  router.delete('/:platform', async (c) => {
    const platform = c.req.param('platform');
    try {
      const res = await c.env.DB.prepare(
          "UPDATE secret_store SET status = 'archived', updated_at = datetime('now') WHERE platform = ? AND status = 'active'"
      ).bind(platform).run();
      return c.json(success({ platform, archived: (res.meta?.changes ?? 0) > 0 }));
    } catch (err) {
      console.error('[Credentials] Archive error:', err);
      return c.json(error(err instanceof Error ? err.message : 'Archive failed'), HTTP_STATUS.INTERNAL_ERROR);
    }
  });

  return router;
}
