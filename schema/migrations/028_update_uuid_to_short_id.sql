-- Migration: 将 UUID 格式 ID 更新为短 ID 格式
-- 执行命令: wrangler d1 execute cf-tracking-db --remote --file=schema/migrations/028_update_uuid_to_short_id.sql

-- 1. 更新 flows 表的 campaignId 外键
-- 先创建临时映射表
CREATE TEMPORARY TABLE campaign_id_map AS
SELECT id as old_id, displayId as new_id FROM campaigns WHERE id != displayId;

-- 更新 flows 表的 campaignId
UPDATE flows SET campaignId = (SELECT new_id FROM campaign_id_map WHERE old_id = flows.campaignId)
WHERE campaignId IN (SELECT old_id FROM campaign_id_map);

-- 2. 更新 flows 表的 id 为 displayId
UPDATE flows SET id = displayId WHERE id != displayId;

-- 3. 更新 campaigns 表的 id 为 displayId
UPDATE campaigns SET id = displayId WHERE id != displayId;

-- 4. 更新其他可能使用 campaignId 的表
-- offers 表
UPDATE offers SET id = displayId WHERE id != displayId;

-- landingPages 表
UPDATE landingPages SET id = displayId WHERE id != displayId;

-- trafficSources 表
UPDATE trafficSources SET id = displayId WHERE id != displayId;

-- affiliateNetworks 表
UPDATE affiliateNetworks SET id = displayId WHERE id != displayId;

-- rules 表
UPDATE rules SET id = displayId WHERE id != displayId;

-- 5. 清理临时表
DROP TABLE IF EXISTS campaign_id_map;

-- 验证结果
SELECT 'Campaigns:' as table_name;
SELECT id, displayId, name FROM campaigns LIMIT 5;

SELECT 'Flows:' as table_name;
SELECT id, displayId, campaignId, name FROM flows LIMIT 5;
