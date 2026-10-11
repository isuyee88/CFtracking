-- Persist source identity and normalized Impact terms for idempotent offer sync.
ALTER TABLE offers ADD COLUMN externalId TEXT;
ALTER TABLE offers ADD COLUMN countries TEXT;
ALTER TABLE offers ADD COLUMN metadata TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_external_id ON offers(externalId) WHERE externalId IS NOT NULL;