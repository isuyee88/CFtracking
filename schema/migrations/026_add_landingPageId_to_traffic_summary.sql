-- Migration: Add landingPageId to trafficSummary table
-- Date: 2026-03-22
-- Reason: landingPage.repo.ts getStats() 查询需要 landingPageId 列

-- Add landingPageId column to trafficSummary table
ALTER TABLE trafficSummary ADD COLUMN landingPageId TEXT;

-- Create index for landingPageId queries
CREATE INDEX IF NOT EXISTS idx_traffic_summary_landing_page ON trafficSummary(landingPageId);

-- Create composite index for campaign + landing page + date queries
CREATE INDEX IF NOT EXISTS idx_traffic_summary_campaign_landing ON trafficSummary(campaignId, landingPageId, date);
