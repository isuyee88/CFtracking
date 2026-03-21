-- Migration: Add security and risk assessment fields to clicks table
-- Created: 2026-03-21
-- Updated: 2026-03-21 - Skip isBot column (already exists)

-- Add risk assessment fields (isBot already exists from previous migration)
ALTER TABLE clicks ADD COLUMN riskScore REAL DEFAULT 0;
ALTER TABLE clicks ADD COLUMN isSuspicious INTEGER DEFAULT 0;
ALTER TABLE clicks ADD COLUMN riskReasons TEXT;

-- Add fingerprint field
ALTER TABLE clicks ADD COLUMN fingerprint TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_clicks_riskScore ON clicks(riskScore);
CREATE INDEX IF NOT EXISTS idx_clicks_isSuspicious ON clicks(isSuspicious);
CREATE INDEX IF NOT EXISTS idx_clicks_fingerprint ON clicks(fingerprint);
