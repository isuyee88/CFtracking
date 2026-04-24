-- Migration: 058_unify_autorules_binding_and_metrics.sql
-- Description:
--   1) Add Campaign / Flow autorule binding tables (single binding MVP)
--   2) Add click-level rule decision fields for report metrics
--   3) Add migration ledger for legacy traffic-filter compatibility window

CREATE TABLE IF NOT EXISTS campaign_rule_bindings (
  campaignId TEXT PRIMARY KEY,
  ruleId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_rule_bindings_rule ON campaign_rule_bindings(ruleId);

CREATE TABLE IF NOT EXISTS flow_rule_bindings (
  flowId TEXT PRIMARY KEY,
  ruleId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flow_rule_bindings_rule ON flow_rule_bindings(ruleId);

CREATE TABLE IF NOT EXISTS traffic_filter_migration_ledger (
  id TEXT PRIMARY KEY,
  legacyType TEXT NOT NULL,
  legacyKey TEXT NOT NULL,
  mappedType TEXT NOT NULL,
  mappedValue TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_traffic_filter_migration_legacy ON traffic_filter_migration_ledger(legacyType, legacyKey);

ALTER TABLE clicks ADD COLUMN ruleMatched INTEGER DEFAULT 0;
ALTER TABLE clicks ADD COLUMN ruleBlocked INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clicks_ruleMatched ON clicks(ruleMatched);
CREATE INDEX IF NOT EXISTS idx_clicks_ruleBlocked ON clicks(ruleBlocked);
