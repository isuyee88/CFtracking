-- Migration: Migrate UUID to Short ID Format
-- Description: Convert existing UUID-based IDs to short ID format (c1, c2, o1, etc.)
-- Created: 2026-03-23
-- 
-- This migration:
-- 1. Creates a temporary mapping table for UUID to short ID
-- 2. Updates all entity tables to use short IDs
-- 3. Updates foreign key references
-- 4. Drops the temporary mapping table

-- Step 1: Create temporary mapping table
CREATE TEMPORARY TABLE IF NOT EXISTS id_migration_map (
    uuid TEXT PRIMARY KEY,
    short_id TEXT NOT NULL,
    table_name TEXT NOT NULL
);

-- Step 2: Populate mapping for campaigns
-- Assign sequential numbers based on createdAt order
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'c' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'campaigns'
FROM campaigns
WHERE id NOT LIKE 'c%' OR id GLOB '*-*';

-- Step 3: Update campaigns table
UPDATE campaigns 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = campaigns.id AND table_name = 'campaigns'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = campaigns.id AND table_name = 'campaigns'
);

-- Step 4: Update flows.campaignId foreign key
UPDATE flows
SET campaignId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flows.campaignId AND table_name = 'campaigns'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flows.campaignId AND table_name = 'campaigns'
);

-- Step 5: Update flows.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'f' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'flows'
FROM flows
WHERE id NOT LIKE 'f%' OR id GLOB '*-*';

UPDATE flows 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flows.id AND table_name = 'flows'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flows.id AND table_name = 'flows'
);

-- Step 6: Update offers.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'o' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'offers'
FROM offers
WHERE id NOT LIKE 'o%' OR id GLOB '*-*';

UPDATE offers 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = offers.id AND table_name = 'offers'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = offers.id AND table_name = 'offers'
);

-- Step 7: Update landingPages.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'lp' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'landingPages'
FROM landingPages
WHERE id NOT LIKE 'lp%' OR id GLOB '*-*';

UPDATE landingPages 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = landingPages.id AND table_name = 'landingPages'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = landingPages.id AND table_name = 'landingPages'
);

-- Step 8: Update trafficSources.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'ts' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'trafficSources'
FROM trafficSources
WHERE id NOT LIKE 'ts%' OR id GLOB '*-*';

UPDATE trafficSources 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = trafficSources.id AND table_name = 'trafficSources'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = trafficSources.id AND table_name = 'trafficSources'
);

-- Step 9: Update affiliateNetworks.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'an' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'affiliateNetworks'
FROM affiliateNetworks
WHERE id NOT LIKE 'an%' OR id GLOB '*-*';

UPDATE affiliateNetworks 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = affiliateNetworks.id AND table_name = 'affiliateNetworks'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = affiliateNetworks.id AND table_name = 'affiliateNetworks'
);

-- Step 10: Update rules.id
INSERT OR IGNORE INTO id_migration_map (uuid, short_id, table_name)
SELECT 
    id,
    'r' || ROW_NUMBER() OVER (ORDER BY createdAt ASC),
    'rules'
FROM rules
WHERE id NOT LIKE 'r%' OR id GLOB '*-*';

UPDATE rules 
SET id = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = rules.id AND table_name = 'rules'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = rules.id AND table_name = 'rules'
);

-- Step 11: Update flowOffers.offerId foreign key
UPDATE flowOffers
SET offerId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flowOffers.offerId AND table_name = 'offers'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flowOffers.offerId AND table_name = 'offers'
);

-- Step 12: Update flowOffers.flowId foreign key
UPDATE flowOffers
SET flowId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flowOffers.flowId AND table_name = 'flows'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flowOffers.flowId AND table_name = 'flows'
);

-- Step 13: Update flowLandingPages.landingPageId foreign key
UPDATE flowLandingPages
SET landingPageId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flowLandingPages.landingPageId AND table_name = 'landingPages'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flowLandingPages.landingPageId AND table_name = 'landingPages'
);

-- Step 14: Update flowLandingPages.flowId foreign key
UPDATE flowLandingPages
SET flowId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = flowLandingPages.flowId AND table_name = 'flows'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = flowLandingPages.flowId AND table_name = 'flows'
);

-- Step 15: Update trafficSummary.campaignId foreign key
UPDATE trafficSummary
SET campaignId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = trafficSummary.campaignId AND table_name = 'campaigns'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = trafficSummary.campaignId AND table_name = 'campaigns'
);

-- Step 16: Update ruleExecutions.ruleId foreign key
UPDATE ruleExecutions
SET ruleId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = ruleExecutions.ruleId AND table_name = 'rules'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = ruleExecutions.ruleId AND table_name = 'rules'
);

-- Step 17: Update ruleExecutions.campaignId foreign key
UPDATE ruleExecutions
SET campaignId = (
    SELECT short_id 
    FROM id_migration_map 
    WHERE uuid = ruleExecutions.campaignId AND table_name = 'campaigns'
)
WHERE EXISTS (
    SELECT 1 FROM id_migration_map 
    WHERE uuid = ruleExecutions.campaignId AND table_name = 'campaigns'
);

-- Step 18: Update displayId to match id for all tables
UPDATE campaigns SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE flows SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE offers SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE landingPages SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE trafficSources SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE affiliateNetworks SET displayId = id WHERE displayId IS NULL OR displayId != id;
UPDATE rules SET displayId = id WHERE displayId IS NULL OR displayId != id;

-- Step 19: Drop temporary table
DROP TABLE IF EXISTS id_migration_map;

-- Note: This migration does not handle blacklist/whitelist tables
-- as they use UUID for internal tracking and don't need user-friendly IDs
