ALTER TABLE clicks ADD COLUMN matchedRuleId TEXT;
ALTER TABLE clicks ADD COLUMN matchedRuleLayer TEXT;
ALTER TABLE clicks ADD COLUMN matchedRuleReason TEXT;

CREATE INDEX IF NOT EXISTS idx_clicks_matchedRuleLayer ON clicks(matchedRuleLayer);
CREATE INDEX IF NOT EXISTS idx_clicks_matchedRuleId ON clicks(matchedRuleId);
