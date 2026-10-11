-- ============================================
-- Phase 1 验证脚本
-- 验证 Landing Page 数据库扩展
-- ============================================

-- 1. 检查 landingPages 表结构
SELECT 'landingPages 表字段:' as check_item;
PRAGMA table_info(landingPages);

-- 2. 检查新增的表
SELECT '新增的表:' as check_item;
SELECT name FROM sqlite_master 
WHERE type='table' AND name LIKE 'landingPage%'
ORDER BY name;

-- 3. 检查索引
SELECT '新增的索引:' as check_item;
SELECT name FROM sqlite_master 
WHERE type='index' AND name LIKE '%landing%'
ORDER BY name;

-- 4. 测试插入一条 Landing Page
SELECT '测试数据插入:' as check_item;
INSERT OR IGNORE INTO landingPages (
  id, name, url, slug, status, template, is_public,
  seo_title, createdAt, updatedAt
) VALUES (
  'test-lp-001',
  'Test Landing Page',
  '/lp/test',
  'test',
  'active',
  'betting-comparison',
  1,
  'Test Landing Page Title',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

SELECT * FROM landingPages WHERE id = 'test-lp-001';

-- 5. 清理测试数据
DELETE FROM landingPages WHERE id = 'test-lp-001';
