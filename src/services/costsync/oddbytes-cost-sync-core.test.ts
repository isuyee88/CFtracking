/**
 * @fileoverview OddBytes cost 回填纯函数测试
 * @module services/costsync/oddbytes-cost-sync-core.test
 */

import { describe, it, expect } from 'vitest';
import {
    extractOddBytesCampaignIds,
    chunkIds,
    toStatsRows,
    OB_CHUNK_SIZE,
} from './oddbytes-cost-sync-core';

describe('extractOddBytesCampaignIds', () => {
    it('提取合法映射并过滤非正整数/非整数', () => {
        expect(extractOddBytesCampaignIds('{"oddbytesCampaignIds":[8393, 12, -1, 0, "x", 3.5]}')).toEqual([8393, 12]);
    });

    it('缺失/非法一律空数组（零基线安全）', () => {
        expect(extractOddBytesCampaignIds(null)).toEqual([]);
        expect(extractOddBytesCampaignIds('')).toEqual([]);
        expect(extractOddBytesCampaignIds('not json')).toEqual([]);
        expect(extractOddBytesCampaignIds('{}')).toEqual([]);
        expect(extractOddBytesCampaignIds('{"oddbytesCampaignIds":"8393"}')).toEqual([]);
    });
});

describe('chunkIds', () => {
    it('按 WSDL 上限 10 分块且保留顺序', () => {
        const ids = Array.from({ length: 23 }, (_, i) => i + 1);
        const chunks = chunkIds(ids);
        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toHaveLength(OB_CHUNK_SIZE);
        expect(chunks[2]).toHaveLength(3);
        expect(chunks.flat()).toEqual(ids);
    });

    it('空数组零分块', () => {
        expect(chunkIds([])).toEqual([]);
    });
});

describe('toStatsRows', () => {
    it('adapter 统计行转换为 PaStatsRow 兼容形状（null/缺失归零）', () => {
        const rows = toStatsRows(
            [
                { campaignId: 8393, cost: 1.2, clicks: 3, impressions: 50 },
                { campaignId: '100', cost: '0.00', clicks: null, impressions: null },
            ],
            '2026-09-21'
        );
        expect(rows).toEqual([
            { campaign_id: 8393, date_time: '2026-09-21', spent: 1.2, clicks: 3, impressions: 50 },
            { campaign_id: 100, date_time: '2026-09-21', spent: 0, clicks: 0, impressions: 0 },
        ]);
    });
});
