-- Migration: Create A/B Tests tables
-- Created: 2026-03-20

-- A/B Tests table
CREATE TABLE IF NOT EXISTS abTests (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'landing',
  status TEXT DEFAULT 'draft',
  trafficAllocation TEXT DEFAULT 'equal',
  winnerCriteria TEXT DEFAULT 'conversion_rate',
  minSampleSize INTEGER DEFAULT 1000,
  minConfidence REAL DEFAULT 95,
  autoSelectWinner INTEGER DEFAULT 0,
  startDate TEXT,
  endDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  createdBy TEXT
);

-- A/B Test Variants table
CREATE TABLE IF NOT EXISTS abTestVariants (
  id TEXT PRIMARY KEY,
  testId TEXT NOT NULL,
  name TEXT NOT NULL,
  landingPageId TEXT,
  landingPageName TEXT,
  offerId TEXT,
  offerName TEXT,
  weight INTEGER DEFAULT 50,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  isWinner INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign ON abTests(campaignId);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON abTests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON abTestVariants(testId);
