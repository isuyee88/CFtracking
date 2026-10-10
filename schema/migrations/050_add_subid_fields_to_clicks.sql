-- Migration: Add additional Sub ID fields to clicks table
-- Created: 2026-04-07
-- Description: Extend subId support from 3 to 30 fields to match Keitaro standard

-- Add Sub ID fields 4-30
ALTER TABLE clicks ADD COLUMN subId4 TEXT;
ALTER TABLE clicks ADD COLUMN subId5 TEXT;
ALTER TABLE clicks ADD COLUMN subId6 TEXT;
ALTER TABLE clicks ADD COLUMN subId7 TEXT;
ALTER TABLE clicks ADD COLUMN subId8 TEXT;
ALTER TABLE clicks ADD COLUMN subId9 TEXT;
ALTER TABLE clicks ADD COLUMN subId10 TEXT;
ALTER TABLE clicks ADD COLUMN subId11 TEXT;
ALTER TABLE clicks ADD COLUMN subId12 TEXT;
ALTER TABLE clicks ADD COLUMN subId13 TEXT;
ALTER TABLE clicks ADD COLUMN subId14 TEXT;
ALTER TABLE clicks ADD COLUMN subId15 TEXT;
ALTER TABLE clicks ADD COLUMN subId16 TEXT;
ALTER TABLE clicks ADD COLUMN subId17 TEXT;
ALTER TABLE clicks ADD COLUMN subId18 TEXT;
ALTER TABLE clicks ADD COLUMN subId19 TEXT;
ALTER TABLE clicks ADD COLUMN subId20 TEXT;
ALTER TABLE clicks ADD COLUMN subId21 TEXT;
ALTER TABLE clicks ADD COLUMN subId22 TEXT;
ALTER TABLE clicks ADD COLUMN subId23 TEXT;
ALTER TABLE clicks ADD COLUMN subId24 TEXT;
ALTER TABLE clicks ADD COLUMN subId25 TEXT;
ALTER TABLE clicks ADD COLUMN subId26 TEXT;
ALTER TABLE clicks ADD COLUMN subId27 TEXT;
ALTER TABLE clicks ADD COLUMN subId28 TEXT;
ALTER TABLE clicks ADD COLUMN subId29 TEXT;
ALTER TABLE clicks ADD COLUMN subId30 TEXT;

-- Add UTM parameters for better tracking
ALTER TABLE clicks ADD COLUMN utmSource TEXT;
ALTER TABLE clicks ADD COLUMN utmMedium TEXT;
ALTER TABLE clicks ADD COLUMN utmCampaign TEXT;
ALTER TABLE clicks ADD COLUMN utmTerm TEXT;
ALTER TABLE clicks ADD COLUMN utmContent TEXT;

-- Add Cloudflare specific fields
ALTER TABLE clicks ADD COLUMN cfRayId TEXT;
ALTER TABLE clicks ADD COLUMN cfBotScore INTEGER;
ALTER TABLE clicks ADD COLUMN cfCountry TEXT;
ALTER TABLE clicks ADD COLUMN cfRegion TEXT;
ALTER TABLE clicks ADD COLUMN cfCity TEXT;
ALTER TABLE clicks ADD COLUMN cfASN INTEGER;
ALTER TABLE clicks ADD COLUMN cfASName TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_clicks_utmSource ON clicks(utmSource);
CREATE INDEX IF NOT EXISTS idx_clicks_utmCampaign ON clicks(utmCampaign);
CREATE INDEX IF NOT EXISTS idx_clicks_cfRayId ON clicks(cfRayId);
