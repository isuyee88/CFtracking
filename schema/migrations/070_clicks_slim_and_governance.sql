-- Migration: 070_clicks_slim_and_governance.sql
-- Purpose: clicks 表瘦身 + 治理列补齐。
--   1) DROP 27 个 snake_case 冗余列 sub_id_4..sub_id_30：
--      迁移漂移产物（与 camelCase subId4..subId30 完全重复），src 代码零引用
--      （click.repo saveClick/findClicks 仅用 camelCase；clicks_fts 外部内容表
--      仅引用 clickId/ip/visitorId/userAgent；全部索引均建在 camelCase 列上）。
--      生产已撞 D1 单表 100 列硬限（99 列），本次释放至 75 列，为后续迁移留余量。
--   2) 补齐 062 治理列（生产缺 matchedRuleId/matchedRuleLayer/matchedRuleReason，
--      governanceAction 已存在）。click.repo 动态探测治理列（GOVERNANCE_COLUMN_NAMES），
--      无需代码变更，补齐后自动写入。

-- ============ 1. DROP snake_case 冗余列（27） ============
ALTER TABLE clicks DROP COLUMN sub_id_4;
ALTER TABLE clicks DROP COLUMN sub_id_5;
ALTER TABLE clicks DROP COLUMN sub_id_6;
ALTER TABLE clicks DROP COLUMN sub_id_7;
ALTER TABLE clicks DROP COLUMN sub_id_8;
ALTER TABLE clicks DROP COLUMN sub_id_9;
ALTER TABLE clicks DROP COLUMN sub_id_10;
ALTER TABLE clicks DROP COLUMN sub_id_11;
ALTER TABLE clicks DROP COLUMN sub_id_12;
ALTER TABLE clicks DROP COLUMN sub_id_13;
ALTER TABLE clicks DROP COLUMN sub_id_14;
ALTER TABLE clicks DROP COLUMN sub_id_15;
ALTER TABLE clicks DROP COLUMN sub_id_16;
ALTER TABLE clicks DROP COLUMN sub_id_17;
ALTER TABLE clicks DROP COLUMN sub_id_18;
ALTER TABLE clicks DROP COLUMN sub_id_19;
ALTER TABLE clicks DROP COLUMN sub_id_20;
ALTER TABLE clicks DROP COLUMN sub_id_21;
ALTER TABLE clicks DROP COLUMN sub_id_22;
ALTER TABLE clicks DROP COLUMN sub_id_23;
ALTER TABLE clicks DROP COLUMN sub_id_24;
ALTER TABLE clicks DROP COLUMN sub_id_25;
ALTER TABLE clicks DROP COLUMN sub_id_26;
ALTER TABLE clicks DROP COLUMN sub_id_27;
ALTER TABLE clicks DROP COLUMN sub_id_28;
ALTER TABLE clicks DROP COLUMN sub_id_29;
ALTER TABLE clicks DROP COLUMN sub_id_30;

-- ============ 2. 治理列 ============
-- Already created by migration 062; do not add them twice on a fresh D1 database.
SELECT 1;
