-- Migration: Create affiliateNetworks table
-- Created: 2026-03-20

-- Affiliate Networks table
CREATE TABLE IF NOT EXISTS affiliateNetworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'api',
  status TEXT DEFAULT 'active',
  apiUrl TEXT,
  apiKey TEXT,
  postbackUrl TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_status ON affiliateNetworks(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_type ON affiliateNetworks(type);
