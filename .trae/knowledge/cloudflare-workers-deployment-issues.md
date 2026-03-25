# Cloudflare Workers 部署问题总结

**日期**: 2026-03-25  
**项目**: CF Tracking  
**问题类型**: 部署配置错误

---

## 问题概述

### 现象
- 访问 `/dashboard` 显示 SSR 简单 Dashboard 界面，而不是完整的前端应用
- 前端应用包含完整功能：Dashboard, Campaigns, Offers, Landings, Traffic Sources, Clicks Log, Conversions Log 等
- 用户想要移除 SSR 简单界面，显示完整的前端应用

### 根本原因
1. **部署了错误的项目**：部署了 `src/ssr/worker.ts` - 简单的 SSR 示例项目，而不是完整的前端应用
2. **配置错误**：`wrangler.toml` 的 `main` 字段指向了错误的入口文件
3. **Assets 配置错误**：Assets 目录指向了错误的构建输出目录

---

## 错误尝试

### 尝试 1：修复 SSR 渲染
**错误思路**：认为需要修复 SSR 渲染，让 SSR App.tsx 渲染前端所有页面

**导致的问题**：
1. **路径别名问题**：前端代码使用了 `@/utils/cn`、`@/components/DateRangePicker` 等路径别名
2. **wrangler 构建失败**：wrangler 在部署时会重新构建项目，使用的构建系统无法解析 TypeScript 的路径别名配置
3. **多次构建失败**：
   - 缺少依赖：`lucide-react`、`tailwind-merge`、`cross-env`
   - 文件扩展名错误：`worker.ts` 使用 JSX 语法，需要改为 `worker.tsx`
   - 路径别名无法解析：Cloudflare Pages 构建环境无法解析 Vite 的路径别名配置

### 尝试 2：禁用 wrangler 自动构建
**错误思路**：禁用 wrangler 的自动构建，只部署已经构建好的文件

**结果**：仍然失败，因为根本问题是部署了错误的项目

---

## 正确的解决方案

### 步骤 1：对比成功构建的版本
通过 `git log` 找到最后一次成功构建的版本（`1c921ea`），对比差异：
- 成功版本：部署的是 `src/index.ts` - 主要的 Worker 入口文件
- 失败版本：部署的是 `src/ssr/worker.ts` - 简单的 SSR 示例项目

### 步骤 2：移除错误的项目
```bash
Remove-Item src/ssr/worker.ts -Force
```

### 步骤 3：修改 wrangler.toml 配置
```toml
# 修改前
name = "cf-tracking-ssr"
main = "src/ssr/worker.ts"

# 修改后
name = "cf-tracking"
main = "src/index.ts"
```

### 步骤 4：修改 Assets 配置
```toml
# 修改前
[assets]
directory = "./dist/client"

# 修改后
[assets]
directory = "./frontend/dist"
```

### 步骤 5：修改 build command
```toml
# 修改前
[build]
command = "npm run build"

# 修改后
[build]
command = "cd frontend && npm install && npm run build"
```

### 步骤 6：导出 Durable Objects
```typescript
// src/index.ts
import { CacheDurableObject } from '@/ssr/cache-do';

export {
  SessionDurableObject,
  CounterDurableObject,
  QueueDurableObject,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  CacheDurableObject,
};
```

---

## 关键教训

### 1. 对比成功版本
**教训**：在修改部署配置前，应该先对比之前成功构建的版本，了解差异

**改善措施**：
- 使用 `git log` 查看历史提交
- 使用 `git diff` 对比差异
- 使用 `git show` 查看历史版本的文件内容

### 2. 本地测试
**教训**：部署前应该在本地进行完整的构建和测试

**改善措施**：
- 运行 `npm run build` 确保构建成功
- 运行 `wrangler deploy` 本地测试部署
- 检查构建产物是否正确

### 3. 理解项目架构
**教训**：应该先理解项目的整体架构，再进行修改

**改善措施**：
- 检查 `wrangler.toml` 配置，了解部署架构
- 检查 `package.json` 脚本，了解构建流程
- 检查项目目录结构，了解各个模块的作用

### 4. 避免过度修改
**教训**：不要一次性修改太多内容，应该逐步修改并测试

**改善措施**：
- 每次修改后立即测试
- 使用 `git commit` 记录每次修改
- 如果出现问题，可以快速回滚

---

## 技术要点

### Cloudflare Workers 部署架构
```
┌─────────────────────────────────────────┐
│         Cloudflare Workers              │
│  ┌─────────────────────────────────┐   │
│  │   Worker (src/index.ts)         │   │
│  │   - API 处理                    │   │
│  │   - Durable Objects             │   │
│  │   - Cron Jobs                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Assets (frontend/dist)        │   │
│  │   - React SPA                   │   │
│  │   - 静态资源                    │   │
│  │   - PWA 配置                    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### wrangler.toml 配置要点
```toml
# Worker 入口文件
name = "cf-tracking"
main = "src/index.ts"

# Assets 配置
[assets]
directory = "./frontend/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

# 构建命令
[build]
command = "cd frontend && npm install && npm run build"

# Durable Objects
[[durable_objects.bindings]]
name = "CACHE_DO"
class_name = "CacheDurableObject"
```

### Durable Objects 导出要求
- 所有 Durable Objects 必须在入口文件中导出
- 使用 `export` 关键字导出类
- 在 `wrangler.toml` 中配置绑定

---

## 预防措施

### 1. 部署前检查清单
- [ ] 检查 `wrangler.toml` 的 `main` 字段是否正确
- [ ] 检查 Assets 目录是否正确
- [ ] 检查所有 Durable Objects 是否已导出
- [ ] 本地运行 `npm run build` 确保构建成功
- [ ] 本地运行 `wrangler deploy` 测试部署

### 2. 代码审查要点
- [ ] 确认部署的项目是否正确
- [ ] 确认构建命令是否正确
- [ ] 确认路径别名配置是否正确
- [ ] 确认依赖是否完整

### 3. 文档记录
- [ ] 记录项目的部署架构
- [ ] 记录 wrangler.toml 配置说明
- [ ] 记录常见问题和解决方案

---

## 相关资源

### Cloudflare 官方文档
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

### 项目文件
- `wrangler.toml` - Worker 配置文件
- `src/index.ts` - Worker 入口文件
- `frontend/` - 前端项目目录
- `frontend/dist/` - 前端构建输出目录

---

## 总结

此次问题的根本原因是**部署了错误的项目**。通过对比最后一次成功构建的版本，找到了问题的根源，并采取了正确的解决方案。

**关键教训**：
1. 对比成功版本，了解差异
2. 本地测试，确保构建成功
3. 理解项目架构，避免盲目修改
4. 逐步修改，及时测试

**改善措施**：
1. 建立部署前检查清单
2. 记录项目架构和配置说明
3. 定期审查和更新文档

---

**记录人**: AI Assistant  
**审核人**: User  
**状态**: 已解决
