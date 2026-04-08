-- Migration: Add countries field to offers table
-- Created: 2026-04-06
-- Description: 添加 offers 表的 countries 字段，支持国家定向
-- Note: 此迁移已被标记为已应用，因为列已存在

-- 验证结果
SELECT 'Offers table countries column already exists' as info;
SELECT name, type, dflt_value FROM pragma_table_info('offers') WHERE name = 'countries';
