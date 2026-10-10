/**
 * @fileoverview OddBytes cost 回填纯函数
 * @description 与路由编排解耦，便于直测；映射提取、ID 分块（WSDL 10/请求上限）、
 *          adapter 统计行 → PaStatsRow 形状转换（复用 cost-sync-core 已验证的 aggregateRows 聚合器）
 * @module services/costsync/oddbytes-cost-sync-core
 */

import type { PaStatsRow } from './cost-sync-core';

/** WSDL 约束：getDailyTargetsStats 的 campaignIds 数组上限（array_unsignedInt_1_10） */
export const OB_CHUNK_SIZE = 10;

/** 报表窗口上限：与 PA 同锁 7 天（每天每 10 个 campaign 一请求且 5s 串行限速，控制 Workers 墙钟时长） */
export const OB_MAX_WINDOW_DAYS = 7;

/** campaign.parameters 里声明的 OddBytes 映射：{ oddbytesCampaignIds: [8393] }；非法/缺失一律空数组（零基线安全） */
export function extractOddBytesCampaignIds(parametersJson: string | null): number[] {
    if (!parametersJson) return [];
    try {
        const params = JSON.parse(parametersJson);
        const ids = params?.oddbytesCampaignIds;
        if (!Array.isArray(ids)) return [];
        return ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0);
    } catch {
        return [];
    }
}

/** 按 WSDL 上限分块：逐日 × 逐块发起 SOAP 请求（5s 串行节流由 adapter 内建） */
export function chunkIds(ids: number[], size: number = OB_CHUNK_SIZE): number[][] {
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
    }
    return chunks;
}

/** adapter 返回的 DailyTargetsStats 行（按 target 粒度，字段经 toNumberOrString 已是 number|string|null） */
export interface OddBytesStatsRow {
    campaignId?: number | string | null;
    cost?: number | string | null;
    clicks?: number | string | null;
    impressions?: number | string | null;
}

/** 转换为 PaStatsRow 形状（aggregateRows 入参契约），日期由请求方注入（API 单日单请求） */
export function toStatsRows(stats: OddBytesStatsRow[], date: string): PaStatsRow[] {
    return stats.map((s) => ({
        campaign_id: Number(s.campaignId ?? 0),
        date_time: date,
        spent: Number(s.cost ?? 0),
        clicks: Number(s.clicks ?? 0),
        impressions: Number(s.impressions ?? 0),
    }));
}
