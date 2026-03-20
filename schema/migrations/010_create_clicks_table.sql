-- Migration: Create Clicks table for detailed click logging
-- Created: 2026-03-20

-- Clicks table - stores detailed click information
CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  clickId TEXT NOT NULL UNIQUE,
  campaignId TEXT NOT NULL,
  flowId TEXT,
  landingPageId TEXT,
  offerId TEXT,
  timestamp TEXT NOT NULL,
  ip TEXT NOT NULL,
  userAgent TEXT NOT NULL,
  referer TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  isp TEXT,
  connectionType TEXT,
  visitorId TEXT NOT NULL,
  subId1 TEXT,
  subId2 TEXT,
  subId3 TEXT,
  cost REAL DEFAULT 0,
  isUnique INTEGER DEFAULT 1,
  redirectUrl TEXT,
  createdAt TEXT NOT NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_clicks_campaignId ON clicks(campaignId);
CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp);
CREATE INDEX IF NOT EXISTS idx_clicks_visitorId ON clicks(visitorId);
CREATE INDEX IF NOT EXISTS idx_clicks_ip ON clicks(ip);
CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country);
CREATE INDEX IF NOT EXISTS idx_clicks_device ON clicks(device);
CREATE INDEX IF NOT EXISTS idx_clicks_browser ON clicks(browser);
CREATE INDEX IF NOT EXISTS idx_clicks_offerId ON clicks(offerId);
CREATE INDEX IF NOT EXISTS idx_clicks_flowId ON clicks(flowId);
CREATE INDEX IF NOT EXISTS idx_clicks_isUnique ON clicks(isUnique);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_timestamp ON clicks(campaignId, timestamp);
