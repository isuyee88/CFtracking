-- Migration: Create Conversions table for detailed conversion logging
-- Created: 2026-03-20

-- Conversions table - stores detailed conversion information
CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY,
  conversionId TEXT NOT NULL UNIQUE,
  clickId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  offerId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  revenue REAL DEFAULT 0,
  payout REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  conversionType TEXT DEFAULT 'lead',
  offerName TEXT,
  status TEXT DEFAULT 'approved',
  ip TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  source TEXT,
  subId1 TEXT,
  subId2 TEXT,
  subId3 TEXT,
  createdAt TEXT NOT NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversions_clickId ON conversions(clickId);
CREATE INDEX IF NOT EXISTS idx_conversions_campaignId ON conversions(campaignId);
CREATE INDEX IF NOT EXISTS idx_conversions_offerId ON conversions(offerId);
CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_country ON conversions(country);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign_timestamp ON conversions(campaignId, timestamp);
