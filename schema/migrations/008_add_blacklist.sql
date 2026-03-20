-- Migration: Add blacklist/whitelist tables and apiConfig to trafficSources
-- Description: Create blacklist and whitelist tables for traffic source zone management

-- Add apiConfig column to trafficSources
ALTER TABLE trafficSources ADD COLUMN apiConfig TEXT;

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
    id TEXT PRIMARY KEY,
    trafficSourceId TEXT NOT NULL,
    type TEXT NOT NULL, -- zone, creative, publisher, sub_id, geo, device
    value TEXT NOT NULL, -- the actual ID to block
    name TEXT, -- optional name/description
    reason TEXT, -- why it was blacklisted
    status TEXT NOT NULL DEFAULT 'active', -- active, removed
    synced INTEGER NOT NULL DEFAULT 0, -- whether synced to traffic source
    syncedAt TEXT,
    campaignId TEXT, -- optional: specific campaign
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (trafficSourceId) REFERENCES trafficSources(id) ON DELETE CASCADE
);

-- Create indexes for blacklist
CREATE INDEX IF NOT EXISTS idx_blacklist_trafficSourceId ON blacklist(trafficSourceId);
CREATE INDEX IF NOT EXISTS idx_blacklist_type ON blacklist(type);
CREATE INDEX IF NOT EXISTS idx_blacklist_status ON blacklist(status);
CREATE INDEX IF NOT EXISTS idx_blacklist_synced ON blacklist(synced);
CREATE INDEX IF NOT EXISTS idx_blacklist_campaignId ON blacklist(campaignId);
CREATE INDEX IF NOT EXISTS idx_blacklist_value ON blacklist(trafficSourceId, type, value);

-- Create whitelist table
CREATE TABLE IF NOT EXISTS whitelist (
    id TEXT PRIMARY KEY,
    trafficSourceId TEXT NOT NULL,
    type TEXT NOT NULL, -- zone, creative, publisher, sub_id, geo, device
    value TEXT NOT NULL, -- the actual ID to whitelist
    name TEXT, -- optional name/description
    reason TEXT, -- why it was whitelisted
    status TEXT NOT NULL DEFAULT 'active', -- active, removed
    synced INTEGER NOT NULL DEFAULT 0, -- whether synced to traffic source
    syncedAt TEXT,
    campaignId TEXT, -- optional: specific campaign
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (trafficSourceId) REFERENCES trafficSources(id) ON DELETE CASCADE
);

-- Create indexes for whitelist
CREATE INDEX IF NOT EXISTS idx_whitelist_trafficSourceId ON whitelist(trafficSourceId);
CREATE INDEX IF NOT EXISTS idx_whitelist_type ON whitelist(type);
CREATE INDEX IF NOT EXISTS idx_whitelist_status ON whitelist(status);
CREATE INDEX IF NOT EXISTS idx_whitelist_synced ON whitelist(synced);
CREATE INDEX IF NOT EXISTS idx_whitelist_campaignId ON whitelist(campaignId);
CREATE INDEX IF NOT EXISTS idx_whitelist_value ON whitelist(trafficSourceId, type, value);
