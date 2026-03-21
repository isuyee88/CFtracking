-- Migration: Add displayId fields to all entity tables
-- Created: 2026-03-20
-- Updated: 2026-03-21 - Skip if columns already exist

-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- These columns already exist from a previous migration, so this is now a no-op

-- Create indexes for displayId lookups (these will help with uniqueness checks in code)
CREATE INDEX IF NOT EXISTS idx_campaigns_display_id ON campaigns(displayId);
CREATE INDEX IF NOT EXISTS idx_flows_display_id ON flows(displayId);
CREATE INDEX IF NOT EXISTS idx_landing_pages_display_id ON landingPages(displayId);
CREATE INDEX IF NOT EXISTS idx_offers_display_id ON offers(displayId);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_display_id ON trafficSources(displayId);
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_display_id ON affiliateNetworks(displayId);
CREATE INDEX IF NOT EXISTS idx_rules_display_id ON rules(displayId);
