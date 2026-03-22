-- Migration: Add redirectType field to offers table
-- Created: 2026-03-23
-- Description: 添加 offers 表的 redirectType 字段，支持多种重定向方式

-- 添加 redirectType 字段
ALTER TABLE offers ADD COLUMN redirectType TEXT DEFAULT 'http';

-- 验证结果
SELECT 'Offers table redirectType column:' as info;
SELECT name, type, dflt_value FROM pragma_table_info('offers') WHERE name = 'redirectType';
