/**
 * @fileoverview cost 回填路由（批3 Slice4）
 * @description 将 PropellerAds statistics 的按日花费快照回填 D1 campaign_costs 表。
 *          为什么走 secret-store：凭据零明文落盘（§4.5.2），运行期解密仅驻留内存。
 *          已实证约束（guardian/生产验证）：
 *          - POST /adv/statistics 不带 campaign_id 过滤返回空集，必须先收集 ID 再按数组过滤
 *          - 统计窗口 >7 天返回空集，days 上限锁 7（单次请求即可，无需分段）
 *          纯函数（解析/聚合/映射）在 cost-sync-core.ts，此处只做编排
 * @module services/costsync/cost-sync.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { s2sMiddleware } from '@/middleware/auth';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { decryptSecret } from '@/services/credentials/secret-crypto';
import { MAX_WINDOW_DAYS, PA_API_BASE, extractPaCampaignIds, estDate, extractStatsRows, aggregateRows } from './cost-sync-core';

export function createCostSyncRouter() {
    const router = new Hono<{ Bindings: Env }>();

    // Worker 间调用，统一 S2S 鉴权（与 credentials 同层）
    router.use('*', s2sMiddleware);

    /**
     * POST /api/s2s/cost-sync  body: { days?: number }
     * 回填流程：campaigns.parameters.paCampaignIds → secret-store 取凭据 →
     * PA statistics（按 campaign+date 分组）→ 覆盖式 upsert campaign_costs
     */
    router.post('/', async (c) => {
        if (!c.env.CRED_MASTER_KEY) {
            return c.json(error('CRED_MASTER_KEY not configured', 'NOT_CONFIGURED'), 503);
        }
        const body = await c.req.json().catch(() => ({}));
        const days = Math.min(Math.max(Number(body?.days) || MAX_WINDOW_DAYS, 1), MAX_WINDOW_DAYS);

        try {
            // 1. 收集 campaign → PA campaign 映射（无映射零操作，天然幂等安全）
            const { results: campaigns } = await c.env.DB.prepare(
                "SELECT id, parameters FROM campaigns WHERE status != 'deleted'"
            ).all<{ id: string; parameters: string | null }>();
            const mappings: Array<{ campaignId: string; paId: number }> = [];
            for (const row of campaigns ?? []) {
                for (const paId of extractPaCampaignIds(row.parameters)) {
                    mappings.push({ campaignId: row.id, paId });
                }
            }
            if (mappings.length === 0) {
                return c.json(success({
                    windowDays: days, mappedCampaigns: 0, syncedRows: 0,
                    note: 'no campaigns declare parameters.paCampaignIds; add mapping in campaign JSON to enable sync',
                }));
            }

            // 2. secret-store 取明文凭据（仅 active 行；内存解密不落盘）
            const credRow = await c.env.DB.prepare(
                "SELECT cipher FROM secret_store WHERE platform = 'propellerads' AND status = 'active'"
            ).first<{ cipher: string }>();
            if (!credRow) {
                return c.json(error('No active propellerads credential in secret_store; POST /api/s2s/credentials to rotate in'), HTTP_STATUS.NOT_FOUND);
            }
            const token = await decryptSecret(c.env.CRED_MASTER_KEY, credRow.cipher);

            // 3. PA statistics：必须带 campaign_id 数组过滤（实证：不带返回空集）
            const paIds = [...new Set(mappings.map((m) => m.paId))];
            const res = await fetch(`${PA_API_BASE}/adv/statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    day_from: estDate(days),
                    day_to: estDate(0),
                    group_by: ['campaign_id', 'date_time'],
                    campaign_id: paIds,
                    tz: '-0500',
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                return c.json(error(`PropellerAds statistics failed: HTTP ${res.status} ${text.slice(0, 200)}`), 502);
            }
            const rows = extractStatsRows(await res.json().catch(() => null));

            // 4. 聚合并覆盖式 upsert（快照语义：同 key 重跑不累加）
            const aggregated = aggregateRows(rows, mappings, estDate(days));
            const now = new Date().toISOString();
            const stmts = [...aggregated.entries()].map(([key, v]) => {
                const [campaignId = '', extCampaignId = '', date = ''] = key.split('|');
                return c.env.DB.prepare(`
                    INSERT INTO campaign_costs (campaignId, extCampaignId, source, date, spend, clicks, impressions, syncedAt)
                    VALUES (?, ?, 'propellerads', ?, ?, ?, ?, ?)
                    ON CONFLICT(campaignId, extCampaignId, date) DO UPDATE SET
                        spend = excluded.spend, clicks = excluded.clicks,
                        impressions = excluded.impressions, syncedAt = excluded.syncedAt
                `).bind(campaignId, extCampaignId, date, v.spend, v.clicks, v.impressions, now);
            });
            if (stmts.length > 0) await c.env.DB.batch(stmts);

            // 5. 按 cf campaign 汇总返回（窗口合计花费）
            const byCampaign: Record<string, number> = {};
            for (const [key, v] of aggregated) {
                const campaignId = key.split('|')[0] || '';
                byCampaign[campaignId] = (byCampaign[campaignId] || 0) + v.spend;
            }
            return c.json(success({
                windowDays: days,
                mappedCampaigns: new Set(mappings.map((m) => m.paId)).size,
                paCampaignsQueried: paIds.length,
                syncedRows: stmts.length,
                byCampaign,
                syncedAt: now,
            }));
        } catch (err) {
            console.error('[CostSync] Sync error:', err);
            return c.json(error(err instanceof Error ? err.message : 'Cost sync failed'), HTTP_STATUS.INTERNAL_ERROR);
        }
    });

    /**
     * GET /api/s2s/cost-sync?campaignIds=c37,c38&days=7
     * 回填快照查询：campaign 维度按日花费（报表/admin 后续可消费）
     */
    router.get('/', async (c) => {
        try {
            const days = Math.min(Math.max(Number(c.req.query('days')) || MAX_WINDOW_DAYS, 1), 90);
            const campaignIds = (c.req.query('campaignIds') || '').split(',').map((s) => s.trim()).filter(Boolean);
            const since = estDate(days);

            const sql = 'SELECT campaignId, extCampaignId, source, date, spend, clicks, impressions, syncedAt FROM campaign_costs WHERE date >= ?';
            const stmt = campaignIds.length
                ? c.env.DB.prepare(`${sql} AND campaignId IN (${campaignIds.map(() => '?').join(',')}) ORDER BY campaignId, date`).bind(since, ...campaignIds)
                : c.env.DB.prepare(`${sql} ORDER BY campaignId, date`).bind(since);
            const { results } = await stmt.all();
            return c.json(success({ windowDays: days, rows: results ?? [] }));
        } catch (err) {
            console.error('[CostSync] Query error:', err);
            return c.json(error(err instanceof Error ? err.message : 'Cost query failed'), HTTP_STATUS.INTERNAL_ERROR);
        }
    });

    return router;
}
