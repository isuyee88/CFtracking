-- Migration: 059_seed_general_traffic_source.sql
-- Description: Add built-in "General Traffic Source" for manual generic blacklist/whitelist entries.

INSERT OR IGNORE INTO trafficSources (
  id,
  name,
  type,
  status,
  postbackUrl,
  costModel,
  costValue,
  currency,
  parameters,
  createdAt,
  updatedAt
) VALUES (
  'general',
  'General Traffic Source',
  'other',
  'active',
  NULL,
  'cpc',
  0,
  'USD',
  '{}',
  datetime('now'),
  datetime('now')
);
