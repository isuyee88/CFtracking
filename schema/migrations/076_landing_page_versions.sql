-- Migration: 076_landing_page_versions.sql
-- Purpose: immutable-ish Landing Page revisions with explicit release lifecycle.

CREATE TABLE IF NOT EXISTS landingPageVersions (
  id TEXT PRIMARY KEY,
  landingPageId TEXT NOT NULL,
  versionNumber INTEGER NOT NULL,
  assetId TEXT,
  manifestSnapshotJson TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'preview', 'published', 'paused', 'archived')),
  publishedAt TEXT,
  publishedBy TEXT,
  rollbackFromVersion INTEGER,
  contentHash TEXT,
  etag TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (landingPageId, versionNumber),
  FOREIGN KEY (landingPageId) REFERENCES landingPages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_landing_page_versions_landing_status
  ON landingPageVersions(landingPageId, status);

CREATE INDEX IF NOT EXISTS idx_landing_page_versions_content_hash
  ON landingPageVersions(contentHash);
