-- Migration: 031_add_affiliate_network_fields
-- Created: 2026-03-23
-- Description: Add apiSecret, offerParameters and templateId fields to affiliateNetworks table

-- Add new columns to affiliateNetworks table
ALTER TABLE affiliateNetworks ADD COLUMN apiSecret TEXT;
ALTER TABLE affiliateNetworks ADD COLUMN offerParameters TEXT;
ALTER TABLE affiliateNetworks ADD COLUMN templateId TEXT;
