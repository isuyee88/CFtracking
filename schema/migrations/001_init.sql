-- CFTracking Database Schema
-- Version: 1.0.0
-- Created: 2026-03-15

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  "group" TEXT,
  trafficSource TEXT,
  flowRotation TEXT DEFAULT 'position',
  costModel TEXT DEFAULT 'cpc',
  trafficLoss REAL DEFAULT 0,
  uniquenessTTL INTEGER DEFAULT 86400,
  visitorBinding TEXT DEFAULT 'none',
  apiToken TEXT UNIQUE,
  parameters TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Flows table
CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'regular',
  weight INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Landing Pages table
CREATE TABLE IF NOT EXISTS landingPages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  payout REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Flow-LandingPage associations
CREATE TABLE IF NOT EXISTS flowLandingPages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowId TEXT NOT NULL,
  landingPageId TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

-- Flow-Offer associations
CREATE TABLE IF NOT EXISTS flowOffers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flowId TEXT NOT NULL,
  offerId TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (flowId) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (offerId) REFERENCES offers(id) ON DELETE CASCADE
);

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Rule execution logs
CREATE TABLE IF NOT EXISTS ruleExecutions (
  id TEXT PRIMARY KEY,
  ruleId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  executionResult TEXT NOT NULL,
  triggeredBy TEXT NOT NULL,
  FOREIGN KEY (ruleId) REFERENCES rules(id) ON DELETE CASCADE
);

-- Traffic summary table (aggregated data)
CREATE TABLE IF NOT EXISTS trafficSummary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaignId TEXT NOT NULL,
  date TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  country TEXT,
  device TEXT,
  browser TEXT,
  offerId TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Platform configurations
CREATE TABLE IF NOT EXISTS platformConfigs (
  id TEXT PRIMARY KEY,
  platformId TEXT NOT NULL UNIQUE,
  config TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Task queue (for rule execution)
CREATE TABLE IF NOT EXISTS taskQueue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  scheduledAt TEXT,
  executedAt TEXT,
  result TEXT,
  error TEXT,
  retryCount INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_alias ON campaigns(alias);
CREATE INDEX IF NOT EXISTS idx_flows_campaign ON flows(campaignId);
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
CREATE INDEX IF NOT EXISTS idx_flow_landing_pages_flow ON flowLandingPages(flowId);
CREATE INDEX IF NOT EXISTS idx_flow_offers_flow ON flowOffers(flowId);
CREATE INDEX IF NOT EXISTS idx_rules_status ON rules(status);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled);
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON ruleExecutions(ruleId);
CREATE INDEX IF NOT EXISTS idx_rule_executions_campaign ON ruleExecutions(campaignId);
CREATE INDEX IF NOT EXISTS idx_traffic_summary_campaign ON trafficSummary(campaignId);
CREATE INDEX IF NOT EXISTS idx_traffic_summary_date ON trafficSummary(date);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON taskQueue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_scheduled ON taskQueue(scheduledAt);
