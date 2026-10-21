-- Cover offer status counts and status-filtered admin lists without a table scan.
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
