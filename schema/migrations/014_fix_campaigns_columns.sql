-- Migration: Fix missing columns in campaigns table
-- Created: 2026-03-20

-- Add apiToken column to campaigns
ALTER TABLE campaigns ADD COLUMN apiToken TEXT UNIQUE;
