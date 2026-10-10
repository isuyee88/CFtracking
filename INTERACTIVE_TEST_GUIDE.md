# CFtracking 本地环境交互测试指南

**目标**: 使用 Cloudflare Workers 本地开发环境进行完整的端到端测试验证

---

## 📋 一、准备工作

### 1.1 环境要求

```bash
# 检查依赖
node --version   # 需要 v18+
npm --version    # 需要 v9+
npx wrangler --version  # 需要 v4+
```

### 1.2 项目初始化

```bash
cd D:/suyee/github/CFtracking

# 安装依赖
npm install

# 初始化本地 D1 数据库
npm run db:migrate:local

# 构建前端
npm run build:frontend
```

---

## 🚀 二、启动本地服务器

### 2.1 启动命令

```bash
# 方式 1: 直接启动（前台运行）
npm run dev:worker

# 方式 2: 后台运行
npm run dev:worker > wrangler-dev.log 2>&1 &

# 查看日志
tail -f wrangler-dev.log
```

### 2.2 验证启动成功

```bash
# 等待看到以下输出
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:12342

# 测试访问
curl http://localhost:12342/
```

**预期结果**: 返回 HTML 内容（首页）

---

## 🧪 三、核心测试用例

### 3.1 安全测试

#### 测试 1: Bootstrap 未认证访问

```bash
# 测试命令
curl -s http://localhost:12342/__bootstrap/dashboard-stats | jq

# 预期结果（开发模式）:
# - HTTP 200 + 返回统计数据 (AUTH_MODE=off)
# - 风险: 生产环境必须返回 401

# 验证点
echo "⚠️ 检查 wrangler.toml 中 AUTH_MODE 是否为 'on'"
```

#### 测试 2: /api/health 端点

```bash
# 测试命令
curl -s -w "\nHTTP: %{http_code}\n" http://localhost:12342/api/health

# 当前已知问题: 返回 404
# 预期修复后: HTTP 200 + {"status":"healthy"}
```

#### 测试 3: Postback 伪造测试

```bash
# 伪造转化测试
curl -X POST "http://localhost:12342/api/postback/universal?click_id=FAKE_CLICK_123&status=approved&payout=9999" \
  -w "\nHTTP: %{http_code}\n"

# 安全风险验证:
# - 如果返回 200 并接受 → 🔴 严重安全漏洞
# - 应该返回 400/403 并拒绝 → ✅ 安全
```

#### 测试 4: API 认证测试

```bash
# 未认证访问 API
curl -s -w "\nHTTP: %{http_code}\n" http://localhost:12342/api/campaigns

# 开发模式预期: 200 (AUTH_MODE=off)
# 生产模式预期: 401 (AUTH_MODE=on)
```

---

### 3.2 核心业务流程测试

#### 测试 5: Campaign CRUD

```bash
# 1. 列出所有 Campaign
curl http://localhost:12342/api/campaigns | jq

# 2. 创建新 Campaign
curl -X POST http://localhost:12342/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "alias": "test-camp-001",
    "domain": "track.example.com",
    "trafficSource": "facebook",
    "status": "active"
  }' | jq

# 3. 获取 Campaign 详情
CAMPAIGN_ID="test-camp-001"
curl "http://localhost:12342/api/campaigns/$CAMPAIGN_ID" | jq

# 4. 更新 Campaign
curl -X PUT "http://localhost:12342/api/campaigns/$CAMPAIGN_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "paused"}' | jq

# 5. 删除 Campaign
curl -X DELETE "http://localhost:12342/api/campaigns/$CAMPAIGN_ID" \
  -w "\nHTTP: %{http_code}\n"
```

#### 测试 6: Tracking URL 完整流程

