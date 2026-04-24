-- Migration: 061_expand_autorule_bindings_priority.sql
-- Description:
--   Expand autorule bindings from single-binding MVP to ordered multi-binding tables.

CREATE TABLE IF NOT EXISTS campaign_rule_binding_entries (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_rule_binding_entries_unique
  ON campaign_rule_binding_entries(campaignId, ruleId);

CREATE INDEX IF NOT EXISTS idx_campaign_rule_binding_entries_priority
  ON campaign_rule_binding_entries(campaignId, priority);

CREATE TABLE IF NOT EXISTS flow_rule_binding_entries (
  id TEXT PRIMARY KEY,
  flowId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_rule_binding_entries_unique
  ON flow_rule_binding_entries(flowId, ruleId);

CREATE INDEX IF NOT EXISTS idx_flow_rule_binding_entries_priority
  ON flow_rule_binding_entries(flowId, priority);

INSERT INTO campaign_rule_binding_entries (id, campaignId, ruleId, priority, enabled, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), campaignId, ruleId, 0, 1, createdAt, updatedAt
FROM campaign_rule_bindings
WHERE NOT EXISTS (
  SELECT 1
  FROM campaign_rule_binding_entries next
  WHERE next.campaignId = campaign_rule_bindings.campaignId
    AND next.ruleId = campaign_rule_bindings.ruleId
);

INSERT INTO flow_rule_binding_entries (id, flowId, ruleId, priority, enabled, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), flowId, ruleId, 0, 1, createdAt, updatedAt
FROM flow_rule_bindings
WHERE NOT EXISTS (
  SELECT 1
  FROM flow_rule_binding_entries next
  WHERE next.flowId = flow_rule_bindings.flowId
    AND next.ruleId = flow_rule_bindings.ruleId
);
