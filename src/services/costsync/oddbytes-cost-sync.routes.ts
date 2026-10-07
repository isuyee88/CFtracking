/**
 * @fileoverview OddBytes cost 回填路由
 * @description 将 OddBytes getDailyTargetsStats 的按日花费快照回填 D1 campaign_costs 表。
 *          与 PA cost-sync 平行通路（零触碰已验证路径），复用 OddBytesAdapter
 *          （内建 5s 串行节流/SOAP 报文/解析）与 aggregateRows 聚合器（行形状转换后复用）。
 *          凭据源（现有现实）：trafficSources.apiConfig（templateId='oddbytes' AND status='active'）；
 *          映射源：campaigns.parameters.oddbytesCampaignIds（镜像 PA 的 paCampaignIds 模式）。
 *          已实证约束：date 单日单请求、campaignIds ≤10/请求（WSDL）、请求串行 ≥5s。
 * @module services/costsync/oddbytes-cost-sync.routes
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { s2sMiddleware } from '@/middleware/auth';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import { OddBytesAdapter } from '@/services/platform/oddbytes';
import { aggregateRows, estDate } from './cost-sync-core';
import type { PaStatsRow } from './cost-sync-core';
import {
    OB_MAX_WINDOW_DAYS,
    OB_CHUNK_SIZE,
    extractOddBytesCampaignIds,
    chunkIds,
    toStatsRows,
} from './oddbytes-cost-sync-core';
import type { OddBytesStatsRow } from './oddbytes-cost-sync-core';

interface OddBytesApiConfig {
    enabled?: boolean;
    baseUrl?: string;
    apiKey?: string;
}

export function createOddBytesCostSyncRouter() {
    const router = new Hono<{ Bindings: Env }>();

    // Worker 间调用，统一 S2S 鉴权（与 credentials/cost-sync 同层）
    router.use('*', s2sMiddleware);

    /**
     * POST /api/s2s/oddbytes-cost-sync  body: { days?: number }
     * 回填流程：campaigns.parameters.oddbytesCampaignIds → trafficSources.apiConfig 取凭据 →
     * getDailyTargetsStats（逐日 × 逐块，adapter 内建 5s 节流）→ 覆盖式 upsert campaign_costs
     */
    router.post('/', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const days = Math.min(Math.max(Number(body?.days) || 1, 1), OB_MAX_WINDOW_DAYS);

        try {
            // 1. 收集 campaign → OddBytes campaign 映射（无映射零操作，天然幂等安全）
            const { results: campaigns } = await c.env.DB.prepare(
                "SELECT id, parameters FROM campaigns WHERE status != 'deleted'"
            ).all<{ id: string; parameters: string | null }>();
            const mappings: Array<{ campaignId: string; paId: number }> = [];
            for (const row of campaigns ?? []) {
                for (const obId of extractOddBytesCampaignIds(row.parameters)) {
                    mappings.push({ campaignId: row.id, paId: obId });
                }
            }
            if (mappings.length === 0) {
                return c.json(success({
                    windowDays: days, mappedCampaigns: 0, syncedRows: 0,
                    note: 'no campaigns declare parameters.oddbytesCampaignIds; add mapping in campaign JSON to enable sync',
                }));
            }

            // 2. 凭据：trafficSources.apiConfig（secret_store 无 oddbytes 行，明文 JSON 为现有存储现实）
            const sourceRow = await c.env.DB.prepare(
                "SELECT apiConfig FROM trafficSources WHERE templateId = 'oddbytes' AND status = 'active' LIMIT 1"
            ).first<{ apiConfig: string | null }>();
            const apiConfig = sourceRow?.apiConfig
                ? (JSON.parse(sourceRow.apiConfig) as OddBytesApiConfig)
                : null;
            if (!apiConfig?.baseUrl || !apiConfig?.apiKey || apiConfig.enabled === false) {
                return c.json(error(
                    'No usable oddbytes apiConfig in trafficSources (need enabled=true + baseUrl + apiKey)',
                    ERROR_CODES.NOT_FOUND
                ), HTTP_STATUS.NOT_FOUND);
            }

            // 3. 逐日 × 逐块拉取（同一 adapter 实例共享 5s 节流状态；单块失败降级记录，不中断整窗同步）
            const adapter = new OddBytesAdapter({ baseUrl: apiConfig.baseUrl, apiKey: apiConfig.apiKey });
            await adapter.initialize();
            const obIds = [...new Set(mappings.map((m) => m.paId))];
            const chunks = chunkIds(obIds, OB_CHUNK_SIZE);
            const statsRows: PaStatsRow[] = [];
            const failures: string[] = [];
            let requestCount = 0;
            for (let d = days - 1; d >= 0; d--) {
                const date = estDate(d);
                for (const chunk of chunks) {
                    requestCount++;
                    const result = await adapter.execute('get_daily_stats', { date, campaignIds: chunk });
                    if (!result.success) {
                        failures.push(`${date} [${chunk.length} ids]: ${result.message}`);
                        continue;
                    }
                    const stats = (result.data?.stats as OddBytesStatsRow[] | undefined) ?? [];
                    statsRows.push(...toStatsRows(stats, date));
                }
            }

            // 4. 聚合并覆盖式 upsert（快照语义：同 key 重跑不累加；source='oddbytes' 与 PA 行按 extCampaignId 域天然隔离）
            const aggregated = aggregateRows(statsRows, mappings, estDate(days - 1));
            const now = new Date().toISOString();
            const stmts = [...aggregated.entries()].map(([key, v]) => {
                const [campaignId = '', extCampaignId = '', date = ''] = key.split('|');
                return c.env.DB.prepare(`
                    INSERT INTO campaign_costs (campaignId, extCampaignId, source, date, spend, clicks, impressions, syncedAt)
                    VALUES (?, ?, 'oddbytes', ?, ?, ?, ?, ?)
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
                mappedCampaigns: new Set(mappings.map((m) => m.campaignId)).size,
                obCampaignsQueried: obIds.length,
                requests: requestCount,
                failedRequests: failures.length,
                failures,
                syncedRows: stmts.length,
                byCampaign,
                syncedAt: now,
            }));
        } catch (err) {
            console.error('[OddBytesCostSync] Sync error:', err);
            return c.json(error(err instanceof Error ? err.message : 'OddBytes cost sync failed', ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.INTERNAL_ERROR);
        }
    });

    return router;
}
