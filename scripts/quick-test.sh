#!/bin/bash
# 快速测试脚本

BASE_URL="${BASE_URL:-http://localhost:8787}"

echo "🧪 Running quick tests against $BASE_URL"

# 健康检查
echo -n "1️⃣ Health check... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ "$STATUS" -eq 200 ]; then
    echo "✅ ($STATUS)"
else
    echo "❌ ($STATUS)"
    exit 1
fi

# 测试 API 端点
echo -n "2️⃣ API endpoint... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/campaigns)
if [ "$STATUS" -eq 200 ]; then
    echo "✅ ($STATUS)"
else
    echo "❌ ($STATUS)"
fi

# 测试追踪 URL
echo -n "3️⃣ Tracking URL... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/click/test?external_id=abc")
if [ "$STATUS" -eq 302 ] || [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 404 ]; then
    echo "✅ ($STATUS)"
else
    echo "❌ ($STATUS)"
fi

echo "✅ Quick tests completed"
