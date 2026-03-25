# SSR + DO 部署指南

## 📋 部署前准备

### 1. 配置 Cloudflare 资源

#### 1.1 创建 Analytics Engine 数据集

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages > Analytics Engine**
3. 点击 **Create dataset**
4. 输入数据集名称：`click_tracking`
5. 点击 **Create**

#### 1.2 创建 KV 命名空间

1. 进入 **Workers & Pages > KV**
2. 点击 **Create a namespace**
3. 输入名称：`cftracking-metadata`
4. 点击 **Add**
5. **重要**: 复制命名空间 ID（类似：`abc123...`）

### 2. 更新 wrangler.toml

打开 `wrangler.toml`，替换 KV namespace ID:

```toml
[[kv_namespaces]]
binding = "METADATA_KV"
id = "你的 KV namespace ID"  # 替换为实际 ID
preview_id = "你的 KV namespace ID"  # 可以使用相同 ID
```

### 3. 登录 Cloudflare

```bash
npx wrangler login
```

---

## 🚀 部署步骤

### Step 1: 安装依赖（已完成）

```bash
npm install
```

### Step 2: 构建项目

```bash
npm run build
```

**注意**: 可能会有一些 TypeScript 类型警告，但不影响核心功能。

### Step 3: 首次部署

```bash
npm run deploy
```

或者：

```bash
npx wrangler deploy
```

### Step 4: 查看部署日志

```bash
npm run tail
```

或者：

```bash
npx wrangler tail
```

---

## ✅ 验证部署

### 1. 访问应用

部署成功后，访问你的 Worker URL:

```
https://cftracking-ssr-do.<your-subdomain>.workers.dev
```

### 2. 验证清单

- [ ] **首页加载**: 访问 `/` 应该看到 SSR 渲染的首页
- [ ] **Dashboard**: 访问 `/dashboard` 应该看到 Dashboard 页面
- [ ] **CDN 缓存**: 刷新页面，第二次应该从 CDN 缓存（更快）
- [ ] **WebSocket 连接**: 打开浏览器 DevTools Console，应该看到 `🔌 WebSocket connected`
- [ ] **API 端点**: 访问 `/api/metadata` 应该返回 JSON 数据

### 3. 测试实时功能

#### 测试 WebSocket:

1. 打开浏览器 DevTools > Console
2. 访问 `/dashboard` 页面
3. 应该看到:
   ```
   🔌 WebSocket connected
   📡 Client subscribed to real-time updates
   ```

#### 测试 AE 触发器:

1. 在 Cloudflare Dashboard 进入 **Workers & Pages > Analytics Engine**
2. 点击你的 `click_tracking` 数据集
3. 写入测试数据（或使用你的应用产生点击）
4. 查看 Worker Logs 应该看到:
   ```
   ✅ AE auto-trigger: Synced 1 click to DO cache
   ```

---

## 🔧 故障排查

### 问题 1: 部署失败 - "Binding not found"

**原因**: KV namespace ID 配置错误

**解决方案**:
1. 检查 `wrangler.toml` 中的 KV namespace ID 是否正确
2. 确认 KV 命名空间已创建
3. 重新部署

### 问题 2: WebSocket 连接失败

**原因**: WebSocket 端点配置错误

**解决方案**:
1. 检查浏览器 Console 错误信息
2. 查看 Worker Logs: `npm run tail`
3. 确认 `/websocket` 路由正确处理

### 问题 3: DO 读取失败

**原因**: Durable Objects 未正确初始化

**解决方案**:
1. 检查 `wrangler.toml` 中的 DO 绑定
2. 查看 Worker Logs
3. 确认 `CacheDurableObject` 类已正确导出

### 问题 4: AE 触发器不工作

**原因**: Analytics Engine 配置错误

**解决方案**:
1. 确认 AE 数据集名称正确：`click_tracking`
2. 检查 `wrangler.toml` 中的 AE 绑定
3. 查看 Worker Logs 确认 AE 事件触发

---

## 📊 监控与运维

### 查看实时日志

```bash
npx wrangler tail
```

### 查看存储使用

1. 进入 **Workers & Pages > Your Worker**
2. 点击 **Storage**
3. 查看 Durable Objects 存储使用情况

### 清除过期数据

通过 API 端点手动触发:

```bash
curl -X POST https://cftracking-ssr-do.<your-subdomain>.workers.dev/admin/cache/purge
```

---

## 🎯 性能优化建议

### 1. CDN 缓存优化

当前配置：5 分钟 TTL

如需调整，修改 `wrangler.toml`:

```toml
[vars]
CDN_CACHE_TTL = "600"  # 10 分钟
```

### 2. DO 存储优化

- 默认保留 7 天数据
- 自动清理过期数据
- 监控存储使用量（免费额度：5GB）

### 3. WebSocket 优化

- 心跳间隔：30 秒
- 断线重连：最多 5 次
- 清理过期连接：5 分钟无心跳

---

## 📝 下一步

部署成功后，继续执行:

### Phase 3: 缓存优化

- [ ] Task 3.1: 地理分片（HK + CN）
- [ ] Task 3.2: CDN 缓存策略优化
- [ ] Task 3.3: 性能基准测试

### Phase 4: 监控与测试

- [ ] Task 4.1: 监控系统实现
- [ ] Task 4.2: 全面测试（Lighthouse）
- [ ] Task 4.3: 文档完善

---

## 🆘 获取帮助

### 有用链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Durable Objects 文档](https://developers.cloudflare.com/durable-objects/)
- [Analytics Engine 文档](https://developers.cloudflare.com/analytics/analytics-engine/)

### 查看项目文档

- [SSR_DO_INTEGRATION_PLAN.md](./SSR_DO_INTEGRATION_PLAN.md) - 完整实施计划
- [SSR_DO_QUICK_REFERENCE.md](./SSR_DO_QUICK_REFERENCE.md) - 快速参考
- [SSR_DO_IMPLEMENTATION_SUMMARY.md](./SSR_DO_IMPLEMENTATION_SUMMARY.md) - 实施总结

---

**最后更新**: 2026-03-25  
**版本**: 1.0
