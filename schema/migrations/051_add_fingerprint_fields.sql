-- Migration: Add fingerprint fields to clicks table
-- Created: 2026-04-07
-- Description: Add TLS fingerprint and device fingerprint fields for improved device identification

-- Add server-side fingerprint fields (from Cloudflare)
ALTER TABLE clicks ADD COLUMN serverFingerprint TEXT;
ALTER TABLE clicks ADD COLUMN clientFingerprint TEXT;

-- Add TLS fingerprint fields
ALTER TABLE clicks ADD COLUMN ja3Hash TEXT;
ALTER TABLE clicks ADD COLUMN ja4 TEXT;
ALTER TABLE clicks ADD COLUMN tlsCipher TEXT;
ALTER TABLE clicks ADD COLUMN tlsVersion TEXT;

-- Add network identification fields
ALTER TABLE clicks ADD COLUMN asn INTEGER;
ALTER TABLE clicks ADD COLUMN asOrganization TEXT;

-- Add client-side fingerprint components
ALTER TABLE clicks ADD COLUMN screenResolution TEXT;
ALTER TABLE clicks ADD COLUMN hardwareConcurrency INTEGER;
ALTER TABLE clicks ADD COLUMN deviceMemory REAL;
ALTER TABLE clicks ADD COLUMN timezoneOffset INTEGER;
ALTER TABLE clicks ADD COLUMN browserLanguage TEXT;

-- Create indexes for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_clicks_serverFingerprint ON clicks(serverFingerprint);
CREATE INDEX IF NOT EXISTS idx_clicks_clientFingerprint ON clicks(clientFingerprint);
CREATE INDEX IF NOT EXISTS idx_clicks_ja3Hash ON clicks(ja3Hash);
CREATE INDEX IF NOT EXISTS idx_clicks_asn ON clicks(asn);
