-- Migration: Add isBot field to clicks table
-- Created: 2026-03-20

-- Add isBot column for bot detection
ALTER TABLE clicks ADD COLUMN isBot INTEGER DEFAULT 0;

-- Create index for bot queries
CREATE INDEX IF NOT EXISTS idx_clicks_isBot ON clicks(isBot);
