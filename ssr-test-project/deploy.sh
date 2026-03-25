#!/bin/bash

# SSR 测试项目部署脚本
# 用法：./deploy.sh

echo "🚀 开始部署 SSR 测试项目到 Cloudflare..."

# 检查是否已登录
echo "📝 检查 Cloudflare 登录状态..."
if ! wrangler whoami > /dev/null 2>&1; then
  echo "❌ 未登录 Cloudflare，请先执行：wrangler login"
  exit 1
fi

echo "✅ 已登录 Cloudflare"

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 构建失败"
  exit 1
fi

echo "✅ 构建完成"

# 部署到 Cloudflare
echo "🌐 部署到 Cloudflare..."
npm run deploy

if [ $? -ne 0 ]; then
  echo "❌ 部署失败"
  exit 1
fi

echo "✅ 部署成功!"
echo ""
echo "📊 访问地址：https://cf-tracking-ssr-test.<your-subdomain>.workers.dev"
echo ""
echo "🧪 下一步:"
echo "   1. 使用 Lighthouse 测试线上性能"
echo "   2. 对比 SPA vs SSR 性能差异"
echo "   3. 记录测试数据到报告"
