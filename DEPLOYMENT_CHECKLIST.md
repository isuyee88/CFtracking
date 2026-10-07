# CFtracking Phase 0 部署检查清单

**部署日期**: 2026-01-07  
**版本**: Phase 0.1 & 0.2  
**部署环境**: Staging → Production

---

## ✅ 部署前检查

### 代码质量
- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过
- [ ] 单元测试通过率 ≥ 95%
- [ ] E2E 测试通过率 ≥ 70%
- [ ] 代码审查完成

### 环境配置

#### Staging 环境
- [ ] AUTH_MODE = "on"
- [ ] JWT_SECRET 已配置（≥32字符）
- [ ] ADMIN_PASSWORD_HASH 已配置
- [ ] KV 绑定已配置
- [ ] D1 数据库已配置
- [ ] DO 绑定已配置

#### Production 环境
- [ ] AUTH_MODE = "on"
- [ ] JWT_SECRET 已配置（强随机）
- [ ] ADMIN_PASSWORD_HASH 已配置（Argon2id）
- [ ] KV 绑定已配置
- [ ] D1 数据库已配置
- [ ] DO 绑定已配置
- [ ] 域名配置正确
- [ ] SSL 证书有效

### 数据库
- [ ] 本地迁移测试通过
- [ ] Staging 数据库迁移完成
- [ ] Production 数据库备份完成
- [ ] 迁移脚本准备就绪

### 监控与日志
- [ ] Cloudflare Analytics 已启用
- [ ] 错误日志监控已配置
- [ ] 性能监控已配置
- [ ] 告警规则已设置

---

## 🚀 部署步骤

### Step 1: 本地验证
```bash
# 运行测试
npm run test:run

# 代码质量
npm run lint
npm run typecheck

# 本地服务器测试
npm run dev:worker
# 测试核心功能
```

### Step 2: 提交代码
```bash
# 使用提供的脚本
bash deploy-phase-0.sh

# 或手动提交
git add .
git commit -m "feat(security): Phase 0.1 & 0.2 - Security enhancements"
git push origin codex/release-hardening-20261007
```

### Step 3: 部署到 Staging
```bash
# 部署
wrangler deploy --env staging

# 验证
curl https://staging.cftracking.com/api/health

# 测试登录限流
for i in {1..6}; do
  curl -X POST https://staging.cftracking.com/api/auth/login \
    -d '{"username":"admin","password":"wrong"}'
done
# 第6次应返回 429

# 测试环境验证（查看日志）
wrangler tail --env staging
```

### Step 4: Staging 验证
- [ ] 健康检查端点正常
- [ ] 登录功能正常
- [ ] 登录限流生效
- [ ] 环境验证日志正常
- [ ] Dashboard 加载正常
- [ ] API 响应时间 < 500ms
- [ ] 错误率 < 0.1%

### Step 5: 部署到 Production
```bash
# 灰度发布（可选）
# 1. 部署新版本
wrangler deploy --env production

# 2. 验证
curl https://cftracking.com/api/health

# 3. 监控 5-10 分钟
wrangler tail --env production

# 4. 检查错误率和性能
```

### Step 6: Production 验证
- [ ] 健康检查端点正常
- [ ] 登录功能正常
- [ ] 所有 API 端点正常
- [ ] Dashboard 功能正常
- [ ] 性能指标达标
- [ ] 无错误日志
- [ ] 用户访问正常

---

## 🔄 回滚计划

### 如果部署失败

**Staging 环境**:
```bash
# 回滚到上一版本
wrangler rollback --env staging

# 或重新部署上一版本
git checkout HEAD~1
wrangler deploy --env staging
```

**Production 环境**:
```bash
# 立即回滚
wrangler rollback --env production

# 验证回滚成功
curl https://cftracking.com/api/health
```

### 常见问题处理

**问题 1: 环境验证失败阻止启动**
```
症状: 返回 500，日志显示 Configuration Error
原因: AUTH_MODE 或 JWT_SECRET 未配置
解决: 
  wrangler secret put JWT_SECRET --env production
  # 或修改 wrangler.toml
```

**问题 2: 登录限流不工作**
```
症状: 可以无限次尝试登录
原因: KV 绑定未配置
解决: 检查 wrangler.toml 的 KV 配置
```

**问题 3: 测试用户被锁定**
```
症状: 无法登录，返回 429
原因: 测试时触发限流
解决: 
  # 等待 15 分钟
  # 或手动清除 KV
  wrangler kv:key delete "login-attempts:admin:IP" --binding KV
```

---

## 📊 部署后监控

### 关键指标

**立即监控（前30分钟）**:
- 错误率 < 0.1%
- P95 响应时间 < 500ms
- 健康检查成功率 100%
- CPU 使用率 < 50%

**持续监控（前24小时）**:
- 登录成功率 > 99%
- API 可用性 > 99.9%
- 数据库连接正常
- 无内存泄漏

### 监控工具
```bash
# 实时日志
wrangler tail --env production

# 查看错误
wrangler tail --env production --format json | jq 'select(.level == "error")'

# Cloudflare Dashboard
# https://dash.cloudflare.com/
```

---

## 📝 部署记录

### Staging 部署
- 部署时间: ___________
- 部署人: ___________
- 版本: ___________
- 验证结果: [ ] 通过 / [ ] 失败
- 问题: ___________

### Production 部署
- 部署时间: ___________
- 部署人: ___________
- 版本: ___________
- 验证结果: [ ] 通过 / [ ] 失败
- 问题: ___________

---

## ✅ 部署完成确认

- [ ] Staging 部署成功
- [ ] Staging 验证通过
- [ ] Production 部署成功
- [ ] Production 验证通过
- [ ] 监控正常
- [ ] 文档已更新
- [ ] 团队已通知

---

**批准人**: ___________  
**签署日期**: ___________

---

## 🎯 下一步

Phase 0 完成后：
1. ✅ 监控 24 小时稳定性
2. ✅ 收集用户反馈
3. ✅ 开始 Phase 1.1: E2E 测试修复
4. ✅ 继续迭代优化
