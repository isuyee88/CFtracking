-- Migration: Add Flow Filters
-- Description: Add filters column to flows table to support flow-level filtering

-- Add filters column to flows table
ALTER TABLE flows ADD COLUMN filters TEXT DEFAULT '[]';

-- Add action_type column for flow actions
ALTER TABLE flows ADD COLUMN action_type TEXT DEFAULT 'redirect';

-- Add action_config column for action configuration
ALTER TABLE flows ADD COLUMN action_config TEXT DEFAULT '{}';

-- Note: SQLite D1 has some limitations on ALTER TABLE
-- If the above ALTER TABLE statements fail, the flows table already exists
-- and we may need to recreate it. For production, ensure these columns exist.
