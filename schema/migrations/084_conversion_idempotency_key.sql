-- Conversion idempotency without deleting history.
--
-- Why a new column instead of a UNIQUE index on `clickId`:
--   production already contains duplicate rows for one click (a retried
--   postback inserted the same conversion two or three times). Those rows were
--   counted in reports and are the only record of what happened, so they must
--   stay. A UNIQUE index on `clickId` cannot be created while they exist, and a
--   backfill cannot make them unique without rewriting or deleting them.
--
-- Why this works on the existing rows:
--   SQLite treats NULLs as distinct in a UNIQUE index. Every historical row
--   keeps `idempotencyKey = NULL`, so they coexist; only rows written from now
--   on carry `idempotencyKey = clickId` and are protected.
--
-- Invariant: new inserts write `idempotencyKey = clickId` (an empty clickId is
-- written as NULL so keyless rows cannot collide with each other). The writer
-- uses `INSERT ... ON CONFLICT(idempotencyKey) DO NOTHING`, which targets only
-- this index, so other constraint errors still surface. At most one row per
-- click can be inserted; historical NULL-key rows are never matched by that
-- conflict target.
--
-- Additive only: runs as-is on the populated production table (no backfill, no
-- deletes, no rewrites). The ALTER is not re-runnable, so apply it once per
-- database.
ALTER TABLE conversions ADD COLUMN idempotencyKey TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_idempotencyKey ON conversions(idempotencyKey);
