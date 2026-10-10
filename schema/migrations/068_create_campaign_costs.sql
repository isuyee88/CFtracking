-- 068: cost 回填快照表（批3 Slice4）
-- 为什么独立表：trafficSummary.spend 是「增量累加」语义（upsert = spend + ?），
-- 外部平台成本同步是「覆盖式快照」，混写会导致重复触发时 spend 虚高；
-- 独立表与内部统计零交集（不伤害既有报表链路），报表侧后续可按 campaignId+date join。
CREATE TABLE IF NOT EXISTS campaign_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaignId TEXT NOT NULL,
    extCampaignId TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'propellerads',
    date TEXT NOT NULL,
    spend REAL NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    syncedAt TEXT NOT NULL,
    UNIQUE(campaignId, extCampaignId, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_costs_campaign ON campaign_costs(campaignId, date);

INSERT INTO d1_migrations (name, applied_at)
SELECT '068_create_campaign_costs.sql', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '068_create_campaign_costs.sql');
