-- Migration: Add action configuration to flows
-- Created: 2026-03-21
-- Purpose: Add actionType and actionConfig fields for flow actions

-- Add actionType column
-- Values: 'redirect', 'show_offer', 'show_landing', 'traffic_loss'
ALTER TABLE flows ADD COLUMN actionType TEXT DEFAULT 'redirect';

-- Add actionConfig column (JSON)
ALTER TABLE flows ADD COLUMN actionConfig TEXT DEFAULT '{}';

-- Create index for action type queries
CREATE INDEX IF NOT EXISTS idx_flows_action_type ON flows(actionType);
