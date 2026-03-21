-- Migration: Fix missing columns in campaigns table
-- Created: 2026-03-20
-- Updated: 2026-03-21 - Skip if column already exists

-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This migration is now empty because apiToken column already exists
-- The column was added in a previous migration

-- No changes needed
SELECT 1;
