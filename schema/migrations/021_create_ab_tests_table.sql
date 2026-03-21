-- Migration: Create AB Tests table
-- Created: 2026-03-20

-- A/B Tests table
CREATE TABLE IF NOT EXISTS abTests (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  trafficAllocation TEXT DEFAULT 'equal',
  variants TEXT NOT NULL,
  winnerCriteria TEXT DEFAULT 'conversion_rate',
  minSampleSize INTEGER,
  minConfidence INTEGER,
  autoSelectWinner INTEGER DEFAULT 0,
  startDate TEXT,
  endDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  createdBy TEXT,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign ON abTests(campaignId);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON abTests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON abTests(type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_at ON abTests(createdAt);
