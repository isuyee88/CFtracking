-- Migration: 060_add_list_condition_rules.sql
-- Description:
--   Add composable AND/OR condition rule fields for blacklist/whitelist entries.

ALTER TABLE blacklist ADD COLUMN conditionMode TEXT; -- 'all' | 'any'
ALTER TABLE blacklist ADD COLUMN conditionsJson TEXT; -- JSON array of ListCondition

ALTER TABLE whitelist ADD COLUMN conditionMode TEXT; -- 'all' | 'any'
ALTER TABLE whitelist ADD COLUMN conditionsJson TEXT; -- JSON array of ListCondition

CREATE INDEX IF NOT EXISTS idx_blacklist_conditionMode ON blacklist(conditionMode);
CREATE INDEX IF NOT EXISTS idx_whitelist_conditionMode ON whitelist(conditionMode);
