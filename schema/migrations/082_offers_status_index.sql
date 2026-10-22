-- Cover the offer COUNT(*) path without a table scan.
--
-- @see ../../src/handlers/d1/offer.repo.ts (count/findPage filter `status != 'deleted'`)
-- @see ops/scripts/data/d1-index-migrate.mjs (applies and verifies this index)
--
-- `offers(status)` lets `COUNT(*) ... WHERE status != 'deleted'` run as a
-- covering-index scan; the admin list still sorts by createdAt and is not
-- served by this index. IF NOT EXISTS keeps the migration re-runnable after a
-- window that failed part-way.
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
