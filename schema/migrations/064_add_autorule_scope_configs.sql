-- Migration: 064_add_autorule_scope_configs.sql
-- Purpose: Introduce layered autorule scope configuration for global / traffic source / campaign governance.

CREATE TABLE IF NOT EXISTS autorule_scope_configs (
  id TEXT PRIMARY KEY,
  scopeType TEXT NOT NULL CHECK(scopeType IN ('global', 'traffic_source', 'campaign')),
  scopeId TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'inherit' CHECK(mode IN ('inherit', 'off', 'rules', 'whitelist_gate')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_autorule_scope_configs_scope
  ON autorule_scope_configs(scopeType, scopeId);

CREATE INDEX IF NOT EXISTS idx_autorule_scope_configs_updated_at
  ON autorule_scope_configs(updatedAt DESC);

CREATE TABLE IF NOT EXISTS autorule_scope_bindings (
  id TEXT PRIMARY KEY,
  scopeConfigId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (scopeConfigId) REFERENCES autorule_scope_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_autorule_scope_bindings_scope
  ON autorule_scope_bindings(scopeConfigId, priority, updatedAt DESC);

CREATE INDEX IF NOT EXISTS idx_autorule_scope_bindings_rule
  ON autorule_scope_bindings(ruleId);

INSERT OR IGNORE INTO autorule_scope_configs (id, scopeType, scopeId, mode, enabled, createdAt, updatedAt)
SELECT
  'scope_campaign_' || campaignId,
  'campaign',
  campaignId,
  'rules',
  1,
  MIN(createdAt),
  MAX(updatedAt)
FROM campaign_rule_binding_entries
WHERE enabled = 1
GROUP BY campaignId;

INSERT OR IGNORE INTO autorule_scope_bindings (id, scopeConfigId, ruleId, priority, enabled, createdAt, updatedAt)
SELECT
  'binding_campaign_' || campaignId || '_' || ruleId || '_' || printf('%06d', priority),
  'scope_campaign_' || campaignId,
  ruleId,
  priority,
  enabled,
  createdAt,
  updatedAt
FROM campaign_rule_binding_entries
WHERE enabled = 1;