```bash
# 1. 创建测试 Campaign (假设已存在 alias: test-campaign)

# 2. 访问 Tracking URL
curl -i "http://localhost:12342/test-campaign?sub1=test&sub2=source"

# 预期: 302 重定向到 Landing 页
# 验证: 查看 Location 响应头

# 3. 验证 Click 记录
# 在本地 D1 数据库中查询
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  "SELECT * FROM clicks ORDER BY createdAt DESC LIMIT 5;"
```

#### 测试 7: Conversion 追踪

```bash
# 假设前面的 Click 生成了 click_id

CLICK_ID="<从数据库获取>"

# 发送转化 Postback
curl -X POST "http://localhost:12342/api/postback/test-network?click_id=$CLICK_ID&status=approved&payout=10.50" \
  -w "\nHTTP: %{http_code}\n"

# 验证转化记录
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  "SELECT * FROM conversions WHERE clickId = '$CLICK_ID';"
```

#### 测试 8: Dashboard 数据统计

```bash
# 获取 Dashboard 统计
curl "http://localhost:12342/api/dashboard-stats?range=today" | jq

# 预期返回:
# {
#   "clicks": 123,
#   "conversions": 45,
#   "revenue": 450.00,
#   "roi": 0.25
# }
```

---

### 3.3 实时功能测试

#### 测试 9: SSE 实时推送

```bash
# 监听缓存更新事件（保持连接）
curl -N http://localhost:12342/events/cache

# 在另一个终端创建 Campaign，观察 SSE 推送
# 预期: 收到 event: cache-updated
```

#### 测试 10: AI 自动优化

```bash
# 触发 AI 优化
curl -X POST "http://localhost:12342/api/ai-optimization/run" | jq

# 查看优化建议
curl "http://localhost:12342/api/ai-optimization/recommendations" | jq
```

---

## 🔍 四、数据库检查

### 4.1 直接查询 D1 数据库

```bash
# 找到数据库文件
DB_FILE=$(find .wrangler/state/v3/d1 -name "*.sqlite" | head -1)

# 查看所有表
sqlite3 "$DB_FILE" ".tables"

# 查询 Campaign 数据
sqlite3 "$DB_FILE" "SELECT id, name, alias, status FROM campaigns LIMIT 10;"

# 查询 Click 统计
sqlite3 "$DB_FILE" "SELECT COUNT(*) as total_clicks FROM clicks;"

# 查询 Conversion 统计
sqlite3 "$DB_FILE" "SELECT COUNT(*) as total_conversions, SUM(payout) as total_revenue FROM conversions;"

# 查询今天的流量
sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM clicks WHERE DATE(createdAt) = DATE('now');"
```

### 4.2 验证数据完整性

```bash
# 检查外键约束
sqlite3 "$DB_FILE" "PRAGMA foreign_keys;"

# 检查索引
sqlite3 "$DB_FILE" ".schema clicks" | grep INDEX

# 检查表结构
sqlite3 "$DB_FILE" ".schema campaigns"
```

---

## 📱 五、前端交互测试

### 5.1 浏览器手动测试

访问: http://localhost:12342

**测试清单**:
- [ ] 首页加载
- [ ] Dashboard 实时数据
- [ ] Campaign 列表
- [ ] 创建新 Campaign
- [ ] Campaign 详情页
- [ ] Tracking URL 复制
- [ ] Landings/Offers 管理
- [ ] Reports 查看
- [ ] Autorules 配置
- [ ] 黑白名单管理

### 5.2 移动端测试

```bash
# 使用 Chrome DevTools
# 1. F12 打开开发者工具
# 2. Toggle device toolbar (Ctrl+Shift+M)
# 3. 选择设备: iPhone 12 Pro (375x812)
# 4. 测试响应式布局
```

**验证点**:
- [ ] 表格横向滚动流畅
- [ ] 按钮触摸目标 ≥ 44x44px
- [ ] 导航菜单可用
- [ ] 表单输入友好

---

## 🧪 六、自动化 E2E 测试

### 6.1 运行 Playwright 测试

