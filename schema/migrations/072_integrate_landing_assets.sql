-- Migration: 072_integrate_landing_assets.sql
-- Purpose: bind managed hosted assets and workers-landing manifests to landing pages.
-- Existing remote URL landings remain valid: all new columns are nullable/defaulted.

ALTER TABLE landingPages ADD COLUMN hostingMode TEXT NOT NULL DEFAULT 'remote';
ALTER TABLE landingPages ADD COLUMN assetId TEXT;
ALTER TABLE landingPages ADD COLUMN manifestJson TEXT;
ALTER TABLE landingPages ADD COLUMN notes TEXT;
ALTER TABLE landingPages ADD COLUMN sourceSlug TEXT;

CREATE INDEX IF NOT EXISTS idx_landing_pages_asset_id ON landingPages(assetId);
CREATE INDEX IF NOT EXISTS idx_landing_pages_hosting_mode ON landingPages(hostingMode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_pages_source_slug ON landingPages(sourceSlug) WHERE sourceSlug IS NOT NULL;
