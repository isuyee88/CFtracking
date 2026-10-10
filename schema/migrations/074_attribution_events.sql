-- Migration: 074_attribution_events.sql
-- Purpose: immutable, status-aware conversion events keyed by network transaction.
-- Raw payloads are intentionally excluded; rawHash is for dedupe/audit only.

CREATE TABLE IF NOT EXISTS attribution_events (
  id TEXT PRIMARY KEY,
  sourcePlatform TEXT NOT NULL,
  transactionId TEXT NOT NULL,
  clickId TEXT,
  conversionId TEXT,
  eventStatus TEXT NOT NULL CHECK(eventStatus IN ('pending', 'approved', 'rejected', 'reversed')),
  payout REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  occurredAt TEXT NOT NULL,
  receivedAt TEXT NOT NULL,
  rawHash TEXT NOT NULL,
  requestId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sourcePlatform, transactionId, eventStatus)
);

CREATE INDEX IF NOT EXISTS idx_attribution_events_identity
  ON attribution_events(sourcePlatform, transactionId, receivedAt DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_events_conversion
  ON attribution_events(conversionId, receivedAt DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_events_status
  ON attribution_events(eventStatus, receivedAt DESC);
