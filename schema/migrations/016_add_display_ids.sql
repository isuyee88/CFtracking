-- Migration: Add displayId fields to all entity tables
-- Created: 2026-03-20
-- Updated: 2026-03-21 - Skip if columns already exist

-- Add display identifiers before indexing them. These columns are nullable so this
-- migration remains safe for existing rows; application writes populate them for
-- new records and backfill jobs can fill older rows later.
ALTER TABLE campaigns ADD COLUMN displayId TEXT;
ALTER TABLE flows ADD COLUMN displayId TEXT;
ALTER TABLE landingPages ADD COLUMN displayId TEXT;
ALTER TABLE offers ADD COLUMN displayId TEXT;
ALTER TABLE trafficSources ADD COLUMN displayId TEXT;
ALTER TABLE affiliateNetworks ADD COLUMN displayId TEXT;
ALTER TABLE rules ADD COLUMN displayId TEXT;

-- Create indexes for displayId lookups (these will help with uniqueness checks in code)
CREATE INDEX IF NOT EXISTS idx_campaigns_display_id ON campaigns(displayId);
CREATE INDEX IF NOT EXISTS idx_flows_display_id ON flows(displayId);
CREATE INDEX IF NOT EXISTS idx_landing_pages_display_id ON landingPages(displayId);
CREATE INDEX IF NOT EXISTS idx_offers_display_id ON offers(displayId);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_display_id ON trafficSources(displayId);
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_display_id ON affiliateNetworks(displayId);
CREATE INDEX IF NOT EXISTS idx_rules_display_id ON rules(displayId);
