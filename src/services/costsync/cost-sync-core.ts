/**
 * @fileoverview cost 回填纯函数（批3 Slice4）
 * @description 与路由编排解耦，便于直测；含 PA 响应多形态解析、映射提取、日期口径
 * @module services/costsync/cost-sync-core
 */

/** PA statistics 窗口上限（平台硬约束：>7 天返回空集） */
export const MAX_WINDOW_DAYS = 7;
export const PA_API_BASE = 'https://ssp-api.propellerads.com/v5';

export interface PaStatsRow {
    campaign_id?: number;
    date_time?: string;
    spent?: number | string;
    clicks?: number | string;
    impressions?: number | string;
}

/** campaign.parameters 里声明的 PA 映射：{ paCampaignIds: [11874655] }；非法/缺失一律空数组（零基线安全） */
export function extractPaCampaignIds(parametersJson: string | null): number[] {
    if (!parametersJson) return [];
    try {
        const params = JSON.parse(parametersJson);
        const ids = params?.paCampaignIds;
        if (!Array.isArray(ids)) return [];
        return ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0);
    } catch {
        return [];
    }
}

/** EST 日期（与 PA 统计口径对齐；guardian 同款实现保持对照一致性） */
export function estDate(daysAgo: number): string {
    return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

/** 响应行提取：兼容 {result:[...]} / {result:{rows:[...]}} / {rows:[...]} / 裸数组 多形态 */
export function extractStatsRows(data: unknown): PaStatsRow[] {
    const d = data as { result?: unknown; rows?: unknown };
    if (Array.isArray(d?.result)) return d.result as PaStatsRow[];
    const inner = d?.result as { rows?: unknown } | undefined;
    if (Array.isArray(inner?.rows)) return inner.rows as PaStatsRow[];
    if (Array.isArray(d?.rows)) return d.rows as PaStatsRow[];
    if (Array.isArray(data)) return data as PaStatsRow[];
    return [];
}

/**
 * 按 (cf campaign, PA campaign, date) 聚合统计行
 * 为什么一个 PA id 可能对应多个 cf campaign：允许多 landing 复用同一投放，
 * 花费按映射关系各自落行（报表按 cf campaign 消费）
 */
export function aggregateRows(
    rows: PaStatsRow[],
    mappings: Array<{ campaignId: string; paId: number }>,
    fallbackDate: string
): Map<string, { spend: number; clicks: number; impressions: number }> {
    const paToCampaigns = new Map<number, string[]>();
    for (const m of mappings) {
        paToCampaigns.set(m.paId, [...(paToCampaigns.get(m.paId) || []), m.campaignId]);
    }
    const aggregated = new Map<string, { spend: number; clicks: number; impressions: number }>();
    for (const r of rows) {
        const paId = Number(r.campaign_id);
        const owners = paToCampaigns.get(paId);
        if (!owners) continue; // 非映射范围的平台 campaign，静默跳过
        // date_time 可能带时分（date_time 分组），截取日期部分；缺失回落窗口起点
        const date = String(r.date_time || fallbackDate).slice(0, 10);
        for (const campaignId of owners) {
            const key = `${campaignId}|${paId}|${date}`;
            const cur = aggregated.get(key) || { spend: 0, clicks: 0, impressions: 0 };
            cur.spend += Number(r.spent || 0);
            cur.clicks += Number(r.clicks || 0);
            cur.impressions += Number(r.impressions || 0);
            aggregated.set(key, cur);
        }
    }
    return aggregated;
}
