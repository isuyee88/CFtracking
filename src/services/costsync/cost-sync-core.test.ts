import { describe, it, expect } from 'vitest';
import {
    MAX_WINDOW_DAYS,
    extractPaCampaignIds,
    estDate,
    extractStatsRows,
    aggregateRows,
} from './cost-sync-core';

describe('cost-sync-core 常量', () => {
    it('窗口上限锁定 7 天（PA 平台硬约束）', () => {
        expect(MAX_WINDOW_DAYS).toBe(7);
    });
});

describe('extractPaCampaignIds', () => {
    it('合法数组原样提取', () => {
        expect(extractPaCampaignIds('{"paCampaignIds":[11874655,11880113]}')).toEqual([11874655, 11880113]);
    });

    it('paCampaignIds 非数组返回空', () => {
        expect(extractPaCampaignIds('{"paCampaignIds":"11874655"}')).toEqual([]);
        expect(extractPaCampaignIds('{"paCampaignIds":{"a":1}}')).toEqual([]);
    });

    it('缺失 paCampaignIds 键返回空（现网 4 campaign 全无映射的零基线安全）', () => {
        expect(extractPaCampaignIds('{"utmSource":"fb"}')).toEqual([]);
    });

    it('非法 JSON 返回空（不抛异常）', () => {
        expect(extractPaCampaignIds('{broken json')).toEqual([]);
    });

    it('负数/零/非整数被过滤，数字字符串可转换', () => {
        expect(extractPaCampaignIds('{"paCampaignIds":[-1,0,1.5,11874655,"11880113"]}')).toEqual([11874655, 11880113]);
    });

    it('空串/null 返回空', () => {
        expect(extractPaCampaignIds('')).toEqual([]);
        expect(extractPaCampaignIds(null)).toEqual([]);
    });
});

describe('estDate', () => {
    it('0 天前返回 UTC 当天日期（10 位）', () => {
        expect(estDate(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('daysAgo 递增日期单调递减', () => {
        const d1 = new Date(estDate(1));
        const d2 = new Date(estDate(2));
        expect(d2.getTime()).toBeLessThan(d1.getTime());
    });
});

describe('extractStatsRows', () => {
    const row = { campaign_id: 11874655, spent: 1.399, clicks: 3 };

    it('形态一 {result:[...]}', () => {
        expect(extractStatsRows({ result: [row] })).toEqual([row]);
    });

    it('形态二 {result:{rows:[...]}}', () => {
        expect(extractStatsRows({ result: { rows: [row] } })).toEqual([row]);
    });

    it('形态三 {rows:[...]}', () => {
        expect(extractStatsRows({ rows: [row] })).toEqual([row]);
    });

    it('形态四 裸数组', () => {
        expect(extractStatsRows([row])).toEqual([row]);
    });

    it('空对象/未知形态返回空数组（不抛异常）', () => {
        expect(extractStatsRows({})).toEqual([]);
        expect(extractStatsRows({ result: {} })).toEqual([]);
        expect(extractStatsRows(null)).toEqual([]);
    });
});

describe('aggregateRows', () => {
    const mappings = [
        { campaignId: 'c37', paId: 11874655 },
        { campaignId: 'c38', paId: 11874655 }, // 一个 PA id 对应多个 cf campaign
        { campaignId: 'c39', paId: 11880113 },
    ];

    it('单 PA 多 cf campaign 各自落行（花费按映射复用）', () => {
        const rows = [{ campaign_id: 11874655, date_time: '2026-09-21 00:00:00', spent: 1.399, clicks: 3, impressions: 100 }];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect(agg.get('c37|11874655|2026-09-21')).toEqual({ spend: 1.399, clicks: 3, impressions: 100 });
        expect(agg.get('c38|11874655|2026-09-21')).toEqual({ spend: 1.399, clicks: 3, impressions: 100 });
        expect(agg.has('c39|11874655|2026-09-21')).toBe(false);
    });

    it('非映射范围的平台 campaign 静默跳过', () => {
        const rows = [{ campaign_id: 99999999, date_time: '2026-09-21', spent: 17.55 }];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect(agg.size).toBe(0);
    });

    it('date_time 带时分截取前 10 位日期', () => {
        const rows = [{ campaign_id: 11880113, date_time: '2026-09-20 13:45:00', spent: 2.994 }];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect([...agg.keys()][0]).toBe('c39|11880113|2026-09-20');
    });

    it('date_time 缺失回落 fallbackDate', () => {
        const rows = [{ campaign_id: 11880113, spent: 2.994 }];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect(agg.get('c39|11880113|2026-09-15')?.spend).toBe(2.994);
    });

    it('同行多行累加（同 campaign 同 date 分片）', () => {
        const rows = [
            { campaign_id: 11880113, date_time: '2026-09-20', spent: 1, clicks: 1, impressions: 10 },
            { campaign_id: 11880113, date_time: '2026-09-20', spent: 2, clicks: 2, impressions: 20 },
        ];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect(agg.get('c39|11880113|2026-09-20')).toEqual({ spend: 3, clicks: 3, impressions: 30 });
    });

    it('字符串型数值字段可转换（spent/clicks/impressions）', () => {
        const rows = [{ campaign_id: 11880113, date_time: '2026-09-20', spent: '2.994', clicks: '5', impressions: '50' }];
        const agg = aggregateRows(rows, mappings, '2026-09-15');
        expect(agg.get('c39|11880113|2026-09-20')).toEqual({ spend: 2.994, clicks: 5, impressions: 50 });
    });
});
