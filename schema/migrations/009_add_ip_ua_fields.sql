-- Migration: Add IP/UA specific fields to blacklist and whitelist tables
-- Description: Add match mode fields and sync preference for IP and UA types

-- Add columns to blacklist table
ALTER TABLE blacklist ADD COLUMN ipMatchMode TEXT; -- 'exact' or 'cidr' for IP type
ALTER TABLE blacklist ADD COLUMN uaMatchMode TEXT; -- 'exact' or 'contains' for UA type
ALTER TABLE blacklist ADD COLUMN syncToPlatform INTEGER DEFAULT 1; -- Whether to sync to traffic platform

-- Add columns to whitelist table
ALTER TABLE whitelist ADD COLUMN ipMatchMode TEXT; -- 'exact' or 'cidr' for IP type
ALTER TABLE whitelist ADD COLUMN uaMatchMode TEXT; -- 'exact' or 'contains' for UA type
ALTER TABLE whitelist ADD COLUMN syncToPlatform INTEGER DEFAULT 1; -- Whether to sync to traffic platform

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_blacklist_ipMatchMode ON blacklist(ipMatchMode);
CREATE INDEX IF NOT EXISTS idx_blacklist_uaMatchMode ON blacklist(uaMatchMode);
CREATE INDEX IF NOT EXISTS idx_whitelist_ipMatchMode ON whitelist(ipMatchMode);
CREATE INDEX IF NOT EXISTS idx_whitelist_uaMatchMode ON whitelist(uaMatchMode);
