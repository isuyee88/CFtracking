-- Migration: Add displayId fields to all entity tables
-- Created: 2026-03-20
-- Purpose: Add human-readable display IDs with prefixes
-- Note: SQLite doesn't allow adding UNIQUE columns directly, so we add without constraint first

-- Add displayId to campaigns (without UNIQUE first)
ALTER TABLE campaigns ADD COLUMN displayId TEXT;

-- Add displayId to flows
ALTER TABLE flows ADD COLUMN displayId TEXT;

-- Add displayId to landingPages
ALTER TABLE landingPages ADD COLUMN displayId TEXT;

-- Add displayId to offers
ALTER TABLE offers ADD COLUMN displayId TEXT;

-- Add displayId to trafficSources
ALTER TABLE trafficSources ADD COLUMN displayId TEXT;

-- Add displayId to affiliateNetworks
ALTER TABLE affiliateNetworks ADD COLUMN displayId TEXT;

-- Add displayId to rules
ALTER TABLE rules ADD COLUMN displayId TEXT;

-- Create indexes for displayId lookups (these will help with uniqueness checks in code)
CREATE INDEX IF NOT EXISTS idx_campaigns_display_id ON campaigns(displayId);
CREATE INDEX IF NOT EXISTS idx_flows_display_id ON flows(displayId);
CREATE INDEX IF NOT EXISTS idx_landing_pages_display_id ON landingPages(displayId);
CREATE INDEX IF NOT EXISTS idx_offers_display_id ON offers(displayId);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_display_id ON trafficSources(displayId);
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_display_id ON affiliateNetworks(displayId);
CREATE INDEX IF NOT EXISTS idx_rules_display_id ON rules(displayId);
