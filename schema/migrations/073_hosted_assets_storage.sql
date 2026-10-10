-- Migration: 073_hosted_assets_storage.sql
-- Purpose: formalize Hosted Asset metadata for R2-backed content.
-- Existing pre-R2 tables are upgraded defensively by HostedAssetService at runtime.

CREATE TABLE IF NOT EXISTS hostedAssets (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL,
  mode TEXT NOT NULL,
  name TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  byteSize INTEGER NOT NULL,
  contentBase64 TEXT NOT NULL DEFAULT '',
  storageBackend TEXT NOT NULL DEFAULT 'd1',
  r2Key TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hosted_assets_entity_mode
  ON hostedAssets(entityType, mode);
