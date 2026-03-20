-- Migration: Add apiConfig column to trafficSources table
-- Created: 2026-03-20

-- Add apiConfig column for storing API integration configuration
ALTER TABLE trafficSources ADD COLUMN apiConfig TEXT;
