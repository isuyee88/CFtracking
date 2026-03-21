-- Migration: Add uniqueness method to campaigns
-- Created: 2026-03-21
-- Purpose: Add uniquenessMethod field for deduplication configuration

-- Add uniquenessMethod column to campaigns
-- Values: 'ip', 'ip_ua', 'cookie', 'parameter', 'none'
ALTER TABLE campaigns ADD COLUMN uniquenessMethod TEXT DEFAULT 'none';

-- Add uniquenessParameter column for parameter-based deduplication
ALTER TABLE campaigns ADD COLUMN uniquenessParameter TEXT;

-- Add costValue column for cost tracking
ALTER TABLE campaigns ADD COLUMN costValue REAL DEFAULT 0;

-- Add currency column
ALTER TABLE campaigns ADD COLUMN currency TEXT DEFAULT 'USD';

-- Create index for uniqueness queries
CREATE INDEX IF NOT EXISTS idx_campaigns_uniqueness ON campaigns(uniquenessMethod);
