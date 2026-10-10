-- Delivery state is explicit: a failed attempt must never become sent.
-- The table was historically created lazily by the repository, so bootstrap the
-- legacy shape first and then add the delivery columns for both fresh and old DBs.
CREATE TABLE IF NOT EXISTS postback_idempotency (
  id TEXT PRIMARY KEY,
  conversion_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(conversion_id, platform)
);

ALTER TABLE postback_idempotency ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE postback_idempotency ADD COLUMN next_attempt_at TEXT;
ALTER TABLE postback_idempotency ADD COLUMN last_error TEXT;
ALTER TABLE postback_idempotency ADD COLUMN last_status_code INTEGER;
ALTER TABLE postback_idempotency ADD COLUMN request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pidempotency_conversion
  ON postback_idempotency(conversion_id);
CREATE INDEX IF NOT EXISTS idx_pidempotency_platform
  ON postback_idempotency(platform);
CREATE INDEX IF NOT EXISTS idx_postback_idempotency_retry
  ON postback_idempotency(status, next_attempt_at);
