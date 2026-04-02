# 部署指南

## 📋 部署方式

本项目支持两种部署方式：
1. **本地部署** - 使用 Wrangler CLI 直接部署
2. **GitHub Actions 自动部署** - 推送到 master 分支自动部署

---

## 🔧 本地部署

### 前置条件

1. 安装 Node.js 18+
2. 安装 Wrangler CLI
3. 配置 Cloudflare API Token

### 安装 Wrangler

```bash
npm install -g wrangler
```

### 配置 Cloudflare 认证

```bash
# 登录 Cloudflare
wrangler login

# 或者使用 API Token
wrangler whoami
```

### 执行部署

```bash
# 方法一：直接部署（推荐）
wrangler deploy

# 方法二：使用代理（如果网络有问题）
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
wrangler deploy
```

### 常见问题

#### 问题 1：日志文件目录不存在

**错误信息**:
```
Failed to write to log file Error: ENOENT: no such file or directory
```

**解决方案**:
```powershell
# Windows
New-Item -ItemType Directory -Force -Path "$env:APPDATA\xdg.config\.wrangler\logs"

# macOS/Linux
mkdir -p ~/.config/wrangler/logs
```

#### 问题 2：网络超时

**错误信息**:
```
fetch failed
TypeError: fetch failed
```

**解决方案**:

1. **使用代理**
   ```powershell
   $env:HTTP_PROXY = "http://127.0.0.1:7890"
   $env:HTTPS_PROXY = "http://127.0.0.1:7890"
   wrangler deploy
   ```

2. **检查 Clash Verge Rev 配置**
   - 确保 Clash Verge Rev 正在运行
   - 确认代理端口（默认 7890）
   - 检查系统代理设置

3. **使用 GitHub Actions 部署**（推荐）
   ```bash
   git push origin master
   ```

---

## 🤖 GitHub Actions 自动部署

### 配置 Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下 Secrets：

| Secret Name | 说明 | 获取方式 |
|-------------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | `wrangler whoami` 命令查看 |

### 创建 API Token

1. 访问 [Cloudflare API Token 页面](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Edit Cloudflare Workers" 模板
4. 配置权限：
   - Account.Cloudflare Workers: Edit
   - Account.Cloudflare Pages: Edit
5. 点击 "Continue to summary"
6. 点击 "Create Token"
7. **重要**: 立即复制 Token，只显示一次

### 获取账户 ID

```bash
wrangler whoami
```

输出示例：
```
👋 You are logged in as:
  - Email: user@example.com
  - Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 触发部署

#### 方式一：推送代码

```bash
git add .
git commit -m "feat: add new feature"
git push origin master
```

#### 方式二：手动触发

1. 进入仓库 Actions 标签
2. 选择 "Deploy to Cloudflare Workers" 工作流
3. 点击 "Run workflow"
4. 选择分支（默认 master）
5. 点击 "Run workflow"

### 查看部署状态

1. 进入仓库 Actions 标签
2. 查看最近的部署记录
3. 点击查看详情
4. 查看部署日志

### 部署成功标志

```
✅ Deployment Successful!
- Branch: master
- Commit: abc123def456...
- Time: 2026-04-02T17:00:00Z
```

---

## 📊 部署验证

### 1. 检查 Workers 状态

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → cf-tracking

### 2. 访问应用

- **生产环境**: https://t.isuyee.com
- **开发环境**: `wrangler dev`

### 3. 检查功能

- [ ] Dashboard 页面正常加载
- [ ] 图表正常显示（无控制台警告）
- [ ] API 请求正常
- [ ] 数据实时更新
- [ ] 响应式布局正常

### 4. 性能测试

```bash
# 使用 Lighthouse
lighthouse https://t.isuyee.com --view

# 在线工具
# https://pagespeed.web.dev/
```

---

## 🔍 故障排除

### 问题 1：GitHub Actions 部署失败

**检查清单**:
- [ ] API Token 是否正确
- [ ] 账户 ID 是否正确
- [ ] 网络是否正常
- [ ] Node.js 版本是否兼容

**解决方案**:
```yaml
# 在 .github/workflows/deploy.yml 中添加调试步骤
- name: Debug
  run: |
    echo "Node version: $(node -v)"
    echo "NPM version: $(npm -v)"
    echo "Wrangler version: $(npx wrangler --version)"
```

### 问题 2：部署后页面空白

**可能原因**:
- 前端构建失败
- 路由配置错误
- 静态资源路径错误

**解决方案**:
```bash
# 本地测试构建
npm run build:frontend

# 检查构建输出
ls -la dist/

# 本地测试运行
wrangler dev
```

### 问题 3：API 请求失败

**检查**:
1. D1 数据库绑定
2. KV 命名空间绑定
3. R2 存储桶绑定
4. Durable Objects 配置

**解决方案**:
```bash
# 检查 wrangler.toml 配置
cat wrangler.toml

# 重新部署
wrangler deploy --force
```

---

## 🚀 最佳实践

### 1. 使用 Git 标签

```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 2. 预部署检查清单

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 本地构建成功
- [ ] 环境变量已配置
- [ ] 数据库迁移已完成

### 3. 回滚策略

```bash
# 回滚到上一个版本
git revert HEAD
git push origin master

# 或者部署特定版本
git checkout <commit-hash>
wrangler deploy
```

### 4. 监控和日志

```bash
# 查看实时日志
wrangler tail

# 查看特定部署的日志
wrangler tail --format json
```

---

## 📝 更新日志

### v1.0.0 (2026-04-02)
- 添加 GitHub Actions 自动部署
- 优化本地部署流程
- 添加故障排除指南
- 完善部署验证清单

---

## 🔗 相关资源

- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Clash Verge Rev 配置指南](./CLASH_VERGE_SCRIPT_GUIDE.md)

---

**最后更新**: 2026-04-02