```bash
# 运行完整 E2E 测试套件
npm run test:e2e

# 运行特定测试文件
npx playwright test test/e2e-comprehensive.ts

# 调试模式
npx playwright test --debug

# 生成测试报告
npx playwright test --reporter=html
```

### 6.2 查看测试结果

```bash
# 查看 HTML 报告
npx playwright show-report

# 预期: 31/44 通过（基于 2026-10-07 评审）
# 失败用例: 主要是 /api/health 404 等已知问题
```

---

## 🛠️ 七、故障排查

### 7.1 服务器启动失败

**问题**: 端口被占用
```bash
# 查找占用进程
netstat -ano | findstr :12342
# 或 (Linux/Mac)
lsof -i :12342

# 杀死进程
kill -9 <PID>
```

**问题**: 网络超时 (ETIMEDOUT)
```bash
# 检查代理设置
echo $http_proxy
echo $https_proxy

# 临时禁用代理
unset http_proxy https_proxy

# 或在 wrangler.dev.toml 中配置
```

### 7.2 数据库问题

**问题**: D1 数据库未初始化
```bash
# 重新初始化
npm run db:migrate:local

# 检查迁移状态
npx wrangler d1 execute cf-tracking-db --local \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**问题**: 数据库锁定
```bash
# 停止所有 wrangler 进程
pkill -f wrangler

# 删除锁文件
rm .wrangler/state/v3/d1/*.lock
```

### 7.3 前端构建问题

**问题**: 静态资源 404
```bash
# 清理并重新构建
rm -rf frontend/dist
npm run build:frontend

# 验证构建输出
ls -lh frontend/dist/
```

---

## 📊 八、测试结果记录模板

```markdown
# 测试执行记录

**测试日期**: 2026-01-07
**测试人员**: [您的名字]
**环境**: Wrangler Dev (本地)

## 测试结果

### 安全测试
- [ ] Bootstrap 认证: ✅/❌
- [ ] /api/health: ✅/❌ (已知 404)
- [ ] Postback 安全: ✅/❌
- [ ] API 认证: ✅/❌

### 功能测试
- [ ] Campaign CRUD: ✅/❌
- [ ] Tracking URL: ✅/❌
- [ ] Conversion 追踪: ✅/❌
- [ ] Dashboard 数据: ✅/❌
- [ ] SSE 推送: ✅/❌

### 性能测试
- 首页加载时间: ___ ms
- API 响应时间: ___ ms
- 数据库查询: ___ ms

### 发现的问题
1. [问题描述]
   - 严重程度: P0/P1/P2
   - 复现步骤: ...
   - 预期结果: ...
   - 实际结果: ...

## 结论
- 总体评分: __/10
- 生产就绪: 是/否
- 建议: ...
```

---

## 🎯 九、关键验证点总结

基于 2026-10-07 评审报告，重点验证：

### P0 安全问题
- [ ] ⚠️ Bootstrap 未认证泄露数据
- [ ] ⚠️ Postback fail-open 接受伪造
- [ ] ⚠️ /api/health 返回 404
- [ ] ⚠️ 转化写入失败仍报成功
- [ ] ⚠️ 登录密码哈希不安全

### 核心流程验证
- [ ] ⚠️ tracking→conversion→report 闭环
- [ ] 数据一致性（DO Cache vs D1）
- [ ] 实时推送功能

### 移动端体验
- [ ] ⚠️ 表格固定宽度 1160px
- [ ] 触摸目标大小
- [ ] 响应式布局

---

## 📝 十、下一步行动

完成本地测试后:

1. ✅ 生成测试报告
2. ✅ 更新评审文档
3. ⚠️ 提交 P0 问题修复建议
4. ⚠️ 协助团队修复关键问题
5. ⚠️ 重新进行生产就绪评估

---

**文档维护**: 请随时更新此文档以反映最新的测试流程和发现
**联系方式**: 如有问题请查看项目 README 或提交 Issue

