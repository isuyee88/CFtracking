-- Migration: 065_create_ai_optimization_decisions.sql
-- Purpose: Persist AI optimization decisions independently from executable auto_operations

CREATE TABLE IF NOT EXISTS ai_optimization_decisions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  display_id INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,

  campaign_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('campaign', 'zone', 'publisher')),
  scope_id TEXT NOT NULL,
  platform TEXT NOT NULL,

  action_type TEXT NOT NULL CHECK(action_type IN ('ADJUST_BID', 'BLOCK_ZONE', 'BLOCK_PUBLISHER', 'OBSERVE', 'NO_ACTION')),
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '[]',
  expected_impact TEXT NOT NULL DEFAULT '{}',
  rollback_hint TEXT,
  metrics_snapshot TEXT NOT NULL DEFAULT '{}',

  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK(trigger_type IN ('manual', 'auto', 'scheduled')),

  status TEXT NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested', 'blocked_by_safety', 'unsupported', 'executed', 'execution_failed', 'observe', 'no_action')),
  execution_status TEXT NOT NULL DEFAULT 'pending' CHECK(execution_status IN ('pending', 'executed', 'failed', 'skipped')),
  rollback_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK(rollback_status IN ('not_applicable', 'available', 'rollback_success', 'rollback_failed')),

  operation_id TEXT,
  rollback_operation_id TEXT,
  provider TEXT,
  gateway_id TEXT,
  fallback_used INTEGER NOT NULL DEFAULT 0,
  fallback_reason TEXT,
  model TEXT,
  raw_response TEXT,
  execution_error TEXT,
  executed_at TEXT,
  rollbacked_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (operation_id) REFERENCES auto_operations(id) ON DELETE SET NULL,
  FOREIGN KEY (rollback_operation_id) REFERENCES auto_operations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_opt_decisions_campaign ON ai_optimization_decisions(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_opt_decisions_scope ON ai_optimization_decisions(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_ai_opt_decisions_status ON ai_optimization_decisions(status, execution_status, rollback_status);
CREATE INDEX IF NOT EXISTS idx_ai_opt_decisions_created ON ai_optimization_decisions(created_at DESC);
