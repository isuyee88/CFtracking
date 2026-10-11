#!/bin/bash
# 开发环境一键启动脚本

echo "🚀 Starting cf-tracking development environment..."

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

# 检查 .dev.vars
if [ ! -f .dev.vars ]; then
    echo "⚠️ .dev.vars not found. Creating template..."
    cat > .dev.vars << 'EOF'
SIMULATION_MODE=true
PROPELLERADS_API_KEY=test-key
PARTNERBOOST_API_TOKEN=test-token
EOF
    echo "✅ Created .dev.vars template. Please update with real test keys."
fi

# 初始化本地数据库
echo "📦 Initializing local database..."
wrangler d1 migrations apply cf-tracking-db --local > /dev/null 2>&1

# 插入测试数据
if [ -f test/fixtures/seed.sql ]; then
    echo "🌱 Seeding test data..."
    wrangler d1 execute cf-tracking-db --local --file=test/fixtures/seed.sql > /dev/null 2>&1
fi

# 启动开发服务器
echo "✅ Starting dev server at http://localhost:8787"
wrangler dev
