-- Migration: Add missing fields to offers table
-- Created: 2026-03-20

ALTER TABLE offers ADD COLUMN payoutType TEXT DEFAULT 'fixed';
