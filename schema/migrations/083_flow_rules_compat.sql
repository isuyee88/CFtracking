-- Compatibility table for flow rules.
--
-- Production bundles create `flowRules` lazily with `condition`/`action`/`status`,
-- while migration 045 created the unused `flow_rules` shape. The repository and
-- the deployed click/config path read `flowRules`, so a fresh database built only
-- from migrations returns 500 on every rule endpoint. Keep the production shape
-- in migrations as the compatibility source of truth; `flow_rules` stays for
-- historical data and is not read by the application.
CREATE TABLE IF NOT EXISTS flowRules (
  id TEXT PRIMARY KEY,
  flowId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flowRules_flowId ON flowRules(flowId);
CREATE INDEX IF NOT EXISTS idx_flowRules_status ON flowRules(status);
