#!/bin/bash
# 重置本地数据库脚本

echo "🗑️ Resetting local database..."

# 删除本地数据库文件
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
echo "✅ Deleted local database"

# 重新应用迁移
echo "📦 Applying migrations..."
wrangler d1 migrations apply cf-tracking-db --local

# 插入测试数据
if [ -f test/fixtures/seed.sql ]; then
    echo "🌱 Seeding test data..."
    wrangler d1 execute cf-tracking-db --local --file=test/fixtures/seed.sql
fi

# 验证
echo "🔍 Verifying database..."
wrangler d1 execute cf-tracking-db --local \
  --command "SELECT name FROM sqlite_master WHERE type='table'"

echo "✅ Database reset complete"
