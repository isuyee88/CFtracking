-- Migration: 032_create_domains
-- Purpose: add domains module support

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  displayId TEXT UNIQUE,
  hostname TEXT NOT NULL UNIQUE,
  usage TEXT NOT NULL DEFAULT 'tracking',
  status TEXT NOT NULL DEFAULT 'pending',
  sslStatus TEXT NOT NULL DEFAULT 'pending',
  dnsProvider TEXT NOT NULL DEFAULT 'cloudflare',
  registrar TEXT,
  cloudflareZoneId TEXT,
  cloudflareProxyEnabled INTEGER NOT NULL DEFAULT 0,
  defaultCampaignId TEXT,
  defaultLandingPageId TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (defaultCampaignId) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (defaultLandingPageId) REFERENCES landingPages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_display_id ON domains(displayId);
CREATE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_usage ON domains(usage);
