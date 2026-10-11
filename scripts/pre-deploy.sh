#!/bin/bash
# 部署前检查脚本

echo "🔍 Pre-deployment checks..."

ERRORS=0

# TypeScript 类型检查
echo -n "1️⃣ Type checking... "
if npm run typecheck > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    npm run typecheck
    ERRORS=$((ERRORS + 1))
fi

# 构建
echo -n "2️⃣ Building... "
if npm run build > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    npm run build
    ERRORS=$((ERRORS + 1))
fi

# Dry-run 部署
echo -n "3️⃣ Dry-run deployment... "
if wrangler deploy --dry-run > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    wrangler deploy --dry-run
    ERRORS=$((ERRORS + 1))
fi

# 总结
if [ $ERRORS -eq 0 ]; then
    echo ""
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Deploy with:"
    echo "  wrangler deploy              # Production"
    echo "  wrangler deploy --env staging  # Staging"
    exit 0
else
    echo ""
    echo "❌ $ERRORS check(s) failed. Fix errors before deploying."
    exit 1
fi
