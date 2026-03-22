-- Migration: Add missing fields to offers table (payoutType, network, `group`)
-- Created: 2026-03-23
-- Description: 添加 offers 表缺失的字段

-- 添加 payoutType 字段
ALTER TABLE offers ADD COLUMN payoutType TEXT DEFAULT 'fixed';

-- 添加 network 字段
ALTER TABLE offers ADD COLUMN network TEXT DEFAULT '';

-- 添加 group 字段 (使用双引号避免与 SQLite 关键字冲突)
ALTER TABLE offers ADD COLUMN "group" TEXT DEFAULT '';

-- 验证结果
SELECT 'Offers table columns:' as info;
SELECT name, type FROM pragma_table_info('offers') WHERE name IN ('payoutType', 'network', 'group');
