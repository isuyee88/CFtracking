# Staging Environment Setup Guide

**目的**: 创建独立的 staging 环境用于预发布测试

---

## 📋 创建 Staging 资源

### Step 1: 创建 D1 Database

```bash
# 创建 staging 数据库
npx wrangler d1 create cf-tracking-staging-db

# 输出示例:
# ✅ Successfully created DB 'cf-tracking-staging-db'
# 📋 Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**记录 Database ID 并更新 wrangler.toml**

---

### Step 2: 创建 KV Namespace

```bash
# 创建 staging KV
npx wrangler kv:namespace create "UNIQUENESS_KV" --env staging

# 输出示例:
# 🌀 Creating namespace with title "cf-tracking-staging-UNIQUENESS_KV"
# ✨ Success!
# Add the following to your configuration file:
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**记录 KV ID 并更新 wrangler.toml**

---

### Step 3: 初始化数据库 Schema

```bash
# 复制 production schema 到 staging
npx wrangler d1 execute cf-tracking-staging-db --file=./schema.sql
```

---

### Step 4: 更新 wrangler.toml

取消注释并填入实际 ID:

```toml
[[env.staging.d1_databases]]
binding = "DB"
database_name = "cf-tracking-staging-db"
database_id = "your-actual-staging-db-id"  # ← 填入实际 ID

[[env.staging.kv_namespaces]]
binding = "UNIQUENESS_KV"
id = "your-actual-staging-kv-id"  # ← 填入实际 ID
```

---

## 🚀 部署到 Staging

### 首次部署

```bash
# 部署到 staging
npx wrangler deploy --env staging

# 输出示例:
# ⛅️ wrangler 4.80.0
# ------------------
# Total Upload: xx.xx KiB / gzip: xx.xx KiB
# Uploaded cf-tracking-staging (x.xx sec)
# Published cf-tracking-staging (x.xx sec)
#   https://cf-tracking-staging.suyee88.workers.dev
```

---

### 验证部署

```bash
# Health check
curl https://cf-tracking-staging.suyee88.workers.dev/health

# Deployment info
curl https://cf-tracking-staging.suyee88.workers.dev/api/deployment/info

# 应该显示:
# {
#   "success": true,
#   "data": {
#     "environment": "staging",
#     "version": "..."
#   }
# }
```

---

## 🧪 Staging 测试流程

### 1. 部署新功能到 Staging

```bash
# 切换到功能分支
git checkout feature/new-feature

# 部署到 staging
npx wrangler deploy --env staging
```

### 2. 运行集成测试

```bash
# 设置测试环境
export TEST_BASE_URL=https://cf-tracking-staging.suyee88.workers.dev

# 运行测试
npm run test:integration
```

### 3. 手动测试

访问 staging 环境手动测试新功能:
- https://cf-tracking-staging.suyee88.workers.dev/

### 4. 通过后部署到 Production

```bash
# 合并到 main
git checkout main
git merge feature/new-feature

# 部署到 production
npx wrangler deploy
```

---

## 🔄 Staging 数据管理

### 重置 Staging 数据库

```bash
# 删除所有数据
npx wrangler d1 execute cf-tracking-staging-db --command "DELETE FROM campaigns"

# 重新初始化
npx wrangler d1 execute cf-tracking-staging-db --file=./schema.sql

# 导入测试数据
npx wrangler d1 execute cf-tracking-staging-db --file=./test-data.sql
```

### 从 Production 复制数据

```bash
# 导出 production 数据
npx wrangler d1 backup create cf-tracking-db

# 导入到 staging（谨慎使用）
# 注意：生产数据可能包含敏感信息
```

---

## 🔒 Staging 最佳实践

### DO
- ✅ 在 staging 测试所有新功能
- ✅ 使用 staging 进行破坏性测试
- ✅ 定期重置 staging 数据
- ✅ 保持 staging 和 production 配置一致

### DON'T
- ❌ 不要在 staging 测试生产数据
- ❌ 不要跳过 staging 直接部署
- ❌ 不要让 staging 配置过时
- ❌ 不要在 staging 存储敏感数据

---

## 📊 Staging vs Production

| 特性 | Staging | Production |
|------|---------|------------|
| 数据 | 测试数据 | 真实数据 |
| 流量 | 内部测试 | 用户流量 |
| 稳定性 | 可以不稳定 | 必须稳定 |
| 部署频率 | 随时 | 审慎 |
| 监控 | 基础监控 | 完整监控 |

---

## 🎯 Staging 检查清单

### 部署前
- [ ] wrangler.toml 配置正确
- [ ] Staging 资源已创建
- [ ] 数据库 schema 同步
- [ ] 环境变量设置

### 部署后
- [ ] Health check 通过
- [ ] 功能测试通过
- [ ] 集成测试通过
- [ ] 性能测试通过

### 验证通过后
- [ ] 准备 production 部署
- [ ] 更新部署文档
- [ ] 通知团队

---

**维护**: 每周检查 staging 环境状态  
**数据清理**: 每月重置一次 staging 数据
