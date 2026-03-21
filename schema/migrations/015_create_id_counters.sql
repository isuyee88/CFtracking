-- Migration: Create ID counters table
-- Created: 2026-03-20
-- Purpose: Support auto-increment display IDs with prefixes

-- ID Counters table for generating sequential IDs
CREATE TABLE IF NOT EXISTS idCounters (
  tableName TEXT PRIMARY KEY,
  currentNumber INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_id_counters_table ON idCounters(tableName);
