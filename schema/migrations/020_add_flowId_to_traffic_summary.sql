-- Migration: Add flowId to trafficSummary table
-- Created: 2026-03-20
-- Updated: 2026-03-21 - Add column first, then index

-- Add flowId column to trafficSummary table
ALTER TABLE trafficSummary ADD COLUMN flowId TEXT;

-- Create a new index that includes flowId
CREATE INDEX IF NOT EXISTS idx_traffic_summary_campaign_date_flow ON trafficSummary(campaignId, date, flowId);
