# SSR + DO 整合快速参考

## 项目结构

```
ssr-test-project/
├── src/
│   ├── worker.ts                    # SSR Worker 入口
│   ├── client.tsx                   # 客户端水合脚本
│   ├── ae-trigger.ts                # Analytics Engine 触发器
│   ├── durable-objects/
│   │   └── cache-do.ts              # Durable Objects 缓存实现
│   ├── components/                  # React 组件
│   ├── pages/                       # React 页面组件
│   └── services/                    # 服务层
├── index.html                       # HTML 入口
├── wrangler.toml                    # Cloudflare 配置
├── vite.config.ts                   # Vite 配置
├── tsconfig.json                    # TypeScript 配置
└── package.json                     # 依赖配置
```

## 核心架构

### 1. SSR 渲染流程

```
用户请求 → Cloudflare Edge → Worker (SSR)
  → 检查 CDN 缓存（5 分钟）
  → 如果 miss: 读取 DO 缓存
  → 服务器渲染 HTML
  → 注入客户端水合脚本
  → 返回 HTML
```

### 2. 实时数据流

```
用户点击 → Analytics Engine → 自动触发 Worker
  → 增量追加到 DO
  → WebSocket 推送
  → 客户端实时更新
```

### 3. 缓存层次

```
┌─────────────────────────────────────┐
│  CDN Edge Cache (5 分钟)             │
├─────────────────────────────────────┤
│  Durable Objects (SQLite, 7 天)      │
├─────────────────────────────────────┤
│  Analytics Engine (实时触发)         │
└─────────────────────────────────────┘
```

## 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "CACHE_DO"
class_name = "CacheDurableObject"

[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "click_tracking"

[[kv_namespaces]]
binding = "METADATA_KV"
id = "your-kv-id"
```

### 3. 创建 AE 数据集

在 Cloudflare Dashboard:
1. 进入 Workers & Pages > Analytics Engine
2. 创建新数据集：`click_tracking`
3. 配置写入权限

### 4. 部署

```bash
npm run deploy
```

### 5. 验证

访问：`https://cftracking-ssr-do.<your-subdomain>.workers.dev`

## API 端点

### 数据读取

```bash
# 获取点击数据
GET /api/clicks?limit=100&since=1234567890

# 获取元数据
GET /api/metadata
```

### 管理端点

```bash
# 清除过期数据
POST /admin/cache/purge

# 获取统计
GET /admin/cache/stats
```

## 监控指标

### 性能指标

- **FCP (First Contentful Paint)**: < 0.9s
- **LCP (Largest Contentful Paint)**: < 1.2s
- **TTI (Time to Interactive)**: < 1.5s
- **CDN 命中率**: > 80%
- **WebSocket 延迟**: < 100ms

### 缓存指标

- **DO 存储使用**: < 5GB (免费额度)
- **数据保留**: 7 天
- **增量更新**: 仅追加新数据

## 故障排查

### 1. WebSocket 连接失败

检查：
- Worker 日志：`wrangler tail`
- 浏览器控制台错误
- 防火墙设置

### 2. DO 写入失败

检查：
- DO 绑定是否正确
- 存储配额是否超限
- SQLite 表结构是否正确

### 3. AE 触发器不工作

检查：
- AE 数据集配置
- Worker 绑定
- 事件格式是否正确

## 知识图谱记录

相关架构已记录：
- Entity: "SSR + DO Integration Architecture"
- Entity: "Analytics Engine Auto-Trigger"
- Entity: "Durable Objects Cache Layer"
