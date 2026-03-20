-- Migration: Create trafficSources table
-- Created: 2026-03-20

-- Traffic Sources table
CREATE TABLE IF NOT EXISTS trafficSources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  status TEXT DEFAULT 'active',
  postbackUrl TEXT,
  costModel TEXT DEFAULT 'cpc',
  costValue REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  parameters TEXT DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traffic_sources_status ON trafficSources(status);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_type ON trafficSources(type);
