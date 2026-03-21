-- Migration: Add flowId to trafficSummary table
-- Created: 2026-03-20

-- Add flowId column to trafficSummary table
ALTER TABLE trafficSummary ADD COLUMN flowId TEXT;

-- Update the UNIQUE constraint to include flowId
-- First, drop the existing index if it exists
DROP INDEX IF EXISTS idx_traffic_summary_campaign_date;

-- Create a new index that includes flowId
CREATE INDEX IF NOT EXISTS idx_traffic_summary_campaign_date_flow ON trafficSummary(campaignId, date, flowId);

-- Update the ON CONFLICT clause in upsert queries to include flowId
-- Note: This will be handled in the application code
